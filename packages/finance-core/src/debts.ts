import {
  addMonths,
  addMonthsToMonth,
  monthOf,
  monthRange,
  type DateString,
  type MonthString,
} from "./dates";

/**
 * Regras de dívidas: juros mensais compostos sobre o saldo devedor.
 * Taxas em percentual ao mês (2,1 = 2,1% a.m.); valores em centavos inteiros.
 */
export type AmortizationSystem = "price" | "sac" | "none";

/** Juros de um mês sobre o saldo (arredondados ao centavo). */
export function monthlyInterest(balance: number, monthlyRatePercent: number): number {
  return Math.round((balance * monthlyRatePercent) / 100);
}

/** Parcela fixa da Tabela Price para quitar `balance` em `months` meses. */
export function pricePayment(balance: number, monthlyRatePercent: number, months: number): number {
  if (months <= 0) return balance;
  const rate = monthlyRatePercent / 100;
  if (rate === 0) return Math.ceil(balance / months);
  return Math.ceil((balance * rate) / (1 - (1 + rate) ** -months));
}

export interface ScheduleRow {
  /** 1 = próxima parcela. */
  number: number;
  date: DateString;
  payment: number;
  interest: number;
  principal: number;
  /** Saldo depois do pagamento. */
  balance: number;
}

export interface ScheduleInput {
  balance: number;
  monthlyRate: number;
  system: AmortizationSystem;
  /** Parcela (Price e sem juros). No SAC, é a primeira parcela; a amortização fixa vem de `remainingInstallments`. */
  payment: number | null;
  /** Parcelas restantes (obrigatório no SAC; nos outros, usado quando não há parcela informada). */
  remainingInstallments: number | null;
  /** Data da próxima parcela. */
  firstDate: DateString;
  /** Valor extra pago todo mês (antecipação mensal). */
  extraMonthly?: number;
  /** Limite de segurança (50 anos). */
  maxMonths?: number;
}

export interface Schedule {
  rows: ScheduleRow[];
  totalInterest: number;
  totalPaid: number;
  /** A parcela não cobre os juros: a dívida nunca termina (comum no rotativo). */
  neverEnds: boolean;
}

/** Parcela efetiva usada no cronograma. */
export function effectivePayment(
  input: Pick<ScheduleInput, "balance" | "monthlyRate" | "payment" | "remainingInstallments">,
): number {
  if (input.payment && input.payment > 0) return input.payment;
  if (input.remainingInstallments && input.remainingInstallments > 0) {
    return pricePayment(input.balance, input.monthlyRate, input.remainingInstallments);
  }
  return 0;
}

/** Cronograma até a quitação, mês a mês. */
export function amortizationSchedule(input: ScheduleInput): Schedule {
  const maxMonths = input.maxMonths ?? 600;
  const extra = Math.max(input.extraMonthly ?? 0, 0);
  const rows: ScheduleRow[] = [];
  let balance = input.balance;
  let totalInterest = 0;
  let totalPaid = 0;
  const rate = input.system === "none" ? 0 : input.monthlyRate;
  const sacPrincipal =
    input.system === "sac" && input.remainingInstallments
      ? Math.ceil(input.balance / input.remainingInstallments)
      : 0;
  const basePayment = input.system === "sac" ? 0 : effectivePayment(input);

  if (balance <= 0) return { rows, totalInterest: 0, totalPaid: 0, neverEnds: false };
  if (input.system !== "sac" && basePayment + extra <= monthlyInterest(balance, rate)) {
    return { rows, totalInterest: 0, totalPaid: 0, neverEnds: true };
  }

  for (let number = 1; balance > 0 && number <= maxMonths; number += 1) {
    const interest = monthlyInterest(balance, rate);
    const due = input.system === "sac" ? sacPrincipal + interest : basePayment;
    const payment = Math.min(due + extra, balance + interest);
    const principal = payment - interest;
    balance -= principal;
    totalInterest += interest;
    totalPaid += payment;
    rows.push({
      number,
      date: addMonths(input.firstDate, number - 1),
      payment,
      interest,
      principal,
      balance,
    });
  }
  return { rows, totalInterest, totalPaid, neverEnds: balance > 0 };
}

/** Percentual já pago (0 a 1), a partir do valor inicial e do saldo atual. */
export function percentPaid(originalAmount: number, currentBalance: number): number {
  if (originalAmount <= 0) return 0;
  return Math.min(Math.max((originalAmount - currentBalance) / originalAmount, 0), 1);
}

/** Efeito de um pagamento no saldo: parcela normal soma os juros do mês; antecipação abate direto do principal. */
export function applyPayment(
  balance: number,
  amount: number,
  monthlyRate: number,
  kind: "regular" | "prepayment",
  system: AmortizationSystem = "price",
): { interest: number; principal: number; balance: number } {
  const interest =
    kind === "regular" && system !== "none"
      ? Math.min(monthlyInterest(balance, monthlyRate), amount)
      : 0;
  const principal = Math.min(amount - interest, balance);
  return { interest, principal, balance: balance - principal };
}

export interface PrepaymentScenario {
  months: number;
  totalInterest: number;
  endDate: DateString | null;
  payment: number;
  neverEnds: boolean;
}

export interface PrepaymentResult {
  baseline: PrepaymentScenario;
  scenario: PrepaymentScenario;
  interestSaved: number;
  monthsSaved: number;
}

function summarize(schedule: Schedule, payment: number): PrepaymentScenario {
  return {
    months: schedule.rows.length,
    totalInterest: schedule.totalInterest,
    endDate: schedule.rows.at(-1)?.date ?? null,
    payment,
    neverEnds: schedule.neverEnds,
  };
}

/**
 * Simula antecipações:
 * - `extraMonthly`: pagar um valor a mais todo mês (reduz o prazo);
 * - `lumpSum` hoje com `mode` "reduce_term" (mantém a parcela, termina antes) ou "reduce_payment"
 *   (mantém o prazo, parcela menor).
 */
export function simulatePrepayment(
  input: ScheduleInput & { lumpSum?: number; mode?: "reduce_term" | "reduce_payment" },
): PrepaymentResult {
  const baseSchedule = amortizationSchedule({ ...input, extraMonthly: 0 });
  const basePayment =
    input.system === "sac" ? (baseSchedule.rows[0]?.payment ?? 0) : effectivePayment(input);
  const baseline = summarize(baseSchedule, basePayment);

  const lump = Math.min(Math.max(input.lumpSum ?? 0, 0), input.balance);
  const balance = input.balance - lump;
  let scenarioInput: ScheduleInput = { ...input, balance };
  if (lump > 0 && input.mode === "reduce_payment") {
    const months = baseline.neverEnds ? (input.remainingInstallments ?? 0) : baseline.months;
    scenarioInput =
      input.system === "sac"
        ? { ...scenarioInput, remainingInstallments: months }
        : {
            ...scenarioInput,
            payment: pricePayment(balance, input.system === "none" ? 0 : input.monthlyRate, months),
          };
  }
  const schedule = amortizationSchedule(scenarioInput);
  const payment =
    input.system === "sac" ? (schedule.rows[0]?.payment ?? 0) : effectivePayment(scenarioInput);
  const scenario = summarize(schedule, payment);

  return {
    baseline,
    scenario,
    interestSaved: baseline.neverEnds
      ? 0
      : Math.max(baseline.totalInterest - scenario.totalInterest, 0),
    monthsSaved: baseline.neverEnds ? 0 : Math.max(baseline.months - scenario.months, 0),
  };
}

export interface BalancePoint {
  month: MonthString;
  balance: number;
  /** Mês anterior ao primeiro pagamento registrado: saldo estimado entre o início e o acompanhamento. */
  estimated: boolean;
}

/**
 * Saldo ao fim de cada mês, do início da dívida até o mês de `today`.
 * Parte do saldo atual e devolve o principal de cada pagamento posterior ao mês.
 * Antes dos pagamentos registrados, o saldo vai em linha reta do valor inicial ao primeiro saldo conhecido.
 */
export function balanceHistory(input: {
  originalAmount: number;
  currentBalance: number;
  startDate: DateString;
  today: DateString;
  /** Mês em que o acompanhamento começou (cadastro da dívida). */
  trackedSince: MonthString;
  payments: { date: DateString; principal: number }[];
}): BalancePoint[] {
  const months = monthRange(monthOf(input.startDate), monthOf(input.today));
  if (months.length === 0)
    return [{ month: monthOf(input.today), balance: input.currentBalance, estimated: false }];
  const firstTracked = [
    input.trackedSince,
    ...input.payments.map((payment) => monthOf(payment.date)),
  ].sort()[0]!;
  const known = (month: MonthString) =>
    input.currentBalance +
    input.payments
      .filter((payment) => monthOf(payment.date) > month)
      .reduce((sum, payment) => sum + payment.principal, 0);

  const startIndex = Math.max(months.indexOf(firstTracked), 0);
  // Saldo conhecido no fim do mês anterior ao acompanhamento.
  const anchor = known(addMonthsToMonth(months[startIndex]!, -1));
  return months.map((month, index) => {
    if (index === 0 && startIndex > 0)
      return { month, balance: input.originalAmount, estimated: false };
    if (index < startIndex) {
      const ratio = index / (startIndex - 1);
      return {
        month,
        balance: Math.round(input.originalAmount + (anchor - input.originalAmount) * ratio),
        estimated: true,
      };
    }
    return { month, balance: known(month), estimated: false };
  });
}

/** Taxa anual equivalente a uma taxa mensal composta (em percentual): 1,5% a.m. → 19,56% a.a. */
export function equivalentYearlyRate(monthlyRatePercent: number): number {
  return ((1 + monthlyRatePercent / 100) ** 12 - 1) * 100;
}

export type DebtStatus = "active" | "overdue" | "paid_off" | "growing";

export interface DebtSnapshotInput {
  originalAmount: number;
  currentBalance: number;
  monthlyRate: number;
  system: AmortizationSystem;
  installmentAmount: number | null;
  installmentCount: number | null;
  /** Data da última parcela do contrato. */
  endDate: DateString | null;
  nextDueDate: DateString | null;
  /** Parcelas normais já registradas no app. */
  regularPaymentsCount: number;
  today: DateString;
}

export interface DebtSnapshot {
  remainingInstallments: number | null;
  /** Parcela usada nos cálculos (informada ou calculada pela taxa e pelo prazo). */
  payment: number;
  schedule: Schedule;
  percentPaid: number;
  /** Juros deste mês sobre o saldo atual. */
  monthInterest: number;
  /** Última parcela pela projeção (null se a dívida não termina). */
  projectedEndDate: DateString | null;
  status: DebtStatus;
}

/**
 * Situação de uma dívida hoje. As parcelas que faltam vêm da data final do contrato (vale para
 * dívidas cadastradas no meio) ou, sem ela, do número de parcelas menos as pagas no app.
 */
export function debtSnapshot(input: DebtSnapshotInput): DebtSnapshot {
  const firstDate =
    input.nextDueDate && input.nextDueDate >= input.today ? input.nextDueDate : input.today;
  let remainingInstallments: number | null = null;
  if (input.endDate)
    remainingInstallments = Math.max(
      monthRange(monthOf(firstDate), monthOf(input.endDate)).length,
      1,
    );
  else if (input.installmentCount)
    remainingInstallments = Math.max(input.installmentCount - input.regularPaymentsCount, 1);

  const scheduleInput: ScheduleInput = {
    balance: input.currentBalance,
    monthlyRate: input.monthlyRate,
    system: input.system,
    payment: input.installmentAmount,
    remainingInstallments,
    firstDate,
  };
  const schedule = amortizationSchedule(scheduleInput);
  const payment =
    input.system === "sac" ? (schedule.rows[0]?.payment ?? 0) : effectivePayment(scheduleInput);

  let status: DebtStatus = "active";
  if (input.currentBalance <= 0) status = "paid_off";
  else if (schedule.neverEnds) status = "growing";
  else if (input.nextDueDate && input.nextDueDate < input.today) status = "overdue";

  return {
    remainingInstallments,
    payment,
    schedule,
    percentPaid: percentPaid(input.originalAmount, input.currentBalance),
    monthInterest:
      input.system === "none" ? 0 : monthlyInterest(input.currentBalance, input.monthlyRate),
    projectedEndDate: schedule.neverEnds ? null : (schedule.rows.at(-1)?.date ?? null),
    status,
  };
}

export interface EvolutionPoint {
  month: MonthString;
  value: number;
  projected: boolean;
  estimated: boolean;
}

/**
 * Evolução do saldo devedor: o realizado (pelos pagamentos) até hoje e a projeção do cronograma
 * até a quitação. Reduz a no máximo `maxPoints` pontos, mantendo o primeiro, o de hoje e o último.
 */
export function debtEvolution(input: {
  originalAmount: number;
  currentBalance: number;
  startDate: DateString;
  trackedSince: MonthString;
  payments: { date: DateString; principal: number }[];
  schedule: Schedule;
  today: DateString;
  maxPoints?: number;
}): EvolutionPoint[] {
  const maxPoints = input.maxPoints ?? 30;
  const history = balanceHistory({
    originalAmount: input.originalAmount,
    currentBalance: input.currentBalance,
    startDate: input.startDate <= input.today ? input.startDate : input.today,
    today: input.today,
    trackedSince: input.trackedSince,
    payments: input.payments,
  }).map((point) => ({
    month: point.month,
    value: point.balance,
    projected: false,
    estimated: point.estimated,
  }));

  const lastMonth = history.at(-1)?.month ?? monthOf(input.today);
  const projection = new Map<MonthString, number>();
  for (const row of input.schedule.rows) {
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
  const step = Math.ceil(points.length / maxPoints);
  const todayIndex = history.length - 1;
  return points.filter(
    (_, index) =>
      index === 0 || index === todayIndex || index === points.length - 1 || index % step === 0,
  );
}
