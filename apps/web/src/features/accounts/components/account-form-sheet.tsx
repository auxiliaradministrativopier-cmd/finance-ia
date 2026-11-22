"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import type { AccountInput } from "@/data/models/entities";
import type { Account } from "@/features/cash-flow/types";

export const accountTypes = [
  { value: "checking", label: "Conta corrente", icon: "landmark" },
  { value: "savings", label: "Poupança", icon: "piggy-bank" },
  { value: "digital", label: "Conta digital", icon: "smartphone" },
  { value: "wallet", label: "Dinheiro", icon: "wallet" },
  { value: "benefit", label: "Benefício (VR/VA)", icon: "utensils" },
  { value: "other", label: "Outra", icon: "landmark" },
] as const;

export function AccountFormSheet({
  open,
  onOpenChange,
  account,
  today,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  today: string;
  onSubmit: (input: AccountInput) => Promise<void>;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={account ? "Editar conta" : "Nova conta"}
      description="Onde você recebe, guarda e paga."
    >
      {open ? (
        <AccountForm
          key={account?.id ?? "new"}
          account={account}
          today={today}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function AccountForm({
  account,
  today,
  onSubmit,
  onCancel,
}: {
  account: Account | null;
  today: string;
  onSubmit: (input: AccountInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<string>(account?.type ?? "checking");
  const [institutionName, setInstitutionName] = useState(account?.institutionName ?? "");
  const [balance, setBalance] = useState(Math.abs(account?.initialBalance ?? 0));
  const [negative, setNegative] = useState((account?.initialBalance ?? 0) < 0);
  const [balanceDate, setBalanceDate] = useState(account?.initialBalanceDate ?? today);
  const [overdraft, setOverdraft] = useState(account?.overdraftLimit ?? 0);
  const [includeInTotal, setIncludeInTotal] = useState(account?.includeInTotal ?? true);
  const [color, setColor] = useState(account?.color ?? "chart-2");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await onSubmit({
        name,
        type: type as AccountInput["type"],
        institutionName: institutionName.trim() || null,
        color,
        icon: accountTypes.find((option) => option.value === type)?.icon ?? "landmark",
        initialBalance: negative ? -balance : balance,
        initialBalanceDate: balanceDate,
        overdraftLimit: overdraft > 0 ? overdraft : null,
        includeInTotal,
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
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <TextField
        label="Nome"
        placeholder="Ex.: Nubank"
        maxLength={60}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Tipo"
          value={type}
          options={accountTypes.map(({ value, label }) => ({ value, label }))}
          onChange={(event) => setType(event.target.value)}
        />
        <TextField
          label="Banco (opcional)"
          maxLength={60}
          value={institutionName}
          onChange={(event) => setInstitutionName(event.target.value)}
          error={errors.institutionName}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField
          label="Saldo inicial"
          value={balance}
          onChange={setBalance}
          error={errors.initialBalance}
        />
        <TextField
          label="Data do saldo"
          type="date"
          value={balanceDate}
          onChange={(event) => setBalanceDate(event.target.value)}
          error={errors.initialBalanceDate}
        />
      </div>
      <Switch
        label="O saldo está negativo"
        description="Por exemplo, usando o cheque especial."
        checked={negative}
        onCheckedChange={setNegative}
      />
      <MoneyField
        label="Limite do cheque especial (opcional)"
        value={overdraft}
        onChange={setOverdraft}
        error={errors.overdraftLimit}
      />
      <Switch
        label="Incluir no saldo total"
        description="Desligue para contas que você só acompanha."
        checked={includeInTotal}
        onCheckedChange={setIncludeInTotal}
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {account ? "Salvar alterações" : "Criar conta"}
        </Button>
      </div>
    </form>
  );
}
