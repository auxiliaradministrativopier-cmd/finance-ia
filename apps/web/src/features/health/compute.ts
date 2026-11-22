import { healthHistory, type HealthScore } from "@finance-ia/finance-core";
import { buildHealthInput, type HealthSources } from "./inputs";

export interface HealthResult {
  /** Do mais antigo para o atual. */
  history: HealthScore[];
  current: HealthScore | null;
  previous: HealthScore | null;
  /** Variação em relação ao mês anterior (null sem mês anterior). */
  delta: number | null;
}

/** IFA atual e evolução dos últimos 12 meses, a partir dos dados do app. */
export function computeHealth(sources: HealthSources): HealthResult {
  const history = healthHistory(buildHealthInput(sources), sources.today, 12);
  const last = history.at(-1) ?? null;
  const current = last && last.month === sources.today.slice(0, 7) ? last : null;
  const previous = current ? (history.at(-2) ?? null) : last;
  return {
    history,
    current,
    previous,
    delta: current && previous ? current.score - previous.score : null,
  };
}
