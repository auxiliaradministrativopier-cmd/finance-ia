"use client";

import { applyPayment } from "@finance-ia/finance-core";
import { formatMoney } from "@finance-ia/shared";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import type { PaymentEntry } from "../service";
import type { DebtView } from "../types";

export function PaymentSheet({
  view,
  defaultKind = "regular",
  defaultAmount,
  today,
  accounts,
  onOpenChange,
  onSubmit,
}: {
  view: DebtView | null;
  defaultKind?: PaymentEntry["kind"];
  /** Valor sugerido (ex.: vindo do simulador). */
  defaultAmount?: number;
  today: string;
  accounts: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: PaymentEntry) => Promise<void>;
}) {
  return (
    <Sheet
      open={view !== null}
      onOpenChange={onOpenChange}
      title="Registrar pagamento"
      description={view?.debt.name}
    >
      {view ? (
        <PaymentForm
          key={`${view.debt.id}-${defaultKind}-${defaultAmount ?? ""}`}
          view={view}
          defaultKind={defaultKind}
          defaultAmount={defaultAmount}
          today={today}
          accounts={accounts}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function PaymentForm({
  view,
  defaultKind,
  defaultAmount,
  today,
  accounts,
  onSubmit,
  onCancel,
}: {
  view: DebtView;
  defaultKind: PaymentEntry["kind"];
  defaultAmount?: number;
  today: string;
  accounts: { id: string; name: string }[];
  onSubmit: (entry: PaymentEntry) => Promise<void>;
  onCancel: () => void;
}) {
  const { debt } = view;
  const [kind, setKind] = useState(defaultKind);
  const regularAmount = Math.min(view.payment, debt.currentBalance + view.monthInterest);
  const [amount, setAmount] = useState(
    defaultAmount ?? (defaultKind === "regular" ? regularAmount : 0),
  );
  const [date, setDate] = useState(
    debt.nextDueDate && debt.nextDueDate <= today ? debt.nextDueDate : today,
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const split =
    amount > 0
      ? applyPayment(debt.currentBalance, amount, debt.monthlyRate, kind, debt.amortization)
      : null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (amount <= 0) {
      setErrors({ amount: "Informe um valor maior que zero." });
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        kind,
        amount,
        date,
        note: note.trim() || null,
        accountId: accountId || null,
      });
    } catch (error) {
      setErrors(
        error instanceof DataError && Object.keys(error.fields).length > 0
          ? error.fields
          : { amount: error instanceof Error ? error.message : "Não foi possível salvar." },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div role="group" aria-label="Tipo de pagamento" className="flex flex-wrap gap-2">
        <Chip
          selected={kind === "regular"}
          onClick={() => {
            setKind("regular");
            setAmount(regularAmount);
          }}
        >
          Parcela do mês
        </Chip>
        <Chip
          selected={kind === "prepayment"}
          onClick={() => {
            setKind("prepayment");
            setAmount(0);
          }}
        >
          Antecipação
        </Chip>
      </div>
      <p className="text-body text-ink-muted">
        {kind === "regular"
          ? "A parcela paga primeiro os juros do mês; o resto abate o saldo."
          : "A antecipação abate direto do saldo, sem juros. Confirme com o credor o desconto dos juros futuros."}
      </p>
      <MoneyField
        label="Valor pago"
        size="lg"
        value={amount}
        onChange={(value) => {
          setAmount(value);
          setErrors({});
        }}
        error={errors.amount}
        autoFocus
      />
      {split ? (
        <dl
          className="grid grid-cols-3 gap-3 rounded-lg bg-surface-sunken px-4 py-3"
          aria-live="polite"
        >
          <div className="flex flex-col">
            <dt className="text-caption text-ink-muted">Juros</dt>
            <dd>
              <Amount cents={split.interest} className="text-amount font-medium" />
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-caption text-ink-muted">Abate do saldo</dt>
            <dd>
              <Amount cents={split.principal} className="text-amount font-medium" />
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-caption text-ink-muted">Novo saldo</dt>
            <dd>
              <Amount cents={split.balance} className="text-amount font-semibold" />
            </dd>
          </div>
        </dl>
      ) : null}
      {split && split.principal === 0 && kind === "regular" ? (
        <p className="text-caption text-warning">
          Esse valor só cobre os juros de {formatMoney(view.monthInterest)}. O saldo não diminui.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Data"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={errors.date}
        />
        <SelectField
          label="Pago com"
          value={accountId}
          options={[
            ...accounts.map((account) => ({ value: account.id, label: account.name })),
            { value: "", label: "Não lançar no fluxo de caixa" },
          ]}
          onChange={(event) => setAccountId(event.target.value)}
          hint={accountId ? "Vira uma despesa na categoria Dívidas e juros." : undefined}
        />
      </div>
      <TextField
        label="Observação (opcional)"
        maxLength={120}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Registrar pagamento
        </Button>
      </div>
    </form>
  );
}
