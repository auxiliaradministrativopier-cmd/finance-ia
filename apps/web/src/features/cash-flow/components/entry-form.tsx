"use client";

import { installmentSchedule, invoiceFor } from "@finance-ia/finance-core";
import { formatMoney } from "@finance-ia/shared";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Chip } from "@/components/ui/chip";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import { cn } from "@/lib/cn";
import { formatMonthTitle } from "@/lib/format";
import type {
  Account,
  Card,
  Category,
  ChangeScope,
  EntryDraft,
  EntryType,
  RepeatOption,
  Transaction,
} from "../types";
import { QuickAccountForm } from "./quick-account-form";
import { ScopePicker } from "./scope-picker";

export interface EntryFormProps {
  uid: string;
  today: string;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  /** Lançamento em edição; sem ele, o formulário cria um novo. */
  transaction: Transaction | null;
  defaultType: EntryType;
  onCreate: (draft: EntryDraft) => Promise<void>;
  onUpdate: (changes: Partial<EntryDraft>, scope: ChangeScope) => Promise<void>;
  onDelete: (scope: ChangeScope) => Promise<void>;
  onCancel: () => void;
}

const sourceValue = (kind: "account" | "card", id: string) => `${kind}:${id}`;

/** Formulário de lançamento (tela 19): cadastro e edição de receitas e despesas. */
export function EntryForm(props: EntryFormProps) {
  const { transaction, today, accounts, cards, categories } = props;
  const editing = transaction !== null;
  const grouped = Boolean(transaction?.installmentPlanId || transaction?.recurrenceId);

  const activeAccounts = accounts.filter((account) => !account.archived);
  const activeCards = cards.filter((card) => !card.archived);

  const [type, setType] = useState<EntryType>(
    (transaction?.type as EntryType | undefined) ?? props.defaultType,
  );
  const [amount, setAmount] = useState(transaction?.amount ?? 0);
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [date, setDate] = useState(transaction?.date ?? today);
  const [paid, setPaid] = useState(transaction ? transaction.status === "paid" : true);
  const [paidTouched, setPaidTouched] = useState(editing);
  const [source, setSource] = useState(() => {
    if (transaction?.cardId) return sourceValue("card", transaction.cardId);
    const accountId = transaction?.accountId ?? activeAccounts[0]?.id;
    return accountId ? sourceValue("account", accountId) : "";
  });
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [repeat, setRepeat] = useState<RepeatOption>({ kind: "none" });
  const [scope, setScope] = useState<ChangeScope>("one");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Data futura sugere "previsto"; o usuário pode mudar.
  const effectivePaid = paidTouched ? paid : date <= today;

  const typeCategories = categories.filter(
    (category) => category.type === type && (!category.archived || category.id === categoryId),
  );
  const visibleCategories = showAllCategories ? typeCategories : typeCategories.slice(0, 8);
  const [sourceKind, sourceId] = source.split(":") as ["account" | "card" | "", string | undefined];
  const selectedCard =
    sourceKind === "card" ? activeCards.find((card) => card.id === sourceId) : undefined;

  const sourceOptions = [
    ...activeAccounts.map((account) => ({
      value: sourceValue("account", account.id),
      label: account.name,
    })),
    ...(type === "expense"
      ? activeCards.map((card) => ({
          value: sourceValue("card", card.id),
          label: `Cartão ${card.name}`,
        }))
      : []),
  ];

  // Prévia do parcelamento (cálculo barato: refeito a cada renderização).
  const preview = (() => {
    if (repeat.kind !== "installments" || amount <= 0) return null;
    const schedule = installmentSchedule({
      totalCents: amount,
      count: repeat.count,
      firstDate: date,
      card: selectedCard ?? null,
    });
    const first = schedule[0];
    const last = schedule.at(-1);
    const per = schedule[1]?.amount ?? first?.amount ?? 0;
    const text = `${repeat.count}x de ${formatMoney(per)}${first && first.amount !== per ? ` (1ª de ${formatMoney(first.amount)})` : ""}`;
    const range =
      first?.invoiceMonth && last?.invoiceMonth
        ? ` · faturas de ${formatMonthTitle(first.invoiceMonth).toLowerCase()} a ${formatMonthTitle(last.invoiceMonth).toLowerCase()}`
        : "";
    return text + range;
  })();

  const invoiceHint =
    selectedCard && repeat.kind !== "installments"
      ? `Entra na fatura de ${formatMonthTitle(invoiceFor(date, selectedCard).invoiceMonth).toLowerCase()}.`
      : undefined;

  function fail(error: unknown) {
    if (error instanceof DataError && Object.keys(error.fields).length > 0) setErrors(error.fields);
    else setFormError(error instanceof Error ? error.message : "Não foi possível salvar.");
  }

  function localErrors(): Record<string, string> {
    const found: Record<string, string> = {};
    if (amount <= 0) found.amount = "Informe um valor maior que zero.";
    if (!description.trim()) found.description = "A descrição é obrigatória.";
    if (!categoryId) found.categoryId = "Escolha uma categoria.";
    if (!sourceId)
      found.source =
        type === "income"
          ? "Escolha a conta que recebe o valor."
          : "Escolha uma conta ou um cartão.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) found.date = "Informe uma data válida.";
    if (repeat.kind === "recurring" && repeat.endDate && repeat.endDate < date)
      found.endDate = "A data final precisa ser depois do início.";
    return found;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const found = localErrors();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const values = {
      amount,
      description: description.trim(),
      date,
      status: effectivePaid ? ("paid" as const) : ("pending" as const),
      categoryId,
      accountId: sourceKind === "account" ? (sourceId ?? null) : null,
      cardId: sourceKind === "card" ? (sourceId ?? null) : null,
      notes: notes.trim() || null,
    };
    setSaving(true);
    try {
      if (transaction) await props.onUpdate(values, grouped ? scope : "one");
      else await props.onCreate({ ...values, type, repeat });
    } catch (error) {
      fail(error);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await props.onDelete(grouped ? scope : "one");
    } catch (error) {
      fail(error);
      setSaving(false);
    }
  }

  if (activeAccounts.length === 0 && !editing) {
    return (
      <QuickAccountForm
        uid={props.uid}
        today={today}
        onCreated={(id) => setSource(sourceValue("account", id))}
      />
    );
  }

  const noun = type === "income" ? "receita" : "despesa";

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      {!editing ? (
        <div role="group" aria-label="Tipo de lançamento" className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={type === option}
              onClick={() => {
                setType(option);
                setCategoryId("");
                if (option === "income") {
                  setRepeat((current) =>
                    current.kind === "installments" ? { kind: "none" } : current,
                  );
                  if (sourceKind === "card")
                    setSource(
                      activeAccounts[0] ? sourceValue("account", activeAccounts[0].id) : "",
                    );
                }
              }}
              className={cn(
                "flex h-control-md cursor-pointer items-center justify-center gap-2 rounded-md border text-label font-semibold",
                type === option
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line-control text-ink",
              )}
            >
              {option === "expense" ? (
                <ArrowDownCircle className="size-4" aria-hidden="true" />
              ) : (
                <ArrowUpCircle className="size-4" aria-hidden="true" />
              )}
              {option === "expense" ? "Despesa" : "Receita"}
            </button>
          ))}
        </div>
      ) : null}

      <MoneyField
        label="Valor"
        size="lg"
        value={amount}
        onChange={(cents) => {
          setAmount(cents);
          setErrors((e) => ({ ...e, amount: "" }));
        }}
        error={errors.amount || undefined}
        autoFocus={!editing}
      />

      <TextField
        label="Descrição"
        placeholder={type === "income" ? "Ex.: Salário de novembro" : "Ex.: Supermercado"}
        maxLength={120}
        value={description}
        onChange={(event) => {
          setDescription(event.target.value);
          setErrors((e) => ({ ...e, description: "" }));
        }}
        error={errors.description || undefined}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-medium">Categoria</legend>
        <div role="radiogroup" aria-label="Categoria" className="flex flex-wrap gap-2">
          {visibleCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={categoryId === category.id}
              onClick={() => {
                setCategoryId(category.id);
                setErrors((e) => ({ ...e, categoryId: "" }));
              }}
              className={cn(
                "inline-flex h-control-sm cursor-pointer items-center gap-1.5 rounded-full border pr-3 pl-1 text-label font-medium",
                categoryId === category.id
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line-control text-ink hover:bg-surface-sunken",
              )}
            >
              <CategoryIcon icon={category.icon} color={category.color} className="size-6" />
              {category.name}
            </button>
          ))}
          {typeCategories.length > 8 ? (
            <Chip onClick={() => setShowAllCategories((value) => !value)}>
              {showAllCategories ? "Menos" : `Mais ${typeCategories.length - 8}`}
            </Chip>
          ) : null}
        </div>
        {errors.categoryId ? <p className="text-caption text-danger">{errors.categoryId}</p> : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Data"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={errors.date || undefined}
        />
        <SelectField
          label={type === "income" ? "Receber em" : "Pagar com"}
          value={source}
          options={source ? sourceOptions : [{ value: "", label: "Escolha" }, ...sourceOptions]}
          onChange={(event) => {
            setSource(event.target.value);
            setErrors((e) => ({ ...e, source: "", accountId: "" }));
          }}
          hint={errors.source || errors.accountId ? undefined : invoiceHint}
        />
      </div>
      {errors.source || errors.accountId ? (
        <p className="-mt-3 text-caption text-danger">{errors.source || errors.accountId}</p>
      ) : null}

      <Switch
        label={type === "income" ? "Já recebi" : "Já paguei"}
        description={
          effectivePaid ? "Entra no saldo agora." : "Fica como previsto até você confirmar."
        }
        checked={effectivePaid}
        onCheckedChange={(value) => {
          setPaid(value);
          setPaidTouched(true);
        }}
      />

      {!editing ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-label font-medium">Repetição</legend>
          <div role="radiogroup" aria-label="Repetição" className="flex flex-wrap gap-2">
            <Chip
              role="radio"
              aria-checked={repeat.kind === "none"}
              aria-pressed={undefined}
              selected={repeat.kind === "none"}
              onClick={() => setRepeat({ kind: "none" })}
            >
              Não repete
            </Chip>
            {type === "expense" ? (
              <Chip
                role="radio"
                aria-checked={repeat.kind === "installments"}
                aria-pressed={undefined}
                selected={repeat.kind === "installments"}
                onClick={() => setRepeat({ kind: "installments", count: 2 })}
              >
                Parcelar
              </Chip>
            ) : null}
            <Chip
              role="radio"
              aria-checked={repeat.kind === "recurring"}
              aria-pressed={undefined}
              selected={repeat.kind === "recurring"}
              onClick={() => setRepeat({ kind: "recurring", frequency: "monthly", endDate: null })}
            >
              Repetir
            </Chip>
          </div>
          {repeat.kind === "installments" ? (
            <div className="flex flex-col gap-2">
              <SelectField
                label="Número de parcelas"
                value={String(repeat.count)}
                options={Array.from({ length: 71 }, (_, index) => ({
                  value: String(index + 2),
                  label: `${index + 2}x`,
                }))}
                onChange={(event) =>
                  setRepeat({ kind: "installments", count: Number(event.target.value) })
                }
              />
              {preview ? (
                <p className="rounded-md bg-surface-sunken px-3 py-2 text-caption text-ink">
                  {preview}
                </p>
              ) : null}
            </div>
          ) : null}
          {repeat.kind === "recurring" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Frequência"
                value={repeat.frequency}
                options={[
                  { value: "monthly", label: "Todo mês" },
                  { value: "weekly", label: "Toda semana" },
                  { value: "yearly", label: "Todo ano" },
                ]}
                onChange={(event) =>
                  setRepeat({
                    ...repeat,
                    frequency: event.target.value as "weekly" | "monthly" | "yearly",
                  })
                }
              />
              <TextField
                label="Até (opcional)"
                type="date"
                value={repeat.endDate ?? ""}
                onChange={(event) => setRepeat({ ...repeat, endDate: event.target.value || null })}
                error={errors.endDate || undefined}
                hint="Sem data, repete até você encerrar."
              />
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <TextField
        label="Observações (opcional)"
        maxLength={500}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      {editing && grouped ? (
        <ScopePicker
          legend={
            transaction.installmentPlanId
              ? "Aplicar a quais parcelas?"
              : "Aplicar a quais ocorrências?"
          }
          value={scope}
          onChange={setScope}
        />
      ) : null}

      {confirmDelete ? (
        <Alert
          tone="warning"
          title={`Excluir ${grouped && scope !== "one" ? "estes lançamentos" : `esta ${noun}`}?`}
        >
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="danger" size="sm" loading={saving} onClick={remove}>
              Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </div>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        {editing ? (
          <Button
            variant="ghost"
            className="text-danger hover:text-danger"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 aria-hidden="true" />
            Excluir
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={props.onCancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving && !confirmDelete}>
            {editing ? "Salvar alterações" : `Salvar ${noun}`}
          </Button>
        </div>
      </div>
    </form>
  );
}
