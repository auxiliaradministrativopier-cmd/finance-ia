"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import type { CardInput } from "@/data/models/entities";
import type { Account, Card } from "@/features/cash-flow/types";

export const brands = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "American Express" },
  { value: "hipercard", label: "Hipercard" },
  { value: "other", label: "Outra" },
] as const;

const days = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1),
  label: `Dia ${index + 1}`,
}));

export function CardFormSheet({
  open,
  onOpenChange,
  card,
  accounts,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card | null;
  accounts: Account[];
  onSubmit: (input: CardInput) => Promise<void>;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={card ? "Editar cartão" : "Novo cartão"}
      description="Nunca pedimos o número completo do cartão."
    >
      {open ? (
        <CardForm
          key={card?.id ?? "new"}
          card={card}
          accounts={accounts}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function CardForm({
  card,
  accounts,
  onSubmit,
  onCancel,
}: {
  card: Card | null;
  accounts: Account[];
  onSubmit: (input: CardInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(card?.name ?? "");
  const [institutionName, setInstitutionName] = useState(card?.institutionName ?? "");
  const [brand, setBrand] = useState<string>(card?.brand ?? "visa");
  const [lastFour, setLastFour] = useState(card?.lastFour ?? "");
  const [limit, setLimit] = useState(card?.limit ?? 0);
  const [closingDay, setClosingDay] = useState(card?.closingDay ?? 3);
  const [dueDay, setDueDay] = useState(card?.dueDay ?? 10);
  const [paymentAccountId, setPaymentAccountId] = useState(card?.paymentAccountId ?? "");
  const [color, setColor] = useState(card?.color ?? "chart-4");
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
        institutionName: institutionName.trim() || null,
        brand: brand as CardInput["brand"],
        lastFour: lastFour.trim() || null,
        limit,
        closingDay,
        dueDay,
        paymentAccountId: paymentAccountId || null,
        color,
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
        placeholder="Ex.: Nubank Roxinho"
        maxLength={60}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Bandeira"
          value={brand}
          options={[...brands]}
          onChange={(event) => setBrand(event.target.value)}
        />
        <TextField
          label="4 últimos dígitos (opcional)"
          inputMode="numeric"
          maxLength={4}
          value={lastFour}
          onChange={(event) => setLastFour(event.target.value.replace(/\D/g, ""))}
          error={errors.lastFour}
        />
      </div>
      <TextField
        label="Banco (opcional)"
        maxLength={60}
        value={institutionName}
        onChange={(event) => setInstitutionName(event.target.value)}
      />
      <MoneyField label="Limite" value={limit} onChange={setLimit} error={errors.limit} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Fechamento da fatura"
          value={String(closingDay)}
          options={days}
          onChange={(event) => setClosingDay(Number(event.target.value))}
          hint="Compras a partir deste dia vão para a fatura seguinte."
        />
        <SelectField
          label="Vencimento"
          value={String(dueDay)}
          options={days}
          onChange={(event) => setDueDay(Number(event.target.value))}
        />
      </div>
      <SelectField
        label="Conta de pagamento (opcional)"
        value={paymentAccountId}
        options={[
          { value: "", label: "Nenhuma" },
          ...accounts
            .filter((a) => !a.archived)
            .map((account) => ({ value: account.id, label: account.name })),
        ]}
        onChange={(event) => setPaymentAccountId(event.target.value)}
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {card ? "Salvar alterações" : "Criar cartão"}
        </Button>
      </div>
    </form>
  );
}
