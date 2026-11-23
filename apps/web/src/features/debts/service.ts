import { addMonths, applyPayment } from "@finance-ia/finance-core";
import { DataError } from "@/data/errors";
import type { DebtInput } from "@/data/models/entities";
import { getRepositories, type Repositories } from "@/data/repositories";
import type { WriteOperation } from "@/data/store/types";
import type { Debt, DebtPayment } from "./types";

export interface PaymentEntry {
  kind: "regular" | "prepayment";
  amount: number;
  date: string;
  note?: string | null;
  /** Conta de onde o dinheiro saiu: cria a despesa no Fluxo de Caixa. Sem conta, só registra na dívida. */
  accountId?: string | null;
}

/** Categoria das despesas com dívidas (padrão "Dívidas e juros"). */
const DEBT_CATEGORY_ID = "exp-dividas";

function requestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Regras do Controle de Dívidas sobre a camada de dados. */
export function createDebtService(repos: Repositories = getRepositories()) {
  const { debts, transactions, categories } = repos;

  return {
    create: (uid: string, input: DebtInput) => debts.create(uid, input),
    update: (uid: string, id: string, patch: Partial<DebtInput>) => debts.update(uid, id, patch),
    remove: (uid: string, id: string) => debts.remove(uid, id),
    restore: (uid: string, id: string) => debts.restore(uid, id),

    /**
     * Registra um pagamento em um lote: o pagamento (com juros e principal separados), o novo saldo,
     * o próximo vencimento e, se houver conta, a despesa no Fluxo de Caixa.
     */
    async registerPayment(uid: string, debt: Debt, entry: PaymentEntry): Promise<string> {
      if (debt.currentBalance <= 0)
        throw new DataError("invalid", { fields: { amount: "Esta dívida já está quitada." } });
      const split = applyPayment(
        debt.currentBalance,
        entry.amount,
        debt.monthlyRate,
        entry.kind,
        debt.amortization,
      );
      const paymentsRepo = repos.debtPayments(debt.id);
      const operations: WriteOperation[] = [];

      let transactionId: string | null = null;
      if (entry.accountId) {
        const category = await categories.get(uid, DEBT_CATEGORY_ID).catch(() => null);
        const created = await transactions.buildCreate(uid, {
          type: "expense",
          status: "paid",
          amount: entry.amount,
          description: `${entry.kind === "prepayment" ? "Antecipação" : "Parcela"} · ${debt.name}`,
          date: entry.date,
          paidAt: new Date(),
          accountId: entry.accountId,
          categoryId: category?.id ?? DEBT_CATEGORY_ID,
          categoryName: category?.name ?? "Dívidas e juros",
          categoryIcon: category?.icon ?? "credit-card",
          categoryColor: category?.color ?? "chart-5",
          linkedEntity: { type: "debt", id: debt.id },
          source: "manual",
          clientRequestId: requestId(),
        });
        transactionId = created.id;
        operations.push(created);
      }

      const payment = await paymentsRepo.buildCreate(uid, {
        kind: entry.kind,
        amount: entry.amount,
        interest: split.interest,
        principal: split.principal,
        date: entry.date,
        note: entry.note ?? null,
        transactionId,
        previousDueDate: debt.nextDueDate,
      });
      operations.push(payment);

      // O saldo cai por soma atômica: dois aparelhos (ou escritas offline) não se sobrescrevem.
      const patch: Partial<DebtInput> = {};
      if (entry.kind === "regular" && debt.nextDueDate && split.balance > 0)
        patch.nextDueDate = addMonths(debt.nextDueDate, 1);
      if (split.balance === 0) patch.nextDueDate = null;
      operations.push(
        await debts.buildUpdate(uid, debt.id, patch, { currentBalance: -split.principal }),
      );

      await repos.commit(operations);
      return payment.id;
    },

    /**
     * Desfaz um pagamento: devolve o principal ao saldo e exclui a despesa ligada.
     * O vencimento só volta quando o pagamento desfeito é o mais recente; pagamentos antigos
     * não mexem no vencimento atual.
     */
    async removePayment(uid: string, debt: Debt, payment: DebtPayment): Promise<void> {
      const payments = await repos.debtPayments(debt.id).list(uid);
      const latest = payments[0]?.id === payment.id;
      const patch: Partial<DebtInput> = {};
      if (latest) {
        if (payment.previousDueDate !== undefined && payment.previousDueDate !== null) {
          patch.nextDueDate = payment.previousDueDate;
        } else if (payment.kind === "regular" && debt.nextDueDate) {
          // Pagamentos antigos, sem o vencimento anterior guardado.
          patch.nextDueDate = addMonths(debt.nextDueDate, -1);
        }
      }
      const operations: WriteOperation[] = [
        await repos.debtPayments(debt.id).buildRemove(uid, payment.id),
        await debts.buildUpdate(uid, debt.id, patch, { currentBalance: payment.principal }),
      ];
      if (payment.transactionId)
        operations.push(await transactions.buildRemove(uid, payment.transactionId));
      await repos.commit(operations);
    },
  };
}

export type DebtService = ReturnType<typeof createDebtService>;
