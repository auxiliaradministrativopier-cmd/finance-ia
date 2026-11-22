import type { MonthString } from "./dates";

/** O mínimo de um lançamento que os cálculos precisam. */
export interface LedgerEntry {
  type: "income" | "expense" | "transfer";
  status: "paid" | "pending" | "scheduled";
  amount: number;
  date: string;
  month: string;
  accountId: string | null;
  toAccountId: string | null;
  cardId: string | null;
  categoryId: string | null;
}

export interface MonthSummary {
  month: MonthString;
  income: { paid: number; pending: number };
  expense: { paid: number; pending: number };
  /** Receitas − despesas efetivadas. */
  balance: number;
  /** Receitas − despesas, incluindo previstas. */
  projectedBalance: number;
  /** Despesas por categoria (pagas e previstas), maior primeiro. */
  expenseByCategory: { categoryId: string; amount: number }[];
  count: number;
}

const isDone = (entry: LedgerEntry) => entry.status === "paid";

/** Resumo de um mês por competência (transferências não entram em receitas e despesas). */
export function summarizeMonth(entries: LedgerEntry[], month: MonthString): MonthSummary {
  const summary: MonthSummary = {
    month,
    income: { paid: 0, pending: 0 },
    expense: { paid: 0, pending: 0 },
    balance: 0,
    projectedBalance: 0,
    expenseByCategory: [],
    count: 0,
  };
  const byCategory = new Map<string, number>();
  for (const entry of entries) {
    if (entry.month !== month || entry.type === "transfer") continue;
    summary.count += 1;
    const bucket = entry.type === "income" ? summary.income : summary.expense;
    if (isDone(entry)) bucket.paid += entry.amount;
    else bucket.pending += entry.amount;
    if (entry.type === "expense" && entry.categoryId) {
      byCategory.set(entry.categoryId, (byCategory.get(entry.categoryId) ?? 0) + entry.amount);
    }
  }
  summary.balance = summary.income.paid - summary.expense.paid;
  summary.projectedBalance =
    summary.income.paid + summary.income.pending - summary.expense.paid - summary.expense.pending;
  summary.expenseByCategory = [...byCategory.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
  return summary;
}

/** Receitas e despesas (efetivadas + previstas) de cada mês, para o gráfico. */
export function monthlyFlow(
  entries: LedgerEntry[],
  months: MonthString[],
): { month: MonthString; income: number; expense: number }[] {
  return months.map((month) => {
    const summary = summarizeMonth(entries, month);
    return {
      month,
      income: summary.income.paid + summary.income.pending,
      expense: summary.expense.paid + summary.expense.pending,
    };
  });
}
