import {
  addMonths,
  daysInMonth,
  formatDate,
  parseDate,
  type DateString,
  type MonthString,
} from "./dates";

export interface CardCycle {
  closingDay: number;
  dueDay: number;
}

export interface InvoiceInfo {
  /** Mês de referência da fatura (mês em que ela fecha) — id de cards/{id}/invoices/{YYYY-MM}. */
  invoiceMonth: MonthString;
  closingDate: DateString;
  dueDate: DateString;
}

function clampDay(year: number, month: number, day: number): DateString {
  return formatDate(year, month, Math.min(day, daysInMonth(year, month)));
}

/**
 * Em qual fatura cai uma compra no cartão.
 * Compras antes do dia de fechamento entram na fatura que fecha neste mês; a partir do fechamento,
 * na do mês seguinte. O vencimento é no mesmo mês do fechamento se o dia de vencimento for depois
 * do fechamento; senão, no mês seguinte.
 */
export function invoiceFor(purchaseDate: DateString, card: CardCycle): InvoiceInfo {
  const { year, month, day } = parseDate(purchaseDate);
  const closesThisMonth = day < Math.min(card.closingDay, daysInMonth(year, month));
  const reference = closesThisMonth
    ? `${year}-${String(month).padStart(2, "0")}-01`
    : addMonths(`${year}-${String(month).padStart(2, "0")}-01`, 1);
  const ref = parseDate(reference);
  const closingDate = clampDay(ref.year, ref.month, card.closingDay);
  const dueBase = card.dueDay > card.closingDay ? reference : addMonths(reference, 1);
  const due = parseDate(dueBase);
  return {
    invoiceMonth: reference.slice(0, 7),
    closingDate,
    dueDate: clampDay(due.year, due.month, card.dueDay),
  };
}

/** O mínimo de um lançamento para calcular faturas. */
export interface InvoiceLedgerEntry {
  type: "income" | "expense" | "transfer";
  amount: number;
  cardId: string | null;
  invoiceMonth: string | null;
}

/** Pagamento de fatura: transferência da conta para o cartão, ligada a uma fatura (`invoiceMonth`). */
export function isInvoicePayment(entry: InvoiceLedgerEntry): boolean {
  return entry.type === "transfer" && Boolean(entry.cardId) && Boolean(entry.invoiceMonth);
}

/** Compra feita no cartão (entra em uma fatura). */
export function isCardPurchase(entry: InvoiceLedgerEntry): boolean {
  return entry.type === "expense" && Boolean(entry.cardId) && Boolean(entry.invoiceMonth);
}

/** Vencimento da fatura de referência `invoiceMonth` (mês em que ela fecha). */
export function invoiceDueDate(invoiceMonth: MonthString, card: CardCycle): DateString {
  const reference = `${invoiceMonth}-01`;
  const dueBase = card.dueDay > card.closingDay ? reference : addMonths(reference, 1);
  const due = parseDate(dueBase);
  return clampDay(due.year, due.month, card.dueDay);
}

export interface InvoiceBalance {
  purchases: number;
  paid: number;
  /** Quanto falta pagar (nunca negativo). */
  remaining: number;
}

/** Total de compras, pagamentos e saldo de uma fatura. */
export function invoiceBalance(
  entries: InvoiceLedgerEntry[],
  cardId: string,
  invoiceMonth: MonthString,
): InvoiceBalance {
  let purchases = 0;
  let paid = 0;
  for (const entry of entries) {
    if (entry.cardId !== cardId || entry.invoiceMonth !== invoiceMonth) continue;
    if (isCardPurchase(entry)) purchases += entry.amount;
    else if (isInvoicePayment(entry)) paid += entry.amount;
  }
  return { purchases, paid, remaining: Math.max(purchases - paid, 0) };
}

export interface OutstandingInvoice {
  cardId: string;
  invoiceMonth: MonthString;
  dueDate: DateString;
  remaining: number;
}

/**
 * Faturas com valor a pagar que vencem entre `from` e `to` (inclusive).
 * Faturas que venceram antes de `from` ficam de fora: antes do pagamento de fatura existir no app,
 * não há como saber se foram pagas.
 */
export function outstandingInvoices(
  entries: InvoiceLedgerEntry[],
  cards: (CardCycle & { id: string })[],
  range: { from: DateString; to: DateString },
): { total: number; items: OutstandingInvoice[] } {
  const items: OutstandingInvoice[] = [];
  for (const card of cards) {
    const months = new Set(
      entries
        .filter((entry) => entry.cardId === card.id && entry.invoiceMonth)
        .map((entry) => entry.invoiceMonth!),
    );
    for (const invoiceMonth of months) {
      const dueDate = invoiceDueDate(invoiceMonth, card);
      if (dueDate < range.from || dueDate > range.to) continue;
      const { remaining } = invoiceBalance(entries, card.id, invoiceMonth);
      if (remaining > 0) items.push({ cardId: card.id, invoiceMonth, dueDate, remaining });
    }
  }
  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { total: items.reduce((sum, item) => sum + item.remaining, 0), items };
}
