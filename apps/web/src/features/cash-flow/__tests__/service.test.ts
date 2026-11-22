import { createRepositories } from "@/data/repositories";
import { createMemoryStore } from "@/data/store/memory-store";
import { ensureUserSetup } from "@/data/user-setup";
import { createCashFlowService, type CashFlowContext } from "../service";
import type { EntryDraft } from "../types";

const UID = "juliana";
const TODAY = "2026-11-22";

async function setup() {
  const store = createMemoryStore();
  const repos = createRepositories(async () => store);
  await ensureUserSetup(store, { uid: UID, email: "j@exemplo.com", displayName: "Juliana" });
  const accountId = await repos.accounts.create(UID, {
    name: "Itaú",
    type: "checking",
    color: "chart-2",
    icon: "landmark",
    initialBalance: 100000,
    initialBalanceDate: "2026-11-01",
  });
  const cardId = await repos.cards.create(UID, {
    name: "Visa",
    brand: "visa",
    limit: 500000,
    closingDay: 3,
    dueDay: 10,
    color: "chart-4",
  });
  const context: CashFlowContext = {
    uid: UID,
    today: TODAY,
    categories: await repos.categories.list(UID),
    cards: await repos.cards.list(UID),
  };
  return { repos, service: createCashFlowService(repos), context, accountId, cardId };
}

const draft = (overrides: Partial<EntryDraft>): EntryDraft => ({
  type: "expense",
  amount: 10000,
  description: "Mercado",
  date: TODAY,
  status: "paid",
  categoryId: "exp-mercado",
  accountId: null,
  cardId: null,
  notes: null,
  repeat: { kind: "none" },
  ...overrides,
});

describe("criar lançamentos", () => {
  it("despesa simples na conta, com categoria desnormalizada", async () => {
    const { repos, service, context, accountId } = await setup();
    const id = await service.create(draft({ accountId }), context);
    expect(await repos.transactions.get(UID, id)).toMatchObject({
      type: "expense",
      status: "paid",
      month: "2026-11",
      categoryName: "Mercado",
      categoryIcon: "shopping-cart",
      invoiceMonth: null,
    });
  });

  it("compra no cartão calcula a fatura e não usa conta", async () => {
    const { repos, service, context, accountId, cardId } = await setup();
    const id = await service.create(draft({ cardId, accountId }), context);
    expect(await repos.transactions.get(UID, id)).toMatchObject({
      cardId,
      accountId: null,
      invoiceMonth: "2026-12",
    });
  });

  it("receita futura fica prevista", async () => {
    const { repos, service, context, accountId } = await setup();
    const id = await service.create(
      draft({
        type: "income",
        categoryId: "inc-salario",
        accountId,
        date: "2026-12-05",
        status: "pending",
      }),
      context,
    );
    expect(await repos.transactions.get(UID, id)).toMatchObject({
      status: "pending",
      paidAt: null,
    });
  });

  it("parcelamento cria o plano e as parcelas, somando o total", async () => {
    const { repos, service, context, cardId } = await setup();
    await service.create(
      draft({
        amount: 100000,
        description: "TV",
        cardId,
        categoryId: "exp-compras",
        repeat: { kind: "installments", count: 3 },
      }),
      context,
    );
    const items = (await repos.transactions.list(UID))
      .filter((t) => t.installmentPlanId)
      .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0));
    expect(items.map((t) => [t.installmentNumber, t.amount, t.invoiceMonth, t.status])).toEqual([
      [1, 33334, "2026-12", "paid"],
      [2, 33333, "2027-01", "pending"],
      [3, 33333, "2027-02", "pending"],
    ]);
    const [plan] = await repos.installmentPlans.list(UID);
    expect(plan).toMatchObject({
      totalAmount: 100000,
      installmentCount: 3,
      firstInstallmentAmount: 33334,
      installmentAmount: 33333,
      status: "active",
    });
  });

  it("recorrência gera as ocorrências até 3 meses à frente", async () => {
    const { repos, service, context, accountId } = await setup();
    await service.create(
      draft({
        type: "income",
        description: "Salário",
        categoryId: "inc-salario",
        accountId,
        date: "2026-11-05",
        repeat: { kind: "recurring", frequency: "monthly", endDate: null },
      }),
      context,
    );
    const items = (await repos.transactions.list(UID))
      .filter((t) => t.recurrenceId)
      .map((t) => [t.date, t.status]);
    expect(items.sort()).toEqual([
      ["2026-11-05", "paid"],
      ["2026-12-05", "pending"],
      ["2027-01-05", "pending"],
      ["2027-02-05", "pending"],
    ]);
    const [recurrence] = await repos.recurrences.list(UID);
    expect(recurrence?.generatedUntil).toBe("2027-02-22");
  });

  it("estender recorrências é idempotente", async () => {
    const { repos, service, context, accountId } = await setup();
    await service.create(
      draft({
        accountId,
        description: "Aluguel",
        date: "2026-11-05",
        repeat: { kind: "recurring", frequency: "monthly", endDate: null },
      }),
      context,
    );
    // Um mês depois, gera a próxima ocorrência; rodar de novo não duplica.
    const later = { ...context, today: "2026-12-22" };
    expect(await service.extendRecurrences(later, await repos.recurrences.list(UID))).toBe(1);
    expect(await service.extendRecurrences(later, await repos.recurrences.list(UID))).toBe(0);
    expect((await repos.transactions.list(UID)).filter((t) => t.recurrenceId)).toHaveLength(5);
  });

  it("recusa parcelar receita e categoria inexistente", async () => {
    const { service, context, accountId } = await setup();
    await expect(
      service.create(
        draft({
          type: "income",
          categoryId: "inc-salario",
          accountId,
          repeat: { kind: "installments", count: 2 },
        }),
        context,
      ),
    ).rejects.toMatchObject({ code: "invalid" });
    await expect(
      service.create(draft({ accountId, categoryId: "nao-existe" }), context),
    ).rejects.toMatchObject({ fields: { categoryId: "Escolha uma categoria." } });
  });
});

describe("editar e excluir", () => {
  async function installments() {
    const ctx = await setup();
    await ctx.service.create(
      draft({
        amount: 90000,
        description: "Sofá",
        cardId: ctx.cardId,
        categoryId: "exp-compras",
        repeat: { kind: "installments", count: 3 },
      }),
      ctx.context,
    );
    const items = (await ctx.repos.transactions.list(ctx.repos ? UID : UID)).sort(
      (a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0),
    );
    return { ...ctx, items };
  }

  it("edita a descrição desta e das próximas parcelas", async () => {
    const { repos, service, context, items } = await installments();
    await service.update(items[1]!, { description: "Sofá retrátil" }, "following", context, items);
    const after = (await repos.transactions.list(UID)).sort(
      (a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0),
    );
    expect(after.map((t) => t.description)).toEqual(["Sofá", "Sofá retrátil", "Sofá retrátil"]);
  });

  it("muda o valor só da parcela escolhida", async () => {
    const { repos, service, context, items } = await installments();
    await service.update(items[2]!, { amount: 31000 }, "all", context, items);
    expect((await repos.transactions.list(UID)).map((t) => t.amount).sort()).toEqual([
      30000, 30000, 31000,
    ]);
  });

  it("exclui esta e as próximas parcelas e cancela o plano", async () => {
    const { repos, service, context, items } = await installments();
    const removed = await service.remove(items[1]!, "following", context, items);
    expect(removed).toHaveLength(2);
    expect(await repos.transactions.list(UID)).toHaveLength(1);
    expect((await repos.installmentPlans.list(UID))[0]?.status).toBe("canceled");
  });

  it("exclui todas as parcelas e o plano", async () => {
    const { repos, service, context, items } = await installments();
    await service.remove(items[0]!, "all", context, items);
    expect(await repos.transactions.list(UID)).toHaveLength(0);
    expect(await repos.installmentPlans.list(UID)).toHaveLength(0);
  });

  it("desfaz a exclusão de um lançamento", async () => {
    const { repos, service, context, accountId } = await setup();
    const id = await service.create(draft({ accountId }), context);
    const tx = await repos.transactions.get(UID, id);
    const removed = await service.remove(tx, "one", context, [tx]);
    expect(await repos.transactions.list(UID)).toHaveLength(0);
    await service.restore(UID, removed);
    expect(await repos.transactions.list(UID)).toHaveLength(1);
  });

  it("recorrência: novo valor vale para as próximas não pagas; excluir encerra a série", async () => {
    const { repos, service, context, accountId } = await setup();
    await service.create(
      draft({
        accountId,
        description: "Academia",
        amount: 12000,
        date: "2026-11-10",
        repeat: { kind: "recurring", frequency: "monthly", endDate: null },
      }),
      context,
    );
    let items = (await repos.transactions.list(UID)).sort((a, b) => a.date.localeCompare(b.date));
    await service.update(items[1]!, { amount: 13000 }, "following", context, items);
    items = (await repos.transactions.list(UID)).sort((a, b) => a.date.localeCompare(b.date));
    expect(items.map((t) => t.amount)).toEqual([12000, 13000, 13000, 13000]);
    expect((await repos.recurrences.list(UID))[0]?.amount).toBe(13000);

    await service.remove(items[2]!, "following", context, items);
    expect((await repos.transactions.list(UID)).map((t) => t.date)).toEqual([
      "2026-12-10",
      "2026-11-10",
    ]);
    const recurrence = (await repos.recurrences.list(UID))[0];
    expect(recurrence).toMatchObject({ endDate: "2027-01-09", active: false });
  });

  it("marca como pago", async () => {
    const { repos, service, context, accountId } = await setup();
    const id = await service.create(
      draft({ accountId, status: "pending", date: "2026-11-25" }),
      context,
    );
    await service.markPaid(await repos.transactions.get(UID, id), UID);
    const tx = await repos.transactions.get(UID, id);
    expect(tx.status).toBe("paid");
    expect(tx.paidAt).toBeInstanceOf(Date);
  });
});
