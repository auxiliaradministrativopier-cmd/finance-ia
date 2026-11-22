import { z } from "zod";

/** Tipos base do Modelo de Dados (seção 3). Valores monetários são inteiros em centavos. */
export const MAX_CENTS = 100_000_000_000; // R$ 1 bilhão

export const money = z
  .number({ error: "Informe um valor." })
  .int("Use centavos inteiros.")
  .min(0, "O valor não pode ser negativo.")
  .max(MAX_CENTS, "Valor acima do limite permitido.");

export const positiveMoney = money.refine((value) => value > 0, "Informe um valor maior que zero.");

export const signedMoney = z.number().int("Use centavos inteiros.").min(-MAX_CENTS).max(MAX_CENTS);

export const dateString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Use uma data válida.");

export const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use um mês válido.");

export const entityId = z.string().min(1).max(64);

export const text = (min: number, max: number, label = "Este campo") =>
  z
    .string()
    .trim()
    .min(
      min,
      min <= 1 ? `${label} é obrigatório.` : `${label} precisa de pelo menos ${min} caracteres.`,
    )
    .max(max, `Use no máximo ${max} caracteres.`);

export const rate = (max: number) =>
  z.number().min(0, "A taxa não pode ser negativa.").max(max, `Use no máximo ${max}.`);

/** Campos que todo documento recebe da camada de dados. */
export interface EntityMeta {
  id: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export function readMeta(id: string, data: Record<string, unknown>): EntityMeta {
  const asDate = (value: unknown) => (value instanceof Date ? value : null);
  return {
    id,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    deletedAt: asDate(data.deletedAt),
  };
}

/** Extrai o mês (YYYY-MM) de uma data YYYY-MM-DD. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}
