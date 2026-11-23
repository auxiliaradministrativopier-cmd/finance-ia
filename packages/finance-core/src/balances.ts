import type { DateString, MonthString } from "./dates";
import type { LedgerEntry } from "./summary";

export interface AccountOpening {
  id: string;
  initialBalance: number;
  initialBalanceDate: DateString;
  includeInTotal: boolean;
}

/**
 * Efeito de um lançamento no saldo de uma conta. Compras no cartão não mexem na conta:
 * o dinheiro só sai quando a fatura é paga (transferência da conta para o cartão).
 */
export function accountEffect(entry: LedgerEntry, accountId: string): number {
  // Compra no cartão não mexe na conta; o pagamento da fatura (transferência com cardId) sim.
  if (entry.cardId && entry.type !== "transfer") return 0;
  if (entry.type === "income" && entry.accountId === accountId) return entry.amount;
  if (entry.type === "expense" && entry.accountId === accountId) return -entry.amount;
  if (entry.type === "transfer") {
    if (entry.accountId === accountId) return -entry.amount;
    if (entry.toAccountId === accountId) return entry.amount;
  }
  return 0;
}

/**
 * Saldo de cada conta em uma data: saldo inicial + lançamentos efetivados desde a data do saldo inicial.
 * Com `includePending`, soma também os previstos até a data (saldo projetado).
 */
export function accountBalances(
  accounts: AccountOpening[],
  entries: LedgerEntry[],
  asOf: DateString,
  options: { includePending?: boolean } = {},
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const account of accounts) {
    // Antes da data do saldo inicial, a conta ainda não era acompanhada: saldo desconhecido (0).
    if (asOf < account.initialBalanceDate) {
      balances.set(account.id, 0);
      continue;
    }
    let balance = account.initialBalance;
    for (const entry of entries) {
      if (entry.date > asOf || entry.date < account.initialBalanceDate) continue;
      if (entry.status !== "paid" && !options.includePending) continue;
      balance += accountEffect(entry, account.id);
    }
    balances.set(account.id, balance);
  }
  return balances;
}

export function totalBalance(accounts: AccountOpening[], balances: Map<string, number>): number {
  return accounts
    .filter((account) => account.includeInTotal)
    .reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0);
}

/**
 * Saldo total das contas mês a mês: meses passados no último dia; o mês atual hoje;
 * meses futuros no último dia, somando os lançamentos previstos (projeção).
 */
export function balanceSeries(
  accounts: AccountOpening[],
  entries: LedgerEntry[],
  months: MonthString[],
  today: DateString,
): { month: MonthString; value: number; projected: boolean }[] {
  const currentMonth = today.slice(0, 7);
  return months.map((month) => {
    const [year, m] = month.split("-").map(Number) as [number, number];
    const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const endOfMonth = `${month}-${String(lastDay).padStart(2, "0")}`;
    const projected = month > currentMonth;
    const asOf = month === currentMonth ? today : endOfMonth;
    const balances = accountBalances(accounts, entries, asOf, { includePending: projected });
    return { month, value: totalBalance(accounts, balances), projected };
  });
}
