import { CATEGORY_COLORS } from "@finance-ia/shared";
import { z } from "zod";
import {
  dateString,
  entityId,
  money,
  monthString,
  positiveMoney,
  rate,
  signedMoney,
  text,
} from "./common";

/**
 * Schemas de entrada das entidades que o usuário cadastra (Modelo de Dados, seção 4).
 * Campos calculados pelo servidor (saldos, faturas, progresso) não fazem parte da entrada:
 * as Security Rules impedem o app de escrevê-los.
 */
const color = z.enum(CATEGORY_COLORS as [string, ...string[]]);
const icon = z.string().min(1).max(40);
const nullableId = entityId.nullable().default(null);

// ---------- Categorias (4.6) ----------
export const categoryInput = z.object({
  name: text(1, 40, "O nome"),
  type: z.enum(["income", "expense"]),
  icon,
  color,
  parentId: nullableId,
  catalogId: nullableId,
  essential: z.boolean().default(false),
  archived: z.boolean().default(false),
  order: z.number().int().min(0).max(10_000).default(0),
});

// ---------- Contas bancárias (4.4) ----------
export const accountInput = z.object({
  name: text(1, 60, "O nome"),
  type: z.enum(["checking", "savings", "wallet", "benefit", "digital", "other"]),
  institutionName: text(1, 60).nullable().default(null),
  color,
  icon,
  initialBalance: signedMoney,
  initialBalanceDate: dateString,
  overdraftLimit: money.nullable().default(null),
  includeInTotal: z.boolean().default(true),
  archived: z.boolean().default(false),
  order: z.number().int().min(0).max(10_000).default(0),
});

// ---------- Cartões (4.5) ----------
export const cardInput = z.object({
  name: text(1, 60, "O nome"),
  institutionName: text(1, 60).nullable().default(null),
  brand: z.enum(["visa", "mastercard", "elo", "amex", "hipercard", "other"]),
  lastFour: z
    .string()
    .regex(/^\d{4}$/, "Informe apenas os 4 últimos dígitos.")
    .nullable()
    .default(null),
  limit: positiveMoney,
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  paymentAccountId: nullableId,
  color,
  archived: z.boolean().default(false),
});

// ---------- Lançamentos: receitas, despesas e transferências (4.7) ----------
const attachment = z.object({
  path: z.string().min(1).max(300),
  name: z.string().min(1).max(120),
  mimeType: z.string().min(1).max(80),
  size: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
});

export const transactionInput = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    status: z.enum(["paid", "pending", "scheduled"]),
    amount: positiveMoney,
    description: text(1, 120, "A descrição"),
    date: dateString,
    paidAt: z.date().nullable().default(null),
    accountId: nullableId,
    cardId: nullableId,
    invoiceMonth: monthString.nullable().default(null),
    toAccountId: nullableId,
    categoryId: nullableId,
    categoryName: z.string().max(40).nullable().default(null),
    categoryIcon: z.string().max(40).nullable().default(null),
    categoryColor: z.string().max(20).nullable().default(null),
    installmentPlanId: nullableId,
    installmentNumber: z.number().int().min(1).max(72).nullable().default(null),
    installmentTotal: z.number().int().min(1).max(72).nullable().default(null),
    recurrenceId: nullableId,
    linkedEntity: z
      .object({
        type: z.enum(["provision", "goal", "debt", "invoice", "investment"]),
        id: entityId,
      })
      .nullable()
      .default(null),
    tags: z.array(z.string().trim().min(1).max(24)).max(10, "Use no máximo 10 tags.").default([]),
    notes: z.string().max(500, "Use no máximo 500 caracteres.").nullable().default(null),
    attachments: z.array(attachment).max(5, "Anexe no máximo 5 arquivos.").default([]),
    source: z
      .enum(["manual", "recurrence", "installment", "import", "open_finance", "ai"])
      .default("manual"),
    clientRequestId: z.string().min(8).max(64),
  })
  .superRefine((value, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (value.type === "income" && (!value.accountId || value.cardId)) {
      issue("accountId", "Escolha a conta que recebeu o valor.");
    }
    if (value.type === "expense" && Boolean(value.accountId) === Boolean(value.cardId)) {
      issue("accountId", "Escolha uma conta ou um cartão.");
    }
    if (value.cardId && !value.invoiceMonth) issue("invoiceMonth", "Informe a fatura da compra.");
    if (value.type === "transfer") {
      if (!value.accountId || !value.toAccountId)
        issue("toAccountId", "Escolha as contas de origem e de destino.");
      else if (value.accountId === value.toAccountId)
        issue("toAccountId", "A conta de destino precisa ser diferente.");
      if (value.categoryId) issue("categoryId", "Transferências não têm categoria.");
    } else if (!value.categoryId) {
      issue("categoryId", "Escolha uma categoria.");
    }
    if (value.status === "paid" && !value.paidAt) issue("paidAt", "Informe quando foi pago.");
    if ((value.installmentNumber ?? 0) > (value.installmentTotal ?? 72)) {
      issue("installmentNumber", "A parcela não pode ser maior que o total.");
    }
  });

// ---------- Metas (4.12) ----------
export const goalInput = z.object({
  name: text(1, 60, "O nome"),
  icon,
  color,
  type: z.enum([
    "emergency_reserve",
    "purchase",
    "travel",
    "education",
    "retirement",
    "debt_payoff",
    "other",
  ]),
  targetAmount: positiveMoney,
  targetDate: dateString.nullable().default(null),
  priority: z.number().int().min(1).max(5).default(3),
  linkedInvestmentIds: z.array(entityId).max(10).default([]),
  status: z.enum(["active", "paused", "canceled"]).default("active"),
});

// ---------- Provisionamentos (4.11) ----------
export const provisionInput = z.object({
  name: text(1, 60, "O nome"),
  kind: z.enum([
    "ipva",
    "iptu",
    "seguro",
    "escola",
    "material_escolar",
    "ferias",
    "decimo_terceiro",
    "imposto_renda",
    "manutencao",
    "presentes",
    "outro",
  ]),
  targetAmount: positiveMoney,
  dueDate: dateString,
  repeatsYearly: z.boolean().default(false),
  reserveAccountId: nullableId,
  aiSuggested: z.boolean().default(false),
});

// ---------- Dívidas (4.13) ----------
export const debtInput = z
  .object({
    name: text(1, 60, "O nome"),
    creditor: text(1, 60, "O credor"),
    type: z.enum([
      "personal_loan",
      "payroll_loan",
      "vehicle_financing",
      "real_estate_financing",
      "revolving_credit",
      "overdraft",
      "student_loan",
      "credit_card_installment",
      "installment_purchase",
      "informal",
      "other",
    ]),
    originalAmount: positiveMoney,
    currentBalance: money,
    monthlyRate: rate(30),
    cetYearly: rate(1000).nullable().default(null),
    amortization: z.enum(["price", "sac", "none"]),
    installmentAmount: money.nullable().default(null),
    installmentCount: z.number().int().min(1).max(600).nullable().default(null),
    startDate: dateString,
    nextDueDate: dateString.nullable().default(null),
    /** Data da última parcela prevista no contrato. */
    endDate: dateString.nullable().default(null),
    linkedAssetId: nullableId,
  })
  .refine((value) => value.currentBalance <= value.originalAmount * 3, {
    path: ["currentBalance"],
    message: "O saldo atual parece alto demais para o valor inicial. Confira os valores.",
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "A data final precisa ser depois do início.",
  });

// ---------- Investimentos (4.14) ----------
export const investmentInput = z
  .object({
    name: text(1, 80, "O nome"),
    assetClass: z.enum([
      "fixed_income",
      "treasury",
      "stocks",
      "reits",
      "funds",
      "pension",
      "crypto",
      "savings",
      "international",
      "other",
    ]),
    product: z.string().trim().max(40).nullable().default(null),
    institutionName: z.string().trim().max(60).nullable().default(null),
    ticker: z
      .string()
      .regex(/^[A-Z0-9.]{1,12}$/, "Use o código em maiúsculas, como PETR4.")
      .nullable()
      .default(null),
    indexer: z.enum(["cdi", "selic", "ipca", "prefixed", "none"]).nullable().default(null),
    rate: rate(1000).nullable().default(null),
    liquidity: z.enum(["daily", "d_plus_30", "at_maturity", "other"]),
    maturityDate: dateString.nullable().default(null),
    isEmergencyReserve: z.boolean().default(false),
    goalId: nullableId,
    quantity: z.number().min(0).nullable().default(null),
    currentValue: money,
    status: z.enum(["active", "redeemed"]).default("active"),
  })
  .refine((value) => !value.isEmergencyReserve || value.liquidity === "daily", {
    path: ["isEmergencyReserve"],
    message: "A reserva de emergência precisa de liquidez diária.",
  });

// ---------- Bens (4.15) ----------
export const assetInput = z.object({
  name: text(1, 80, "O nome"),
  type: z.enum(["real_estate", "vehicle", "electronics", "business", "other"]),
  purchaseValue: money.nullable().default(null),
  purchaseDate: dateString.nullable().default(null),
  currentValue: money,
  yearlyDepreciation: rate(100).nullable().default(null),
  linkedDebtId: nullableId,
});

export type CategoryInput = z.input<typeof categoryInput>;
export type AccountInput = z.input<typeof accountInput>;
export type CardInput = z.input<typeof cardInput>;
export type TransactionInput = z.input<typeof transactionInput>;
export type GoalInput = z.input<typeof goalInput>;
export type ProvisionInput = z.input<typeof provisionInput>;
export type DebtInput = z.input<typeof debtInput>;
export type InvestmentInput = z.input<typeof investmentInput>;
export type AssetInput = z.input<typeof assetInput>;

// ---------- Parcelamentos (4.8) ----------
export const installmentPlanInput = z
  .object({
    description: text(1, 120, "A descrição"),
    totalAmount: positiveMoney,
    installmentCount: z
      .number()
      .int()
      .min(2, "Parcele em pelo menos 2 vezes.")
      .max(72, "Parcele em no máximo 72 vezes."),
    installmentAmount: positiveMoney,
    firstInstallmentAmount: positiveMoney,
    firstDate: dateString,
    cardId: nullableId,
    accountId: nullableId,
    categoryId: entityId,
    hasInterest: z.boolean().default(false),
    monthlyRate: rate(30).nullable().default(null),
    status: z.enum(["active", "finished", "canceled"]).default("active"),
  })
  .refine((value) => Boolean(value.cardId) !== Boolean(value.accountId), {
    path: ["accountId"],
    message: "Escolha uma conta ou um cartão.",
  })
  .refine(
    (value) =>
      value.firstInstallmentAmount + value.installmentAmount * (value.installmentCount - 1) ===
      value.totalAmount,
    {
      path: ["totalAmount"],
      message: "A soma das parcelas precisa ser igual ao total.",
    },
  );

// ---------- Recorrências (4.9) ----------
export const recurrenceInput = z
  .object({
    type: z.enum(["income", "expense"]),
    description: text(1, 120, "A descrição"),
    amount: positiveMoney,
    categoryId: entityId,
    accountId: nullableId,
    cardId: nullableId,
    frequency: z.enum(["weekly", "monthly", "yearly"]),
    startDate: dateString,
    endDate: dateString.nullable().default(null),
    autoConfirm: z.boolean().default(false),
    active: z.boolean().default(true),
    /** Até que data as ocorrências já foram geradas (o app mantém 3 meses à frente). */
    generatedUntil: dateString.nullable().default(null),
  })
  .refine((value) => value.type !== "income" || (value.accountId && !value.cardId), {
    path: ["accountId"],
    message: "Escolha a conta que recebe o valor.",
  })
  .refine(
    (value) => value.type !== "expense" || Boolean(value.accountId) !== Boolean(value.cardId),
    {
      path: ["accountId"],
      message: "Escolha uma conta ou um cartão.",
    },
  )
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "A data final precisa ser depois do início.",
  });

export type InstallmentPlanInput = z.input<typeof installmentPlanInput>;
export type RecurrenceInput = z.input<typeof recurrenceInput>;

// ---------- Aportes de provisionamentos (4.11, subcoleção contributions) ----------
export const contributionInput = z.object({
  /** "deposit" = guardar; "withdrawal" = usar o dinheiro reservado. */
  kind: z.enum(["deposit", "withdrawal"]),
  amount: positiveMoney,
  date: dateString,
  note: z.string().trim().max(120, "Use no máximo 120 caracteres.").nullable().default(null),
  transactionId: nullableId,
});

export type ContributionInput = z.input<typeof contributionInput>;

// ---------- Pagamentos de dívidas (4.13, subcoleção payments) ----------
export const debtPaymentInput = z.object({
  /** "regular" = parcela (inclui os juros do mês); "prepayment" = antecipação (abate do saldo). */
  kind: z.enum(["regular", "prepayment"]),
  amount: positiveMoney,
  /** Parte que foi para juros e parte que abateu o saldo (guardadas para desfazer com precisão). */
  interest: money,
  principal: money,
  date: dateString,
  note: z.string().trim().max(120, "Use no máximo 120 caracteres.").nullable().default(null),
  transactionId: nullableId,
});

export type DebtPaymentInput = z.input<typeof debtPaymentInput>;
