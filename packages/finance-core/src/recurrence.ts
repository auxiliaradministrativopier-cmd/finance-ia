import { addDays, addMonths, type DateString } from "./dates";

export type Frequency = "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  startDate: DateString;
  frequency: Frequency;
  /** Última data possível (inclusive); null = sem fim. */
  endDate: DateString | null;
}

/**
 * Datas de uma recorrência dentro de [from, until], inclusive. Mensal mantém o dia da data inicial
 * (ajustando em meses curtos); anual, o dia e o mês; semanal, o dia da semana.
 */
export function occurrencesBetween(
  rule: RecurrenceRule,
  from: DateString,
  until: DateString,
  max = 400,
): DateString[] {
  const dates: DateString[] = [];
  const last = rule.endDate && rule.endDate < until ? rule.endDate : until;
  const day = Number(rule.startDate.slice(8, 10));
  for (let index = 0; dates.length < max; index += 1) {
    const date =
      rule.frequency === "weekly"
        ? addDays(rule.startDate, index * 7)
        : addMonths(rule.startDate, rule.frequency === "monthly" ? index : index * 12, day);
    if (date > last) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

/** Id determinístico de uma ocorrência: gerar de novo nunca duplica. */
export function occurrenceId(recurrenceId: string, date: DateString): string {
  return `${recurrenceId}_${date.replaceAll("-", "")}`;
}
