"use client";

import type { OutstandingInvoice } from "@finance-ia/finance-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import { formatMonthTitle, formatShortDate } from "@/lib/format";
import type { Card } from "@/features/cash-flow/types";
import type { InvoicePayment } from "../service";

export function PayInvoiceSheet({
  card,
  invoices,
  accounts,
  today,
  onOpenChange,
  onSubmit,
}: {
  card: Card | null;
  invoices: OutstandingInvoice[];
  accounts: { id: string; name: string }[];
  today: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payment: InvoicePayment) => Promise<void>;
}) {
  return (
    <Sheet
      open={card !== null}
      onOpenChange={onOpenChange}
      title="Pagar fatura"
      description={card?.name}
    >
      {card ? (
        <PayInvoiceForm
          key={card.id}
          card={card}
          invoices={invoices}
          accounts={accounts}
          today={today}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function PayInvoiceForm({
  card,
  invoices,
  accounts,
  today,
  onSubmit,
  onCancel,
}: {
  card: Card;
  invoices: OutstandingInvoice[];
  accounts: { id: string; name: string }[];
  today: string;
  onSubmit: (payment: InvoicePayment) => Promise<void>;
  onCancel: () => void;
}) {
  const [invoiceMonth, setInvoiceMonth] = useState(invoices[0]?.invoiceMonth ?? "");
  const selected = invoices.find((item) => item.invoiceMonth === invoiceMonth);
  const [amount, setAmount] = useState(selected?.remaining ?? 0);
  const [accountId, setAccountId] = useState(
    accounts.find((account) => account.id === card.paymentAccountId)?.id ?? accounts[0]?.id ?? "",
  );
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-muted">Não há fatura com valor a pagar neste cartão.</p>
        <Button variant="secondary" className="self-end" onClick={onCancel}>
          Fechar
        </Button>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId) {
      setErrors({ accountId: "Cadastre uma conta para pagar a fatura." });
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ invoiceMonth, amount, accountId, date });
    } catch (error) {
      setErrors(
        error instanceof DataError && Object.keys(error.fields).length > 0
          ? error.fields
          : { amount: error instanceof Error ? error.message : "Não foi possível pagar." },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {invoices.length > 1 ? (
        <SelectField
          label="Fatura"
          value={invoiceMonth}
          options={invoices.map((item) => ({
            value: item.invoiceMonth,
            label: `${formatMonthTitle(item.invoiceMonth)} · vence em ${formatShortDate(item.dueDate)}`,
          }))}
          onChange={(event) => {
            setInvoiceMonth(event.target.value);
            setAmount(
              invoices.find((item) => item.invoiceMonth === event.target.value)?.remaining ?? 0,
            );
          }}
        />
      ) : (
        <p className="text-body text-ink-muted">
          Fatura de {formatMonthTitle(invoiceMonth).toLowerCase()} · vence em{" "}
          {selected ? formatShortDate(selected.dueDate) : ""}
        </p>
      )}
      <MoneyField
        label="Valor pago"
        size="lg"
        value={amount}
        onChange={(value) => {
          setAmount(value);
          setErrors({});
        }}
        error={errors.amount}
        hint="Pode ser o valor total ou parte dele."
        autoFocus
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Pago com"
          value={accountId}
          options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          onChange={(event) => setAccountId(event.target.value)}
          hint={errors.accountId}
        />
        <TextField
          label="Data"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={errors.date}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Pagar fatura
        </Button>
      </div>
    </form>
  );
}
