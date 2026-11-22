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
