import { CircleCheck, Clock, TrendingUp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DebtStatus } from "../types";

export const debtStatusInfo = {
  active: { label: "Em dia", tone: "success", icon: Clock },
  overdue: { label: "Vencida", tone: "danger", icon: TriangleAlert },
  growing: { label: "Crescendo", tone: "danger", icon: TrendingUp },
  paid_off: { label: "Quitada", tone: "success", icon: CircleCheck },
} as const;

export function DebtStatusBadge({ status }: { status: DebtStatus }) {
  const info = debtStatusInfo[status];
  const Icon = info.icon;
  return (
    <Badge tone={info.tone} icon={<Icon aria-hidden="true" />}>
      {info.label}
    </Badge>
  );
}

const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-03-10" → "mar. de 2026". */
export function formatMonthYear(date: string): string {
  return monthFormat.format(new Date(`${date.slice(0, 7)}-01T12:00:00Z`));
}

export function formatMonths(months: number): string {
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearsText = `${years} ${years === 1 ? "ano" : "anos"}`;
  return rest ? `${yearsText} e ${rest} ${rest === 1 ? "mês" : "meses"}` : yearsText;
}
