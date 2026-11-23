"use client";

import { ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ProgressBar } from "@/components/ui/progress-bar";
import { groupOf, typeLabel } from "../kinds";
import type { DebtView } from "../types";
import { DebtStatusBadge } from "./debt-status";
import { formatMonthYear, formatRate } from "@/lib/format";

export function DebtCard({
  view,
  priority,
  onPay,
  onEdit,
  onRemove,
}: {
  view: DebtView;
  /** Posição na ordem sugerida de quitação (1 = maior juros). */
  priority: number | null;
  onPay: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { debt } = view;
  const group = groupOf(debt.type);
  const percent = Math.round(view.percentPaid * 100);
  const href = `/patrimonio/dividas/${debt.id}`;

  return (
    <Card as="article" aria-label={debt.name} className="gap-4">
      <div className="flex items-start gap-3">
        <CategoryIcon icon={group.icon} color={group.color} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate text-h3">
            <Link href={href} className="hover:underline">
              {debt.name}
            </Link>
          </h3>
          <span className="truncate text-caption text-ink-muted">
            {debt.creditor} · {typeLabel(debt.type)}
          </span>
        </div>
        <DebtStatusBadge status={view.status} />
        <DropdownMenu
          triggerLabel={`Mais ações de ${debt.name}`}
          trigger={
            <span className="flex size-control-sm items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </span>
          }
          items={[
            {
              type: "action",
              label: "Editar",
              icon: <Pencil aria-hidden="true" />,
              onSelect: onEdit,
            },
            { type: "separator" },
            {
              type: "action",
              label: "Excluir",
              tone: "danger",
              icon: <Trash2 aria-hidden="true" />,
              onSelect: onRemove,
            },
          ]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-caption text-ink-muted">Saldo devedor</span>
          <span className="text-caption text-ink-muted tabular">{percent}% pago</span>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <Amount cents={debt.currentBalance} className="text-amount-lg font-semibold" />
          <span className="text-body text-ink-muted">
            de <Amount cents={debt.originalAmount} />
          </span>
        </p>
        <ProgressBar value={percent} label={`Percentual pago de ${debt.name}`} />
      </div>

      <dl className="grid grid-cols-3 gap-3 text-body">
        <div className="flex flex-col">
          <dt className="text-caption text-ink-muted">Parcela</dt>
          <dd>
            {view.payment > 0 ? <Amount cents={view.payment} className="font-medium" /> : "—"}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-caption text-ink-muted">Juros</dt>
          <dd className="font-medium tabular">
            {debt.amortization === "none" ? "Sem juros" : `${formatRate(debt.monthlyRate)}% a.m.`}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-caption text-ink-muted">Termina</dt>
          <dd className="font-medium">
            {view.status === "paid_off"
              ? "Quitada"
              : view.projectedEndDate
                ? formatMonthYear(view.projectedEndDate)
                : "Não termina"}
          </dd>
        </div>
      </dl>

      {view.status === "growing" ? (
        <p className="text-body text-danger">
          A parcela não cobre os juros de <Amount cents={view.monthInterest} />. Assim o saldo só
          cresce.
        </p>
      ) : priority === 1 && view.status !== "paid_off" ? (
        <p className="text-body text-ink">
          Tem os juros mais altos. Sobrou dinheiro? Antecipe esta primeiro.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {view.status !== "paid_off" ? (
          <Button size="sm" onClick={onPay}>
            Registrar pagamento
          </Button>
        ) : null}
        <Link
          href={href}
          className="inline-flex h-control-sm items-center gap-1 rounded-md px-2 text-label font-semibold text-brand hover:bg-brand-soft"
        >
          Ver evolução e simular
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
