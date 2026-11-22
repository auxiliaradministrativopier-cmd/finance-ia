import {
  dailyAllowance,
  daysUntil,
  debtCommitment,
  ifaBandFor,
  monthlySavings,
  percentChange,
  savingsRate,
} from "../data/derived";
import {
  formatCompactCurrency,
  formatDayMonth,
  formatMonthLong,
  formatMonthShort,
  formatSignedPercent,
  previousMonth,
} from "../data/format";
import { mockDashboard as data } from "../data/mock-dashboard";

describe("dados simulados coerentes", () => {
  it("economia = receitas − despesas", () => {
    expect(monthlySavings(data)).toBe(358_565);
    expect(savingsRate(data)).toBeCloseTo(0.3659, 3);
  });

  it("o último patrimônio realizado = saldo + investimentos − dívidas", () => {
    const lastActual = data.netWorth.filter((point) => !point.projected).at(-1);
    expect(lastActual?.value).toBe(
      data.balance.current + data.investments.total - data.debts.outstanding,
    );
  });

  it("o mês atual do gráfico bate com os cards", () => {
    const current = data.flow.at(-1);
    expect(current).toEqual({
      month: data.month,
      income: data.income.received,
      expense: data.expense.spent,
    });
  });

  it("o saldo previsto considera o que falta receber, a fatura do mês e o orçamento restante", () => {
    const invoiceThisMonth = data.upcomingBills
      .filter((bill) => bill.dueDate.startsWith(data.month))
      .reduce((sum, bill) => sum + bill.amount, 0);
    const expected =
      data.balance.current +
      (data.income.expected - data.income.received) -
      invoiceThisMonth -
      ((data.expense.budget ?? 0) - data.expense.spent);
    expect(data.balance.projectedEndOfMonth).toBe(expected);
  });

  it("a nota do IFA está na faixa declarada", () => {
    expect(ifaBandFor(data.ifa!.score)).toBe(data.ifa!.band);
  });
});

describe("cálculos de exibição", () => {
  it("divide o orçamento restante pelos dias que faltam (incluindo hoje)", () => {
    // 22/11: restam 9 dias; orçamento restante R$ 785,65.
    expect(dailyAllowance(data)).toBe(Math.floor(78_565 / 9));
    // Sem orçamento, usa o saldo previsto para o fim do mês.
    expect(dailyAllowance({ ...data, expense: { ...data.expense, budget: null } })).toBe(
      Math.floor(data.balance.projectedEndOfMonth / 9),
    );
  });

  it("calcula variação e comprometimento", () => {
    expect(percentChange(110, 100)).toBeCloseTo(0.1);
    expect(percentChange(5, 0)).toBeNull();
    expect(debtCommitment(data)).toBeCloseTo(112_000 / 1_040_000);
  });

  it("conta os dias até o vencimento", () => {
    expect(daysUntil("2026-11-22", "2026-11-25")).toBe(3);
    expect(daysUntil("2026-11-22", "2026-12-05")).toBe(13);
    expect(daysUntil("2026-11-22", "2026-11-20")).toBe(-2);
  });

  it("classifica as faixas do IFA nos limites", () => {
    expect(ifaBandFor(399)).toBe("critical");
    expect(ifaBandFor(400)).toBe("attention");
    expect(ifaBandFor(600)).toBe("healthy");
    expect(ifaBandFor(800)).toBe("excellent");
  });
});

describe("formatação", () => {
  it("formata meses e datas em português", () => {
    expect(formatMonthShort("2026-11")).toBe("nov");
    expect(formatMonthLong("2026-11")).toBe("novembro de 2026");
    expect(formatDayMonth("2026-12-05")).toBe("05 dez");
    expect(previousMonth("2026-01")).toBe("2025-12");
  });

  it("abrevia valores de eixo e mostra variações com sinal", () => {
    // Espaço não separável: "10" e "mil" nunca quebram de linha.
    expect(formatCompactCurrency(1_000_000)).toBe("10\u00a0mil");
    expect(formatSignedPercent(0.14)).toBe("+14%");
    expect(formatSignedPercent(-0.169)).toBe("−16,9%");
  });
});
