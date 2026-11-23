/**
 * Formatação de datas, meses, percentuais e taxas para a interface (pt-BR).
 * Valores em dinheiro usam `formatMoney` (@finance-ia/shared) ou o componente <Amount>.
 */

/** "2026-11-05" ou "2026-11" → Date em UTC (sem surpresas de fuso). */
function utc(value: string): Date {
  const [y, m = 1, d = 1] = value.split("-").map(Number) as [number, number?, number?];
  return new Date(Date.UTC(y, m - 1, d));
}

const weekday = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Cabeçalho de dia na lista: "Hoje", "Ontem", "Amanhã" ou "Sábado, 21 de novembro". */
export function formatDayHeading(date: string, today: string): string {
  const diff = Math.round((utc(date).getTime() - utc(today).getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === -1) return "Ontem";
  if (diff === 1) return "Amanhã";
  return capitalize(weekday.format(utc(date)));
}

/** "2026-11" → "Novembro de 2026" */
export function formatMonthTitle(month: string): string {
  return capitalize(monthYear.format(utc(`${month}-01`)));
}

/** "2026-12-05" → "05 de dez. de 2026" */
export function formatShortDate(date: string): string {
  return shortDate.format(utc(date));
}

const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

/** "2026-11" → "nov" */
export function formatMonthShort(month: string): string {
  return monthShort.format(utc(month)).replace(".", "");
}

/** "2026-11" → "novembro de 2026" */
export function formatMonthLong(month: string): string {
  return monthLong.format(utc(month));
}

/** "2026-12-05" → "05 dez" */
export function formatDayMonth(date: string): string {
  return dayMonth.format(utc(date)).replace(".", "").replace(" de ", " ");
}

/** Centavos → rótulo curto de eixo: 1_000_000 → "10 mil". */
export function formatCompactCurrency(cents: number): string {
  return compactNumber.format(cents / 100);
}

export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

/** Variação com sinal tipográfico: 0.12 → "+12%", -0.17 → "−17%". */
export function formatSignedPercent(ratio: number): string {
  const text = percent.format(Math.abs(ratio));
  if (ratio > 0) return `+${text}`;
  if (ratio < 0) return `−${text}`;
  return text;
}

const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });

/** "2026-10" → "outubro" */
export function formatMonthName(month: string): string {
  return monthName.format(utc(month));
}

/** Mês anterior: "2026-01" → "2025-12". */
export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(y, m - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const monthYearShort = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-03-10" → "mar. de 2026". */
export function formatMonthYear(date: string): string {
  return monthYearShort.format(utc(date.slice(0, 7)));
}

/** Prazo em meses inteiros: 5 → "5 meses"; 14 → "1 ano e 2 meses". */
export function formatMonths(months: number): string {
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearsText = `${years} ${years === 1 ? "ano" : "anos"}`;
  return rest ? `${yearsText} e ${rest} ${rest === 1 ? "mês" : "meses"}` : yearsText;
}

/** Meses com uma casa decimal: 0,4 → "menos de 1 mês"; 1,29 → "1,3 meses". */
export function formatMonthsDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded < 1) return "menos de 1 mês";
  return `${rounded.toLocaleString("pt-BR")} ${rounded === 1 ? "mês" : "meses"}`;
}

/** "2,5" → 2.5. Vazio ou inválido → NaN. */
export function parseRate(text: string): number {
  const normalized = text.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

/** 1.99 → "1,99" (taxa em percentual, sem o símbolo). */
export function formatRate(rate: number): string {
  return rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}
