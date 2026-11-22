"use client";

import { useMemo } from "react";
import { computeHealth } from "@/features/health/compute";
import { useHealthSources } from "@/features/health/use-health";
import { buildAssistantContext } from "./context";

/** Resumo financeiro atual, recalculado a cada mudança nos dados. */
export function useAssistantContext() {
  const { loading, error, cashFlow, debts, provisions, goals, investments } = useHealthSources();
  const context = useMemo(() => {
    if (loading || error) return null;
    const sources = {
      today: cashFlow.today,
      accounts: cashFlow.accounts,
      transactions: cashFlow.transactions,
      debts: debts.views,
      provisions: provisions.views,
      investments: investments.items,
      goals: goals.items,
    };
    return buildAssistantContext(sources, computeHealth(sources));
  }, [loading, error, cashFlow, debts.views, provisions.views, investments.items, goals.items]);
  return {
    status: error ? ("error" as const) : context ? ("ready" as const) : ("loading" as const),
    error,
    context,
  };
}
