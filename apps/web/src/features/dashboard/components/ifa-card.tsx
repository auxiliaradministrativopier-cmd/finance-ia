import { ArrowUpRight, Gauge, Hourglass } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ifaBandLabel } from "../data/derived";
import type { DashboardData, IfaBand } from "../data/types";

const bandStroke: Record<IfaBand, string> = {
  critical: "var(--ifa-critical)",
  attention: "var(--ifa-attention)",
  healthy: "var(--ifa-healthy)",
  excellent: "var(--ifa-excellent)",
};

const bandTone = {
  critical: "danger",
  attention: "warning",
  healthy: "success",
  excellent: "ai",
} as const;

/** Arco de 240° (de 150° a 390°), proporcional à nota de 0 a 1000. */
export function gaugeArc(score: number, radius = 80, center = 100): string {
  const start = 150;
  const sweep = (240 * Math.min(Math.max(score, 0), 1000)) / 1000;
  const point = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return `${(center + radius * Math.cos(rad)).toFixed(2)} ${(center + radius * Math.sin(rad)).toFixed(2)}`;
  };
  if (sweep <= 0) return "";
  return `M${point(start)} A${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${point(start + sweep)}`;
}

export function IfaCard({ data }: { data: DashboardData }) {
  if (!data.ifa) return <IfaPending />;
  const { score, band, delta } = data.ifa;
  const label = ifaBandLabel[band];

  return (
    <Card aria-labelledby="ifa-titulo" className="items-stretch">
      <CardHeader>
        <CardTitle id="ifa-titulo" className="flex items-center gap-2">
          <Gauge className="size-4 text-ink-muted" aria-hidden="true" />
          Saúde financeira
        </CardTitle>
        <Link
          href="/saude-financeira"
          className="text-label font-semibold text-brand hover:underline"
        >
          Detalhes
        </Link>
      </CardHeader>
      <div className="flex flex-col items-center gap-2">
        <svg
          viewBox="0 0 200 160"
          className="h-auto w-full max-w-[220px]"
          role="img"
          aria-label={`IFA ${score} de 1000, faixa ${label}`}
        >
          <path
            d={gaugeArc(1000)}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d={gaugeArc(score)}
            fill="none"
            stroke={bandStroke[band]}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <text
            x="100"
            y="108"
            textAnchor="middle"
            className="fill-ink font-display text-[52px] font-semibold tabular"
          >
            {score}
          </text>
          <text x="100" y="132" textAnchor="middle" className="fill-ink-muted text-[12px]">
            de 1000
          </text>
        </svg>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge tone={bandTone[band]}>{label}</Badge>
          {delta !== null ? (
            <span
              className={cn(
                "flex items-center gap-0.5 text-caption",
                delta >= 0 ? "text-brand" : "text-danger",
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : null}
              {delta >= 0 ? `+${delta}` : `−${Math.abs(delta)}`} pontos no mês
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/** Antes do primeiro cálculo: explica quando o IFA aparece, em vez de mostrar um número inventado. */
function IfaPending() {
  return (
    <Card aria-labelledby="ifa-titulo" className="items-stretch">
      <CardHeader>
        <CardTitle id="ifa-titulo" className="flex items-center gap-2">
          <Gauge className="size-4 text-ink-muted" aria-hidden="true" />
          Saúde financeira
        </CardTitle>
      </CardHeader>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
          <Hourglass className="size-6" aria-hidden="true" />
        </span>
        <p className="text-body font-medium">Seu IFA está a caminho</p>
        <p className="max-w-xs text-caption text-ink-muted">
          A nota de 0 a 1000 aparece assim que houver ao menos uma receita e uma despesa registradas
          nos últimos 3 meses.
        </p>
      </div>
    </Card>
  );
}
