"use client";

import { formatMoney, type Cents } from "@finance-ia/shared";
import { cn } from "@/lib/cn";
import { usePrivacy } from "@/providers/privacy-provider";

export interface AmountProps {
  cents: Cents;
  /** "income" mostra "+" em verde; "expense" mostra "−" em tom neutro. */
  kind?: "neutral" | "income" | "expense";
  className?: string;
}

/** Valor monetário com algarismos tabulares, respeitando o modo "ocultar valores". */
export function Amount({ cents, kind = "neutral", className }: AmountProps) {
  const { hideValues } = usePrivacy();
  const value = kind === "expense" ? -Math.abs(cents) : cents;
  const text = formatMoney(value, { signed: kind === "income", hidden: hideValues });

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular",
        kind === "income" && "text-income",
        kind === "expense" && "text-expense",
        className,
      )}
    >
      {text}
    </span>
  );
}
