/**
 * Datas de competência no formato YYYY-MM-DD, sem fuso horário (como no Modelo de Dados).
 * Toda a aritmética é feita em UTC para não sofrer com horário de verão.
 */
export type DateString = string;
export type MonthString = string;

export function parseDate(date: DateString): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return { year, month, day };
}

export function formatDate(year: number, month: number, day: number): DateString {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Soma meses mantendo o dia; em meses curtos, usa o último dia (31/01 + 1 mês = 28/02). */
export function addMonths(date: DateString, months: number, preferredDay?: number): DateString {
  const { year, month, day } = parseDate(date);
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return formatDate(
    nextYear,
    nextMonth,
    Math.min(preferredDay ?? day, daysInMonth(nextYear, nextMonth)),
  );
}

export function addDays(date: DateString, days: number): DateString {
  const { year, month, day } = parseDate(date);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function monthOf(date: DateString): MonthString {
  return date.slice(0, 7);
}

export function addMonthsToMonth(month: MonthString, months: number): MonthString {
  return monthOf(addMonths(`${month}-01`, months));
}

/** Meses de `from` até `to`, inclusive: ["2026-10", "2026-11"]. */
export function monthRange(from: MonthString, to: MonthString): MonthString[] {
  const result: MonthString[] = [];
  for (let current = from; current <= to; current = addMonthsToMonth(current, 1))
    result.push(current);
  return result;
}

/** Data de hoje no fuso de São Paulo (padrão do app). */
export function todayIn(timeZone = "America/Sao_Paulo", now = new Date()): DateString {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}
