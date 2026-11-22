/**
 * Valores monetários são sempre inteiros em centavos (ADR-06).
 * Estes utilitários tratam apenas da representação; regras financeiras ficam no finance-core.
 */
export type Cents = number;

const MINUS = "−"; // sinal de menos tipográfico, conforme o Design System

const brl = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function isCents(value: unknown): value is Cents {
  return typeof value === "number" && Number.isSafeInteger(value);
}

export interface FormatMoneyOptions {
  /** Exibe "+" para valores positivos (receitas). */
  signed?: boolean;
  /** Substitui o valor por "R$ ••••" (modo ocultar valores). */
  hidden?: boolean;
}

/** Formata centavos no padrão brasileiro: 123456 → "R$ 1.234,56". */
export function formatMoney(cents: Cents, options: FormatMoneyOptions = {}): string {
  if (!isCents(cents)) {
    throw new TypeError(
      `Valor monetário inválido: esperado inteiro em centavos, recebido ${String(cents)}`,
    );
  }
  if (options.hidden) return "R$ ••••";

  const abs = brl.format(Math.abs(cents) / 100);
  if (cents < 0) return `${MINUS} R$ ${abs}`;
  if (options.signed && cents > 0) return `+ R$ ${abs}`;
  return `R$ ${abs}`;
}
