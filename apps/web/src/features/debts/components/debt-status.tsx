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
