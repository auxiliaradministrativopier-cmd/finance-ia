import type { Repositories } from "@/data/repositories";

type ModelOf<K extends keyof Repositories> = Repositories[K] extends {
  get: (...args: never[]) => Promise<infer M>;
}
  ? M
  : never;

export type Transaction = ModelOf<"transactions">;
export type Account = ModelOf<"accounts">;
export type Card = ModelOf<"cards">;
export type Category = ModelOf<"categories">;
export type Recurrence = ModelOf<"recurrences">;

export type EntryType = "income" | "expense";

export type RepeatOption =
  | { kind: "none" }
  | { kind: "installments"; count: number }
  | { kind: "recurring"; frequency: "weekly" | "monthly" | "yearly"; endDate: string | null };

/** O que o formulário de lançamento produz. */
export interface EntryDraft {
  type: EntryType;
  amount: number;
  description: string;
  date: string;
  status: "paid" | "pending";
  categoryId: string;
  accountId: string | null;
  cardId: string | null;
  notes: string | null;
  repeat: RepeatOption;
}

/** Até onde vale uma edição ou exclusão em parcelamentos e recorrências. */
export type ChangeScope = "one" | "following" | "all";
