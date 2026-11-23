import type { DebtStatus, Schedule } from "@finance-ia/finance-core";
import type { Repositories } from "@/data/repositories";

export type Debt = Awaited<ReturnType<Repositories["debts"]["get"]>>;
export type DebtPayment = Awaited<ReturnType<ReturnType<Repositories["debtPayments"]>["get"]>>;

export type { DebtStatus };

/** Dívida com pagamentos, percentual pago e cronograma calculados. */
export interface DebtView {
  debt: Debt;
  payments: DebtPayment[];
  percentPaid: number;
  /** Juros deste mês sobre o saldo atual. */
  monthInterest: number;
  /** Parcela usada nos cálculos (informada ou calculada pela taxa e prazo). */
  payment: number;
  schedule: Schedule;
  /** Última parcela pela projeção (ou null se não termina). */
  projectedEndDate: string | null;
  status: DebtStatus;
}
