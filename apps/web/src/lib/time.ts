import { todayIn } from "@finance-ia/finance-core";

/**
 * Fuso horário do usuário (Configurações → preferências). Todas as contas de "hoje" e de
 * "em que dia isto aconteceu" passam por aqui, para respeitar o fuso escolhido.
 */
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
let zone = DEFAULT_TIME_ZONE;

export function setUserTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    zone = timeZone;
  } catch {
    zone = DEFAULT_TIME_ZONE;
  }
}

export function userTimeZone(): string {
  return zone;
}

/** Hoje (AAAA-MM-DD) no fuso do usuário. */
export function today(): string {
  return todayIn(zone);
}

/** Dia (AAAA-MM-DD) de um instante, no fuso do usuário. */
export function dayOf(date: Date): string {
  return todayIn(zone, date);
}
