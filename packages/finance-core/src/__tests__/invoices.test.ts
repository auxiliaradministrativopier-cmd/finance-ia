import { describe, expect, it } from "vitest";
import { accountBalances } from "../balances";
import {
  invoiceBalance,
  invoiceDueDate,
  invoiceFor,
  isInvoicePayment,
  outstandingInvoices,
  type InvoiceLedgerEntry,
} from "../invoices";
import { summarizeMonth, type LedgerEntry } from "../summary";

const card = { id: "visa", closingDay: 3, dueDay: 10 };
const entry = (overrides: Partial<LedgerEntry>): LedgerEntry => ({
  type: "expense",
  status: "paid",
  amount: 10_000,
  date: "2026-11-05",
  month: "2026-11",
  accountId: null,
  toAccountId: null,
  cardId: "visa",
  categoryId: "exp-mercado",
  ...overrides,
});
const purchase = (amount: number, invoiceMonth: string) =>
  ({ ...entry({ amount }), invoiceMonth }) as LedgerEntry & InvoiceLedgerEntry;
const payment = (amount: number, invoiceMonth: string, date = "2026-12-10") =>
  ({
    ...entry({
      type: "transfer",
      amount,
      accountId: "itau",
      date,
      month: date.slice(0, 7),
      categoryId: null,
    }),
    invoiceMonth,
  }) as LedgerEntry & InvoiceLedgerEntry;

describe("pagamento de fatura", () => {
  it("o vencimento bate com invoiceFor", () => {
    const info = invoiceFor("2026-11-05", card);
    expect(invoiceDueDate(info.invoiceMonth, card)).toBe(info.dueDate);
    expect(invoiceDueDate("2026-12", { closingDay: 25, dueDay: 5 })).toBe("2027-01-05");
  });

  it("separa compras e pagamentos e calcula o que falta", () => {
    const entries = [
      purchase(30_000, "2026-12"),
      purchase(20_000, "2026-12"),
      payment(35_000, "2026-12"),
    ];
    expect(isInvoicePayment(entries[2]!)).toBe(true);
    expect(invoiceBalance(entries, "visa", "2026-12")).toEqual({
      purchases: 50_000,
      paid: 35_000,
      remaining: 15_000,
    });
  });

  it("o pagamento sai da conta, mas não conta como despesa de novo", () => {
    const entries = [purchase(50_000, "2026-12"), payment(50_000, "2026-12", "2026-12-10")];
    const balances = accountBalances(
      [
        {
          id: "itau",
          initialBalance: 100_000,
          initialBalanceDate: "2026-11-01",
          includeInTotal: true,
        },
      ],
      entries,
      "2026-12-31",
    );
    expect(balances.get("itau")).toBe(50_000);
    expect(summarizeMonth(entries, "2026-12").expense.paid).toBe(0);
    expect(summarizeMonth(entries, "2026-11").expense.paid).toBe(50_000);
  });

  it("lista as faturas a pagar no período e ignora as que venceram antes", () => {
    const entries = [
      purchase(40_000, "2026-10"),
      purchase(30_000, "2026-11"),
      purchase(25_000, "2026-12"),
      payment(10_000, "2026-12"),
    ];
    const result = outstandingInvoices(entries, [card], { from: "2026-11-22", to: "2026-12-31" });
    expect(result.items.map((item) => [item.invoiceMonth, item.dueDate, item.remaining])).toEqual([
      ["2026-12", "2026-12-10", 15_000],
    ]);
    expect(result.total).toBe(15_000);
  });
});
