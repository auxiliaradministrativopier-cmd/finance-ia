"use client";

import { useEffect, useMemo, useRef } from "react";
import { getRepositories } from "@/data/repositories";
import { useLiveList } from "@/data/use-live-list";
import { today as currentDay } from "@/lib/time";
import { useAuth } from "@/features/auth/auth-provider";
import { createCashFlowService, type CashFlowContext } from "./service";

const repos = () => getRepositories();
let serviceInstance: ReturnType<typeof createCashFlowService> | null = null;
export function getCashFlowService() {
  serviceInstance ??= createCashFlowService(repos());
  return serviceInstance;
}

/**
 * Tudo o que o Fluxo de Caixa precisa, em tempo real: lançamentos, contas, cartões, categorias e recorrências.
 * Também mantém as recorrências geradas 3 meses à frente (uma vez por sessão).
 */
export function useCashFlowData() {
  const { user } = useAuth();
  const transactions = useLiveList(repos().transactions);
  const accounts = useLiveList(repos().accounts, { includeArchived: true });
  const cards = useLiveList(repos().cards, { includeArchived: true });
  const categories = useLiveList(repos().categories, { includeArchived: true });
  const recurrences = useLiveList(repos().recurrences);
  const today = currentDay();

  const ready = [transactions, accounts, cards, categories, recurrences].every(
    (state) => state.status === "ready",
  );
  const error =
    [transactions, accounts, cards, categories, recurrences].find(
      (state) => state.status === "error",
    )?.error ?? null;

  const context = useMemo<CashFlowContext | null>(
    () =>
      user ? { uid: user.uid, today, categories: categories.items, cards: cards.items } : null,
    [user, today, categories.items, cards.items],
  );

  const extended = useRef(false);
  useEffect(() => {
    if (!ready || !context || extended.current || recurrences.items.length === 0) return;
    extended.current = true;
    getCashFlowService()
      .extendRecurrences(context, recurrences.items)
      .catch((caught) => console.error("Não foi possível atualizar as recorrências.", caught));
  }, [ready, context, recurrences.items]);

  // Objeto estável: quem depende dele (Dashboard, IFA, assistente) só recalcula quando os dados mudam.
  const status = error ? ("error" as const) : ready ? ("ready" as const) : ("loading" as const);
  return useMemo(
    () => ({
      status,
      error,
      today,
      context,
      transactions: transactions.items,
      accounts: accounts.items,
      cards: cards.items,
      categories: categories.items,
      recurrences: recurrences.items,
    }),
    [
      status,
      error,
      today,
      context,
      transactions.items,
      accounts.items,
      cards.items,
      categories.items,
      recurrences.items,
    ],
  );
}

export type CashFlowData = ReturnType<typeof useCashFlowData>;
