import { daysInMonth, parseDate, type DateString } from "./dates";

export interface SpendingAllowanceInput {
  /** Saldo das contas hoje (só o que já foi pago ou recebido). */
  balanceNow: number;
  /** Receitas previstas até o fim do mês, ainda não recebidas. */
  pendingIncome: number;
  /** Despesas previstas até o fim do mês, ainda não pagas (inclui atrasadas). */
  pendingExpense: number;
  /** Quanto separar ainda neste mês (provisionamentos, parcelas de dívidas, meta de poupança). */
  setAside: number;
  today: DateString;
}

export interface SpendingAllowance {
  /** Saldo previsto no fim do mês, antes de separar nada. */
  projectedEndOfMonth: number;
  /** Quanto dá para gastar até o fim do mês sem faltar para o que já está previsto. */
  available: number;
  /** Dias restantes no mês, contando hoje. */
  daysLeft: number;
  /** `available` dividido pelos dias restantes (arredondado para baixo). */
  perDay: number;
}

/** "Quanto posso gastar?": o que sobra até o fim do mês depois do previsto e do que separar. */
export function spendingAllowance(input: SpendingAllowanceInput): SpendingAllowance {
  const { year, month, day } = parseDate(input.today);
  const daysLeft = daysInMonth(year, month) - day + 1;
  const projectedEndOfMonth = input.balanceNow + input.pendingIncome - input.pendingExpense;
  const available = Math.max(projectedEndOfMonth - input.setAside, 0);
  return { projectedEndOfMonth, available, daysLeft, perDay: Math.floor(available / daysLeft) };
}

/** Meses para juntar `remaining` guardando `monthly` por mês (null se não sobra nada por mês). */
export function monthsToReach(remaining: number, monthly: number): number | null {
  if (remaining <= 0) return 0;
  if (monthly <= 0) return null;
  return Math.ceil(remaining / monthly);
}
