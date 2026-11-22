import { describe, expect, it } from "vitest";
import {
  healthHistory,
  healthScore,
  ifaBand,
  piecewise,
  type HealthEntry,
  type HealthInput,
} from "../health";

const TODAY = "2026-11-22";

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

/** Três meses com salário de R$ 10.000 e despesas de `expense`. */
function months(expense: number): HealthEntry[] {
  return ["2026-09", "2026-10", "2026-11"].flatMap((month) => [
    entry({ type: "income", amount: 1_000_000, date: `${month}-05`, categoryId: "inc-salario" }),
    entry({ amount: expense, date: `${month}-10` }),
  ]);
}

function input(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    accounts: [
      { id: "itau", initialBalance: 0, initialBalanceDate: "2026-09-01", includeInTotal: true },
    ],
    entries: months(700_000),
    debts: [],
    investments: [],
    provisions: [],
    goals: [],
    ...overrides,
  };
}

const pillar = (score: ReturnType<typeof healthScore>, id: string) =>
  score!.pillars.find((item) => item.id === id)!;

describe("IFA", () => {
  it("faixas do Design System", () => {
    expect([0, 399, 400, 599, 600, 799, 800, 1000].map(ifaBand)).toEqual([
      "critical",
      "critical",
      "attention",
      "attention",
      "healthy",
      "healthy",
      "excellent",
      "excellent",
    ]);
  });

  it("interpola entre os pontos e satura nas pontas", () => {
    const points: [number, number][] = [
      [0, 0],
      [10, 1],
    ];
    expect(piecewise(-5, points)).toBe(0);
    expect(piecewise(5, points)).toBe(0.5);
    expect(piecewise(50, points)).toBe(1);
  });

  it("sem receita e despesa registradas, não há nota", () => {
    expect(healthScore(input({ entries: [] }), TODAY)).toBeNull();
    expect(healthScore(input({ entries: [entry({})] }), TODAY)).toBeNull();
  });

  it("guardar 30% da renda dá nota máxima em controle de gastos e forma reserva", () => {
    const score = healthScore(input(), TODAY)!;
    expect(pillar(score, "spending")).toMatchObject({
      score: 1,
      points: 250,
      facts: { savingsRate: 0.3 },
    });
    // 3 × R$ 3.000 guardados = R$ 9.000 ≈ 1,29 mês de despesa.
    expect(pillar(score, "reserve").facts.reserveMonths).toBeCloseTo(1.29, 2);
    expect(pillar(score, "debts").score).toBe(1);
    expect(pillar(score, "payments").score).toBe(1);
    expect(score.score).toBeGreaterThan(0);
    expect(score.score).toBeLessThanOrEqual(1000);
  });

  it("gastar mais do que ganha derruba o controle de gastos", () => {
    const score = healthScore(input({ entries: months(1_200_000) }), TODAY)!;
    expect(pillar(score, "spending").score).toBe(0);
    // Sem reserva, o déficit limita a nota à faixa crítica mesmo sem dívidas.
    expect(score.cap).toBe("deficit_without_reserve");
    expect(score.score).toBeLessThanOrEqual(399);
    expect(score.band).toBe("critical");
  });

  it("seis meses de reserva completam o pilar e o excedente conta como investimento", () => {
    const rich = input({
      accounts: [
        {
          id: "itau",
          initialBalance: 8_400_000,
          initialBalanceDate: "2026-09-01",
          includeInTotal: true,
        },
      ],
    });
    const score = healthScore(rich, TODAY)!;
    expect(pillar(score, "reserve").score).toBe(1);
    expect(pillar(score, "investments").facts.invested).toBeGreaterThan(0);
  });

  it("dívida cuja parcela não cobre os juros limita o pilar de dívidas", () => {
    const debt = {
      type: "revolving_credit",
      startDate: "2026-10-01",
      originalAmount: 500_000,
      currentBalance: 500_000,
      monthlyRate: 14,
      amortization: "price" as const,
      payment: 50_000,
      nextDueDate: "2026-12-10",
      trackedSince: "2026-10",
      payments: [],
    };
    const score = healthScore(input({ debts: [debt] }), TODAY)!;
    expect(pillar(score, "debts")).toMatchObject({
      score: 0.15,
      facts: { growingCount: 1, expensiveCount: 1 },
    });
  });

  it("parcelas leves de uma dívida barata quase não pesam", () => {
    const debt = {
      type: "vehicle_financing",
      startDate: "2026-01-01",
      originalAmount: 3_000_000,
      currentBalance: 2_500_000,
      monthlyRate: 1.2,
      amortization: "price" as const,
      payment: 80_000,
      nextDueDate: "2026-12-10",
      trackedSince: "2026-11",
      payments: [],
    };
    const debts = pillar(healthScore(input({ debts: [debt] }), TODAY), "debts");
    expect(debts.facts.commitment).toBe(0.08);
    expect(debts.score).toBeGreaterThan(0.95);
  });

  it("conta atrasada e conta paga com atraso pesam em pagamentos", () => {
    const entries = [
      ...months(600_000),
      entry({
        amount: 20_000,
        date: "2026-11-15",
        status: "pending",
        createdAt: "2026-11-01",
        categoryId: "exp-contas",
      }),
      entry({
        amount: 20_000,
        date: "2026-10-15",
        createdAt: "2026-10-01",
        paidAt: "2026-10-28",
        categoryId: "exp-contas",
      }),
    ];
    const payments = pillar(healthScore(input({ entries }), TODAY), "payments");
    expect(payments.facts).toMatchObject({ overdue: 1, late: 1, bills: 5 });
    expect(payments.score).toBeLessThanOrEqual(0.6);
  });

  it("sem contas a pagar nem dívidas, pagamentos fica fora e a nota é reescalada", () => {
    const entries = months(700_000).map((item) =>
      item.type === "expense" ? { ...item, cardId: "visa", accountId: null } : item,
    );
    const score = healthScore(input({ entries }), TODAY)!;
    expect(pillar(score, "payments").measured).toBe(false);
    const measured = score.pillars.filter((item) => item.measured);
    const expected = Math.round(
      (measured.reduce((sum, item) => sum + item.score * item.maxPoints, 0) / 850) * 1000,
    );
    expect(score.score).toBe(expected);
  });

  it("provisionamento atrasado reduz o cumprimento de metas", () => {
    const provision = {
      targetAmount: 1_200_000,
      dueDate: "2027-09-01",
      startDate: "2026-09-01",
      contributions: [{ date: "2026-09-02", kind: "deposit" as const, amount: 100_000 }],
    };
    const onTrack = {
      ...provision,
      contributions: [{ date: "2026-09-02", kind: "deposit" as const, amount: 300_000 }],
    };
    const none = pillar(healthScore(input(), TODAY), "goals");
    const behind = pillar(healthScore(input({ provisions: [provision] }), TODAY), "goals");
    const good = pillar(healthScore(input({ provisions: [onTrack] }), TODAY), "goals");
    expect(none.score).toBe(0.3);
    expect(behind.score).toBeLessThan(0.8);
    expect(good.score).toBe(1);
  });

  it("evolução: um ponto por mês com dados, meses passados no último dia", () => {
    const history = healthHistory(input(), TODAY);
    expect(history.map((item) => [item.month, item.asOf])).toEqual([
      ["2026-09", "2026-09-30"],
      ["2026-10", "2026-10-31"],
      ["2026-11", TODAY],
    ]);
    // A reserva cresce mês a mês.
    expect(history.map((item) => pillar(item, "reserve").facts.reserveMonths)).toEqual([
      0.43, 0.86, 1.29,
    ]);
  });

  it("lançamentos registrados depois contam como pagos em dia nos meses passados", () => {
    const entries = months(700_000).map((item) => ({ ...item, createdAt: TODAY, paidAt: TODAY }));
    const october = healthHistory(input({ entries }), TODAY).find(
      (item) => item.month === "2026-10",
    )!;
    expect(pillar(october, "payments")).toMatchObject({
      measured: true,
      score: 1,
      facts: { overdue: 0 },
    });
  });
});
