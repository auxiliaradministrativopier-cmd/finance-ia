import { ensureUserSetup } from "@/data/user-setup";
import { createRepositories } from "@/data/repositories";
import { createMemoryStore } from "@/data/store/memory-store";
import { createDebtService } from "../service";
import { buildDebtView, debtEvolution, summarizeDebts } from "../views";

const UID = "juliana";
const TODAY = "2026-11-22";
const loan = {
  name: "Empréstimo da reforma",
  creditor: "Banco Azul",
  type: "personal_loan" as const,
  originalAmount: 1_000_000,
  currentBalance: 1_000_000,
  monthlyRate: 2,
  amortization: "price" as const,
  installmentAmount: 94_560,
  installmentCount: 12,
  startDate: "2026-11-01",
  nextDueDate: "2026-12-01",
  endDate: "2027-11-01",
};

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
  return { repos, service: createDebtService(repos), accountId };
}

describe("dívidas", () => {
  it("parcela paga os juros do mês, abate o resto e lança a despesa no fluxo", async () => {
    const { repos, service, accountId } = await setup();
    const id = await service.create(UID, loan);
    const debt = await repos.debts.get(UID, id);
    await service.registerPayment(UID, debt, {
      kind: "regular",
      amount: 94_560,
      date: "2026-12-01",
      accountId,
    });

    const updated = await repos.debts.get(UID, id);
    expect(updated.currentBalance).toBe(1_000_000 - (94_560 - 20_000));
    expect(updated.nextDueDate).toBe("2027-01-01");

    const [payment] = await repos.debtPayments(id).list(UID);
    expect(payment).toMatchObject({
      kind: "regular",
      amount: 94_560,
      interest: 20_000,
      principal: 74_560,
    });
    const transaction = await repos.transactions.get(UID, payment!.transactionId!);
    expect(transaction).toMatchObject({
      type: "expense",
      amount: 94_560,
      categoryId: "exp-dividas",
      linkedEntity: { type: "debt", id },
      description: "Parcela · Empréstimo da reforma",
    });
  });

  it("antecipação abate direto do saldo e não mexe no vencimento", async () => {
    const { repos, service } = await setup();
    const id = await service.create(UID, loan);
    await service.registerPayment(UID, await repos.debts.get(UID, id), {
      kind: "prepayment",
      amount: 300_000,
      date: TODAY,
    });
    const updated = await repos.debts.get(UID, id);
    expect(updated.currentBalance).toBe(700_000);
    expect(updated.nextDueDate).toBe("2026-12-01");
    const [payment] = await repos.debtPayments(id).list(UID);
    expect(payment).toMatchObject({ interest: 0, principal: 300_000, transactionId: null });
  });

  it("quitar zera o saldo e limpa o vencimento", async () => {
    const { repos, service } = await setup();
    const id = await service.create(UID, loan);
    await service.registerPayment(UID, await repos.debts.get(UID, id), {
      kind: "prepayment",
      amount: 1_000_000,
      date: TODAY,
    });
    const paid = await repos.debts.get(UID, id);
    expect(paid).toMatchObject({ currentBalance: 0, nextDueDate: null });
    await expect(
      service.registerPayment(UID, paid, { kind: "regular", amount: 100, date: TODAY }),
    ).rejects.toThrow();
  });

  it("excluir o pagamento devolve o saldo, o vencimento e remove a despesa", async () => {
    const { repos, service, accountId } = await setup();
    const id = await service.create(UID, loan);
    await service.registerPayment(UID, await repos.debts.get(UID, id), {
      kind: "regular",
      amount: 94_560,
      date: "2026-12-01",
      accountId,
    });
    const [payment] = await repos.debtPayments(id).list(UID);
    await service.removePayment(UID, await repos.debts.get(UID, id), payment!);

    expect(await repos.debts.get(UID, id)).toMatchObject({
      currentBalance: 1_000_000,
      nextDueDate: "2026-12-01",
    });
    expect(await repos.debtPayments(id).list(UID)).toEqual([]);
    expect(await repos.transactions.list(UID)).toEqual([]);
  });

  it("calcula percentual pago, prazo pela data final e evolução até a quitação", async () => {
    const { repos, service } = await setup();
    const id = await service.create(UID, {
      ...loan,
      currentBalance: 600_000,
      startDate: "2026-05-01",
    });
    const view = buildDebtView(await repos.debts.get(UID, id), [], TODAY);
    expect(view.percentPaid).toBeCloseTo(0.4);
    expect(view.status).toBe("active");
    // De dez/2026 a nov/2027: no máximo 12 parcelas; com parcela fixa de 945,60, termina antes.
    expect(view.schedule.rows.length).toBeLessThanOrEqual(12);
    expect(view.monthInterest).toBe(12_000);

    const points = debtEvolution(view, TODAY);
    expect(points[0]).toMatchObject({ month: "2026-05", value: 1_000_000, projected: false });
    expect(points.find((point) => point.month === "2026-11")).toMatchObject({
      value: 600_000,
      projected: false,
    });
    expect(points.at(-1)).toMatchObject({ value: 0, projected: true });
  });

  it("parcela menor que os juros marca a dívida como crescendo e entra no resumo", async () => {
    const { repos, service } = await setup();
    const id = await service.create(UID, {
      ...loan,
      type: "revolving_credit",
      monthlyRate: 12,
      installmentAmount: 50_000,
      installmentCount: null,
      endDate: null,
    });
    const view = buildDebtView(await repos.debts.get(UID, id), [], TODAY);
    expect(view.status).toBe("growing");
    expect(view.projectedEndDate).toBeNull();
    const summary = summarizeDebts([view]);
    expect(summary.growing).toHaveLength(1);
    expect(summary.monthInterest).toBe(120_000);
  });

  it("excluir um pagamento antigo não mexe no vencimento; o mais recente devolve o anterior", async () => {
    const { repos, service } = await setup();
    const id = await service.create(UID, loan);
    await service.registerPayment(UID, await repos.debts.get(UID, id), {
      kind: "regular",
      amount: 94_560,
      date: "2026-12-01",
    });
    await service.registerPayment(UID, await repos.debts.get(UID, id), {
      kind: "regular",
      amount: 94_560,
      date: "2027-01-01",
    });
    expect((await repos.debts.get(UID, id)).nextDueDate).toBe("2027-02-01");

    const [newest, oldest] = await repos.debtPayments(id).list(UID);
    await service.removePayment(UID, await repos.debts.get(UID, id), oldest!);
    expect((await repos.debts.get(UID, id)).nextDueDate).toBe("2027-02-01");
    await service.removePayment(UID, await repos.debts.get(UID, id), newest!);
    expect(await repos.debts.get(UID, id)).toMatchObject({
      nextDueDate: "2027-01-01",
      currentBalance: 1_000_000,
    });
  });

  it("desfazer a quitação devolve o vencimento", async () => {
    const { repos, service } = await setup();
    const id = await service.create(UID, loan);
    await service.registerPayment(UID, await repos.debts.get(UID, id), {
      kind: "prepayment",
      amount: 1_000_000,
      date: TODAY,
    });
    const [payment] = await repos.debtPayments(id).list(UID);
    await service.removePayment(UID, await repos.debts.get(UID, id), payment!);
    expect(await repos.debts.get(UID, id)).toMatchObject({
      currentBalance: 1_000_000,
      nextDueDate: "2026-12-01",
    });
  });

  it("dois pagamentos com a mesma visão desatualizada somam os dois no saldo", async () => {
    const { repos, service } = await setup();
    const id = await service.create(UID, loan);
    const stale = await repos.debts.get(UID, id);
    await service.registerPayment(UID, stale, { kind: "prepayment", amount: 100_000, date: TODAY });
    await service.registerPayment(UID, stale, { kind: "prepayment", amount: 50_000, date: TODAY });
    expect((await repos.debts.get(UID, id)).currentBalance).toBe(850_000);
  });
});
