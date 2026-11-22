import { addMonths, type DateString } from "./dates";

export type ProvisionStatus = "on_track" | "behind" | "completed" | "overdue";

export interface ProvisionPlanInput {
  targetAmount: number;
  /** Saldo já guardado (soma dos aportes menos retiradas). */
  accumulated: number;
  dueDate: DateString;
  /** Quando o provisionamento começou (para saber quanto já deveria ter sido guardado). */
  startDate: DateString;
  today: DateString;
}

export interface ProvisionPlan {
  /** Quanto falta guardar (nunca negativo). */
  remaining: number;
  /** Meses de aporte até o vencimento, contando o mês atual (0 se já venceu). */
  monthsLeft: number;
  /** Quanto guardar por mês para chegar ao valor total a tempo (centavos, arredondado para cima). */
  monthlyNeeded: number;
  /** Progresso de 0 a 1. */
  progress: number;
  /** Quanto já deveria estar guardado hoje, num ritmo constante. */
  expectedByNow: number;
  status: ProvisionStatus;
}

function monthIndex(date: DateString): number {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
}

/**
 * Meses de aporte entre hoje e o vencimento, contando o mês atual.
 * Ex.: hoje 22/11 e vencimento em 15/01 → 2 (novembro e dezembro); vence neste mês → 1; vencido → 0.
 */
export function provisionMonthsLeft(today: DateString, dueDate: DateString): number {
  if (dueDate < today) return 0;
  return Math.max(monthIndex(dueDate) - monthIndex(today), 1);
}

/** Plano de um provisionamento: quanto guardar por mês, progresso e situação. */
export function provisionPlan(input: ProvisionPlanInput): ProvisionPlan {
  const remaining = Math.max(input.targetAmount - input.accumulated, 0);
  const monthsLeft = provisionMonthsLeft(input.today, input.dueDate);
  const monthlyNeeded =
    remaining === 0 ? 0 : monthsLeft === 0 ? remaining : Math.ceil(remaining / monthsLeft);
  const progress =
    input.targetAmount > 0 ? Math.min(Math.max(input.accumulated / input.targetAmount, 0), 1) : 0;

  // Ritmo constante desde o início: no mês de criação, nada é esperado ainda.
  const totalMonths = Math.max(monthIndex(input.dueDate) - monthIndex(input.startDate), 1);
  const elapsed = Math.min(
    Math.max(monthIndex(input.today) - monthIndex(input.startDate), 0),
    totalMonths,
  );
  const expectedByNow = Math.round((input.targetAmount * elapsed) / totalMonths);

  let status: ProvisionStatus = "on_track";
  if (remaining === 0) status = "completed";
  else if (input.dueDate < input.today) status = "overdue";
  else if (input.accumulated < expectedByNow) status = "behind";

  return { remaining, monthsLeft, monthlyNeeded, progress, expectedByNow, status };
}

/** Saldo de um provisionamento a partir dos aportes (depósitos somam, retiradas subtraem). */
export function provisionBalance(
  contributions: { kind: "deposit" | "withdrawal"; amount: number }[],
): number {
  return contributions.reduce(
    (sum, item) => sum + (item.kind === "deposit" ? item.amount : -item.amount),
    0,
  );
}

/** Próximo vencimento de um provisionamento anual (mesmo dia, ano seguinte). */
export function nextYearlyDueDate(dueDate: DateString): DateString {
  return addMonths(dueDate, 12);
}
