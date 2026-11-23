"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
import { debtCommitment, monthlySavings, percentChange, savingsRate } from "../data/derived";
import { formatMonthName, formatPercent, formatSignedPercent, previousMonth } from "@/lib/format";
import type { DashboardData } from "../data/types";
import { useMoneyFormatters } from "@/hooks/use-money-formatters";
import { StatTile } from "@/components/ui/stat-tile";

function Change({
  ratio,
  goodWhenUp,
  suffix,
}: {
  ratio: number | null;
  goodWhenUp: boolean;
  suffix: string;
}) {
  if (ratio === null) return null;
  const good = ratio >= 0 === goodWhenUp;
  const Icon = ratio >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        good ? "text-brand" : "text-warning",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {formatSignedPercent(ratio)}
      <span className="font-normal text-ink-muted">&nbsp;{suffix}</span>
    </span>
  );
}

/** Receitas, despesas, economia, investimentos e dívidas do mês. */
export function KpiRow({ data }: { data: DashboardData }) {
  const { money } = useMoneyFormatters();
  const savings = monthlySavings(data);
  const budget = data.expense.budget;
  const budgetRatio = budget ? data.expense.spent / budget : null;
  const versus = `vs. ${formatMonthName(previousMonth(data.month))}`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatTile
        label="Receitas do mês"
        icon={<TrendingUp aria-hidden="true" />}
        value={<Amount cents={data.income.received} />}
        detail={
          <Change
            ratio={percentChange(data.income.received, data.income.previousMonth)}
            goodWhenUp
            suffix={versus}
          />
        }
        footer={
          <span className="text-caption text-ink-muted">
            Previsto: {money(data.income.expected)}
          </span>
        }
      />
      <StatTile
        label="Despesas do mês"
        icon={<TrendingDown aria-hidden="true" />}
        value={<Amount cents={data.expense.spent} />}
        detail={
          <Change
            ratio={percentChange(data.expense.spent, data.expense.previousMonth)}
            goodWhenUp={false}
            suffix={versus}
          />
        }
        footer={
          budget && budgetRatio !== null ? (
            <div className="flex flex-col gap-1">
              <ProgressBar
                value={Math.round(budgetRatio * 100)}
                tone="auto"
                label="Orçamento do mês usado"
              />
              <span className="text-caption text-ink-muted">
                {formatPercent(budgetRatio)} do orçamento de {money(budget)}
              </span>
            </div>
          ) : (
            <span className="text-caption text-ink-muted">Sem orçamento definido para o mês.</span>
          )
        }
      />
      <StatTile
        label="Economia do mês"
        icon={<PiggyBank aria-hidden="true" />}
        value={<Amount cents={savings} />}
        detail={
          <>
            Você guardou{" "}
            <strong className="font-semibold text-ink">{formatPercent(savingsRate(data))}</strong>{" "}
            da renda
          </>
        }
        footer={
          <span className="text-caption text-ink-muted">Referência saudável: 20% ou mais</span>
        }
      />
      <StatTile
        label="Investimentos"
        icon={<Landmark aria-hidden="true" />}
        value={<Amount cents={data.investments.total} />}
        detail={
          data.investments.monthReturn !== null ? (
            <span className="inline-flex items-center gap-1 text-brand">
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              <Amount cents={data.investments.monthReturn} kind="income" className="font-medium" />
              <span className="text-ink-muted">no mês</span>
            </span>
          ) : data.investments.count > 0 ? (
            `${data.investments.count} ${data.investments.count === 1 ? "investimento ativo" : "investimentos ativos"}`
          ) : (
            "Nenhum investimento cadastrado."
          )
        }
        footer={
          data.investments.monthReturn !== null &&
          data.investments.total > data.investments.monthReturn ? (
            <span className="text-caption text-ink-muted">
              {formatSignedPercent(
                data.investments.monthReturn /
                  (data.investments.total - data.investments.monthReturn),
              )}{" "}
              de rendimento
            </span>
          ) : null
        }
      />
      <StatTile
        label="Dívidas"
        icon={<Receipt aria-hidden="true" />}
        value={<Amount cents={data.debts.outstanding} />}
        detail={
          data.debts.count > 0 ? (
            <>Parcelas de {money(data.debts.monthlyPayment)} por mês</>
          ) : (
            "Nenhuma dívida cadastrada."
          )
        }
        footer={
          data.debts.count > 0 && data.income.expected > 0 ? (
            <span className="text-caption text-ink-muted">
              {formatPercent(debtCommitment(data))} da renda comprometida
            </span>
          ) : null
        }
      />
    </div>
  );
}
