import {
  addDays,
  addMonths,
  installmentSchedule,
  invoiceFor,
  occurrenceId,
  occurrencesBetween,
} from "@finance-ia/finance-core";
import { DataError } from "@/data/errors";
import { getRepositories, type Repositories } from "@/data/repositories";
import type { WriteOperation } from "@/data/store/types";
import type { Card, Category, ChangeScope, EntryDraft, Recurrence, Transaction } from "./types";

/** Quantos meses à frente as recorrências ficam geradas (para a projeção do caixa). */
export const RECURRENCE_HORIZON_MONTHS = 3;

export interface CashFlowContext {
  uid: string;
  today: string;
  categories: Category[];
  cards: Card[];
}

function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function categoryFields(categories: Category[], categoryId: string) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category)
    throw new DataError("invalid", { fields: { categoryId: "Escolha uma categoria." } });
  return {
    categoryId,
    categoryName: category.name,
    categoryIcon: category.icon,
    categoryColor: category.color,
  };
}

function cardCycle(cards: Card[], cardId: string | null) {
  if (!cardId) return null;
  const card = cards.find((item) => item.id === cardId);
  if (!card) throw new DataError("invalid", { fields: { accountId: "Escolha um cartão válido." } });
  return { closingDay: card.closingDay, dueDay: card.dueDay };
}

/** Status de uma ocorrência gerada: só o que já aconteceu herda "pago". */
function statusFor(
  date: string,
  today: string,
  requested: "paid" | "pending",
): { status: "paid" | "pending"; paidAt: Date | null } {
  const paid = requested === "paid" && date <= today;
  return { status: paid ? "paid" : "pending", paidAt: paid ? new Date() : null };
}

/**
 * Regras do Fluxo de Caixa sobre a camada de dados.
 * Parcelamentos e recorrências viram vários lançamentos gravados em um único lote (tudo ou nada).
 */
export function createCashFlowService(repos: Repositories = getRepositories()) {
  const { transactions, installmentPlans, recurrences } = repos;

  /** Lançamento base a partir do rascunho. */
  function baseTransaction(draft: EntryDraft, context: CashFlowContext) {
    return {
      type: draft.type,
      amount: draft.amount,
      description: draft.description,
      accountId: draft.type === "expense" && draft.cardId ? null : draft.accountId,
      cardId: draft.type === "expense" ? draft.cardId : null,
      notes: draft.notes,
      ...categoryFields(context.categories, draft.categoryId),
      clientRequestId: newRequestId(),
    };
  }

  async function recurrenceOccurrences(
    uid: string,
    recurrenceId: string,
    rule: { startDate: string; frequency: "weekly" | "monthly" | "yearly"; endDate: string | null },
    from: string,
    until: string,
    base: Record<string, unknown>,
    requested: "paid" | "pending",
    context: CashFlowContext,
    cardId: string | null,
  ): Promise<WriteOperation[]> {
    const dates = occurrencesBetween(rule, from, until);
    const cycle = cardCycle(context.cards, cardId);
    return Promise.all(
      dates.map((date) =>
        transactions.buildCreate(
          uid,
          {
            ...base,
            ...statusFor(date, context.today, requested),
            date,
            invoiceMonth: cycle ? invoiceFor(date, cycle).invoiceMonth : null,
            recurrenceId,
            source: "recurrence",
            clientRequestId: newRequestId(),
          },
          { id: occurrenceId(recurrenceId, date) },
        ),
      ),
    );
  }

  return {
    /** Cria um lançamento simples, parcelado ou recorrente. Devolve o id do primeiro lançamento. */
    async create(draft: EntryDraft, context: CashFlowContext): Promise<string> {
      const { uid, today } = context;
      const base = baseTransaction(draft, context);
      const cycle = cardCycle(context.cards, base.cardId);
      const operations: WriteOperation[] = [];

      if (draft.repeat.kind === "installments") {
        if (draft.type !== "expense")
          throw new DataError("invalid", {
            fields: { repeat: "Só despesas podem ser parceladas." },
          });
        const planId = await installmentPlans.newId(uid);
        const schedule = installmentSchedule({
          totalCents: draft.amount,
          count: draft.repeat.count,
          firstDate: draft.date,
          card: cycle,
        });
        operations.push(
          await installmentPlans.buildCreate(
            uid,
            {
              description: draft.description,
              totalAmount: draft.amount,
              installmentCount: draft.repeat.count,
              installmentAmount: schedule[1]?.amount ?? draft.amount,
              firstInstallmentAmount: schedule[0]!.amount,
              firstDate: draft.date,
              cardId: base.cardId,
              accountId: base.accountId,
              categoryId: draft.categoryId,
            },
            { id: planId },
          ),
        );
        for (const item of schedule) {
          operations.push(
            await transactions.buildCreate(uid, {
              ...base,
              ...statusFor(item.date, today, draft.status),
              amount: item.amount,
              date: item.date,
              invoiceMonth: item.invoiceMonth,
              installmentPlanId: planId,
              installmentNumber: item.number,
              installmentTotal: draft.repeat.count,
              source: "installment",
              clientRequestId: newRequestId(),
            }),
          );
        }
      } else if (draft.repeat.kind === "recurring") {
        const recurrenceId = await recurrences.newId(uid);
        const horizon = addMonths(today, RECURRENCE_HORIZON_MONTHS);
        const rule = {
          startDate: draft.date,
          frequency: draft.repeat.frequency,
          endDate: draft.repeat.endDate,
        };
        operations.push(
          await recurrences.buildCreate(
            uid,
            {
              type: draft.type,
              description: draft.description,
              amount: draft.amount,
              categoryId: draft.categoryId,
              accountId: base.accountId,
              cardId: base.cardId,
              ...rule,
              generatedUntil: horizon,
            },
            { id: recurrenceId },
          ),
          ...(await recurrenceOccurrences(
            uid,
            recurrenceId,
            rule,
            draft.date,
            horizon,
            base,
            draft.status,
            context,
            base.cardId,
          )),
        );
      } else {
        operations.push(
          await transactions.buildCreate(uid, {
            ...base,
            ...statusFor(draft.date, "9999-12-31", draft.status),
            date: draft.date,
            invoiceMonth: cycle ? invoiceFor(draft.date, cycle).invoiceMonth : null,
          }),
        );
      }

      await repos.commit(operations);
      const first = operations.find((operation) => operation.path.includes("/transactions/"));
      return first?.path.split("/").at(-1) ?? "";
    },

    /**
     * Edita um lançamento. Em parcelamentos e recorrências, o escopo decide se a mudança vale só para este,
     * para este e os próximos ou para todos. Valor e data mudam só no lançamento escolhido.
     */
    async update(
      transaction: Transaction,
      changes: Partial<
        Pick<
          EntryDraft,
          | "amount"
          | "description"
          | "date"
          | "status"
          | "categoryId"
          | "accountId"
          | "cardId"
          | "notes"
        >
      >,
      scope: ChangeScope,
      context: CashFlowContext,
      siblings: Transaction[],
    ): Promise<void> {
      const { uid } = context;
      const patch: Record<string, unknown> = { ...changes };
      if (changes.categoryId)
        Object.assign(patch, categoryFields(context.categories, changes.categoryId));
      if (changes.status)
        patch.paidAt = changes.status === "paid" ? (transaction.paidAt ?? new Date()) : null;
      const cardId = "cardId" in changes ? changes.cardId : transaction.cardId;
      const date = changes.date ?? transaction.date;
      if ("cardId" in changes || "date" in changes) {
        const cycle = cardCycle(context.cards, cardId ?? null);
        patch.invoiceMonth = cycle ? invoiceFor(date, cycle).invoiceMonth : null;
        if (cardId) patch.accountId = null;
      }

      const targets =
        scope === "one"
          ? []
          : affected(transaction, siblings, scope).filter((item) => item.id !== transaction.id);
      // Nos demais, só os campos descritivos (valor, data e status são de cada ocorrência).
      const shared: Record<string, unknown> = {};
      for (const key of [
        "description",
        "categoryId",
        "categoryName",
        "categoryIcon",
        "categoryColor",
        "notes",
      ]) {
        if (key in patch) shared[key] = patch[key];
      }
      if (transaction.recurrenceId && "amount" in patch) {
        // Na recorrência, o novo valor vale para as próximas ocorrências ainda não pagas.
        Object.assign(shared, { amount: patch.amount });
      }

      const operations: WriteOperation[] = [
        await transactions.buildUpdate(uid, transaction.id, patch),
      ];
      for (const item of targets) {
        const itemPatch = { ...shared };
        if (item.status === "paid") delete itemPatch.amount;
        if (Object.keys(itemPatch).length > 0)
          operations.push(await transactions.buildUpdate(uid, item.id, itemPatch));
      }
      if (scope !== "one" && transaction.installmentPlanId) {
        const planPatch: Record<string, unknown> = {};
        if (changes.description) planPatch.description = changes.description;
        if (changes.categoryId) planPatch.categoryId = changes.categoryId;
        if (Object.keys(planPatch).length > 0)
          operations.push(
            await installmentPlans.buildUpdate(uid, transaction.installmentPlanId, planPatch),
          );
      }
      if (scope !== "one" && transaction.recurrenceId) {
        const recurrencePatch: Record<string, unknown> = {};
        for (const key of ["description", "categoryId", "amount"] as const) {
          if (key in changes) recurrencePatch[key] = changes[key];
        }
        if (Object.keys(recurrencePatch).length > 0)
          operations.push(
            await recurrences.buildUpdate(uid, transaction.recurrenceId, recurrencePatch),
          );
      }
      await repos.commit(operations);
    },

    /** Exclui (logicamente) conforme o escopo. Devolve os ids removidos, para "Desfazer". */
    async remove(
      transaction: Transaction,
      scope: ChangeScope,
      context: CashFlowContext,
      siblings: Transaction[],
    ): Promise<string[]> {
      const { uid } = context;
      const targets = scope === "one" ? [transaction] : affected(transaction, siblings, scope);
      const operations: WriteOperation[] = await Promise.all(
        targets.map((item) => transactions.buildRemove(uid, item.id)),
      );

      if (scope !== "one" && transaction.installmentPlanId) {
        const removesEverything = scope === "all" || (transaction.installmentNumber ?? 1) === 1;
        operations.push(
          removesEverything
            ? await installmentPlans.buildRemove(uid, transaction.installmentPlanId)
            : await installmentPlans.buildUpdate(uid, transaction.installmentPlanId, {
                status: "canceled",
              }),
        );
      }
      if (scope !== "one" && transaction.recurrenceId) {
        const recurrence = await recurrences.get(uid, transaction.recurrenceId).catch(() => null);
        if (recurrence) {
          const endDate = addDays(transaction.date, -1);
          operations.push(
            scope === "all" || endDate < recurrence.startDate
              ? await recurrences.buildRemove(uid, transaction.recurrenceId)
              : await recurrences.buildUpdate(uid, transaction.recurrenceId, {
                  endDate,
                  active: false,
                }),
          );
        }
      }
      await repos.commit(operations);
      return targets.map((item) => item.id);
    },

    /** Desfaz uma exclusão de lançamento simples. */
    async restore(uid: string, ids: string[]): Promise<void> {
      for (const id of ids) await transactions.restore(uid, id);
    },

    async markPaid(transaction: Transaction, uid: string): Promise<void> {
      await transactions.update(uid, transaction.id, { status: "paid", paidAt: new Date() });
    },

    /**
     * Mantém as recorrências ativas geradas até 3 meses à frente. Idempotente: ids determinísticos
     * e o marcador generatedUntil evitam duplicar ocorrências.
     */
    async extendRecurrences(context: CashFlowContext, list: Recurrence[]): Promise<number> {
      const { uid, today } = context;
      const horizon = addMonths(today, RECURRENCE_HORIZON_MONTHS);
      const operations: WriteOperation[] = [];
      let created = 0;
      for (const recurrence of list) {
        if (!recurrence.active) continue;
        const from = recurrence.generatedUntil
          ? addDays(recurrence.generatedUntil, 1)
          : recurrence.startDate;
        if (from > horizon) continue;
        const base = {
          type: recurrence.type,
          amount: recurrence.amount,
          description: recurrence.description,
          accountId: recurrence.accountId,
          cardId: recurrence.cardId,
          notes: null,
          ...categoryFields(context.categories, recurrence.categoryId),
        };
        const occurrences = await recurrenceOccurrences(
          uid,
          recurrence.id,
          recurrence,
          from,
          horizon,
          base,
          recurrence.autoConfirm ? "paid" : "pending",
          context,
          recurrence.cardId,
        );
        created += occurrences.length;
        operations.push(
          ...occurrences,
          await recurrences.buildUpdate(uid, recurrence.id, { generatedUntil: horizon }),
        );
      }
      await repos.commit(operations);
      return created;
    },
  };
}

/** Lançamentos afetados por uma edição ou exclusão em grupo (mesmo parcelamento ou recorrência). */
export function affected(
  transaction: Transaction,
  siblings: Transaction[],
  scope: ChangeScope,
): Transaction[] {
  const group = transaction.installmentPlanId
    ? siblings.filter((item) => item.installmentPlanId === transaction.installmentPlanId)
    : transaction.recurrenceId
      ? siblings.filter((item) => item.recurrenceId === transaction.recurrenceId)
      : [transaction];
  if (scope === "one") return [transaction];
  if (scope === "all")
    return group.some((item) => item.id === transaction.id) ? group : [...group, transaction];
  return group.filter((item) =>
    transaction.installmentPlanId
      ? (item.installmentNumber ?? 0) >= (transaction.installmentNumber ?? 0)
      : item.date >= transaction.date,
  );
}

export type CashFlowService = ReturnType<typeof createCashFlowService>;
