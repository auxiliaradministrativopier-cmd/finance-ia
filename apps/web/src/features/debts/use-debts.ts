"use client";

import { useEffect, useMemo, useState } from "react";
import type { DataError } from "@/data/errors";
import { getRepositories } from "@/data/repositories";
import { useLiveList } from "@/data/use-live-list";
import { today as currentDay } from "@/lib/time";
import { useAuth } from "@/features/auth/auth-provider";
import { createDebtService } from "./service";
import type { DebtPayment } from "./types";
import { buildDebtView, summarizeDebts } from "./views";

let serviceInstance: ReturnType<typeof createDebtService> | null = null;
export function getDebtService() {
  serviceInstance ??= createDebtService(getRepositories());
  return serviceInstance;
}

/**
 * Dívidas do usuário com os pagamentos, em tempo real.
 * Escuta os pagamentos só das dívidas em aberto (as quitadas não mudam mais) e, se informada,
 * da dívida aberta no detalhe (`withPaymentsOf`), para mostrar o histórico dela.
 */
export function useDebts(withPaymentsOf?: string) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const list = useLiveList(getRepositories().debts);
  // Pagamentos por dívida, marcados com o dono: ao trocar de conta, nada do anterior é usado.
  const [state, setState] = useState<{ uid: string | null; byDebt: Record<string, DebtPayment[]> }>(
    {
      uid: null,
      byDebt: {},
    },
  );
  const payments = useMemo(() => (state.uid === uid ? state.byDebt : {}), [state, uid]);
  const [paymentError, setPaymentError] = useState<DataError | null>(null);
  const today = currentDay();

  const watched = list.items
    .filter((debt) => debt.currentBalance > 0 || debt.id === withPaymentsOf)
    .map((debt) => debt.id);
  const ids = watched.join(",");
  useEffect(() => {
    if (!uid || !ids) return;
    const keep = ids.split(",");
    const stops = keep.map((id) =>
      getRepositories()
        .debtPayments(id)
        .watch(
          uid,
          {},
          (items) =>
            setState((current) => {
              // Mantém só as dívidas escutadas agora (descarta excluídas e quitadas).
              const byDebt: Record<string, DebtPayment[]> = {};
              const previous = current.uid === uid ? current.byDebt : {};
              for (const debtId of keep) if (debtId in previous) byDebt[debtId] = previous[debtId]!;
              byDebt[id] = items;
              return { uid, byDebt };
            }),
          (error) => setPaymentError(error),
        ),
    );
    return () => stops.forEach((stop) => stop());
  }, [uid, ids]);

  const views = useMemo(
    () => list.items.map((debt) => buildDebtView(debt, payments[debt.id] ?? [], today)),
    [list.items, payments, today],
  );
  const summary = useMemo(() => summarizeDebts(views), [views]);
  const paymentsReady = watched.every((id) => id in payments);
  const error = list.status === "error" ? list.error : paymentError;

  return {
    status: error
      ? ("error" as const)
      : list.status === "ready" && paymentsReady
        ? ("ready" as const)
        : ("loading" as const),
    error,
    today,
    views,
    summary,
  };
}
