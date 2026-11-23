"use client";

import {
  PILLAR_ORDER,
  PILLAR_WEIGHTS,
  type HealthScore,
  type IfaBand,
} from "@finance-ia/finance-core";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Circle } from "lucide-react";
import Link from "next/link";
import { ChartLegend } from "@/components/charts/chart-tooltip";
import { LineChart } from "@/components/charts/line-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle, Overline } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard, DataTable } from "@/components/charts/chart-card";
import { formatMonthLong, formatMonthShort } from "@/lib/format";
import { isScreenAvailable } from "@/config/screens";
import { cn } from "@/lib/cn";
import { usePrivacy } from "@/providers/privacy-provider";
import { bandInfo, explainPillar, pillarInfo, recommendationsFor } from "../labels";
import { useHealth } from "../use-health";
import { bandTone, IfaGauge } from "@/components/ifa/ifa-gauge";

const BANDS: IfaBand[] = ["critical", "attention", "healthy", "excellent"];

/** Tela 44: Saúde financeira (IFA). */
export function HealthPage() {
  const { status, error, result, hasAccounts, hasTransactions } = useHealth();
  const { hideValues } = usePrivacy();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Saúde financeira"
        description="O IFA (Índice Finance IA) resume suas finanças em uma nota de 0 a 1000, mostra o porquê dela e o que fazer para subir."
      />
      {status === "error" ? <Alert tone="danger">{error?.message}</Alert> : null}
      {status === "loading" ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        </div>
      ) : status === "ready" && result ? (
        result.current ? (
          <>
            <div className="grid items-start gap-6 lg:grid-cols-[2fr_3fr]">
              <ScoreCard score={result.current} delta={result.delta} />
              <Recommendations score={result.current} hidden={hideValues} />
            </div>
            <Pillars score={result.current} hidden={hideValues} />
            <Evolution history={result.history} />
            <Method />
          </>
        ) : (
          <NotEnoughData hasAccounts={hasAccounts} hasTransactions={hasTransactions} />
        )
      ) : null}
    </div>
  );
}

function ScoreCard({ score, delta }: { score: HealthScore; delta: number | null }) {
  const info = bandInfo[score.band];
  return (
    <Card variant="highlight" aria-label="Seu IFA" className="items-center text-center">
      <Overline className="self-start text-on-deep-muted">Seu IFA</Overline>
      <IfaGauge score={score.score} band={score.band} bandLabel={info.label} onDeep />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge tone={bandTone[score.band]}>{info.label}</Badge>
        {delta !== null ? (
          <span className="flex items-center gap-0.5 text-caption text-on-deep-muted">
            {delta > 0 ? (
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            ) : delta < 0 ? (
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            ) : null}
            {delta === 0
              ? "Igual ao mês passado"
              : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${Math.abs(delta) === 1 ? "ponto" : "pontos"} desde o mês passado`}
          </span>
        ) : null}
      </div>
      <p className="max-w-[40ch] text-body text-on-deep-muted">{info.summary}</p>
      {score.cap === "deficit_without_reserve" ? (
        <p className="max-w-[40ch] text-caption text-on-deep">
          A nota fica na faixa Crítico enquanto as despesas passarem da renda sem reserva para
          cobrir a diferença.
        </p>
      ) : null}
      <BandScale band={score.band} score={score.score} />
    </Card>
  );
}

function BandScale({ band, score }: { band: IfaBand; score: number }) {
  return (
    <div className="flex w-full flex-col gap-1.5" aria-hidden="true">
      <div className="relative flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        <span className="w-[40%] bg-ifa-critical" />
        <span className="w-[20%] bg-ifa-attention" />
        <span className="w-[20%] bg-ifa-healthy" />
        <span className="w-[20%] bg-ifa-excellent" />
      </div>
      <div className="relative h-2">
        <span
          className="absolute -top-1 size-2.5 -translate-x-1/2 rotate-45 bg-on-deep"
          style={{ left: `${Math.min(Math.max(score / 10, 1), 99)}%` }}
        />
      </div>
      <div className="flex w-full text-caption text-on-deep-muted">
        {BANDS.map((item) => (
          <span
            key={item}
            className={cn(
              item === "critical" ? "w-[40%]" : "w-[20%]",
              "text-left",
              item === band && "font-semibold text-on-deep",
            )}
          >
            {bandInfo[item].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Recommendations({ score, hidden }: { score: HealthScore; hidden: boolean }) {
  const items = recommendationsFor(score, hidden);
  return (
    <Card aria-labelledby="recomendacoes" className="gap-3">
      <div className="flex flex-col gap-1">
        <CardTitle id="recomendacoes">Recomendações</CardTitle>
        <CardDescription>Do que mais sobe a sua nota para o que menos sobe.</CardDescription>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-body text-ink">
          Tudo em dia. Mantenha os hábitos e acompanhe a evolução todo mês.
        </p>
      ) : (
        <ol className="flex flex-col">
          {items.map((item, index) => (
            <li key={item.id} className="flex gap-3 border-b border-line py-3 last:border-0">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-label font-semibold text-brand">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-h3">{item.title}</h3>
                  <span className="text-caption text-ink-muted tabular">
                    até +{item.gain} pontos em {pillarInfo[item.pillar].label.toLowerCase()}
                  </span>
                </div>
                <p className="text-body text-ink-muted">{item.description}</p>
                {isScreenAvailable(item.href) ? (
                  <Link
                    href={item.href}
                    className="-ml-2 inline-flex h-control-sm items-center gap-1 self-start rounded-md px-2 text-label font-semibold text-brand hover:bg-brand-soft"
                  >
                    {item.action}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function pillarTone(score: number) {
  if (score < 0.4) return "danger" as const;
  if (score < 0.7) return "warning" as const;
  return "brand" as const;
}

function Pillars({ score, hidden }: { score: HealthScore; hidden: boolean }) {
  return (
    <section aria-labelledby="pilares" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="pilares" className="text-h2">
          Como sua nota é formada
        </h2>
        <p className="text-body text-ink-muted">Seis pilares, cada um com o seu peso.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PILLAR_ORDER.map((id) => {
          const pillar = score.pillars.find((item) => item.id === id)!;
          const info = pillarInfo[id];
          return (
            <Card as="article" key={id} aria-label={info.label} className="gap-3">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={info.icon} color="chart-6" className="size-9" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="text-h3">{info.label}</h3>
                  <span className="text-caption text-ink-muted">{info.question}</span>
                </div>
                <span className="text-body font-semibold tabular">
                  {pillar.measured ? pillar.points : "—"}
                  <span className="font-normal text-ink-muted">/{pillar.maxPoints}</span>
                </span>
              </div>
              {pillar.measured ? (
                <ProgressBar
                  value={Math.round(pillar.score * 100)}
                  tone={pillarTone(pillar.score)}
                  label={`${info.label}: ${pillar.points} de ${pillar.maxPoints} pontos`}
                />
              ) : (
                <Badge className="self-start">Sem dados: fora da nota</Badge>
              )}
              <p className="text-body text-ink">{explainPillar(pillar, hidden)}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Evolution({ history }: { history: HealthScore[] }) {
  const first = history[0];
  const last = history.at(-1);
  if (!first || !last || history.length < 2) {
    return (
      <Card className="gap-2">
        <CardTitle>Evolução histórica</CardTitle>
        <p className="text-body text-ink-muted">
          A evolução aparece a partir do segundo mês com receitas e despesas registradas.
          Lançamentos de meses anteriores também contam.
        </p>
      </Card>
    );
  }
  const change = last.score - first.score;
  return (
    <ChartCard
      id="evolucao-ifa"
      title="Evolução histórica"
      description={`${change === 0 ? "Sua nota está igual a" : change > 0 ? `Sua nota subiu ${change} pontos desde` : `Sua nota caiu ${Math.abs(change)} pontos desde`} ${formatMonthLong(first.month)}. Calculada com os seus registros de cada mês.`}
      legend={<ChartLegend items={[{ label: "IFA", color: "var(--chart-1)" }]} />}
      chart={
        <LineChart
          data={history.map((item) => ({
            label: formatMonthShort(item.month),
            title: `${formatMonthLong(item.month)} · ${bandInfo[item.band].label}`,
            value: item.score,
          }))}
          seriesLabel="IFA"
          color="var(--chart-1)"
          summary={`IFA de ${formatMonthLong(first.month)} a ${formatMonthLong(last.month)}. Hoje: ${last.score}.`}
          formatValue={(value) => `${value} pontos`}
          formatTick={(value) => String(value)}
          formatEndLabel={(value) => String(value)}
        />
      }
      table={
        <DataTable
          caption="IFA por mês"
          headers={["Mês", "IFA", "Faixa"]}
          rows={history.map((item) => [
            formatMonthLong(item.month),
            String(item.score),
            bandInfo[item.band].label,
          ])}
        />
      }
    />
  );
}

function Method() {
  return (
    <details className="group rounded-lg border border-line bg-surface p-4">
      <summary className="cursor-pointer text-h3 marker:text-ink-muted">
        Como o IFA é calculado
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-body text-ink-muted">
        <p>
          Usamos os seus últimos 3 meses de registros. Cada pilar recebe de 0 ao seu peso máximo;
          pilares sem dados para medir ficam de fora e a nota é ajustada para a escala de 0 a 1000.
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {PILLAR_ORDER.map((id) => (
            <li key={id} className="flex justify-between gap-3 border-b border-line py-1">
              <span>{pillarInfo[id].label}</span>
              <span className="font-medium text-ink tabular">{PILLAR_WEIGHTS[id]} pontos</span>
            </li>
          ))}
        </ul>
        <p>
          Faixas:{" "}
          {BANDS.map((band) => `${bandInfo[band].label} (${bandInfo[band].range})`).join(", ")}. A
          evolução de meses passados é recalculada com os dados daquele mês; metas entram só na nota
          atual.
        </p>
      </div>
    </details>
  );
}

function NotEnoughData({
  hasAccounts,
  hasTransactions,
}: {
  hasAccounts: boolean;
  hasTransactions: boolean;
}) {
  const steps = [
    { done: hasAccounts, label: "Cadastre uma conta com o saldo atual", href: "/contas" },
    { done: hasTransactions, label: "Registre sua renda e suas despesas do mês", href: "/fluxo" },
  ];
  return (
    <Card className="items-start gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">Seu IFA está a caminho</h2>
        <p className="max-w-[60ch] text-body text-ink-muted">
          A nota precisa de pelo menos uma receita e uma despesa nos últimos 3 meses. Faltam poucos
          passos:
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-body">
            {step.done ? (
              <Check className="size-4 text-brand" aria-label="Feito" />
            ) : (
              <Circle className="size-4 text-ink-muted" aria-label="A fazer" />
            )}
            {step.done ? (
              <span className="text-ink-muted line-through">{step.label}</span>
            ) : (
              <Link href={step.href} className="font-medium text-brand hover:underline">
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
