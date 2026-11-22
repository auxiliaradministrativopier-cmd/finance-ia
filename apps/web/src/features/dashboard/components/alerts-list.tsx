import { ChevronRight, CircleAlert, CircleCheck, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { AlertTone, DashboardData } from "../data/types";
import { ListCard } from "./list-card";

const tones: Record<
  AlertTone,
  { icon: React.ComponentType<{ className?: string }>; label: string; className: string }
> = {
  danger: { icon: CircleAlert, label: "Urgente", className: "bg-danger-soft text-danger" },
  warning: { icon: TriangleAlert, label: "Atenção", className: "bg-warning-soft text-warning" },
  ai: { icon: Sparkles, label: "Finance IA", className: "bg-ai-soft text-ai" },
  success: { icon: CircleCheck, label: "Conquista", className: "bg-brand-soft text-brand" },
};

/** Alertas: cada um leva ícone e rótulo, nunca só a cor. */
export function AlertsList({ data }: { data: DashboardData }) {
  return (
    <ListCard id="alertas" title="Alertas" action={{ label: "Ver todos", href: "/notificacoes" }}>
      {data.alerts.length === 0 ? (
        <p className="py-6 text-center text-body text-ink-muted">
          Tudo em dia. Nenhum alerta no momento.
        </p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {data.alerts.map((alert) => {
          const tone = tones[alert.tone];
          const Icon = tone.icon;
          return (
            <li key={alert.id}>
              <Link
                href={alert.href}
                className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-sunken"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    tone.className,
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-caption font-semibold tracking-[0.02em] text-ink-muted uppercase">
                    {tone.label}
                  </span>
                  <span className="text-body font-medium">{alert.title}</span>
                  <span className="text-caption text-ink-muted">{alert.description}</span>
                </span>
                <ChevronRight className="mt-2 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}
