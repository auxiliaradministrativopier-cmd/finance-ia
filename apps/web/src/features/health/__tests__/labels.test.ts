import { healthScore, type HealthEntry, type HealthInput } from "@finance-ia/finance-core";
import { explainPillar, recommendationsFor } from "../labels";

const entry = (overrides: Partial<HealthEntry>): HealthEntry => ({
  type: "expense",
  status: "paid",
  amount: 100_000,
  date: "2026-11-05",
  month: (overrides.date ?? "2026-11-05").slice(0, 7),
  accountId: "itau",
  toAccountId: null,
  cardId: null,
  categoryId: "exp-mercado",
  createdAt: null,
  paidAt: null,
  ...overrides,
});

function scoreFor(expense: number, extra: Partial<HealthInput> = {}) {
  const entries = ["2026-09", "2026-10", "2026-11"].flatMap((month) => [
    entry({ type: "income", amount: 1_000_000, date: `${month}-05`, categoryId: "inc-salario" }),
    entry({ amount: expense, date: `${month}-10` }),
  ]);
  return healthScore(
    {
      accounts: [
        { id: "itau", initialBalance: 0, initialBalanceDate: "2026-09-01", includeInTotal: true },
      ],
      entries,
      debts: [],
      investments: [],
      provisions: [],
      goals: [],
      ...extra,
    },
    "2026-11-22",
  )!;
}

describe("textos do IFA", () => {
  it("explica cada pilar com os números do usuário", () => {
    const score = scoreFor(700_000);
    const text = (id: string) => explainPillar(score.pillars.find((pillar) => pillar.id === id)!);
    expect(text("spending")).toBe(
      "Sobram 30% da renda: média de R$ 3.000,00 por mês nos últimos 3 meses.",
    );
    expect(text("reserve")).toBe(
      "O dinheiro em contas cobre 1,3 meses de despesas. O ideal são 6 meses (R$ 42.000,00).",
    );
    expect(text("debts")).toBe("Nenhuma dívida em aberto.");
    expect(text("payments")).toBe("Todas as 3 contas dos últimos 3 meses foram pagas em dia.");
  });

  it("no modo oculto, os valores somem das frases", () => {
    const score = scoreFor(700_000);
    expect(explainPillar(score.pillars[0]!, true)).toContain("R$ ••••");
  });

  it("recomenda primeiro o que mais sobe a nota", () => {
    const score = scoreFor(1_200_000);
    const items = recommendationsFor(score);
    expect(items[0]).toMatchObject({
      id: "spending",
      title: "Feche o mês no azul",
      href: "/fluxo/despesas",
    });
    expect(items.map((item) => item.gain)).toEqual(
      [...items.map((item) => item.gain)].sort((a, b) => b - a),
    );
    expect(items.length).toBeLessThanOrEqual(4);
    expect(items.some((item) => item.id === "debts")).toBe(false);
  });
});
