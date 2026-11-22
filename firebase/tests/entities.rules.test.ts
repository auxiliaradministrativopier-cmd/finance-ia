import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;
const UID = "juliana";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-finance-ia",
    firestore: { rules: readFileSync(resolve(__dirname, "../firestore.rules"), "utf8") },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

const owner = () => env.authenticatedContext(UID, { email: "juliana@exemplo.com" }).firestore();
const intruder = () =>
  env.authenticatedContext("intruso", { email: "intruso@exemplo.com" }).firestore();
const stamps = () => ({
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  deletedAt: null,
  schemaVersion: 1,
});

interface EntityCase {
  collection: string;
  valid: DocumentData;
  /** Variações inválidas, cada uma deve ser recusada. */
  invalid: Record<string, DocumentData>;
  /** Uma alteração válida. */
  update: DocumentData;
  /** Um campo calculado pelo servidor (se houver). */
  serverField?: [string, unknown];
}

const cases: EntityCase[] = [
  {
    collection: "categories",
    valid: {
      name: "Mercado",
      type: "expense",
      icon: "shopping-cart",
      color: "chart-3",
      parentId: null,
      catalogId: "exp-mercado",
      essential: true,
      archived: false,
      order: 1,
    },
    invalid: {
      "nome vazio": { name: "" },
      "tipo desconhecido": { type: "transfer" },
      "cor fora do Design System": { color: "#ff0000" },
    },
    update: { name: "Supermercado", archived: true },
  },
  {
    collection: "accounts",
    valid: {
      name: "Itaú",
      type: "checking",
      institutionName: "Itaú",
      color: "chart-2",
      icon: "landmark",
      initialBalance: -15000,
      initialBalanceDate: "2026-11-01",
      overdraftLimit: 100000,
      includeInTotal: true,
      archived: false,
      order: 0,
    },
    invalid: {
      "saldo em reais (float)": { initialBalance: 150.5 },
      "data inválida": { initialBalanceDate: "01/11/2026" },
      "tipo desconhecido": { type: "crypto" },
    },
    update: { name: "Itaú Personnalité" },
    serverField: ["currentBalance", 999_999],
  },
  {
    collection: "cards",
    valid: {
      name: "Visa",
      institutionName: "Nubank",
      brand: "visa",
      lastFour: "1234",
      limit: 500000,
      closingDay: 3,
      dueDay: 10,
      paymentAccountId: "acc1",
      color: "chart-4",
      archived: false,
    },
    invalid: {
      "número completo do cartão": { lastFour: "4111111111111111" },
      "limite zero": { limit: 0 },
      "dia de fechamento 32": { closingDay: 32 },
    },
    update: { limit: 600000 },
    serverField: ["availableLimit", 1],
  },
  {
    collection: "transactions",
    valid: {
      type: "expense",
      status: "paid",
      amount: 41237,
      currency: "BRL",
      description: "Supermercado",
      date: "2026-11-22",
      month: "2026-11",
      paidAt: new Date(),
      accountId: null,
      cardId: "card1",
      invoiceMonth: "2026-12",
      toAccountId: null,
      categoryId: "exp-mercado",
      categoryName: "Mercado",
      categoryIcon: "shopping-cart",
      categoryColor: "chart-3",
      installmentPlanId: null,
      installmentNumber: null,
      installmentTotal: null,
      recurrenceId: null,
      linkedEntity: null,
      tags: [],
      notes: null,
      attachments: [],
      source: "manual",
      clientRequestId: "req-12345678",
    },
    invalid: {
      "valor zero": { amount: 0 },
      "despesa com conta e cartão": { accountId: "acc1" },
      "despesa sem conta nem cartão": { cardId: null, invoiceMonth: null },
      "compra no cartão sem fatura": { invoiceMonth: null },
      "pago sem data de pagamento": { paidAt: null },
      "sem categoria": { categoryId: null },
      "moeda diferente": { currency: "USD" },
      "transferência para a mesma conta": {
        type: "transfer",
        accountId: "acc1",
        toAccountId: "acc1",
        cardId: null,
        invoiceMonth: null,
        categoryId: null,
      },
    },
    update: { description: "Pão de Açúcar", status: "pending", paidAt: null },
    serverField: ["ai", { categorized: true }],
  },
  {
    collection: "goals",
    valid: {
      name: "Viagem",
      icon: "plane",
      color: "chart-2",
      type: "travel",
      targetAmount: 1000000,
      targetDate: "2027-07-01",
      priority: 2,
      linkedInvestmentIds: [],
      status: "active",
    },
    invalid: {
      "meta criada como atingida": { status: "achieved" },
      "prioridade 9": { priority: 9 },
      "valor negativo": { targetAmount: -1 },
    },
    update: { status: "paused" },
    serverField: ["currentAmount", 1000000],
  },
  {
    collection: "provisions",
    valid: {
      name: "IPVA 2027",
      kind: "ipva",
      targetAmount: 252000,
      dueDate: "2027-01-15",
      repeatsYearly: true,
      reserveAccountId: null,
      aiSuggested: false,
    },
    invalid: { "tipo desconhecido": { kind: "viagem" }, "sem vencimento": { dueDate: null } },
    update: { targetAmount: 260000 },
    serverField: ["accumulatedAmount", 252000],
  },
  {
    collection: "debts",
    valid: {
      name: "Empréstimo",
      creditor: "Itaú",
      type: "personal_loan",
      originalAmount: 2000000,
      currentBalance: 1264000,
      monthlyRate: 2.1,
      cetYearly: 31.5,
      amortization: "price",
      installmentAmount: 112000,
      installmentCount: 24,
      startDate: "2026-01-15",
      nextDueDate: "2026-12-15",
      endDate: "2027-12-15",
      linkedAssetId: null,
    },
    invalid: {
      "juros de 45% ao mês": { monthlyRate: 45 },
      "amortização desconhecida": { amortization: "bullet" },
      "data final antes do início": { endDate: "2025-01-01" },
    },
    update: { currentBalance: 1152000 },
    serverField: ["payoffPriority", 1],
  },
  {
    collection: "investments",
    valid: {
      name: "CDB Liquidez",
      assetClass: "fixed_income",
      product: "CDB",
      institutionName: "Nubank",
      ticker: null,
      indexer: "cdi",
      rate: 100,
      liquidity: "daily",
      maturityDate: null,
      isEmergencyReserve: true,
      goalId: null,
      quantity: null,
      currentValue: 1260000,
      lastValuationAt: new Date(),
      status: "active",
    },
    invalid: {
      "reserva sem liquidez diária": { liquidity: "at_maturity" },
      "ticker em minúsculas": { ticker: "petr4" },
    },
    update: { currentValue: 1290000, lastValuationAt: new Date() },
    serverField: ["investedAmount", 1],
  },
  {
    collection: "assets",
    valid: {
      name: "Carro",
      type: "vehicle",
      purchaseValue: 6200000,
      purchaseDate: "2024-03-10",
      currentValue: 5400000,
      yearlyDepreciation: 10,
      linkedDebtId: null,
    },
    invalid: {
      "depreciação acima de 100%": { yearlyDepreciation: 150 },
      "tipo desconhecido": { type: "boat" },
    },
    update: { currentValue: 5200000 },
  },
  {
    collection: "installmentPlans",
    valid: {
      description: "TV 55 polegadas",
      totalAmount: 240000,
      installmentCount: 3,
      installmentAmount: 80000,
      firstInstallmentAmount: 80000,
      firstDate: "2026-11-22",
      cardId: "card1",
      accountId: null,
      categoryId: "exp-compras",
      hasInterest: false,
      monthlyRate: null,
      status: "active",
    },
    invalid: {
      "parcelas não somam o total": { firstInstallmentAmount: 70000 },
      "à vista (1 parcela)": {
        installmentCount: 1,
        installmentAmount: 240000,
        firstInstallmentAmount: 240000,
      },
      "conta e cartão ao mesmo tempo": { accountId: "acc1" },
    },
    update: { status: "canceled" },
    serverField: ["paidCount", 1],
  },
  {
    collection: "recurrences",
    valid: {
      type: "income",
      description: "Salário",
      amount: 720000,
      categoryId: "inc-salario",
      accountId: "acc1",
      cardId: null,
      frequency: "monthly",
      startDate: "2026-11-05",
      endDate: null,
      autoConfirm: false,
      active: true,
      generatedUntil: "2027-02-05",
    },
    invalid: {
      "receita no cartão": { cardId: "card1", accountId: null },
      "frequência diária": { frequency: "daily" },
      "fim antes do início": { endDate: "2026-01-01" },
    },
    update: { amount: 760000, generatedUntil: "2027-03-05" },
  },
];

describe.each(cases)("$collection", (entity) => {
  const path = (db = owner()) => doc(db, "users", UID, entity.collection, "e1");
  const seed = () => assertSucceeds(setDoc(path(), { ...entity.valid, ...stamps() }));

  it("o dono cria um documento válido", async () => {
    await seed();
  });

  it("outro usuário não lê, não cria e não altera", async () => {
    await seed();
    await assertFails(getDoc(path(intruder())));
    await assertFails(
      setDoc(doc(intruder(), "users", UID, entity.collection, "e2"), {
        ...entity.valid,
        ...stamps(),
      }),
    );
    await assertFails(
      updateDoc(path(intruder()), { ...entity.update, updatedAt: serverTimestamp() }),
    );
  });

  it("visitantes sem login não acessam", async () => {
    await seed();
    await assertFails(getDoc(path(env.unauthenticatedContext().firestore())));
  });

  it.each(Object.entries(entity.invalid))("recusa: %s", async (_label, change) => {
    await assertFails(setDoc(path(), { ...entity.valid, ...change, ...stamps() }));
  });

  it("recusa campos desconhecidos", async () => {
    await assertFails(setDoc(path(), { ...entity.valid, hackeado: true, ...stamps() }));
  });

  if (entity.serverField) {
    const [field, value] = entity.serverField;
    it(`não deixa o app escrever o campo do servidor "${field}"`, async () => {
      await assertFails(setDoc(path(), { ...entity.valid, [field]: value, ...stamps() }));
      // Documento já com o campo calculado: o app edita o resto, mas não o campo.
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "users", UID, entity.collection, "e1"), {
          ...entity.valid,
          [field]: value,
          ...stamps(),
        });
      });
      await assertSucceeds(updateDoc(path(), { ...entity.update, updatedAt: serverTimestamp() }));
      const tampered = typeof value === "number" ? value + 1 : { adulterado: true };
      await assertFails(updateDoc(path(), { [field]: tampered, updatedAt: serverTimestamp() }));
    });
  }

  it("o dono edita, exclui (lógico) e restaura", async () => {
    await seed();
    await assertSucceeds(updateDoc(path(), { ...entity.update, updatedAt: serverTimestamp() }));
    await assertSucceeds(
      updateDoc(path(), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(updateDoc(path(), { deletedAt: null, updatedAt: serverTimestamp() }));
  });

  it("exige o carimbo de data do servidor e protege a data de criação", async () => {
    await seed();
    await assertFails(updateDoc(path(), { ...entity.update }));
    await assertFails(
      updateDoc(path(), {
        ...entity.update,
        createdAt: new Date(2020, 0, 1),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("não permite exclusão física", async () => {
    await seed();
    await assertFails(deleteDoc(path()));
  });
});

describe("provisions/{id}/contributions", () => {
  const contribution = () => ({
    kind: "deposit",
    amount: 50000,
    date: "2026-11-22",
    note: null,
    transactionId: null,
    ...stamps(),
  });
  const path = (db = owner()) => doc(db, "users", UID, "provisions", "p1", "contributions", "c1");

  it("o dono guarda e usa o dinheiro reservado", async () => {
    await assertSucceeds(setDoc(path(), contribution()));
    await assertSucceeds(
      setDoc(doc(owner(), "users", UID, "provisions", "p1", "contributions", "c2"), {
        ...contribution(),
        kind: "withdrawal",
      }),
    );
    await assertSucceeds(
      updateDoc(path(), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });

  it("outro usuário não lê nem cria aportes", async () => {
    await assertSucceeds(setDoc(path(), contribution()));
    await assertFails(getDoc(path(intruder())));
    await assertFails(
      setDoc(
        doc(intruder(), "users", UID, "provisions", "p1", "contributions", "c9"),
        contribution(),
      ),
    );
  });

  it("recusa valor zero, tipo desconhecido e exclusão física", async () => {
    await assertFails(setDoc(path(), { ...contribution(), amount: 0 }));
    await assertFails(setDoc(path(), { ...contribution(), kind: "juros" }));
    await assertSucceeds(setDoc(path(), contribution()));
    await assertFails(deleteDoc(path()));
  });
});

describe("debts/{id}/payments", () => {
  const payment = () => ({
    kind: "regular",
    amount: 112000,
    interest: 26544,
    principal: 85456,
    date: "2026-11-15",
    note: null,
    transactionId: null,
    ...stamps(),
  });
  const path = (db = owner()) => doc(db, "users", UID, "debts", "d1", "payments", "pg1");

  it("o dono registra e desfaz (exclusão lógica)", async () => {
    await assertSucceeds(setDoc(path(), payment()));
    await assertSucceeds(
      updateDoc(path(), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });

  it("outro usuário não lê nem registra pagamentos", async () => {
    await assertSucceeds(setDoc(path(), payment()));
    await assertFails(getDoc(path(intruder())));
    await assertFails(
      setDoc(doc(intruder(), "users", UID, "debts", "d1", "payments", "pg9"), payment()),
    );
  });

  it("juros e principal não podem passar do valor pago; tipo validado", async () => {
    await assertFails(setDoc(path(), { ...payment(), principal: 112000 }));
    await assertFails(setDoc(path(), { ...payment(), kind: "estorno" }));
  });
});
