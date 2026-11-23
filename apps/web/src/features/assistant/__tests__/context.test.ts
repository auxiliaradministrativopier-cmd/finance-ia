import { computeHealth } from "@/features/health/compute";
import { buildAssistantContext, type AssistantSources } from "../context";
import { redactDeep } from "../redact";
import { assistantContextSchema } from "../schema";

const tx = (
  overrides: Partial<AssistantSources["transactions"][number]>,
): AssistantSources["transactions"][number] => ({
  type: "expense",
  status: "paid",
  amount: 10_000,
  date: "2026-11-05",
  month: (overrides.date ?? "2026-11-05").slice(0, 7),
  accountId: "acc-123",
  toAccountId: null,
  cardId: null,
  categoryId: "exp-mercado",
  createdAt: null,
  paidAt: null,
  description: "Mercado",
  categoryName: "Mercado",
  ...overrides,
});

const sources: AssistantSources = {
  today: "2026-11-22",
  accounts: [
    {
      id: "acc-123",
      initialBalance: 200_000,
      initialBalanceDate: "2026-09-01",
      includeInTotal: true,
    },
  ],
  transactions: [
    ...["2026-09", "2026-10", "2026-11"].map((month) =>
      tx({
        type: "income",
        amount: 800_000,
        date: `${month}-05`,
        categoryId: "inc-salario",
        categoryName: "Salário",
        description: "Salário",
      }),
    ),
    ...["2026-09", "2026-10", "2026-11"].map((month) =>
      tx({
        amount: 300_000,
        date: `${month}-08`,
        categoryId: "exp-moradia",
        categoryName: "Moradia",
        description: "Aluguel",
      }),
    ),
    tx({
      amount: 120_000,
      date: "2026-11-12",
      description: "Pix para ana@exemplo.com CPF 123.456.789-09",
    }),
    tx({
      amount: 90_000,
      date: "2026-11-28",
      status: "pending",
      description: "Conta de luz",
      categoryId: "exp-contas",
      categoryName: "Contas da casa",
    }),
  ],
  debts: [],
  provisions: [],
  investments: [],
  goals: [],
};

describe("resumo para o assistente", () => {
  const context = buildAssistantContext(sources, computeHealth(sources));

  it("respeita o contrato da rota e sobrevive ao mascaramento do servidor sem mudar", () => {
    expect(assistantContextSchema.safeParse(context).success).toBe(true);
    expect(redactDeep(context)).toEqual(context);
  });

  it("traz os números que respondem às perguntas, em reais", () => {
    expect(context.month).toMatchObject({
      month: "2026-11",
      incomeReceived: 8000,
      expensePaid: 4200,
      expenseExpected: 5100,
    });
    expect(context.spending).toMatchObject({ pendingExpense: 900, daysLeft: 9 });
    expect(context.spending.available).toBe(context.spending.projectedEndOfMonth);
    expect(context.categories[0]).toMatchObject({
      name: "Moradia",
      thisMonth: 3000,
      avg3Months: 3000,
    });
    expect(context.largestExpenses[0]).toMatchObject({ description: "Aluguel", amount: 3000 });
    expect(context.upcomingBills).toEqual([
      { title: "Conta de luz", amount: 900, dueDate: "2026-11-28" },
    ]);
    expect(context.health?.score).toBeGreaterThan(0);
  });

  it("não leva identificadores: ids, e-mails ou documentos", () => {
    const text = JSON.stringify(context);
    expect(text).not.toMatch(/acc-123|exemplo\.com|123\.456/);
    expect(text).toContain("Pix para [e-mail] CPF [CPF]");
  });

  it("separa a fatura do cartão que vence no mês e mostra nas próximas contas", () => {
    const withCard: AssistantSources = {
      ...sources,
      cards: [{ id: "visa", closingDay: 20, dueDay: 28 }],
      transactions: [
        ...sources.transactions,
        tx({
          amount: 50_000,
          date: "2026-11-10",
          accountId: null,
          cardId: "visa",
          invoiceMonth: "2026-11",
        }),
      ],
    };
    const result = buildAssistantContext(withCard, computeHealth(withCard));
    expect(result.spending.cardInvoicesDue).toBe(500);
    expect(result.spending.available).toBe(context.spending.available - 500);
    expect(result.upcomingBills).toContainEqual({
      title: "Fatura do cartão",
      amount: 500,
      dueDate: "2026-11-28",
    });
  });
});
