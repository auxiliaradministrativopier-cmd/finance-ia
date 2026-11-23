import { monthOf, type HealthInput } from "@finance-ia/finance-core";
import { dayOf } from "@/lib/time";
import type { DebtView } from "@/features/debts/types";
import type { ProvisionView } from "@/features/provisions/types";

const day = (value: Date | null | undefined) => (value ? dayOf(value) : null);

/** Os dados do app no formato que o cálculo do IFA (finance-core) espera. */
export interface HealthSources {
  today: string;
  accounts: {
    id: string;
    initialBalance: number;
    initialBalanceDate: string;
    includeInTotal: boolean;
  }[];
  cards?: { id: string; closingDay: number; dueDay: number }[];
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
    invoiceMonth?: string | null;
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
    cards: (sources.cards ?? []).map((card) => ({
      id: card.id,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
    })),
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
      invoiceMonth: entry.invoiceMonth ?? null,
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
