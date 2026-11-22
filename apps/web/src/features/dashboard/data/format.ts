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

function utc(value: string): Date {
  const [y, m = 1, d = 1] = value.split("-").map(Number) as [number, number?, number?];
  return new Date(Date.UTC(y, m - 1, d));
}

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
