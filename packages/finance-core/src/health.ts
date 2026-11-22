import { accountBalances, totalBalance, type AccountOpening } from "./balances";
import {
  addDays,
  addMonthsToMonth,
  monthOf,
  monthRange,
  type DateString,
  type MonthString,
} from "./dates";
import { balanceHistory, monthlyInterest } from "./debts";
import { provisionBalance, provisionPlan } from "./provisions";
import { summarizeMonth, type LedgerEntry } from "./summary";

/**
 * IFA (Índice Finance IA): nota de 0 a 1000 em seis pilares.
 * Cada pilar vale de 0 a 1 e é multiplicado pelo seu peso. Pilares sem como medir
 * (ex.: nenhuma conta a pagar no período) saem da conta e a nota é reescalada para 1000.
 */
export type IfaBand = "critical" | "attention" | "healthy" | "excellent";
export type PillarId = "spending" | "reserve" | "debts" | "payments" | "investments" | "goals";

export const PILLAR_WEIGHTS: Record<PillarId, number> = {
  spending: 250,
  reserve: 200,
  debts: 200,
  payments: 150,
  investments: 100,
  goals: 100,
};

export const PILLAR_ORDER: PillarId[] = [
  "spending",
  "reserve",
  "debts",
  "payments",
  "investments",
  "goals",
];

/** Faixas do Design System: 0–399, 400–599, 600–799, 800–1000. */
export function ifaBand(score: number): IfaBand {
  if (score >= 800) return "excellent";
  if (score >= 600) return "healthy";
  if (score >= 400) return "attention";
  return "critical";
}

/** Lançamento com as datas que mostram pontualidade (AAAA-MM-DD no fuso do usuário). */
export interface HealthEntry extends LedgerEntry {
  createdAt: DateString | null;
  paidAt: DateString | null;
}

export interface HealthInput {
  accounts: AccountOpening[];
  entries: HealthEntry[];
  debts: {
    type: string;
    startDate: DateString;
    originalAmount: number;
    currentBalance: number;
    monthlyRate: number;
    amortization: "price" | "sac" | "none";
    /** Parcela mensal usada nos cálculos. */
    payment: number;
    nextDueDate: DateString | null;
    /** Mês do cadastro no app. */
    trackedSince: MonthString;
    payments: { date: DateString; principal: number }[];
  }[];
  investments: {
    currentValue: number;
    isEmergencyReserve: boolean;
    active: boolean;
    since: MonthString;
  }[];
  provisions: {
    targetAmount: number;
    dueDate: DateString;
    startDate: DateString;
    contributions: { date: DateString; kind: "deposit" | "withdrawal"; amount: number }[];
  }[];
  goals: {
    targetAmount: number;
    targetDate: DateString | null;
    current: number | null;
    since: DateString;
    active: boolean;
  }[];
}

export interface PillarResult {
  id: PillarId;
  /** De 0 a 1. */
  score: number;
  points: number;
  maxPoints: number;
  /** false: não há como medir agora; o pilar não entra na nota. */
  measured: boolean;
  facts: Record<string, number>;
}

export interface HealthScore {
  month: MonthString;
  asOf: DateString;
  score: number;
  band: IfaBand;
  pillars: PillarResult[];
  /** Regra que limitou a nota (ex.: gastar mais do que ganha sem reserva). */
  cap: "deficit_without_reserve" | null;
}

/** Interpolação linear por pontos [x, y], com x crescente; fora do intervalo, satura. */
export function piecewise(x: number, points: [number, number][]): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

const WINDOW_MONTHS = 3;
const EXPENSIVE_TYPES = new Set(["revolving_credit", "overdraft"]);
const LATE_TOLERANCE_DAYS = 5;

function endOfMonth(month: MonthString): DateString {
  const [year, m] = month.split("-").map(Number) as [number, number];
  return `${month}-${String(new Date(Date.UTC(year, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Calcula o IFA na data `asOf`. Sem receita e despesa nos últimos 3 meses, devolve null.
 * `isCurrent` = false para meses passados: dados que só existem "hoje" (metas, vencimento de dívida) ficam de fora.
 */
export function healthScore(
  input: HealthInput,
  asOf: DateString,
  isCurrent = true,
): HealthScore | null {
  const month = monthOf(asOf);
  const window = monthRange(addMonthsToMonth(month, -(WINDOW_MONTHS - 1)), month);
  const entries = input.entries.filter((entry) => entry.date <= endOfMonth(month));
  const summaries = window
    .map((item) => summarizeMonth(entries, item))
    .filter((summary) => summary.count > 0);
  const income = summaries.reduce((sum, s) => sum + s.income.paid + s.income.pending, 0);
  const expense = summaries.reduce((sum, s) => sum + s.expense.paid + s.expense.pending, 0);
  if (income <= 0 || expense <= 0) return null;
  const months = summaries.length;
  const avgIncome = income / months;
  const avgExpense = expense / months;
  const inWindow = (date: DateString) => date >= `${window[0]}-01` && date <= asOf;

  // 1. Controle de gastos: quanto da renda sobra.
  const savingsRate = (income - expense) / income;
  const spending = piecewise(savingsRate, [
    [-0.2, 0],
    [0, 0.4],
    [0.1, 0.7],
    [0.2, 0.9],
    [0.3, 1],
  ]);

  // 2. Reserva: saldo das contas + investimentos de reserva, em meses de despesa.
  const accountsTotal = Math.max(
    totalBalance(input.accounts, accountBalances(input.accounts, input.entries, asOf)),
    0,
  );
  const activeInvestments = input.investments.filter((item) => item.active && item.since <= month);
  const emergency = activeInvestments
    .filter((item) => item.isEmergencyReserve)
    .reduce((sum, item) => sum + item.currentValue, 0);
  const reservePool = accountsTotal + emergency;
  const reserveMonths = reservePool / avgExpense;
  const reserve = piecewise(reserveMonths, [
    [0, 0],
    [1, 0.3],
    [3, 0.65],
    [6, 1],
  ]);

  // 3. Dívidas: quanto da renda vai para parcelas, juros caros e dívidas que crescem.
  const openDebts = input.debts
    .filter((debt) => debt.startDate <= asOf)
    .map((debt) => {
      const history = balanceHistory({
        originalAmount: debt.originalAmount,
        currentBalance: debt.currentBalance,
        startDate: debt.startDate,
        today: asOf,
        trackedSince: debt.trackedSince,
        payments: debt.payments,
      });
      const balance = history.at(-1)?.balance ?? debt.currentBalance;
      const interest =
        debt.amortization === "none" ? 0 : monthlyInterest(balance, debt.monthlyRate);
      return { debt, balance, growing: balance > 0 && debt.payment <= interest };
    })
    .filter((item) => item.balance > 0);
  const debtPayments = openDebts.reduce(
    (sum, item) => sum + Math.min(item.debt.payment, item.balance),
    0,
  );
  const commitment = debtPayments / avgIncome;
  const expensiveCount = openDebts.filter(
    (item) => EXPENSIVE_TYPES.has(item.debt.type) || item.debt.monthlyRate >= 4,
  ).length;
  const growingCount = openDebts.filter((item) => item.growing).length;
  let debts =
    openDebts.length === 0
      ? 1
      : piecewise(commitment, [
          [0, 1],
          [0.1, 0.95],
          [0.2, 0.8],
          [0.3, 0.55],
          [0.4, 0.3],
          [0.6, 0],
        ]);
  if (expensiveCount > 0) debts *= 0.75;
  if (growingCount > 0) debts = Math.min(debts, 0.15);

  // 4. Pagamentos: contas pagas em dia (compras no cartão entram pela fatura).
  const bills = input.entries.filter(
    (entry) => entry.type === "expense" && !entry.cardId && inWindow(entry.date),
  );
  // Atrasada na data: já estava registrada e ainda não tinha sido paga.
  // Contas lançadas depois (registro retroativo) não contam como atraso.
  const isOverdue = (entry: HealthEntry) =>
    entry.date < asOf &&
    (entry.createdAt === null || entry.createdAt <= asOf) &&
    (entry.status !== "paid" || (entry.paidAt !== null && entry.paidAt > asOf));
  const isLate = (entry: HealthEntry) =>
    entry.status === "paid" &&
    entry.paidAt !== null &&
    entry.paidAt <= asOf &&
    entry.createdAt !== null &&
    entry.createdAt < entry.date &&
    entry.paidAt > addDays(entry.date, LATE_TOLERANCE_DAYS);
  const overdue = bills.filter(isOverdue).length;
  const late = bills.filter(isLate).length;
  // Vencimento de dívida só é conhecido hoje (o app guarda o próximo, não os passados).
  const overdueDebts = isCurrent
    ? openDebts.filter((item) => item.debt.nextDueDate !== null && item.debt.nextDueDate < asOf)
        .length
    : 0;
  const billsMeasured = bills.length > 0 || openDebts.length > 0;
  let payments = 1;
  if (bills.length > 0) payments = ((bills.length - overdue - late * 0.5) / bills.length) ** 2;
  if (overdue > 0) payments = Math.min(payments, 0.6);
  payments = Math.max(payments - overdueDebts * 0.25, 0);

  // 5. Investimentos: patrimônio investido em meses de despesa (o excedente da reserva conta).
  const invested =
    activeInvestments
      .filter((item) => !item.isEmergencyReserve)
      .reduce((sum, item) => sum + item.currentValue, 0) +
    Math.max(reservePool - avgExpense * 6, 0);
  const investedMonths = invested / avgExpense;
  const hasReturns = summaries.some((summary) =>
    entries.some(
      (entry) =>
        entry.type === "income" &&
        entry.categoryId === "inc-rendimentos" &&
        entry.month === summary.month,
    ),
  );
  const investments = Math.min(
    piecewise(investedMonths, [
      [0, 0],
      [1, 0.25],
      [6, 0.6],
      [12, 0.8],
      [24, 1],
    ]) + (hasReturns ? 0.15 : 0),
    1,
  );

  // 6. Metas: provisionamentos e metas no ritmo combinado.
  const goalScores: number[] = [];
  for (const provision of input.provisions) {
    if (provision.startDate > asOf || provision.dueDate < asOf) continue;
    const accumulated = provisionBalance(
      provision.contributions.filter((item) => item.date <= asOf),
    );
    const plan = provisionPlan({
      targetAmount: provision.targetAmount,
      accumulated,
      dueDate: provision.dueDate,
      startDate: provision.startDate,
      today: asOf,
    });
    if (plan.status === "completed" || plan.status === "on_track") goalScores.push(1);
    else if (plan.status === "behind")
      goalScores.push(0.8 * Math.min(accumulated / Math.max(plan.expectedByNow, 1), 1));
    else goalScores.push(0.1);
  }
  // Metas só têm o valor atual: entram apenas na nota de hoje.
  for (const goal of input.goals) {
    if (!isCurrent || !goal.active || goal.since > asOf || goal.current === null) continue;
    const progress = Math.min(goal.current / goal.targetAmount, 1);
    if (progress >= 1) goalScores.push(1);
    else if (!goal.targetDate) goalScores.push(progress > 0 ? 0.8 : 0.5);
    else {
      const total = Math.max(
        monthRange(monthOf(goal.since), monthOf(goal.targetDate)).length - 1,
        1,
      );
      const elapsed = Math.min(
        Math.max(monthRange(monthOf(goal.since), month).length - 1, 0),
        total,
      );
      const expected = elapsed / total;
      goalScores.push(expected === 0 ? 1 : Math.min(progress / expected, 1));
    }
  }
  const goals =
    goalScores.length === 0
      ? 0.3
      : goalScores.reduce((sum, value) => sum + value, 0) / goalScores.length;

  const raw: [PillarId, number, boolean, Record<string, number>][] = [
    [
      "spending",
      spending,
      true,
      {
        savingsRate: round2(savingsRate),
        avgIncome: Math.round(avgIncome),
        avgExpense: Math.round(avgExpense),
        months,
      },
    ],
    [
      "reserve",
      reserve,
      true,
      { reserveMonths: round2(reserveMonths), reservePool, target: Math.round(avgExpense * 6) },
    ],
    [
      "debts",
      debts,
      true,
      {
        openCount: openDebts.length,
        commitment: round2(commitment),
        expensiveCount,
        growingCount,
        monthlyPayments: debtPayments,
      },
    ],
    ["payments", payments, billsMeasured, { bills: bills.length, overdue, late, overdueDebts }],
    [
      "investments",
      investments,
      true,
      { invested, investedMonths: round2(investedMonths), hasReturns: hasReturns ? 1 : 0 },
    ],
    [
      "goals",
      goals,
      true,
      { items: goalScores.length, onTrack: goalScores.filter((value) => value >= 1).length },
    ],
  ];
  const pillars: PillarResult[] = raw.map(([id, value, measured, facts]) => {
    const score = Math.min(Math.max(value, 0), 1);
    return {
      id,
      score,
      points: Math.round(score * PILLAR_WEIGHTS[id]),
      maxPoints: PILLAR_WEIGHTS[id],
      measured,
      facts,
    };
  });
  const measured = pillars.filter((pillar) => pillar.measured);
  const max = measured.reduce((sum, pillar) => sum + pillar.maxPoints, 0);
  const weighted = Math.round(
    (measured.reduce((sum, pillar) => sum + pillar.score * pillar.maxPoints, 0) / max) * 1000,
  );
  // Gastar mais do que ganha sem um mês de reserva é crítico, mesmo sem dívidas.
  const cap = savingsRate < 0 && reserveMonths < 1 ? ("deficit_without_reserve" as const) : null;
  const total = cap ? Math.min(weighted, 399) : weighted;
  return { month, asOf, score: total, band: ifaBand(total), pillars, cap };
}

/**
 * Evolução do IFA nos últimos `months` meses, reconstruída a partir dos dados:
 * meses passados no último dia; o mês atual hoje. Meses sem dados suficientes ficam de fora.
 */
export function healthHistory(input: HealthInput, today: DateString, months = 12): HealthScore[] {
  const current = monthOf(today);
  const first = input.entries.reduce<MonthString>(
    (min, entry) => (entry.month < min ? entry.month : min),
    current,
  );
  const start = [first, addMonthsToMonth(current, -(months - 1))].sort().at(-1)!;
  return monthRange(start, current)
    .map((month) =>
      month === current ? healthScore(input, today) : healthScore(input, endOfMonth(month), false),
    )
    .filter((item): item is HealthScore => item !== null);
}
