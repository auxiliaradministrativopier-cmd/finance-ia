"use client";

import { formatMoney } from "@finance-ia/shared";
import { ArrowDownToLine, ArrowUpFromLine, Trash2 } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { MoneyField } from "@/components/ui/money-field";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import { formatShortDate } from "@/features/cash-flow/format";
import { cn } from "@/lib/cn";
import type { ProvisionView } from "../types";

export type ContributionMode = "deposit" | "withdrawal" | "history";

export function ContributionSheet({
  view,
  mode,
  today,
  onOpenChange,
  onContribute,
  onRemoveContribution,
}: {
  view: ProvisionView | null;
  mode: ContributionMode;
  today: string;
  onOpenChange: (open: boolean) => void;
  onContribute: (entry: {
    kind: "deposit" | "withdrawal";
    amount: number;
    date: string;
    note: string | null;
  }) => Promise<void>;
  onRemoveContribution: (contributionId: string) => Promise<void>;
}) {
  const title =
    mode === "deposit"
      ? "Guardar dinheiro"
      : mode === "withdrawal"
        ? "Usar dinheiro guardado"
        : "Histórico de aportes";
  return (
    <Sheet
      open={view !== null}
      onOpenChange={onOpenChange}
      title={title}
      description={view?.provision.name}
    >
      {view ? (
        mode === "history" ? (
          <History view={view} onRemove={onRemoveContribution} />
        ) : (
          <ContributionForm
            key={`${view.provision.id}-${mode}`}
            view={view}
            kind={mode}
            today={today}
            onSubmit={onContribute}
            onCancel={() => onOpenChange(false)}
          />
        )
      ) : null}
    </Sheet>
  );
}

function ContributionForm({
  view,
  kind,
  today,
  onSubmit,
  onCancel,
}: {
  view: ProvisionView;
  kind: "deposit" | "withdrawal";
  today: string;
  onSubmit: (entry: {
    kind: "deposit" | "withdrawal";
    amount: number;
    date: string;
    note: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  // Guardar: sugere o valor mensal necessário. Usar: sugere todo o saldo.
  const [amount, setAmount] = useState(kind === "deposit" ? view.plan.monthlyNeeded : view.balance);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (amount <= 0) {
      setErrors({ amount: "Informe um valor maior que zero." });
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ kind, amount, date, note: note.trim() || null });
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
      <p className="text-body text-ink-muted">
        Guardado até agora: <Amount cents={view.balance} className="font-semibold text-ink" /> de{" "}
        <Amount cents={view.provision.targetAmount} />
      </p>
      <MoneyField
        label={kind === "deposit" ? "Quanto guardar" : "Quanto usar"}
        size="lg"
        value={amount}
        onChange={(value) => {
          setAmount(value);
          setErrors({});
        }}
        error={errors.amount}
        hint={
          kind === "deposit" && view.plan.monthlyNeeded > 0
            ? `O valor do mês é ${formatMoney(view.plan.monthlyNeeded)}.`
            : undefined
        }
        autoFocus
      />
      <TextField
        label="Data"
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        error={errors.date}
      />
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
          {kind === "deposit" ? "Guardar" : "Usar"}
        </Button>
      </div>
    </form>
  );
}

function History({
  view,
  onRemove,
}: {
  view: ProvisionView;
  onRemove: (contributionId: string) => Promise<void>;
}) {
  if (view.contributions.length === 0) {
    return <p className="py-6 text-center text-body text-ink-muted">Nenhum aporte ainda.</p>;
  }
  return (
    <ul className="flex flex-col">
      {view.contributions.map((item) => {
        const deposit = item.kind === "deposit";
        const Icon = deposit ? ArrowDownToLine : ArrowUpFromLine;
        return (
          <li
            key={item.id}
            className="flex items-center gap-3 border-b border-line py-3 last:border-0"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                deposit ? "bg-brand-soft text-brand" : "bg-surface-sunken text-ink-muted",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body font-medium">{deposit ? "Guardado" : "Usado"}</span>
              <span className="truncate text-caption text-ink-muted">
                {formatShortDate(item.date)}
                {item.note ? ` · ${item.note}` : ""}
              </span>
            </span>
            <Amount
              cents={item.amount}
              kind={deposit ? "income" : "expense"}
              className="text-amount font-medium"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Excluir aporte de ${formatShortDate(item.date)}`}
              onClick={() => void onRemove(item.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
