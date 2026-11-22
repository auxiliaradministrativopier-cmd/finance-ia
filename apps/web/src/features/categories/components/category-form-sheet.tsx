"use client";

import type { CategoryType } from "@finance-ia/shared";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CategoryIcon, categoryIcons } from "@/components/ui/category-icon";
import { Chip } from "@/components/ui/chip";
import { ColorPicker } from "@/components/ui/color-picker";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { DataError } from "@/data/errors";
import { cn } from "@/lib/cn";
import type { Category } from "../use-categories";

export interface CategoryFormValues {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  essential: boolean;
}

export interface CategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categoria em edição; sem ela, o formulário cria uma nova. */
  category: Category | null;
  defaultType: CategoryType;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  defaultType,
  onSubmit,
}: CategoryFormSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Editar categoria" : "Nova categoria"}
      description="Organize seus lançamentos do seu jeito."
    >
      {/* A chave reinicia o formulário a cada abertura. */}
      {open ? (
        <CategoryForm
          key={category?.id ?? `new-${defaultType}`}
          category={category}
          defaultType={defaultType}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function CategoryForm({
  category,
  defaultType,
  onSubmit,
  onCancel,
}: Pick<CategoryFormSheetProps, "category" | "defaultType" | "onSubmit"> & {
  onCancel: () => void;
}) {
  const [values, setValues] = useState<CategoryFormValues>({
    name: category?.name ?? "",
    type: (category?.type as CategoryType | undefined) ?? defaultType,
    icon: category?.icon ?? "ellipsis",
    color: category?.color ?? "chart-1",
    essential: category?.essential ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(values);
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

      <div className="flex items-center gap-3 rounded-lg bg-surface-sunken p-3">
        <CategoryIcon icon={values.icon} color={values.color} />
        <span className="text-body font-medium">{values.name.trim() || "Prévia da categoria"}</span>
      </div>

      <TextField
        label="Nome"
        name="name"
        maxLength={40}
        value={values.name}
        onChange={(event) => {
          setValues((current) => ({ ...current, name: event.target.value }));
          setErrors((current) => ({ ...current, name: "" }));
        }}
        error={errors.name || undefined}
      />

      {!category ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label font-medium">Tipo</legend>
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((type) => (
              <Chip
                key={type}
                selected={values.type === type}
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    type,
                    essential: type === "expense" && current.essential,
                  }))
                }
              >
                {type === "expense" ? "Despesa" : "Receita"}
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-medium">Ícone</legend>
        <div role="radiogroup" aria-label="Ícone" className="grid grid-cols-7 gap-2 sm:grid-cols-9">
          {Object.entries(categoryIcons).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={values.icon === name}
              aria-label={name}
              onClick={() => setValues((current) => ({ ...current, icon: name }))}
              className={cn(
                "flex aspect-square cursor-pointer items-center justify-center rounded-md border text-ink-muted hover:bg-surface-sunken",
                values.icon === name ? "border-brand bg-brand-soft text-brand" : "border-line",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>

      <ColorPicker
        value={values.color}
        onChange={(color) => setValues((current) => ({ ...current, color }))}
      />

      {values.type === "expense" ? (
        <Switch
          label="Gasto essencial"
          description="Moradia, mercado, saúde… Ajuda a calcular sua saúde financeira."
          checked={values.essential}
          onCheckedChange={(essential) => setValues((current) => ({ ...current, essential }))}
        />
      ) : null}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {category ? "Salvar alterações" : "Criar categoria"}
        </Button>
      </div>
    </form>
  );
}
