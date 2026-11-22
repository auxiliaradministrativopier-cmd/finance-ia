import { Flag, ShieldCheck } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMonthLong, formatPercent } from "../data/format";
import type { DashboardData } from "../data/types";
import { ListCard } from "./list-card";

export function GoalsList({ data }: { data: DashboardData }) {
  return (
    <ListCard
      id="metas"
      title="Metas financeiras"
      action={{ label: "Ver metas", href: "/planejar/metas" }}
    >
      {data.goals.length === 0 ? (
        <p className="py-6 text-center text-body text-ink-muted">
          Nenhuma meta ainda. Comece pela sua reserva de emergência.
        </p>
      ) : null}
      <ul className="flex flex-col">
        {data.goals.map((goal) => {
          const ratio = goal.target > 0 ? goal.current / goal.target : 0;
          const Icon = goal.name.toLowerCase().includes("reserva") ? ShieldCheck : Flag;
          return (
            <li
              key={goal.id}
              className="flex flex-col gap-2 border-b border-line py-3 last:border-0"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium">{goal.name}</span>
                  <span className="text-caption text-ink-muted">
                    <Amount cents={goal.current} /> de <Amount cents={goal.target} />
                    {goal.targetMonth ? ` · até ${formatMonthLong(goal.targetMonth)}` : null}
                  </span>
                </div>
                <span className="shrink-0 text-body font-semibold tabular">
                  {formatPercent(ratio)}
                </span>
              </div>
              <ProgressBar value={Math.round(ratio * 100)} label={`Progresso de ${goal.name}`} />
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}
