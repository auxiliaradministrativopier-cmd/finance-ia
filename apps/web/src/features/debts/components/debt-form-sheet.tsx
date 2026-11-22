"use client";

import { addMonths, monthlyInterest, pricePayment } from "@finance-ia/finance-core";
import { formatMoney } from "@finance-ia/shared";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import type { DebtInput } from "@/data/models/entities";
import { cn } from "@/lib/cn";
import { amortizationLabels, debtGroups, groupOf, type DebtGroup, type DebtType } from "../kinds";
import type { Debt } from "../types";

export function DebtFormSheet({
  open,
  onOpenChange,
  debt,
  defaultGroup,
  today,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  defaultGroup?: DebtGroup;
  today: string;
  onSubmit: (input: DebtInput) => Promise<void>;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={debt ? "Editar dívida" : "Nova dívida"}
      description="Com a taxa e as parcelas, o Finance IA mostra quando ela termina e quanto você paga de juros."
    >
      {open ? (
        <DebtForm
          key={debt?.id ?? `new-${defaultGroup ?? ""}`}
          debt={debt}
          defaultGroup={defaultGroup}
          today={today}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

/** "2,5" → 2.5. Vazio ou inválido → NaN. */
export function parseRate(text: string): number {
  const normalized = text.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

export function formatRate(rate: number): string {
  return rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

/** Taxa anual equivalente a uma taxa mensal composta. */
export function yearlyRate(monthly: number): number {
  return ((1 + monthly / 100) ** 12 - 1) * 100;
}

function DebtForm({
  debt,
  defaultGroup,
  today,
  onSubmit,
  onCancel,
}: {
  debt: Debt | null;
  defaultGroup?: DebtGroup;
  today: string;
  onSubmit: (input: DebtInput) => Promise<void>;
  onCancel: () => void;
}) {
  const initialGroup = debt ? groupOf(debt.type).value : (defaultGroup ?? "loan");
  const [group, setGroup] = useState<DebtGroup>(initialGroup);
  const [type, setType] = useState<DebtType>(
    (debt?.type as DebtType) ??
      debtGroups.find((item) => item.value === initialGroup)!.types[0]!.value,
  );
  const [name, setName] = useState(debt?.name ?? "");
  const [creditor, setCreditor] = useState(debt?.creditor ?? "");
  const [originalAmount, setOriginalAmount] = useState(debt?.originalAmount ?? 0);
  const [currentBalance, setCurrentBalance] = useState(debt?.currentBalance ?? 0);
  const [balanceTouched, setBalanceTouched] = useState(Boolean(debt));
  const [rateText, setRateText] = useState(debt ? formatRate(debt.monthlyRate) : "");
  const [countText, setCountText] = useState(
    debt?.installmentCount ? String(debt.installmentCount) : "",
  );
  const [installmentAmount, setInstallmentAmount] = useState(debt?.installmentAmount ?? 0);
  const [startDate, setStartDate] = useState(debt?.startDate ?? today);
  const [endDate, setEndDate] = useState(debt?.endDate ?? "");
  const [endTouched, setEndTouched] = useState(Boolean(debt?.endDate));
  const [nextDueDate, setNextDueDate] = useState(debt?.nextDueDate ?? addMonths(today, 1));
  const [amortization, setAmortization] = useState<DebtInput["amortization"]>(
    debt?.amortization ?? (initialGroup === "financing" ? "sac" : "price"),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rate = rateText.trim() === "" ? 0 : parseRate(rateText);
  const count = countText.trim() === "" ? null : Number(countText);
  const balance = balanceTouched ? currentBalance : originalAmount;
  const suggestedEnd =
    count && count > 0 && Number.isInteger(count) ? addMonths(startDate, count) : "";
  const effectiveEnd = endTouched ? endDate : suggestedEnd;
  // Parcela sugerida pela taxa e pelo prazo (sobre o valor inicial).
  const suggestedPayment =
    count && count > 0 && Number.isFinite(rate) && originalAmount > 0
      ? amortization === "sac"
        ? Math.ceil(originalAmount / count) + monthlyInterest(originalAmount, rate)
        : pricePayment(originalAmount, amortization === "none" ? 0 : rate, count)
      : 0;

  function selectGroup(value: DebtGroup) {
    setGroup(value);
    setType(debtGroups.find((item) => item.value === value)!.types[0]!.value);
    if (!debt) setAmortization(value === "financing" ? "sac" : "price");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    const local: Record<string, string> = {};
    if (!Number.isFinite(rate)) local.monthlyRate = "Use só números, como 1,99.";
    if (count !== null && (!Number.isInteger(count) || count < 1 || count > 600))
      local.installmentCount = "Informe um número de 1 a 600.";
    if (amortization === "sac" && count === null)
      local.installmentCount = "Nas parcelas decrescentes, informe o número de parcelas.";
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name:
          name.trim() ||
          (debtGroups
            .find((item) => item.value === group)!
            .types.find((item) => item.value === type)?.label ??
            "Dívida"),
        creditor: creditor.trim(),
        type,
        originalAmount,
        currentBalance: balance,
        monthlyRate: amortization === "none" ? 0 : rate,
        cetYearly: debt?.cetYearly ?? null,
        amortization,
        installmentAmount: installmentAmount > 0 ? installmentAmount : null,
        installmentCount: count,
        startDate,
        nextDueDate: nextDueDate || null,
        endDate: effectiveEnd || null,
        linkedAssetId: debt?.linkedAssetId ?? null,
      });
    } catch (error) {
      if (error instanceof DataError && Object.keys(error.fields).length > 0)
        setErrors(error.fields);
      else setFormError(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const groupInfo = debtGroups.find((item) => item.value === group)!;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-medium">Tipo</legend>
        <div role="radiogroup" aria-label="Tipo" className="flex flex-wrap gap-2">
          {debtGroups.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={group === option.value}
              onClick={() => selectGroup(option.value)}
              className={cn(
                "inline-flex h-control-sm cursor-pointer items-center gap-1.5 rounded-full border pr-3 pl-1 text-label font-medium",
                group === option.value
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
      {groupInfo.types.length > 1 ? (
        <SelectField
          label="Modalidade"
          value={type}
          options={groupInfo.types}
          onChange={(event) => setType(event.target.value as DebtType)}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nome"
          maxLength={60}
          placeholder={groupInfo.types.find((item) => item.value === type)?.label}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
        />
        <TextField
          label="Credor"
          maxLength={60}
          placeholder="Banco, loja ou pessoa"
          value={creditor}
          onChange={(event) => setCreditor(event.target.value)}
          error={errors.creditor}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField
          label="Valor inicial"
          value={originalAmount}
          onChange={setOriginalAmount}
          error={errors.originalAmount}
          hint="Quanto você pegou ou financiou."
        />
        <MoneyField
          label="Saldo atual"
          value={balance}
          onChange={(value) => {
            setCurrentBalance(value);
            setBalanceTouched(true);
          }}
          error={errors.currentBalance}
          hint="Quanto falta pagar hoje."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Como são as parcelas"
          value={amortization}
          options={Object.entries(amortizationLabels).map(([value, label]) => ({ value, label }))}
          onChange={(event) => setAmortization(event.target.value as DebtInput["amortization"])}
        />
        {amortization !== "none" ? (
          <TextField
            label="Taxa de juros (% ao mês)"
            inputMode="decimal"
            placeholder="0,00"
            value={rateText}
            onChange={(event) => setRateText(event.target.value)}
            error={errors.monthlyRate}
            hint={
              Number.isFinite(rate) && rate > 0
                ? `Equivale a ${formatRate(Math.round(yearlyRate(rate) * 100) / 100)}% ao ano.`
                : "Está no contrato ou na fatura."
            }
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Número de parcelas"
          inputMode="numeric"
          placeholder="Ex.: 48"
          value={countText}
          onChange={(event) => setCountText(event.target.value.replace(/\D/g, ""))}
          error={errors.installmentCount}
          hint={
            group === "card" && type === "revolving_credit"
              ? "No rotativo, deixe em branco."
              : undefined
          }
        />
        <div className="flex flex-col gap-1.5">
          <MoneyField
            label={amortization === "sac" ? "Valor da próxima parcela" : "Valor da parcela"}
            value={installmentAmount}
            onChange={setInstallmentAmount}
            error={errors.installmentAmount}
            hint={
              suggestedPayment > 0 && suggestedPayment !== installmentAmount
                ? `Pela taxa e pelo prazo, a parcela seria ${formatMoney(suggestedPayment)}.`
                : undefined
            }
          />
          {suggestedPayment > 0 && suggestedPayment !== installmentAmount ? (
            <Button
              size="sm"
              variant="tertiary"
              className="self-start"
              onClick={() => setInstallmentAmount(suggestedPayment)}
            >
              Usar {formatMoney(suggestedPayment)}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Data de início"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={errors.startDate}
        />
        <TextField
          label="Próximo vencimento"
          type="date"
          value={nextDueDate}
          onChange={(event) => setNextDueDate(event.target.value)}
          error={errors.nextDueDate}
        />
        <TextField
          label="Data final"
          type="date"
          value={effectiveEnd}
          onChange={(event) => {
            setEndDate(event.target.value);
            setEndTouched(true);
          }}
          error={errors.endDate}
          hint={!endTouched && suggestedEnd ? "Calculada pelo número de parcelas." : undefined}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {debt ? "Salvar alterações" : "Cadastrar dívida"}
        </Button>
      </div>
    </form>
  );
}
