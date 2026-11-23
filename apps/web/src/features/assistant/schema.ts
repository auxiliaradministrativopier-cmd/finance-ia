import { z } from "zod";

/**
 * Contrato entre o app e a rota /api/ia/chat. Tudo com limites de tamanho: o servidor rejeita
 * o que fugir disso. Valores em reais (número com centavos), datas AAAA-MM-DD.
 */
const reais = z.number().finite().min(-1e10).max(1e10);
const label = z.string().max(80);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-\d{2}$/);

export const assistantContextSchema = z.object({
  today: date,
  hasData: z.boolean(),
  month: z.object({
    month,
    incomeReceived: reais,
    incomeExpected: reais,
    expensePaid: reais,
    expenseExpected: reais,
    projectedResult: reais,
  }),
  history: z.array(z.object({ month, income: reais, expense: reais })).max(12),
  accounts: z.object({ total: reais, count: z.number().int().min(0).max(100) }),
  spending: z.object({
    balanceNow: reais,
    pendingIncome: reais,
    pendingExpense: reais,
    provisionsToSave: reais,
    debtInstallmentsDue: reais,
    cardInvoicesDue: reais,
    projectedEndOfMonth: reais,
    available: reais,
    perDay: reais,
    daysLeft: z.number().int().min(1).max(31),
  }),
  savings: z.object({ avgMonthly: reais, rate: z.number().finite().min(-10).max(1) }),
  categories: z
    .array(
      z.object({
        name: label,
        thisMonth: reais,
        avg3Months: reais,
        shareOfExpenses: z.number().min(0).max(1),
      }),
    )
    .max(12),
  largestExpenses: z
    .array(
      z.object({
        description: label,
        category: label,
        amount: reais,
        date,
        paidWithCard: z.boolean(),
      }),
    )
    .max(10),
  upcomingBills: z.array(z.object({ title: label, amount: reais, dueDate: date })).max(10),
  reserve: z.object({
    months: z.number().finite().min(0).max(1000),
    target6Months: reais,
    aboveTarget: reais,
  }),
  goals: z
    .array(
      z.object({
        name: label,
        kind: z.enum(["provision", "goal"]),
        target: reais,
        saved: reais,
        dueDate: date.nullable(),
        monthlyNeeded: reais.nullable(),
        status: label,
        monthsAtCurrentPace: z.number().int().min(0).max(1200).nullable(),
      }),
    )
    .max(20),
  debts: z
    .array(
      z.object({
        name: label,
        type: label,
        balance: reais,
        original: reais,
        monthlyRatePercent: z.number().finite().min(0).max(100),
        payment: reais,
        projectedEnd: date.nullable(),
        remainingInterest: reais.nullable(),
        status: label,
        payoffWithReserveExcess: z
          .object({
            amount: reais,
            interestSaved: reais,
            monthsSaved: z.number().int().min(0).max(1200),
          })
          .nullable(),
      }),
    )
    .max(20),
  health: z
    .object({
      score: z.number().int().min(0).max(1000),
      band: label,
      pillars: z
        .array(
          z.object({
            name: label,
            points: z.number(),
            max: z.number(),
            summary: z.string().max(240),
          }),
        )
        .max(6),
      recommendations: z.array(z.string().max(160)).max(4),
    })
    .nullable(),
});

export type AssistantContext = z.infer<typeof assistantContextSchema>;

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_LENGTH = 1500;

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(6000),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES)
    .refine((items) => items.at(-1)?.role === "user", "A última mensagem precisa ser do usuário.")
    .refine(
      (items) =>
        items
          .filter((item) => item.role === "user")
          .every((item) => item.content.length <= MAX_MESSAGE_LENGTH),
      `Escreva no máximo ${MAX_MESSAGE_LENGTH} caracteres.`,
    ),
  context: assistantContextSchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** Eventos da resposta (uma linha JSON por evento). */
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; code: "refusal" | "overloaded" | "failed"; message: string };
