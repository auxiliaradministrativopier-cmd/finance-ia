import { describe, expect, it } from "vitest";
import {
  accountBalances,
  addMonths,
  balanceSeries,
  installmentSchedule,
  invoiceFor,
  monthlyFlow,
  monthRange,
  occurrenceId,
  occurrencesBetween,
  splitInstallments,
  summarizeMonth,
  todayIn,
  type LedgerEntry,
} from "../index";

const entry = (overrides: Partial<LedgerEntry>): LedgerEntry => ({
  type: "expense",
  status: "paid",
  amount: 1000,
  date: "2026-11-10",
  month: "2026-11",
  accountId: "acc",
  toAccountId: null,
  cardId: null,
  categoryId: "cat",
  ...overrides,
});

describe("datas", () => {
  it("soma meses ajustando meses curtos", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15");
  });

  it("gera intervalos de meses", () => {
    expect(monthRange("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("calcula hoje no fuso de São Paulo", () => {
    // 02:30 UTC de 23/11 ainda é 22/11 em São Paulo.
    expect(todayIn("America/Sao_Paulo", new Date("2026-11-23T02:30:00Z"))).toBe("2026-11-22");
  });
});

describe("parcelas", () => {
  it("põe a sobra dos centavos na primeira parcela", () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitInstallments(240000, 3)).toEqual([80000, 80000, 80000]);
    for (const [total, count] of [
      [99999, 7],
      [1, 1],
      [123457, 72],
    ] as const) {
      expect(splitInstallments(total, count).reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it("recusa valores inválidos", () => {
    expect(() => splitInstallments(0, 3)).toThrow(RangeError);
    expect(() => splitInstallments(10.5, 2)).toThrow(RangeError);
    expect(() => splitInstallments(1000, 73)).toThrow(RangeError);
  });

  it("no cartão, cada parcela cai na fatura seguinte", () => {
    const schedule = installmentSchedule({
      totalCents: 240000,
      count: 3,
      firstDate: "2026-11-22",
      card: { closingDay: 3, dueDay: 10 },
    });
    expect(schedule.map((item) => item.invoiceMonth)).toEqual(["2026-12", "2027-01", "2027-02"]);
    expect(schedule.map((item) => item.date)).toEqual(["2026-11-22", "2026-12-22", "2027-01-22"]);
  });

  it("fora do cartão, uma por mês mantendo o dia", () => {
    const schedule = installmentSchedule({ totalCents: 10000, count: 3, firstDate: "2026-01-31" });
    expect(schedule.map((item) => item.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(schedule.every((item) => item.invoiceMonth === null)).toBe(true);
  });
});

describe("faturas", () => {
  const card = { closingDay: 3, dueDay: 10 };

  it("compra antes do fechamento entra na fatura deste mês", () => {
    expect(invoiceFor("2026-11-02", card)).toEqual({
      invoiceMonth: "2026-11",
      closingDate: "2026-11-03",
      dueDate: "2026-11-10",
    });
  });

  it("compra no dia do fechamento ou depois vai para a próxima", () => {
    expect(invoiceFor("2026-11-03", card).invoiceMonth).toBe("2026-12");
    expect(invoiceFor("2026-11-22", card)).toEqual({
      invoiceMonth: "2026-12",
      closingDate: "2026-12-03",
      dueDate: "2026-12-10",
    });
  });

  it("vencimento antes do fechamento cai no mês seguinte", () => {
    expect(invoiceFor("2026-11-10", { closingDay: 25, dueDay: 5 })).toEqual({
      invoiceMonth: "2026-11",
      closingDate: "2026-11-25",
      dueDate: "2026-12-05",
    });
  });

  it("fechamento no dia 31 em mês curto usa o último dia", () => {
    expect(invoiceFor("2026-02-27", { closingDay: 31, dueDay: 10 })).toMatchObject({
      invoiceMonth: "2026-02",
      closingDate: "2026-02-28",
    });
    expect(invoiceFor("2026-02-28", { closingDay: 31, dueDay: 10 }).invoiceMonth).toBe("2026-03");
  });
});

describe("recorrência", () => {
  it("mensal mantém o dia, ajustando meses curtos", () => {
    expect(
      occurrencesBetween(
        { startDate: "2026-01-31", frequency: "monthly", endDate: null },
        "2026-01-01",
        "2026-04-30",
      ),
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("respeita o intervalo e a data final", () => {
    const rule = { startDate: "2026-01-05", frequency: "monthly" as const, endDate: "2026-06-05" };
    expect(occurrencesBetween(rule, "2026-04-01", "2026-12-31")).toEqual([
      "2026-04-05",
      "2026-05-05",
      "2026-06-05",
    ]);
  });

  it("semanal e anual", () => {
    expect(
      occurrencesBetween(
        { startDate: "2026-11-02", frequency: "weekly", endDate: null },
        "2026-11-01",
        "2026-11-30",
      ),
    ).toHaveLength(5);
    expect(
      occurrencesBetween(
        { startDate: "2024-02-29", frequency: "yearly", endDate: null },
        "2024-01-01",
        "2026-12-31",
      ),
    ).toEqual(["2024-02-29", "2025-02-28", "2026-02-28"]);
  });

  it("gera ids determinísticos", () => {
    expect(occurrenceId("rec1", "2026-12-05")).toBe("rec1_20261205");
  });
});

describe("resumo mensal", () => {
  const entries = [
    entry({ type: "income", amount: 980000, categoryId: "salario" }),
    entry({ type: "income", status: "pending", amount: 60000, categoryId: "freela" }),
    entry({ amount: 41237, categoryId: "mercado" }),
    entry({
      amount: 20000,
      status: "pending",
      categoryId: "mercado",
      cardId: "c1",
      accountId: null,
    }),
    entry({ amount: 230000, categoryId: "moradia" }),
    entry({ type: "transfer", amount: 50000, categoryId: null, toAccountId: "acc2" }),
    entry({ month: "2026-10", amount: 999 }),
  ];

  it("separa efetivado e previsto e ignora transferências e outros meses", () => {
    const summary = summarizeMonth(entries, "2026-11");
    expect(summary.income).toEqual({ paid: 980000, pending: 60000 });
    expect(summary.expense).toEqual({ paid: 271237, pending: 20000 });
    expect(summary.balance).toBe(980000 - 271237);
    expect(summary.projectedBalance).toBe(1040000 - 291237);
    expect(summary.count).toBe(5);
  });

  it("agrupa despesas por categoria, maior primeiro", () => {
    expect(summarizeMonth(entries, "2026-11").expenseByCategory).toEqual([
      { categoryId: "moradia", amount: 230000 },
      { categoryId: "mercado", amount: 61237 },
    ]);
  });

  it("monta a série mensal", () => {
    expect(monthlyFlow(entries, ["2026-10", "2026-11"])).toEqual([
      { month: "2026-10", income: 0, expense: 999 },
      { month: "2026-11", income: 1040000, expense: 291237 },
    ]);
  });
});

describe("saldos", () => {
  const accounts = [
    { id: "acc", initialBalance: 100000, initialBalanceDate: "2026-11-01", includeInTotal: true },
    { id: "acc2", initialBalance: 0, initialBalanceDate: "2026-11-01", includeInTotal: false },
  ];
  const entries = [
    entry({ type: "income", amount: 500000, date: "2026-11-05" }),
    entry({ amount: 20000, date: "2026-11-06" }),
    entry({ amount: 15000, date: "2026-11-07", cardId: "c1", accountId: null }),
    entry({
      type: "transfer",
      amount: 30000,
      date: "2026-11-08",
      toAccountId: "acc2",
      categoryId: null,
    }),
    entry({ amount: 99999, date: "2026-11-28", status: "pending" }),
    entry({ amount: 70000, date: "2026-10-30" }),
  ];

  it("soma só o que foi efetivado desde o saldo inicial; cartão não mexe na conta", () => {
    const balances = accountBalances(accounts, entries, "2026-11-22");
    expect(balances.get("acc")).toBe(100000 + 500000 - 20000 - 30000);
    expect(balances.get("acc2")).toBe(30000);
  });

  it("antes do saldo inicial a conta não conta", () => {
    expect(accountBalances(accounts, entries, "2026-10-31").get("acc")).toBe(0);
  });

  it("projeta com os previstos", () => {
    expect(
      accountBalances(accounts, entries, "2026-11-30", { includePending: true }).get("acc"),
    ).toBe(550000 - 99999);
  });

  it("série: mês atual hoje, futuros com projeção, só contas no total", () => {
    const series = balanceSeries(accounts, entries, ["2026-11", "2026-12"], "2026-11-22");
    expect(series).toEqual([
      { month: "2026-11", value: 550000, projected: false },
      { month: "2026-12", value: 550000 - 99999, projected: true },
    ]);
  });
});
