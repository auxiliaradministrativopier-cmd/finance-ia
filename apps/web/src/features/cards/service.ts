import { outstandingInvoices } from "@finance-ia/finance-core";
import { DataError } from "@/data/errors";
import { getRepositories, type Repositories } from "@/data/repositories";
import type { Card, Transaction } from "@/features/cash-flow/types";

export interface InvoicePayment {
  invoiceMonth: string;
  amount: number;
  accountId: string;
  date: string;
}

function requestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Faturas que o usuário pode pagar agora: com saldo, vencendo de 40 dias atrás até a fatura aberta. */
export function payableInvoices(
  card: Card,
  transactions: Transaction[],
  today: string,
  openDueDate: string,
) {
  const from = new Date(`${today}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 40);
  return outstandingInvoices(transactions, [card], {
    from: from.toISOString().slice(0, 10),
    to: openDueDate,
  }).items;
}

/** Pagamentos de fatura: o dinheiro sai da conta e o limite do cartão é liberado. */
export function createCardService(repos: Repositories = getRepositories()) {
  return {
    async payInvoice(uid: string, card: Card, payment: InvoicePayment): Promise<string> {
      if (payment.amount <= 0) {
        throw new DataError("invalid", { fields: { amount: "Informe um valor maior que zero." } });
      }
      return repos.transactions.create(uid, {
        type: "transfer",
        status: "paid",
        amount: payment.amount,
        description: `Pagamento da fatura ${card.name}`,
        date: payment.date,
        paidAt: new Date(),
        accountId: payment.accountId,
        toAccountId: null,
        cardId: card.id,
        invoiceMonth: payment.invoiceMonth,
        categoryId: null,
        categoryName: null,
        categoryIcon: null,
        categoryColor: null,
        linkedEntity: { type: "invoice", id: `${card.id}_${payment.invoiceMonth}` },
        source: "manual",
        clientRequestId: requestId(),
      });
    },
  };
}
