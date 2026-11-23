import {
  accountBalances,
  type AccountOpening,
  addDays,
  addMonthsToMonth,
  balanceSeries,
  invoiceBalance,
  invoiceFor,
  type LedgerEntry,
  monthlyFlow,
  monthRange,
  summarizeMonth,
  totalBalance,
} from "@finance-ia/finance-core";
import { formatMoney } from "@finance-ia/shared";
import { daysUntil } from "./derived";
import { formatPercent } from "@/lib/format";
import type { DashboardAlert, DashboardData, GoalSummary, UpcomingBill } from "./types";

export interface LiveSources {
  today: string;
  accounts: (AccountOpening & { name: string; archived: boolean })[];
  cards: { id: string; name: string; closingDay: number; dueDay: number; archived: boolean }[];
  transactions: (LedgerEntry & { id: string; description: string; invoiceMonth: string | null })[];
  goals: {
    id: string;
    name: string;
    targetAmount: number;
    targetDate: string | null;
    currentAmount?: number;
    status: string;
  }[];
  investments: { currentValue: number; status: string }[];
  /** IFA já calculado (features/health). */
  ifa?: DashboardData["ifa"];
  /** Dívidas já com parcela e situação calculadas (finance-core). */
  debts: {
    id: string;
    name: string;
    creditor: string;
    currentBalance: number;
    payment: number;
    nextDueDate: string | null;
    status: "active" | "overdue" | "paid_off" | "growing";
  }[];
  /** Provisionamentos já com saldo e plano calculados (finance-core). */
  provisions: {
    id: string;
    name: string;
    dueDate: string;
    targetAmount: number;
    balance: number;
    plan: {
      monthlyNeeded: number;
      remaining: number;
      progress: number;
      status: "on_track" | "behind" | "completed" | "overdue";
    };
  }[];
}

/** O usuário já começou a usar o app (tem conta ou lançamento)? */
export function hasOwnData(sources: Pick<LiveSources, "accounts" | "transactions">): boolean {
  return sources.accounts.length > 0 || sources.transactions.length > 0;
}

/**
 * Monta os números do Dashboard a partir dos dados reais.
 * Enquanto as Cloud Functions não existem, os agregados são calculados aqui (no app).
 */
export function buildLiveDashboard(sources: LiveSources): DashboardData {
  const { today } = sources;
  const month = today.slice(0, 7);
  const previous = addMonthsToMonth(month, -1);
  const accounts = sources.accounts.filter((account) => !account.archived);
  const entries = sources.transactions;

  const current = summarizeMonth(entries, month);
  const last = summarizeMonth(entries, previous);
  const balances = accountBalances(accounts, entries, today);
  const lastDay = `${month}-${String(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}`;
  const projected = accountBalances(accounts, entries, lastDay, { includePending: true });

  // Próximas contas: despesas previstas na conta (inclui atrasadas) + fatura atual de cada cartão.
  const horizon = addDays(today, 30);
  const bills: UpcomingBill[] = entries
    .filter(
      (entry) =>
        entry.type === "expense" &&
        entry.status !== "paid" &&
        !entry.cardId &&
        entry.date <= horizon,
    )
    .map((entry) => ({
      id: entry.id,
      title: entry.description,
      kind: "bill" as const,
      dueDate: entry.date,
      amount: entry.amount,
      account: accounts.find((account) => account.id === entry.accountId)?.name ?? "Conta",
    }));
  for (const card of sources.cards.filter((item) => !item.archived)) {
    const invoice = invoiceFor(today, card);
    // O que falta pagar da fatura (compras menos pagamentos já registrados).
    const total = invoiceBalance(entries, card.id, invoice.invoiceMonth).remaining;
    if (total > 0 && invoice.dueDate <= horizon) {
      bills.push({
        id: `invoice-${card.id}`,
        title: `Fatura ${card.name}`,
        kind: "invoice",
        dueDate: invoice.dueDate,
        amount: total,
        account: `Cartão ${card.name}`,
      });
    }
  }
  // Provisionamentos que vencem em até 30 dias e ainda não estão completos.
  for (const provision of sources.provisions) {
    if (provision.plan.status !== "completed" && provision.dueDate <= horizon) {
      bills.push({
        id: `provision-${provision.id}`,
        title: provision.name,
        kind: "provision",
        dueDate: provision.dueDate,
        amount: provision.plan.remaining,
        account: "Falta guardar",
      });
    }
  }
  // Próxima parcela de cada dívida em aberto.
  const openDebts = sources.debts.filter((debt) => debt.status !== "paid_off");
  for (const debt of openDebts) {
    if (debt.nextDueDate && debt.payment > 0 && debt.nextDueDate <= horizon) {
      bills.push({
        id: `debt-${debt.id}`,
        title: `Parcela ${debt.name}`,
        kind: "debt",
        dueDate: debt.nextDueDate,
        amount: Math.min(debt.payment, debt.currentBalance),
        account: debt.creditor,
      });
    }
  }
  bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Alertas factuais, a partir dos próprios lançamentos.
  const alerts: DashboardAlert[] = [];
  const overdue = bills.filter((bill) => bill.kind === "bill" && bill.dueDate < today);
  if (overdue.length > 0) {
    alerts.push({
      id: "overdue",
      tone: "danger",
      title:
        overdue.length === 1
          ? `"${overdue[0]!.title}" está atrasada`
          : `${overdue.length} contas atrasadas`,
      description: `Total de ${formatMoney(overdue.reduce((sum, bill) => sum + bill.amount, 0))}. Marque como paga quando quitar.`,
      href: "/fluxo/despesas",
    });
  }
  const invoiceSoon = bills.find(
    (bill) =>
      bill.kind === "invoice" &&
      daysUntil(today, bill.dueDate) <= 3 &&
      daysUntil(today, bill.dueDate) >= 0,
  );
  if (invoiceSoon) {
    const days = daysUntil(today, invoiceSoon.dueDate);
    alerts.push({
      id: "invoice",
      tone: "warning",
      title: `${invoiceSoon.title} vence ${days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`}`,
      description: `${formatMoney(invoiceSoon.amount)} em compras nesta fatura.`,
      href: "/cartoes",
    });
  }
  if (current.projectedBalance < 0) {
    alerts.push({
      id: "negative",
      tone: "warning",
      title: "O mês deve fechar no vermelho",
      description: `Com o que está previsto, faltam ${formatMoney(-current.projectedBalance)} para cobrir as despesas.`,
      href: "/fluxo",
    });
  }
  const lagging = sources.provisions.filter(
    (item) => item.plan.status === "behind" || item.plan.status === "overdue",
  );
  if (lagging.length > 0) {
    const first = lagging[0]!;
    alerts.push({
      id: "provisions",
      tone: "warning",
      title:
        lagging.length === 1
          ? `"${first.name}" está ${first.plan.status === "overdue" ? "vencido" : "atrasado"}`
          : `${lagging.length} provisionamentos precisam de atenção`,
      description:
        lagging.length === 1
          ? `Guarde ${formatMoney(first.plan.monthlyNeeded)} ${first.plan.status === "overdue" ? "para completar" : "este mês para voltar ao ritmo"}.`
          : "Confira quanto guardar em cada um para chegar a tempo.",
      href: "/planejar/provisionamentos",
    });
  }
  const growing = openDebts.filter((debt) => debt.status === "growing");
  const lateDebts = openDebts.filter((debt) => debt.status === "overdue");
  if (growing.length > 0) {
    alerts.push({
      id: "debts-growing",
      tone: "danger",
      title:
        growing.length === 1
          ? `A parcela de "${growing[0]!.name}" não cobre os juros`
          : `${growing.length} dívidas estão crescendo`,
      description:
        "Com a parcela abaixo dos juros, o saldo só aumenta. Veja como renegociar ou antecipar.",
      href: "/patrimonio/dividas",
    });
  } else if (lateDebts.length > 0) {
    alerts.push({
      id: "debts-overdue",
      tone: "danger",
      title:
        lateDebts.length === 1
          ? `A parcela de "${lateDebts[0]!.name}" venceu`
          : `${lateDebts.length} parcelas de dívidas venceram`,
      description: "Registre o pagamento para manter o saldo e a evolução em dia.",
      href: "/patrimonio/dividas",
    });
  }
  const income = current.income.paid;
  if (income > 0 && (income - current.expense.paid) / income >= 0.2) {
    alerts.push({
      id: "savings",
      tone: "success",
      title: `Você guardou ${formatPercent((income - current.expense.paid) / income)} da renda`,
      description: "Acima dos 20% recomendados. Que tal direcionar a sobra para uma meta?",
      href: "/planejar/metas",
    });
  }

  const goals: GoalSummary[] = sources.goals
    .filter((goal) => goal.status !== "canceled")
    .slice(0, 3)
    .map((goal) => ({
      id: goal.id,
      name: goal.name,
      current: goal.currentAmount ?? 0,
      target: goal.targetAmount,
      targetMonth: goal.targetDate?.slice(0, 7) ?? null,
    }));

  // A evolução começa no mês em que o primeiro saldo passou a ser acompanhado.
  const firstTracked = accounts
    .reduce(
      (min, account) => (account.initialBalanceDate < min ? account.initialBalanceDate : min),
      today,
    )
    .slice(0, 7);
  const evolutionStart =
    firstTracked > addMonthsToMonth(month, -11) ? firstTracked : addMonthsToMonth(month, -11);
  const flowMonths = monthRange(addMonthsToMonth(month, -11), month);
  const evolutionMonths = monthRange(evolutionStart, addMonthsToMonth(month, 3));
  const activeInvestments = sources.investments.filter(
    (investment) => investment.status === "active",
  );

  return {
    source: "live",
    month,
    today,
    balance: {
      current: totalBalance(accounts, balances),
      projectedEndOfMonth: totalBalance(accounts, projected),
    },
    income: {
      received: current.income.paid,
      expected: current.income.paid + current.income.pending,
      previousMonth: last.income.paid + last.income.pending,
    },
    expense: {
      spent: current.expense.paid,
      budget: null,
      previousMonth: last.expense.paid + last.expense.pending,
    },
    investments: {
      total: activeInvestments.reduce((sum, item) => sum + item.currentValue, 0),
      monthReturn: null,
      count: activeInvestments.length,
    },
    debts: {
      outstanding: openDebts.reduce((sum, debt) => sum + debt.currentBalance, 0),
      monthlyPayment: openDebts.reduce((sum, debt) => sum + debt.payment, 0),
      count: openDebts.length,
    },
    ifa: sources.ifa ?? null,
    evolutionLabel: "Saldo em contas",
    flow: monthlyFlow(entries, flowMonths),
    netWorth: balanceSeries(accounts, entries, evolutionMonths, today),
    upcomingBills: bills.slice(0, 6),
    goals,
    provisions: {
      monthlyNeeded: sources.provisions
        .filter((item) => item.plan.status !== "completed")
        .reduce((sum, item) => sum + item.plan.monthlyNeeded, 0),
      saved: sources.provisions.reduce(
        (sum, item) => sum + Math.min(item.balance, item.targetAmount),
        0,
      ),
      target: sources.provisions.reduce((sum, item) => sum + item.targetAmount, 0),
      openCount: sources.provisions.filter((item) => item.plan.status !== "completed").length,
      behind: lagging.length,
      items: [...sources.provisions]
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          name: item.name,
          dueDate: item.dueDate,
          progress: item.plan.progress,
          monthlyNeeded: item.plan.monthlyNeeded,
          status: item.plan.status,
        })),
    },
    alerts,
  };
}
