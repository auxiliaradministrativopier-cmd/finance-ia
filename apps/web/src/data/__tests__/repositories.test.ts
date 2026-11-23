import { DEFAULT_CATEGORIES } from "@finance-ia/shared";
import { DataError, toDataError } from "../errors";
import { createRepositories } from "../repositories";
import { createUserRepository, flattenPatch } from "../repositories/user-repository";
import { createMemoryStore } from "../store/memory-store";
import type { DataStore } from "../store/types";
import { ensureUserSetup } from "../user-setup";

const UID = "juliana";
let store: DataStore;
let repos: ReturnType<typeof createRepositories>;

beforeEach(() => {
  store = createMemoryStore();
  repos = createRepositories(async () => store);
});

const expense = {
  type: "expense" as const,
  status: "paid" as const,
  amount: 41_237,
  description: "Supermercado",
  date: "2026-11-22",
  paidAt: new Date("2026-11-22T12:00:00Z"),
  cardId: "card1",
  invoiceMonth: "2026-12",
  categoryId: "exp-mercado",
  clientRequestId: "req-12345678",
};

describe("CRUD genérico", () => {
  it("cria, lê, lista, atualiza, exclui e restaura", async () => {
    const id = await repos.categories.create(UID, {
      name: "Pets",
      type: "expense",
      icon: "paw-print",
      color: "chart-3",
    });
    const created = await repos.categories.get(UID, id);
    expect(created).toMatchObject({
      name: "Pets",
      essential: false,
      archived: false,
      deletedAt: null,
    });
    expect(created.createdAt).toBeInstanceOf(Date);

    await repos.categories.update(UID, id, { name: "Pet shop" });
    expect((await repos.categories.get(UID, id)).name).toBe("Pet shop");

    await repos.categories.remove(UID, id);
    expect(await repos.categories.list(UID)).toHaveLength(0);
    await expect(repos.categories.get(UID, id)).rejects.toMatchObject({ code: "not-found" });

    await repos.categories.restore(UID, id);
    expect(await repos.categories.list(UID)).toHaveLength(1);
  });

  it("devolve erros de validação por campo, em português", async () => {
    const error = await repos.categories
      .create(UID, { name: "", type: "expense", icon: "x", color: "#ff0000" })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DataError);
    expect((error as DataError).code).toBe("invalid");
    expect((error as DataError).fields.name).toBe("O nome é obrigatório.");
    expect((error as DataError).fields.color).toBeDefined();
  });

  it("esconde arquivados por padrão e mostra quando pedido", async () => {
    const id = await repos.categories.create(UID, {
      name: "Antiga",
      type: "expense",
      icon: "x",
      color: "chart-1",
    });
    await repos.categories.update(UID, id, { archived: true });
    expect(await repos.categories.list(UID)).toHaveLength(0);
    expect(await repos.categories.list(UID, { includeArchived: true })).toHaveLength(1);
  });

  it("acompanha a lista em tempo real", async () => {
    const seen: number[] = [];
    const stop = repos.categories.watch(
      UID,
      {},
      (items) => seen.push(items.length),
      () => {},
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await repos.categories.create(UID, { name: "A", type: "expense", icon: "x", color: "chart-1" });
    await repos.categories.create(UID, { name: "B", type: "income", icon: "x", color: "chart-2" });
    stop();
    await repos.categories.create(UID, { name: "C", type: "income", icon: "x", color: "chart-2" });
    expect(seen).toEqual([0, 1, 2]);
  });

  it("ordena conforme a entidade", async () => {
    await repos.categories.create(UID, {
      name: "Zebra",
      type: "expense",
      icon: "x",
      color: "chart-1",
      order: 0,
    });
    await repos.categories.create(UID, {
      name: "Água",
      type: "expense",
      icon: "x",
      color: "chart-1",
      order: 0,
    });
    await repos.categories.create(UID, {
      name: "Primeira",
      type: "expense",
      icon: "x",
      color: "chart-1",
      order: -0,
    });
    expect((await repos.categories.list(UID)).map((c) => c.name)).toEqual([
      "Água",
      "Primeira",
      "Zebra",
    ]);
  });
});

describe("lançamentos", () => {
  it("grava a moeda e o mês derivado da data", async () => {
    const id = await repos.transactions.create(UID, expense);
    const saved = await repos.transactions.get(UID, id);
    expect(saved).toMatchObject({ month: "2026-11", currency: "BRL", source: "manual", tags: [] });
  });

  it("recalcula o mês quando a data muda", async () => {
    const id = await repos.transactions.create(UID, expense);
    await repos.transactions.update(UID, id, { date: "2026-12-02" });
    expect((await repos.transactions.get(UID, id)).month).toBe("2026-12");
  });

  it("aplica as regras entre campos na criação", async () => {
    await expect(
      repos.transactions.create(UID, { ...expense, accountId: "acc1" }),
    ).rejects.toMatchObject({
      code: "invalid",
      fields: { accountId: "Escolha uma conta ou um cartão." },
    });
    await expect(
      repos.transactions.create(UID, {
        ...expense,
        type: "transfer",
        cardId: null,
        invoiceMonth: null,
        accountId: "a",
        toAccountId: "a",
        categoryId: null,
      }),
    ).rejects.toMatchObject({
      fields: { toAccountId: "A conta de destino precisa ser diferente." },
    });
  });

  it("valida o documento inteiro na edição (não só o campo alterado)", async () => {
    const id = await repos.transactions.create(UID, expense);
    // Tirar a fatura de uma compra no cartão deixa o lançamento inválido.
    await expect(repos.transactions.update(UID, id, { invoiceMonth: null })).rejects.toMatchObject({
      fields: { invoiceMonth: "Informe a fatura da compra." },
    });
  });
});

describe("outras entidades", () => {
  it("investimento de reserva exige liquidez diária e registra a data da avaliação", async () => {
    await expect(
      repos.investments.create(UID, {
        name: "CDB",
        assetClass: "fixed_income",
        liquidity: "at_maturity",
        isEmergencyReserve: true,
        currentValue: 100,
      }),
    ).rejects.toMatchObject({
      fields: { isEmergencyReserve: "A reserva de emergência precisa de liquidez diária." },
    });
    const id = await repos.investments.create(UID, {
      name: "CDB",
      assetClass: "fixed_income",
      liquidity: "daily",
      isEmergencyReserve: true,
      currentValue: 100,
    });
    expect((await repos.investments.get(UID, id)).lastValuationAt).toBeInstanceOf(Date);
  });

  it("cartão nunca guarda o número completo", async () => {
    await expect(
      repos.cards.create(UID, {
        name: "Visa",
        brand: "visa",
        lastFour: "4111111111111111",
        limit: 1000,
        closingDay: 3,
        dueDay: 10,
        color: "chart-4",
      }),
    ).rejects.toMatchObject({ fields: { lastFour: "Informe apenas os 4 últimos dígitos." } });
  });

  it("os dados de um usuário não aparecem para outro", async () => {
    await repos.goals.create(UID, {
      name: "Viagem",
      icon: "plane",
      color: "chart-2",
      type: "travel",
      targetAmount: 100,
    });
    expect(await repos.goals.list("outra-pessoa")).toHaveLength(0);
  });
});

describe("configuração inicial do usuário", () => {
  const user = { uid: UID, email: "juliana@exemplo.com", displayName: null };

  it("cria perfil, preferências e as 24 categorias padrão", async () => {
    const result = await ensureUserSetup(store, user, "Juliana Souza");
    expect(result).toEqual({
      createdProfile: true,
      createdPreferences: true,
      createdCategories: 24,
    });

    const profile = await createUserRepository(async () => store).getProfile(UID);
    expect(profile).toMatchObject({
      displayName: "Juliana Souza",
      email: "juliana@exemplo.com",
      onboarding: { completed: false, step: 0 },
    });
    const categories = await repos.categories.list(UID);
    expect(categories).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(categories[0]).toMatchObject({
      name: "Moradia",
      catalogId: "exp-moradia",
      essential: true,
    });
  });

  it("é idempotente e completa só o que falta", async () => {
    await ensureUserSetup(store, user, "Juliana Souza");
    expect(await ensureUserSetup(store, user)).toEqual({
      createdProfile: false,
      createdPreferences: false,
      createdCategories: 0,
    });

    // Conta antiga sem preferências: só as preferências são criadas.
    const legacy = createMemoryStore();
    await legacy.set(`users/${UID}`, { displayName: "Juliana", email: user.email });
    await legacy.set(`users/${UID}/categories/c1`, { name: "Minha", deletedAt: null });
    expect(await ensureUserSetup(legacy, user)).toEqual({
      createdProfile: false,
      createdPreferences: true,
      createdCategories: 0,
    });
  });

  it("não roda sem e-mail", async () => {
    expect(await ensureUserSetup(store, { uid: UID, email: null, displayName: null })).toEqual({
      createdProfile: false,
      createdPreferences: false,
      createdCategories: 0,
    });
  });
});

describe("preferências", () => {
  it("atualiza um campo aninhado sem apagar os outros", async () => {
    await ensureUserSetup(store, { uid: UID, email: "j@exemplo.com", displayName: "Juliana" });
    const users = createUserRepository(async () => store);
    await users.updatePreferences(UID, { notifications: { push: false }, theme: "dark" });
    const preferences = await users.getPreferences(UID);
    expect(preferences.theme).toBe("dark");
    expect(preferences.notifications).toEqual({ push: false, email: true, inApp: true, types: {} });
  });

  it("valida os valores", async () => {
    await ensureUserSetup(store, { uid: UID, email: "j@exemplo.com", displayName: "Juliana" });
    const users = createUserRepository(async () => store);
    await expect(users.updatePreferences(UID, { monthStartDay: 31 })).rejects.toMatchObject({
      fields: { monthStartDay: "Use um dia entre 1 e 28." },
    });
  });

  it("achata o patch em caminhos com ponto", () => {
    expect(flattenPatch({ theme: "dark", ai: { enabled: false } })).toEqual({
      theme: "dark",
      "ai.enabled": false,
    });
  });
});

describe("erros", () => {
  it("traduz códigos do Firestore", () => {
    expect(toDataError({ code: "permission-denied" }).message).toBe(
      "Você não tem permissão para acessar estes dados.",
    );
    expect(toDataError({ code: "unavailable" }).code).toBe("unavailable");
    expect(toDataError(new Error("x")).code).toBe("unknown");
  });
});

describe("Firestore: lista vazia do cache", () => {
  it("espera o servidor quando há internet; usa o cache quando não há", async () => {
    const { isProvisionalEmpty } = await import("../store/firestore-store");
    expect(isProvisionalEmpty(true, true, true)).toBe(true);
    expect(isProvisionalEmpty(true, false, true)).toBe(false);
    expect(isProvisionalEmpty(false, true, true)).toBe(false);
    expect(isProvisionalEmpty(true, true, false)).toBe(false);
  });
});

describe("leitura validada", () => {
  it("documento inválido fica fora da lista e não derruba a tela; get explica o problema", async () => {
    const store = createMemoryStore();
    const repos = createRepositories(async () => store);
    const id = await repos.categories.create(UID, {
      name: "Mercado",
      type: "expense",
      icon: "shopping-cart",
      color: "chart-1",
    });
    await store.set(`users/${UID}/categories/quebrado`, {
      name: "",
      type: "desconhecido",
      deletedAt: null,
      updatedAt: new Date(),
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const list = await repos.categories.list(UID);
    expect(list.map((item) => item.id)).toEqual([id]);
    await expect(repos.categories.get(UID, "quebrado")).rejects.toBeInstanceOf(DataError);
    expect(warn).toHaveBeenCalledWith("Documento inválido ignorado em categories: quebrado");
    warn.mockRestore();
  });

  it("preenche com o padrão campos que surgiram depois (migração suave)", async () => {
    const store = createMemoryStore();
    const repos = createRepositories(async () => store);
    await store.set(`users/${UID}/debts/d1/payments/antigo`, {
      kind: "regular",
      amount: 1000,
      interest: 100,
      principal: 900,
      date: "2026-11-01",
      note: null,
      transactionId: null,
      deletedAt: null,
      updatedAt: new Date(),
    });
    const [payment] = await repos.debtPayments("d1").list(UID);
    expect(payment).toMatchObject({ id: "antigo", previousDueDate: null });
  });
});
