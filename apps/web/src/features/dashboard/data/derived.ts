import type { Cents } from "@finance-ia/shared";
import type { DashboardData } from "./types";

/** Cálculos de exibição do Dashboard. Regras financeiras de verdade ficarão no finance-core. */
export function monthlySavings(data: DashboardData): Cents {
  return data.income.received - data.expense.spent;
}

/** Taxa de poupança do mês (0–1). */
export function savingsRate(data: DashboardData): number {
  return data.income.received > 0 ? monthlySavings(data) / data.income.received : 0;
}

/** Variação percentual entre dois valores; null quando a base é zero. */
export function percentChange(current: number, previous: number): number | null {
  return previous === 0 ? null : (current - previous) / previous;
}

/**
 * Quanto ainda dá para gastar por dia até o fim do mês: pelo orçamento, quando existe;
 * senão, pelo saldo previsto para o fim do mês (depois das contas já lançadas).
 */
export function dailyAllowance(data: DashboardData): Cents {
  const [year, month, day] = data.today.split("-").map(Number) as [number, number, number];
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = Math.max(daysInMonth - day + 1, 1);
  const remaining =
    data.expense.budget !== null
      ? Math.max(data.expense.budget - data.expense.spent, 0)
      : Math.max(data.balance.projectedEndOfMonth, 0);
  return Math.floor(remaining / daysLeft);
}

/** Parte da renda comprometida com parcelas de dívidas (0–1). */
export function debtCommitment(data: DashboardData): number {
  return data.income.expected > 0 ? data.debts.monthlyPayment / data.income.expected : 0;
}

export function daysUntil(today: string, date: string): number {
  const toUtc = (value: string) => {
    const [y, m, d] = value.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000);
}
