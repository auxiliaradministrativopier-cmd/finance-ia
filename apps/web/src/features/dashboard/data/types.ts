import type { Cents } from "@finance-ia/shared";

/** Formato dos dados do Dashboard. É o contrato que o repositório real (Firestore) vai cumprir. */
export interface MonthlyFlow {
  /** Mês no formato YYYY-MM. */
  month: string;
  income: Cents;
  expense: Cents;
}

export interface NetWorthPoint {
  month: string;
  value: Cents;
  /** Pontos futuros calculados a partir de recorrências, parcelas e médias. */
  projected: boolean;
}

export type BillKind = "invoice" | "bill" | "provision" | "debt";

export interface UpcomingBill {
  id: string;
  title: string;
  kind: BillKind;
  /** Data de vencimento no formato YYYY-MM-DD. */
  dueDate: string;
  amount: Cents;
  account: string;
}

export interface GoalSummary {
  id: string;
  name: string;
  current: Cents;
  target: Cents;
  /** Mês-alvo no formato YYYY-MM, quando a meta tem prazo. */
  targetMonth: string | null;
}

export type AlertTone = "danger" | "warning" | "success" | "ai";

export interface DashboardAlert {
  id: string;
  tone: AlertTone;
  title: string;
  description: string;
  href: string;
}

export interface ProvisionsSummary {
  /** Quanto guardar por mês somando os provisionamentos em aberto. */
  monthlyNeeded: Cents;
  saved: Cents;
  target: Cents;
  openCount: number;
  /** Atrasados ou vencidos. */
  behind: number;
  /** Os próximos a vencer. */
  items: {
    id: string;
    name: string;
    dueDate: string;
    progress: number;
    monthlyNeeded: Cents;
    status: "on_track" | "behind" | "completed" | "overdue";
  }[];
}

export type IfaBand = "critical" | "attention" | "healthy" | "excellent";

export interface DashboardData {
  /** "sample" = dados de exemplo; "live" = dados reais do usuário. */
  source: "sample" | "live";
  /** Mês de referência (YYYY-MM) e data de hoje (YYYY-MM-DD). */
  month: string;
  today: string;
  balance: { current: Cents; projectedEndOfMonth: Cents };
  income: { received: Cents; expected: Cents; previousMonth: Cents };
  /** budget = null enquanto o usuário não tiver orçamento. */
  expense: { spent: Cents; budget: Cents | null; previousMonth: Cents };
  /** monthReturn = null quando não há histórico de rendimento. */
  investments: { total: Cents; monthReturn: Cents | null; count: number };
  debts: { outstanding: Cents; monthlyPayment: Cents; count: number };
  /** null enquanto o IFA não é calculado (Cloud Functions). */
  /** Nota atual; `delta` é a variação desde o mês anterior (null sem mês anterior). */
  ifa: { score: number; band: IfaBand; delta: number | null } | null;
  /** Rótulo da série de evolução ("Patrimônio líquido" ou "Saldo em contas"). */
  evolutionLabel: string;
  flow: MonthlyFlow[];
  netWorth: NetWorthPoint[];
  upcomingBills: UpcomingBill[];
  goals: GoalSummary[];
  provisions: ProvisionsSummary;
  alerts: DashboardAlert[];
}
