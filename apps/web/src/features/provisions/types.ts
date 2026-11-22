import type { ProvisionPlan } from "@finance-ia/finance-core";
import type { Repositories } from "@/data/repositories";

export type Provision = Awaited<ReturnType<Repositories["provisions"]["get"]>>;
export type Contribution = Awaited<
  ReturnType<ReturnType<Repositories["provisionContributions"]>["get"]>
>;

/** Provisionamento com o saldo (soma dos aportes) e o plano calculado. */
export interface ProvisionView {
  provision: Provision;
  contributions: Contribution[];
  balance: number;
  plan: ProvisionPlan;
}
