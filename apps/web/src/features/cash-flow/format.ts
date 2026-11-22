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

const utc = (date: string) => {
  const [y, m = 1, d = 1] = date.split("-").map(Number) as [number, number?, number?];
  return new Date(Date.UTC(y, m - 1, d));
};

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

export const frequencyLabel = { weekly: "Semanal", monthly: "Mensal", yearly: "Anual" } as const;
