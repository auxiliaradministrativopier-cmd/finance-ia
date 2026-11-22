import { monthOf, todayIn, type HealthInput } from "@finance-ia/finance-core";
import type { DebtView } from "@/features/debts/types";
import type { ProvisionView } from "@/features/provisions/types";

const TIME_ZONE = "America/Sao_Paulo";
const day = (value: Date | null | undefined) => (value ? todayIn(TIME_ZONE, value) : null);

/** Os dados do app no formato que o cálculo do IFA (finance-core) espera. */
export interface HealthSources {
  today: string;
  accounts: {
    id: string;
    initialBalance: number;
    initialBalanceDate: string;
    includeInTotal: boolean;
  }[];
  transactions: {
    type: "income" | "expense" | "transfer";
    status: "paid" | "pending" | "scheduled";
    amount: number;
    date: string;
    month: string;
    accountId: string | null;
    toAccountId: string | null;
    cardId: string | null;
    categoryId: string | null;
    createdAt: Date | null;
    paidAt?: Date | null;
  }[];
  debts: DebtView[];
  provisions: ProvisionView[];
  investments: {
    id: string;
    currentValue: number;
    isEmergencyReserve: boolean;
    status: string;
    createdAt: Date | null;
  }[];
  goals: {
    name?: string;
    targetAmount: number;
    targetDate: string | null;
    currentAmount?: number;
    linkedInvestmentIds?: string[];
    status: string;
    createdAt: Date | null;
  }[];
}

export function buildHealthInput(sources: HealthSources): HealthInput {
  const { today } = sources;
  const investmentValue = new Map(sources.investments.map((item) => [item.id, item.currentValue]));
  return {
    accounts: sources.accounts,
    entries: sources.transactions.map((entry) => ({
      type: entry.type,
      status: entry.status,
      amount: entry.amount,
      date: entry.date,
      month: entry.month,
      accountId: entry.accountId,
      toAccountId: entry.toAccountId,
      cardId: entry.cardId,
      categoryId: entry.categoryId,
      createdAt: day(entry.createdAt),
      paidAt: day(entry.paidAt),
    })),
    debts: sources.debts.map(({ debt, payments, payment }) => ({
      type: debt.type,
      startDate: debt.startDate,
      originalAmount: debt.originalAmount,
      currentBalance: debt.currentBalance,
      monthlyRate: debt.monthlyRate,
      amortization: debt.amortization,
      payment,
      nextDueDate: debt.nextDueDate,
      trackedSince: monthOf(day(debt.createdAt) ?? today),
      payments: payments.map((item) => ({ date: item.date, principal: item.principal })),
    })),
    investments: sources.investments.map((item) => ({
      currentValue: item.currentValue,
      isEmergencyReserve: item.isEmergencyReserve,
      active: item.status === "active",
      since: monthOf(day(item.createdAt) ?? today),
    })),
    provisions: sources.provisions.map(({ provision, contributions }) => ({
      targetAmount: provision.targetAmount,
      dueDate: provision.dueDate,
      startDate: day(provision.createdAt) ?? today,
      contributions: contributions.map((item) => ({
        date: item.date,
        kind: item.kind,
        amount: item.amount,
      })),
    })),
    goals: sources.goals.map((goal) => {
      const linked = (goal.linkedInvestmentIds ?? []).reduce(
        (sum, id) => sum + (investmentValue.get(id) ?? 0),
        0,
      );
      return {
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate,
        current: goal.currentAmount ?? (linked > 0 ? linked : null),
        since: day(goal.createdAt) ?? today,
        active: goal.status === "active",
      };
    }),
  };
}
