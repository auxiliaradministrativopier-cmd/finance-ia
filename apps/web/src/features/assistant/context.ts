import {
  accountBalances,
  addDays,
  addMonthsToMonth,
  monthRange,
  monthsToReach,
  simulatePrepayment,
  spendingAllowance,
  summarizeMonth,
  totalBalance,
  type AmortizationSystem,
} from "@finance-ia/finance-core";
import type { HealthResult } from "@/features/health/compute";
import type { HealthSources } from "@/features/health/inputs";
import { bandInfo, explainPillar, pillarInfo, recommendationsFor } from "@/features/health/labels";
import { typeLabel } from "@/features/debts/kinds";
import { redactDeep } from "./redact";
import type { AssistantContext } from "./schema";

export interface AssistantSources extends HealthSources {
  transactions: (HealthSources["transactions"][number] & {
    description: string;
    categoryName: string | null;
  })[];
}

const reais = (cents: number) => Math.round(cents) / 100;
const label = (text: string) => text.trim().slice(0, 80);

const debtStatusLabel = {
  active: "em dia",
  overdue: "parcela vencida",
  growing: "crescendo (parcela menor que os juros)",
  paid_off: "quitada",
} as const;
const provisionStatusLabel = {
  on_track: "no ritmo",
  behind: "atrasado",
  completed: "concluído",
  overdue: "vencido",
} as const;

/**
 * Resumo financeiro que vai para o assistente. Só agregados e o mínimo de detalhe para responder:
 * nada de e-mail, nome do usuário, ids, nomes de contas ou números de documentos.
 * Textos livres passam por `redactSensitive`.
 */
export function buildAssistantContext(
  sources: AssistantSources,
  health: HealthResult,
): AssistantContext {
  const { today } = sources;
  const month = today.slice(0, 7);
  const entries = sources.transactions;

  const current = summarizeMonth(entries, month);
  const history = monthRange(addMonthsToMonth(month, -5), month).map((item) => {
    const summary = summarizeMonth(entries, item);
    return {
      month: item,
      income: reais(summary.income.paid + summary.income.pending),
      expense: reais(summary.expense.paid + summary.expense.pending),
      count: summary.count,
    };
  });
  const firstWithData = history.findIndex((item) => item.count > 0);
  const recentHistory = (firstWithData === -1 ? [] : history.slice(firstWithData)).map((item) => ({
    month: item.month,
    income: item.income,
    expense: item.expense,
  }));

  const balanceNow = totalBalance(
    sources.accounts,
    accountBalances(sources.accounts, entries, today),
  );

  // Média de sobra mensal (receitas − despesas) nos últimos 3 meses com dados.
  const last3 = monthRange(addMonthsToMonth(month, -2), month)
    .map((item) => summarizeMonth(entries, item))
    .filter((summary) => summary.count > 0);
  const income3 = last3.reduce((sum, s) => sum + s.income.paid + s.income.pending, 0);
  const expense3 = last3.reduce((sum, s) => sum + s.expense.paid + s.expense.pending, 0);
  const avgSavings = last3.length ? (income3 - expense3) / last3.length : 0;

  // Quanto separar ainda neste mês.
  const provisionsToSave = sources.provisions
    .filter((view) => view.plan.status !== "completed")
    .reduce((sum, view) => {
      const savedThisMonth = view.contributions
        .filter((item) => item.date.startsWith(month))
        .reduce((total, item) => total + (item.kind === "deposit" ? item.amount : -item.amount), 0);
      return sum + Math.max(view.plan.monthlyNeeded - savedThisMonth, 0);
    }, 0);
  const debtInstallmentsDue = sources.debts
    .filter(
      (view) =>
        view.status !== "paid_off" &&
        view.debt.nextDueDate &&
        view.debt.nextDueDate.startsWith(month) &&
        view.debt.nextDueDate >= today,
    )
    .reduce((sum, view) => sum + Math.min(view.payment, view.debt.currentBalance), 0);
  const allowance = spendingAllowance({
    balanceNow,
    pendingIncome: current.income.pending,
    pendingExpense: current.expense.pending,
    setAside: provisionsToSave + debtInstallmentsDue,
    today,
  });

  // Categorias: este mês e média de 3 meses.
  const names = new Map<string, string>();
  for (const entry of entries)
    if (entry.categoryId && entry.categoryName) names.set(entry.categoryId, entry.categoryName);
  const byCategory = new Map<string, { thisMonth: number; total3: number }>();
  for (const summary of last3) {
    for (const item of summary.expenseByCategory) {
      const row = byCategory.get(item.categoryId) ?? { thisMonth: 0, total3: 0 };
      row.total3 += item.amount;
      if (summary.month === month) row.thisMonth += item.amount;
      byCategory.set(item.categoryId, row);
    }
  }
  const categories = [...byCategory]
    .sort((a, b) => b[1].total3 - a[1].total3)
    .slice(0, 12)
    .map(([id, row]) => ({
      name: label(names.get(id) ?? "Sem categoria"),
      thisMonth: reais(row.thisMonth),
      avg3Months: reais(row.total3 / Math.max(last3.length, 1)),
      shareOfExpenses: expense3 > 0 ? Math.round((row.total3 / expense3) * 1000) / 1000 : 0,
    }));

  const since = addDays(today, -90);
  const largestExpenses = entries
    .filter((entry) => entry.type === "expense" && entry.date >= since && entry.date <= today)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map((entry) => ({
      description: label(entry.description),
      category: label(entry.categoryName ?? "Sem categoria"),
      amount: reais(entry.amount),
      date: entry.date,
      paidWithCard: Boolean(entry.cardId),
    }));

  const horizon = addDays(today, 30);
  const upcomingBills = [
    ...entries
      .filter(
        (entry) =>
          entry.type === "expense" &&
          entry.status !== "paid" &&
          !entry.cardId &&
          entry.date <= horizon,
      )
      .map((entry) => ({
        title: label(entry.description),
        amount: reais(entry.amount),
        dueDate: entry.date,
      })),
    ...sources.debts
      .filter(
        (view) =>
          view.status !== "paid_off" && view.debt.nextDueDate && view.debt.nextDueDate <= horizon,
      )
      .map((view) => ({
        title: label(`Parcela ${view.debt.name}`),
        amount: reais(Math.min(view.payment, view.debt.currentBalance)),
        dueDate: view.debt.nextDueDate!,
      })),
  ]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 10);

  const reservePillar = health.current?.pillars.find((pillar) => pillar.id === "reserve");
  const reserveMonths = reservePillar?.facts.reserveMonths ?? 0;
  const target6 = reservePillar?.facts.target ?? 0;
  const aboveTarget = Math.max((reservePillar?.facts.reservePool ?? 0) - target6, 0);

  const goals: AssistantContext["goals"] = [
    ...sources.provisions.map((view) => ({
      name: label(view.provision.name),
      kind: "provision" as const,
      target: reais(view.provision.targetAmount),
      saved: reais(view.balance),
      dueDate: view.provision.dueDate,
      monthlyNeeded: reais(view.plan.monthlyNeeded),
      status: provisionStatusLabel[view.plan.status],
      monthsAtCurrentPace: monthsToReach(view.plan.remaining, avgSavings),
    })),
    ...sources.goals
      .filter((goal) => goal.status === "active")
      .map((goal) => {
        const saved = goal.currentAmount ?? 0;
        return {
          name: label(goal.name ?? "Meta"),
          kind: "goal" as const,
          target: reais(goal.targetAmount),
          saved: reais(saved),
          dueDate: goal.targetDate,
          monthlyNeeded: null,
          status: saved >= goal.targetAmount ? "concluída" : "em andamento",
          monthsAtCurrentPace: monthsToReach(goal.targetAmount - saved, avgSavings),
        };
      }),
  ].slice(0, 20);

  const debts: AssistantContext["debts"] = sources.debts
    .filter((view) => view.status !== "paid_off")
    .slice(0, 20)
    .map((view) => {
      const { debt } = view;
      const lump = Math.min(aboveTarget, debt.currentBalance);
      const simulation =
        lump > 0 && !view.schedule.neverEnds
          ? simulatePrepayment({
              balance: debt.currentBalance,
              monthlyRate: debt.monthlyRate,
              system: debt.amortization as AmortizationSystem,
              payment: view.payment,
              remainingInstallments: view.schedule.rows.length || null,
              firstDate: debt.nextDueDate && debt.nextDueDate >= today ? debt.nextDueDate : today,
              lumpSum: lump,
              mode: "reduce_term",
            })
          : null;
      return {
        name: label(debt.name),
        type: label(typeLabel(debt.type)),
        balance: reais(debt.currentBalance),
        original: reais(debt.originalAmount),
        monthlyRatePercent: debt.amortization === "none" ? 0 : debt.monthlyRate,
        payment: reais(view.payment),
        projectedEnd: view.projectedEndDate,
        remainingInterest: view.schedule.neverEnds ? null : reais(view.schedule.totalInterest),
        status: debtStatusLabel[view.status],
        payoffWithReserveExcess: simulation
          ? {
              amount: reais(lump),
              interestSaved: reais(simulation.interestSaved),
              monthsSaved: simulation.monthsSaved,
            }
          : null,
      };
    });

  const score = health.current;
  const context: AssistantContext = {
    today,
    hasData: entries.length > 0,
    month: {
      month,
      incomeReceived: reais(current.income.paid),
      incomeExpected: reais(current.income.paid + current.income.pending),
      expensePaid: reais(current.expense.paid),
      expenseExpected: reais(current.expense.paid + current.expense.pending),
      projectedResult: reais(current.projectedBalance),
    },
    history: recentHistory,
    accounts: { total: reais(balanceNow), count: sources.accounts.length },
    spending: {
      balanceNow: reais(balanceNow),
      pendingIncome: reais(current.income.pending),
      pendingExpense: reais(current.expense.pending),
      provisionsToSave: reais(provisionsToSave),
      debtInstallmentsDue: reais(debtInstallmentsDue),
      projectedEndOfMonth: reais(allowance.projectedEndOfMonth),
      available: reais(allowance.available),
      perDay: reais(allowance.perDay),
      daysLeft: allowance.daysLeft,
    },
    savings: {
      avgMonthly: reais(avgSavings),
      rate:
        income3 > 0 ? Math.max(Math.round(((income3 - expense3) / income3) * 1000) / 1000, -10) : 0,
    },
    categories,
    largestExpenses,
    upcomingBills,
    reserve: {
      months: Math.min(reserveMonths, 1000),
      target6Months: reais(target6),
      aboveTarget: reais(aboveTarget),
    },
    goals,
    debts,
    health: score
      ? {
          score: score.score,
          band: bandInfo[score.band].label,
          pillars: score.pillars.map((pillar) => ({
            name: pillarInfo[pillar.id].label,
            points: pillar.points,
            max: pillar.maxPoints,
            summary: explainPillar(pillar).slice(0, 240),
          })),
          recommendations: recommendationsFor(score).map((item) => item.title.slice(0, 160)),
        }
      : null,
  };
  return redactDeep(context);
}
