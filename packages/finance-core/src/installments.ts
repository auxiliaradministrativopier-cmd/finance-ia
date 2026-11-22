import { addMonths, type DateString, type MonthString } from "./dates";
import { invoiceFor, type CardCycle } from "./invoices";

/**
 * Divide um valor em parcelas inteiras de centavos. A sobra da divisão vai para a primeira
 * parcela, para a soma fechar exatamente no total (Modelo de Dados 4.8).
 * Ex.: R$ 100,00 em 3x → 33,34 + 33,33 + 33,33.
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0)
    throw new RangeError("O total precisa ser um inteiro positivo em centavos.");
  if (!Number.isInteger(count) || count < 1 || count > 72)
    throw new RangeError("O número de parcelas vai de 1 a 72.");
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => (index === 0 ? base + remainder : base));
}

export interface InstallmentScheduleItem {
  number: number;
  amount: number;
  /** Data de competência da parcela. */
  date: DateString;
  /** Fatura da parcela, quando a compra é no cartão. */
  invoiceMonth: MonthString | null;
}

/**
 * Cronograma das parcelas. No cartão, cada parcela cai em uma fatura seguida, a partir da fatura
 * da compra; fora do cartão (carnê, boleto), uma por mês na mesma data.
 */
export function installmentSchedule(input: {
  totalCents: number;
  count: number;
  firstDate: DateString;
  card?: CardCycle | null;
}): InstallmentScheduleItem[] {
  const amounts = splitInstallments(input.totalCents, input.count);
  const firstInvoice = input.card ? invoiceFor(input.firstDate, input.card) : null;
  const day = Number(input.firstDate.slice(8, 10));
  return amounts.map((amount, index) => ({
    number: index + 1,
    amount,
    date: index === 0 ? input.firstDate : addMonths(input.firstDate, index, day),
    invoiceMonth: firstInvoice
      ? addMonths(`${firstInvoice.invoiceMonth}-01`, index).slice(0, 7)
      : null,
  }));
}
