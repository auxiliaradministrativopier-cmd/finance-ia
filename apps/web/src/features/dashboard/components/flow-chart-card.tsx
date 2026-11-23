"use client";

import { ChartLegend } from "@/components/charts/chart-tooltip";
import { GroupedColumnChart } from "@/components/charts/grouped-column-chart";
import { formatMonthLong, formatMonthShort } from "@/lib/format";
import type { MonthlyFlow } from "../data/types";
import { ChartCard, DataTable } from "@/components/charts/chart-card";
import { useMoneyFormatters } from "@/hooks/use-money-formatters";

// Despesas em ameixa (chart-4): o par verde × ameixa passou na validação de daltonismo nos dois temas.
const series = [
  { key: "income", label: "Receitas", color: "var(--chart-1)" },
  { key: "expense", label: "Despesas", color: "var(--chart-4)" },
];

export function FlowChartCard({ flow }: { flow: MonthlyFlow[] }) {
  const { money, tick } = useMoneyFormatters();
  const totalIncome = flow.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = flow.reduce((sum, item) => sum + item.expense, 0);
  // Só contam os meses com lançamentos: mês vazio não é mês "no vermelho".
  const activeMonths = flow.filter((item) => item.income > 0 || item.expense > 0);
  const surplusMonths = activeMonths.filter((item) => item.income > item.expense).length;

  return (
    <ChartCard
      id="grafico-fluxo"
      title="Receitas x despesas"
      description={
        activeMonths.length === 0
          ? "Sem lançamentos no período."
          : `Sobrou dinheiro em ${surplusMonths} de ${activeMonths.length} ${activeMonths.length === 1 ? "mês" : "meses"} com lançamentos.`
      }
      legend={<ChartLegend items={series.map(({ label, color }) => ({ label, color }))} />}
      chart={
        <GroupedColumnChart
          data={flow.map((item) => ({
            label: formatMonthShort(item.month),
            title: formatMonthLong(item.month),
            values: { income: item.income, expense: item.expense },
          }))}
          series={series}
          summary={`Receitas e despesas dos últimos ${flow.length} meses. Total de receitas ${money(totalIncome)}, total de despesas ${money(totalExpense)}.`}
          formatValue={money}
          formatTick={tick}
        />
      }
      table={
        <DataTable
          caption="Receitas e despesas por mês"
          headers={["Mês", "Receitas", "Despesas", "Saldo"]}
          rows={flow.map((item) => [
            formatMonthLong(item.month),
            money(item.income),
            money(item.expense),
            money(item.income - item.expense),
          ])}
        />
      }
    />
  );
}
