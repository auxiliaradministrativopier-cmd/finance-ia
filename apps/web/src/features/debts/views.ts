import {
  debtEvolution as projectEvolution,
  debtSnapshot,
  monthOf,
  type EvolutionPoint,
} from "@finance-ia/finance-core";
import { dayOf } from "@/lib/time";
import type { Debt, DebtPayment, DebtView } from "./types";

export type { EvolutionPoint };

/** Visão de uma dívida: o cálculo vem do finance-core (debtSnapshot); aqui só adaptamos os dados. */
export function buildDebtView(debt: Debt, payments: DebtPayment[], today: string): DebtView {
  const snapshot = debtSnapshot({
    originalAmount: debt.originalAmount,
    currentBalance: debt.currentBalance,
    monthlyRate: debt.monthlyRate,
    system: debt.amortization,
    installmentAmount: debt.installmentAmount,
    installmentCount: debt.installmentCount,
    endDate: debt.endDate,
    nextDueDate: debt.nextDueDate,
    regularPaymentsCount: payments.filter((payment) => payment.kind === "regular").length,
    today,
  });
  return {
    debt,
    payments,
    percentPaid: snapshot.percentPaid,
    monthInterest: snapshot.monthInterest,
    payment: snapshot.payment,
    schedule: snapshot.schedule,
    projectedEndDate: snapshot.projectedEndDate,
    status: snapshot.status,
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

/** Evolução do saldo devedor (realizado + projeção), pronta para o gráfico. */
export function debtEvolution(view: DebtView, today: string, maxPoints = 30): EvolutionPoint[] {
  const { debt, payments, schedule } = view;
  return projectEvolution({
    originalAmount: debt.originalAmount,
    currentBalance: debt.currentBalance,
    startDate: debt.startDate,
    // Mês do cadastro no fuso do usuário.
    trackedSince: monthOf(debt.createdAt ? dayOf(debt.createdAt) : today),
    payments,
    schedule,
    today,
    maxPoints,
  });
}
