"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { useAuth } from "@/features/auth/auth-provider";
import { formatMonthLong } from "../data/format";
import { useDashboard } from "../use-dashboard";
import { AlertsList } from "./alerts-list";
import { BalanceHero } from "./balance-hero";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { FlowChartCard } from "./flow-chart-card";
import { GoalsList } from "./goals-list";
import { IfaCard } from "./ifa-card";
import { KpiRow } from "./kpi-row";
import { NetWorthCard } from "./net-worth-card";
import { ProvisionsCard } from "./provisions-card";
import { UpcomingBills } from "./upcoming-bills";

const periods = [
  { months: 6, label: "6 meses" },
  { months: 12, label: "12 meses" },
] as const;

function greeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Tela 13: Dashboard. Ordem fixa: resumo primeiro, detalhe depois. */
export function DashboardPage() {
  const { user } = useAuth();
  const state = useDashboard();
  const [period, setPeriod] = useState<6 | 12>(6);

  const firstName = (user?.displayName ?? "").trim().split(/\s+/)[0] || "você";
  const hello = useMemo(() => greeting(new Date().getHours()), []);

  if (state.status === "loading") return <DashboardSkeleton />;
  if (state.status === "error") {
    return (
      <Alert tone="danger" title="Não foi possível carregar seu painel">
        {state.message}
      </Alert>
    );
  }

  const { data } = state;
  const flow = data.flow.slice(-period);
  const actual = data.netWorth.filter((point) => !point.projected).slice(-period);
  const netWorth = [...actual, ...data.netWorth.filter((point) => point.projected)];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={formatMonthLong(data.month).replace(/^\w/, (letter) => letter.toUpperCase())}
        title={`${hello}, ${firstName}`}
        actions={
          state.isSample ? (
            <Badge
              tone="ai"
              icon={<FlaskConical aria-hidden="true" />}
              title="Os valores são simulados até a conexão com o banco de dados."
            >
              Dados de exemplo
            </Badge>
          ) : null
        }
      />

      {state.isSample ? (
        <Alert tone="info" title="Estes números são um exemplo">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            Cadastre sua conta e seus lançamentos para ver o seu painel de verdade.
            <Link href="/fluxo" className="font-semibold text-brand underline">
              Começar agora
            </Link>
          </span>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <BalanceHero data={data} />
        </div>
        <div className="lg:col-span-4">
          <IfaCard data={data} />
        </div>
      </div>

      <KpiRow data={data} />

      <section aria-label="Gráficos" className="flex flex-col gap-4">
        <div
          role="group"
          aria-label="Período dos gráficos"
          className="flex flex-wrap items-center gap-2"
        >
          <span className="mr-1 text-label font-medium text-ink-muted">Período</span>
          {periods.map((option) => (
            <Chip
              key={option.months}
              selected={period === option.months}
              onClick={() => setPeriod(option.months)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FlowChartCard flow={flow} />
          <NetWorthCard points={netWorth} label={data.evolutionLabel} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <UpcomingBills data={data} />
        <ProvisionsCard data={data} />
        <GoalsList data={data} />
        <AlertsList data={data} />
      </div>
    </div>
  );
}
