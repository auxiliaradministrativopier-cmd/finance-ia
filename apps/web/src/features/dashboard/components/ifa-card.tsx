import { ArrowUpRight, Gauge, Hourglass } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { bandTone, IfaGauge } from "@/components/ifa/ifa-gauge";
import { bandInfo } from "@/features/health/labels";
import type { DashboardData } from "../data/types";

export function IfaCard({ data }: { data: DashboardData }) {
  if (!data.ifa) return <IfaPending />;
  const { score, band, delta } = data.ifa;
  const label = bandInfo[band].label;

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
        <IfaGauge score={score} band={band} bandLabel={label} className="max-w-[220px]" />
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
