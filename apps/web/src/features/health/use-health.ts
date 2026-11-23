"use client";

import { useMemo } from "react";
import { getRepositories } from "@/data/repositories";
import { useLiveList } from "@/data/use-live-list";
import { useCashFlowData } from "@/features/cash-flow/use-cash-flow";
import { useDebts } from "@/features/debts/use-debts";
import { useProvisions } from "@/features/provisions/use-provisions";
import { computeHealth } from "./compute";

/** Fontes do IFA em tempo real: qualquer lançamento, dívida ou aporte recalcula a nota. */
export function useHealthSources() {
  const cashFlow = useCashFlowData();
  const debts = useDebts();
  const provisions = useProvisions();
  const goals = useLiveList(getRepositories().goals);
  const investments = useLiveList(getRepositories().investments);

  const loading =
    cashFlow.status === "loading" ||
    debts.status === "loading" ||
    provisions.status === "loading" ||
    goals.status === "loading" ||
    investments.status === "loading";
  const error =
    cashFlow.error ??
    debts.error ??
    provisions.error ??
    (goals.status === "error" ? goals.error : null) ??
    (investments.status === "error" ? investments.error : null) ??
    null;

  return { loading, error, cashFlow, debts, provisions, goals, investments };
}

export function useHealth() {
  const { loading, error, cashFlow, debts, provisions, goals, investments } = useHealthSources();
  const result = useMemo(
    () =>
      loading || error
        ? null
        : computeHealth({
            today: cashFlow.today,
            accounts: cashFlow.accounts,
            cards: cashFlow.cards,
            transactions: cashFlow.transactions,
            debts: debts.views,
            provisions: provisions.views,
            investments: investments.items,
            goals: goals.items,
          }),
    [loading, error, cashFlow, debts.views, provisions.views, investments.items, goals.items],
  );
  return {
    status: error ? ("error" as const) : result ? ("ready" as const) : ("loading" as const),
    error,
    today: cashFlow.today,
    result,
    hasAccounts: cashFlow.accounts.length > 0,
    hasTransactions: cashFlow.transactions.length > 0,
  };
}
