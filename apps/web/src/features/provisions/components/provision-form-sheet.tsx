"use client";

import { provisionPlan } from "@finance-ia/finance-core";
import { formatMoney } from "@finance-ia/shared";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import type { ProvisionInput } from "@/data/models/entities";
import { cn } from "@/lib/cn";
import { kindInfo, provisionKinds, type ProvisionKind } from "../kinds";
import type { Provision } from "../types";

export interface ProvisionFormValues {
  input: ProvisionInput;
  initialAmount: number;
}

export function ProvisionFormSheet({
  open,
  onOpenChange,
  provision,
  defaultKind,
  balance,
  today,
  accounts,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provision: Provision | null;
  /** Tipo pré-selecionado (ao escolher um modelo). */
  defaultKind?: ProvisionKind;
  /** Saldo já guardado (na edição, para a prévia do cálculo). */
  balance: number;
  today: string;
  accounts: { id: string; name: string }[];
  onSubmit: (values: ProvisionFormValues) => Promise<void>;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={provision ? "Editar provisionamento" : "Novo provisionamento"}
      description="Separe aos poucos o dinheiro de uma despesa que vai chegar."
    >
      {open ? (
        <ProvisionForm
          key={provision?.id ?? `new-${defaultKind ?? ""}`}
          provision={provision}
          defaultKind={defaultKind}
          balance={balance}
          today={today}
          accounts={accounts}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function defaultDueDate(today: string): string {
  const [year] = today.split("-");
  return `${Number(year) + 1}-01-15`;
}

function ProvisionForm({
  provision,
  defaultKind,
  balance,
  today,
  accounts,
  onSubmit,
  onCancel,
}: {
  provision: Provision | null;
  defaultKind?: ProvisionKind;
  balance: number;
  today: string;
  accounts: { id: string; name: string }[];
  onSubmit: (values: ProvisionFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<ProvisionKind>(provision?.kind ?? defaultKind ?? "ipva");
  const [name, setName] = useState(provision?.name ?? "");
  const [nameTouched, setNameTouched] = useState(Boolean(provision));
  const [targetAmount, setTargetAmount] = useState(provision?.targetAmount ?? 0);
  const [dueDate, setDueDate] = useState(provision?.dueDate ?? defaultDueDate(today));
  const [initialAmount, setInitialAmount] = useState(0);
  const [repeatsYearly, setRepeatsYearly] = useState(
    provision?.repeatsYearly ?? kindInfo(defaultKind ?? "ipva").yearly,
  );
  const [reserveAccountId, setReserveAccountId] = useState(provision?.reserveAccountId ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sugere o nome a partir do tipo e do ano do vencimento, até o usuário escrever o seu.
  const suggestedName = `${kindInfo(kind).label}${kindInfo(kind).yearly ? ` ${dueDate.slice(0, 4)}` : ""}`;
  const effectiveName = nameTouched ? name : suggestedName;

  const saved = provision ? balance : initialAmount;
  const valid = targetAmount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
  const plan = valid
    ? provisionPlan({ targetAmount, accumulated: saved, dueDate, startDate: today, today })
    : null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    if (!provision && dueDate < today) {
      setErrors({ dueDate: "Escolha uma data a partir de hoje." });
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        input: {
          name: effectiveName,
          kind,
          targetAmount,
          dueDate,
          repeatsYearly,
          reserveAccountId: reserveAccountId || null,
          aiSuggested: provision?.aiSuggested ?? false,
        },
        initialAmount,
      });
    } catch (error) {
      if (error instanceof DataError && Object.keys(error.fields).length > 0)
        setErrors(error.fields);
      else setFormError(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-medium">Tipo</legend>
        <div role="radiogroup" aria-label="Tipo" className="flex flex-wrap gap-2">
          {provisionKinds.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={kind === option.value}
              onClick={() => {
                setKind(option.value);
                if (!provision) setRepeatsYearly(option.yearly);
              }}
              className={cn(
                "inline-flex h-control-sm cursor-pointer items-center gap-1.5 rounded-full border pr-3 pl-1 text-label font-medium",
                kind === option.value
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line-control text-ink hover:bg-surface-sunken",
              )}
            >
              <CategoryIcon icon={option.icon} color={option.color} className="size-6" />
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <TextField
        label="Nome"
        maxLength={60}
        value={effectiveName}
        onChange={(event) => {
          setName(event.target.value);
          setNameTouched(true);
        }}
        error={errors.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField
          label="Valor total"
          value={targetAmount}
          onChange={setTargetAmount}
          error={errors.targetAmount}
        />
        <TextField
          label="Data prevista"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          error={errors.dueDate}
        />
      </div>
      {!provision ? (
        <MoneyField
          label="Já guardado (opcional)"
          value={initialAmount}
          onChange={setInitialAmount}
          error={errors.initialAmount}
          hint="Se você já separou uma parte, informe aqui."
        />
      ) : null}

      <div className="rounded-lg bg-brand-soft px-4 py-3" aria-live="polite">
        {plan ? (
          plan.status === "completed" ? (
            <p className="text-body font-medium text-ink">Você já tem o valor total guardado.</p>
          ) : (
            <p className="text-body text-ink">
              Guarde{" "}
              <strong className="font-semibold tabular">{formatMoney(plan.monthlyNeeded)}</strong>{" "}
              por mês durante {plan.monthsLeft} {plan.monthsLeft === 1 ? "mês" : "meses"} para
              chegar a {formatMoney(targetAmount)}.
            </p>
          )
        ) : (
          <p className="text-body text-ink-muted">
            Informe o valor total e a data para ver quanto guardar por mês.
          </p>
        )}
      </div>

      <Switch
        label="Repete todo ano"
        description="Ao vencer, você pode renovar para o ano seguinte com um toque."
        checked={repeatsYearly}
        onCheckedChange={setRepeatsYearly}
      />
      <SelectField
        label="Onde o dinheiro fica guardado (opcional)"
        value={reserveAccountId}
        options={[
          { value: "", label: "Não informar" },
          ...accounts.map((account) => ({ value: account.id, label: account.name })),
        ]}
        onChange={(event) => setReserveAccountId(event.target.value)}
      />

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {provision ? "Salvar alterações" : "Criar provisionamento"}
        </Button>
      </div>
    </form>
  );
}
