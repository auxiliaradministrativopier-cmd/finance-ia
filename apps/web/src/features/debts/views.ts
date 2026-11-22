import {
  amortizationSchedule,
  balanceHistory,
  effectivePayment,
  monthOf,
  monthRange,
  monthlyInterest,
  percentPaid,
  type AmortizationSystem,
} from "@finance-ia/finance-core";
import type { Debt, DebtPayment, DebtStatus, DebtView } from "./types";

/**
 * Parcelas que faltam: pela data final do contrato (vale também para dívidas cadastradas no meio)
 * ou, sem ela, pelo número de parcelas menos as pagas aqui.
 */
function remainingByContract(
  debt: Debt,
  payments: DebtPayment[],
  firstDate: string,
): number | null {
  if (debt.endDate)
    return Math.max(monthRange(monthOf(firstDate), monthOf(debt.endDate)).length, 1);
  if (!debt.installmentCount) return null;
  const paid = payments.filter((payment) => payment.kind === "regular").length;
  return Math.max(debt.installmentCount - paid, 1);
}

/** Calcula a visão de uma dívida: percentual pago, juros do mês, cronograma e situação. */
export function buildDebtView(debt: Debt, payments: DebtPayment[], today: string): DebtView {
  const system = debt.amortization as AmortizationSystem;
  const firstDate = debt.nextDueDate && debt.nextDueDate >= today ? debt.nextDueDate : today;
  const remainingInstallments = remainingByContract(debt, payments, firstDate);
  const scheduleInput = {
    balance: debt.currentBalance,
    monthlyRate: debt.monthlyRate,
    system,
    payment: debt.installmentAmount,
    remainingInstallments,
    firstDate,
  };
  const schedule = amortizationSchedule(scheduleInput);
  const payment =
    system === "sac" ? (schedule.rows[0]?.payment ?? 0) : effectivePayment(scheduleInput);

  let status: DebtStatus = "active";
  if (debt.currentBalance <= 0) status = "paid_off";
  else if (schedule.neverEnds) status = "growing";
  else if (debt.nextDueDate && debt.nextDueDate < today) status = "overdue";

  return {
    debt,
    payments,
    percentPaid: percentPaid(debt.originalAmount, debt.currentBalance),
    monthInterest: system === "none" ? 0 : monthlyInterest(debt.currentBalance, debt.monthlyRate),
    payment,
    schedule,
    projectedEndDate: schedule.neverEnds ? null : (schedule.rows.at(-1)?.date ?? null),
    status,
  };
}

/** Totais e prioridade de quitação (maior juros primeiro: método avalanche). */
export function summarizeDebts(views: DebtView[]) {
  const open = views.filter((view) => view.status !== "paid_off");
  const original = views.reduce((sum, view) => sum + view.debt.originalAmount, 0);
  const balance = open.reduce((sum, view) => sum + view.debt.currentBalance, 0);
  return {
    balance,
    monthlyPayments: open.reduce((sum, view) => sum + view.payment, 0),
    monthInterest: open.reduce((sum, view) => sum + view.monthInterest, 0),
    percentPaid:
      original > 0
        ? Math.min(
            Math.max(
              (original - views.reduce((sum, view) => sum + view.debt.currentBalance, 0)) /
                original,
              0,
            ),
            1,
          )
        : 0,
    openCount: open.length,
    growing: open.filter((view) => view.status === "growing"),
    /** Ordem sugerida: maior taxa de juros primeiro. */
    priority: [...open]
      .sort((a, b) => b.debt.monthlyRate - a.debt.monthlyRate)
      .map((view) => view.debt.id),
  };
}

export interface EvolutionPoint {
  month: string;
  value: number;
  projected: boolean;
  estimated: boolean;
}

/**
 * Evolução do saldo devedor: o realizado (pelos pagamentos registrados) até hoje e a projeção
 * pelo cronograma até a quitação. Reduz a no máximo `maxPoints` pontos para caber no gráfico.
 */
export function debtEvolution(view: DebtView, today: string, maxPoints = 30): EvolutionPoint[] {
  const { debt, payments, schedule } = view;
  const history = balanceHistory({
    originalAmount: debt.originalAmount,
    currentBalance: debt.currentBalance,
    startDate: debt.startDate <= today ? debt.startDate : today,
    today,
    trackedSince: monthOf(debt.createdAt ? debt.createdAt.toISOString().slice(0, 10) : today),
    payments,
  }).map((point) => ({
    month: point.month,
    value: point.balance,
    projected: false,
    estimated: point.estimated,
  }));

  const lastMonth = history.at(-1)?.month ?? monthOf(today);
  const projection = new Map<string, number>();
  for (const row of schedule.rows) {
    const month = monthOf(row.date);
    if (month > lastMonth) projection.set(month, row.balance);
  }
  const points = [
    ...history,
    ...[...projection].map(([month, value]) => ({
      month,
      value,
      projected: true,
      estimated: false,
    })),
  ];
  if (points.length <= maxPoints) return points;

  // Mantém o primeiro, o "hoje" e o último; o resto em passos regulares.
  const step = Math.ceil(points.length / maxPoints);
  const todayIndex = history.length - 1;
  return points.filter(
    (_, index) =>
      index === 0 || index === todayIndex || index === points.length - 1 || index % step === 0,
  );
}
