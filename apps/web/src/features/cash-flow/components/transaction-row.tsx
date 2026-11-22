"use client";

import { Check, CreditCard, Repeat } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { Transaction } from "../types";

export interface TransactionRowProps {
  transaction: Transaction;
  sourceName: string;
  today: string;
  onOpen: () => void;
  onMarkPaid: () => void;
}

/** Linha de lançamento: categoria, descrição, origem, status e valor. */
export function TransactionRow({
  transaction,
  sourceName,
  today,
  onOpen,
  onMarkPaid,
}: TransactionRowProps) {
  const pending = transaction.status !== "paid";
  const overdue = pending && transaction.date < today;
  const income = transaction.type === "income";

  return (
    <li className="flex items-center gap-1 border-b border-line last:border-0">
      <button
        type="button"
        onClick={onOpen}
        className="-mx-1 flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-1 py-3 text-left hover:bg-surface-sunken"
      >
        <CategoryIcon
          icon={transaction.categoryIcon ?? "ellipsis"}
          color={transaction.categoryColor ?? "chart-6"}
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium">{transaction.description}</span>
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption text-ink-muted">
            {transaction.cardId ? <CreditCard className="size-3.5" aria-hidden="true" /> : null}
            <span className="truncate">{sourceName}</span>
            <span aria-hidden="true">·</span>
            <span>{transaction.categoryName}</span>
            {transaction.installmentNumber && transaction.installmentTotal ? (
              <span className="tabular">
                · Parcela {transaction.installmentNumber}/{transaction.installmentTotal}
              </span>
            ) : null}
            {transaction.recurrenceId ? (
              <span className="inline-flex items-center gap-1">
                · <Repeat className="size-3" aria-hidden="true" /> Recorrente
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Amount
            cents={transaction.amount}
            kind={income ? "income" : "expense"}
            className="text-amount font-medium"
          />
          {overdue ? (
            <Badge tone="danger">Atrasado</Badge>
          ) : pending ? (
            <Badge tone="neutral">Previsto</Badge>
          ) : null}
        </span>
      </button>
      {pending ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Marcar "${transaction.description}" como ${income ? "recebido" : "pago"}`}
          title={income ? "Marcar como recebido" : "Marcar como pago"}
          onClick={onMarkPaid}
        >
          <Check aria-hidden="true" />
        </Button>
      ) : (
        <span className="w-control-sm shrink-0" aria-hidden="true" />
      )}
    </li>
  );
}
