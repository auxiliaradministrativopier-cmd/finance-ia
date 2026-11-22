import type { Transaction } from "./types";

export type StatusFilter = "all" | "paid" | "pending";
export type TypeFilter = "all" | "income" | "expense";

export interface CashFlowFilters {
  month: string;
  type: TypeFilter;
  status: StatusFilter;
  /** "account:<id>" ou "card:<id>" ou "" (todas). */
  source: string;
  categoryId: string;
  search: string;
}

/** Texto sem acentos e em minúsculas, para a busca. */
export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Aplica os filtros do Fluxo de Caixa. A busca olha descrição, categoria e observações. */
export function applyFilters(transactions: Transaction[], filters: CashFlowFilters): Transaction[] {
  const terms = normalizeText(filters.search).split(/\s+/).filter(Boolean);
  const [sourceKind, sourceId] = filters.source.split(":");
  return transactions.filter((transaction) => {
    if (transaction.type === "transfer") return false;
    if (transaction.month !== filters.month) return false;
    if (filters.type !== "all" && transaction.type !== filters.type) return false;
    if (filters.status === "paid" && transaction.status !== "paid") return false;
    if (filters.status === "pending" && transaction.status === "paid") return false;
    if (sourceKind === "account" && transaction.accountId !== sourceId) return false;
    if (sourceKind === "card" && transaction.cardId !== sourceId) return false;
    if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
    if (terms.length > 0) {
      const haystack = normalizeText(
        [transaction.description, transaction.categoryName ?? "", transaction.notes ?? ""].join(
          " ",
        ),
      );
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}

/** Agrupa por dia (mais recente primeiro), com o total líquido de cada dia. */
export function groupByDay(
  transactions: Transaction[],
): { date: string; total: number; items: Transaction[] }[] {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of [...transactions].sort((a, b) => b.date.localeCompare(a.date))) {
    groups.set(transaction.date, [...(groups.get(transaction.date) ?? []), transaction]);
  }
  return [...groups.entries()].map(([date, items]) => ({
    date,
    items,
    total: items.reduce(
      (sum, item) => sum + (item.type === "income" ? item.amount : -item.amount),
      0,
    ),
  }));
}
