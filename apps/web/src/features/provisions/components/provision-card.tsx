"use client";

import {
  CircleCheck,
  History,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { DropdownMenu, type DropdownItem } from "@/components/ui/dropdown-menu";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatShortDate } from "@/lib/format";
import { kindInfo } from "../kinds";
import type { ProvisionView } from "../types";

export const statusInfo = {
  on_track: { label: "No ritmo", tone: "success", icon: CircleCheck },
  behind: { label: "Atrasado", tone: "warning", icon: TriangleAlert },
  completed: { label: "Concluído", tone: "success", icon: CircleCheck },
  overdue: { label: "Vencido", tone: "danger", icon: TriangleAlert },
} as const;

function monthsText(months: number): string {
  if (months <= 0) return "venceu";
  if (months === 1) return "vence este mês";
  return `vence em ${months} meses`;
}

export interface ProvisionCardProps {
  view: ProvisionView;
  onDeposit: () => void;
  onWithdraw: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onRenew: () => void;
}

/** Cartão de um provisionamento: progresso, quanto guardar por mês e ações. */
export function ProvisionCard({
  view,
  onDeposit,
  onWithdraw,
  onHistory,
  onEdit,
  onRemove,
  onRenew,
}: ProvisionCardProps) {
  const { provision, plan, balance } = view;
  const info = kindInfo(provision.kind);
  const status = statusInfo[plan.status];
  const StatusIcon = status.icon;
  const canRenew =
    provision.repeatsYearly && (plan.status === "completed" || plan.status === "overdue");

  const menu: DropdownItem[] = [
    {
      type: "action",
      label: "Histórico de aportes",
      icon: <History aria-hidden="true" />,
      onSelect: onHistory,
    },
    {
      type: "action",
      label: "Usar dinheiro guardado",
      icon: <Minus aria-hidden="true" />,
      onSelect: onWithdraw,
    },
    { type: "action", label: "Editar", icon: <Pencil aria-hidden="true" />, onSelect: onEdit },
    { type: "separator" },
    {
      type: "action",
      label: "Excluir",
      tone: "danger",
      icon: <Trash2 aria-hidden="true" />,
      onSelect: onRemove,
    },
  ];

  return (
    <Card as="article" aria-label={provision.name} className="gap-4">
      <div className="flex items-start gap-3">
        <CategoryIcon icon={info.icon} color={info.color} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate text-h3">{provision.name}</h3>
          <span className="text-caption text-ink-muted">
            {formatShortDate(provision.dueDate)} ·{" "}
            {monthsText(plan.status === "overdue" ? 0 : plan.monthsLeft)}
          </span>
        </div>
        <Badge tone={status.tone} icon={<StatusIcon aria-hidden="true" />}>
          {status.label}
        </Badge>
        <DropdownMenu
          triggerLabel={`Mais ações de ${provision.name}`}
          trigger={
            <span className="flex size-control-sm items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </span>
          }
          items={menu}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-caption text-ink-muted">Guardado</span>
          <span className="text-caption text-ink-muted tabular">
            {Math.round(plan.progress * 100)}%
          </span>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <Amount cents={balance} className="text-amount-lg font-semibold" />
          <span className="text-body text-ink-muted">
            de <Amount cents={provision.targetAmount} />
          </span>
        </p>
        <ProgressBar
          value={Math.round(plan.progress * 100)}
          label={`Progresso de ${provision.name}`}
        />
      </div>

      {plan.status === "completed" ? (
        <p className="text-body text-ink">Valor completo. O dinheiro está pronto para a data.</p>
      ) : (
        <p className="text-body text-ink">
          Guarde <Amount cents={plan.monthlyNeeded} className="font-semibold" />
          {plan.status === "overdue" ? " para quitar o que falta." : " por mês"}
          {plan.status === "behind" ? (
            <span className="block text-caption text-warning">
              Para estar no ritmo, já deveria ter <Amount cents={plan.expectedByNow} /> guardado.
            </span>
          ) : null}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {plan.status !== "completed" ? (
          <Button size="sm" onClick={onDeposit}>
            <Plus aria-hidden="true" />
            Guardar
          </Button>
        ) : null}
        {canRenew ? (
          <Button size="sm" variant="secondary" onClick={onRenew}>
            <RefreshCw aria-hidden="true" />
            Renovar para {Number(provision.dueDate.slice(0, 4)) + 1}
          </Button>
        ) : null}
        <Button size="sm" variant="tertiary" onClick={onHistory}>
          Histórico
        </Button>
      </div>
    </Card>
  );
}
