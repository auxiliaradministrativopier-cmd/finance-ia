"use client";

import { useMemo } from "react";
import { getRepositories } from "@/data/repositories";
import { useLiveList } from "@/data/use-live-list";
import { useCashFlowData } from "@/features/cash-flow/use-cash-flow";
import { useDebts } from "@/features/debts/use-debts";
import { computeHealth } from "@/features/health/compute";
import { useProvisions } from "@/features/provisions/use-provisions";
import { buildLiveDashboard, hasOwnData } from "./data/live-dashboard";
import { mockDashboard } from "./data/mock-dashboard";
import type { DashboardData } from "./data/types";

export type DashboardState =
  | { status: "loading"; data: null; isSample: boolean }
  | { status: "ready"; data: DashboardData; isSample: boolean }
  | { status: "error"; data: null; isSample: boolean; message: string };

/**
 * Dados do Dashboard em tempo real. Qualquer lançamento, conta ou meta salvo no Firestore
 * atualiza o painel na hora. Sem nenhum dado ainda, mostra o exemplo para orientar o usuário.
 */
export function useDashboard(): DashboardState {
  const cashFlow = useCashFlowData();
  const goals = useLiveList(getRepositories().goals);
  const investments = useLiveList(getRepositories().investments);
  const debts = useDebts();
  const provisions = useProvisions();

  // Só decide entre exemplo e dados reais depois que todas as fontes responderem.
  const loading =
    cashFlow.status === "loading" ||
    provisions.status === "loading" ||
    debts.status === "loading" ||
    [goals, investments].some((state) => state.status === "loading");
  const error =
    cashFlow.error ??
    provisions.error ??
    debts.error ??
    [goals, investments].find((state) => state.status === "error")?.error ??
    null;

  const data = useMemo(() => {
    if (loading || error) return null;
    if (!hasOwnData(cashFlow) && provisions.views.length === 0 && debts.views.length === 0)
      return mockDashboard;
    const health = computeHealth({
      today: cashFlow.today,
      accounts: cashFlow.accounts,
      cards: cashFlow.cards,
      transactions: cashFlow.transactions,
      debts: debts.views,
      provisions: provisions.views,
      investments: investments.items,
      goals: goals.items,
    });
    return buildLiveDashboard({
      today: cashFlow.today,
      ifa: health.current
        ? { score: health.current.score, band: health.current.band, delta: health.delta }
        : null,
      accounts: cashFlow.accounts,
      cards: cashFlow.cards,
      transactions: cashFlow.transactions,
      goals: goals.items,
      investments: investments.items,
      debts: debts.views.map((view) => ({
        id: view.debt.id,
        name: view.debt.name,
        creditor: view.debt.creditor,
        currentBalance: view.debt.currentBalance,
        payment: view.payment,
        nextDueDate: view.debt.nextDueDate,
        status: view.status,
      })),
      provisions: provisions.views.map((view) => ({
        id: view.provision.id,
        name: view.provision.name,
        dueDate: view.provision.dueDate,
        targetAmount: view.provision.targetAmount,
        balance: view.balance,
        plan: view.plan,
      })),
    });
  }, [loading, error, cashFlow, goals.items, investments.items, debts.views, provisions.views]);

  if (error) return { status: "error", data: null, isSample: false, message: error.message };
  if (!data) return { status: "loading", data: null, isSample: false };
  return { status: "ready", data, isSample: data.source === "sample" };
}
