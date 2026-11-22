"use client";

import { ChartLegend } from "@/components/charts/chart-tooltip";
import { LineChart } from "@/components/charts/line-chart";
import { formatMonthLong, formatMonthShort } from "../data/format";
import type { NetWorthPoint } from "../data/types";
import { ChartCard, DataTable } from "./chart-card";
import { useMoneyFormatters } from "./money";

export function NetWorthCard({
  points,
  label = "Patrimônio líquido",
}: {
  points: NetWorthPoint[];
  label?: string;
}) {
  const { money, tick, compactMoney } = useMoneyFormatters();
  const actual = points.filter((point) => !point.projected);
  const first = actual[0];
  const last = actual[actual.length - 1];
  const growth = first && last ? last.value - first.value : 0;

  return (
    <ChartCard
      id="grafico-patrimonio"
      title="Evolução financeira"
      description={
        first && last && first.month !== last.month
          ? `${label === "Patrimônio líquido" ? "Seu patrimônio líquido" : "O saldo das suas contas"} ${growth >= 0 ? "cresceu" : "caiu"} ${money(Math.abs(growth))} desde ${formatMonthLong(first.month)}.`
          : last
            ? `${label} hoje: ${money(last.value)}. O tracejado mostra a projeção com o que já está previsto.`
            : `${label} ao longo do tempo.`
      }
      legend={
        <ChartLegend
          items={[
            { label, color: "var(--chart-1)" },
            { label: "Projeção", color: "var(--chart-1)", dashed: true },
          ]}
        />
      }
      chart={
        <LineChart
          data={points.map((point) => ({
            label: formatMonthShort(point.month),
            title: formatMonthLong(point.month),
            value: point.value,
            projected: point.projected,
          }))}
          seriesLabel={label}
          color="var(--chart-1)"
          summary={`${label} de ${first ? formatMonthLong(first.month) : ""} a ${last ? formatMonthLong(last.month) : ""}, com projeção para os próximos meses. Valor atual ${last ? money(last.value) : ""}.`}
          formatValue={money}
          formatTick={tick}
          formatEndLabel={compactMoney}
        />
      }
      table={
        <DataTable
          caption={`${label} por mês`}
          headers={["Mês", label, "Tipo"]}
          rows={points.map((point) => [
            formatMonthLong(point.month),
            money(point.value),
            point.projected ? "Projeção" : "Realizado",
          ])}
        />
      }
    />
  );
}
