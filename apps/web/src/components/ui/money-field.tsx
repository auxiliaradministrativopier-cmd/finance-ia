"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

const formatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Centavos → "1.234,56" (sem o símbolo). */
export function formatCentsInput(cents: number | null): string {
  return formatter.format(Math.abs(cents ?? 0) / 100);
}

/** Texto digitado → centavos, no estilo caixa eletrônico: "12345" → 12345 (R$ 123,45). */
export function parseCentsInput(text: string, max = 100_000_000_000): number {
  const digits = text.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);
  return Math.min(Number(digits || "0"), max);
}

export interface MoneyFieldProps {
  label: string;
  /** Valor em centavos. */
  value: number | null;
  onChange: (cents: number) => void;
  error?: string;
  hint?: string;
  size?: "md" | "lg";
  id?: string;
  autoFocus?: boolean;
}

/** Campo de valor em reais: digita só números e o valor se forma da direita para a esquerda. */
export function MoneyField({
  label,
  value,
  onChange,
  error,
  hint,
  size = "md",
  id,
  autoFocus,
}: MoneyFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-label font-medium text-ink">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-surface px-3 transition-shadow focus-within:border-brand focus-within:shadow-[0_0_0_1px_var(--brand)]",
          size === "lg" ? "h-16" : "h-control-md",
          error ? "border-danger shadow-[0_0_0_1px_var(--danger)]" : "border-line-control",
        )}
      >
        <span className={cn("text-ink-muted", size === "lg" ? "text-h2" : "text-body")}>R$</span>
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={formatCentsInput(value)}
          onChange={(event) => onChange(parseCentsInput(event.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent font-semibold text-ink tabular outline-none",
            size === "lg" ? "text-amount-xl" : "text-amount",
          )}
        />
      </div>
      {message ? (
        <p id={messageId} className={cn("text-caption", error ? "text-danger" : "text-ink-muted")}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
