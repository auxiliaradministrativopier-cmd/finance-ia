import { CircleCheck, TriangleAlert } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDayMonth } from "@/lib/format";
import type { DashboardData } from "../data/types";
import { ListCard } from "./list-card";

/** Provisionamentos no Dashboard: quanto guardar por mês e os próximos a vencer. */
export function ProvisionsCard({ data }: { data: DashboardData }) {
  const { provisions } = data;
  return (
    <ListCard
      id="provisionamentos"
      title="Provisionamentos"
      action={{ label: "Ver todos", href: "/planejar/provisionamentos" }}
    >
      {provisions.items.length === 0 ? (
        <p className="py-6 text-center text-body text-ink-muted">
          Nenhum provisionamento. Separe aos poucos o dinheiro do IPVA, do seguro ou da próxima
          viagem.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-0.5 pb-2">
            <span className="text-caption text-ink-muted">Guarde por mês</span>
            <Amount cents={provisions.monthlyNeeded} className="text-amount-lg font-semibold" />
            <span className="text-caption text-ink-muted">
              <Amount cents={provisions.saved} /> reservados de <Amount cents={provisions.target} />
            </span>
          </div>
          <ul className="flex flex-col">
            {provisions.items.map((item) => {
              const attention = item.status === "behind" || item.status === "overdue";
              return (
                <li key={item.id} className="flex flex-col gap-1.5 border-t border-line py-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-body font-medium">
                      {item.name}
                    </span>
                    <span className="text-caption text-ink-muted">
                      {formatDayMonth(item.dueDate)}
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.round(item.progress * 100)}
                    label={`Progresso de ${item.name}`}
                  />
                  <span
                    className={
                      attention
                        ? "flex items-center gap-1 text-caption text-warning"
                        : "flex items-center gap-1 text-caption text-ink-muted"
                    }
                  >
                    {attention ? (
                      <TriangleAlert className="size-3.5" aria-hidden="true" />
                    ) : item.status === "completed" ? (
                      <CircleCheck className="size-3.5 text-brand" aria-hidden="true" />
                    ) : null}
                    {item.status === "completed" ? (
                      "Valor completo"
                    ) : (
                      <>
                        {attention
                          ? item.status === "overdue"
                            ? "Vencido · "
                            : "Atrasado · "
                          : ""}
                        <Amount cents={item.monthlyNeeded} />
                        {item.status === "overdue" ? " para completar" : " por mês"}
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </ListCard>
  );
}
