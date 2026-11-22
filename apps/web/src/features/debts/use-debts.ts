"use client";

import { todayIn } from "@finance-ia/finance-core";
import { useEffect, useMemo, useState } from "react";
import type { DataError } from "@/data/errors";
import { getRepositories } from "@/data/repositories";
import { useLiveList } from "@/data/use-live-list";
import { useAuth } from "@/features/auth/auth-provider";
import { createDebtService } from "./service";
import type { DebtPayment } from "./types";
import { buildDebtView, summarizeDebts } from "./views";

let serviceInstance: ReturnType<typeof createDebtService> | null = null;
export function getDebtService() {
  serviceInstance ??= createDebtService(getRepositories());
  return serviceInstance;
}

/** Dívidas do usuário com os pagamentos de cada uma, em tempo real. */
export function useDebts() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const list = useLiveList(getRepositories().debts);
  const [payments, setPayments] = useState<Record<string, DebtPayment[]>>({});
  const [paymentError, setPaymentError] = useState<DataError | null>(null);
  const today = todayIn();

  const ids = list.items.map((debt) => debt.id).join(",");
  useEffect(() => {
    if (!uid || !ids) return;
    const stops = ids.split(",").map((id) =>
      getRepositories()
        .debtPayments(id)
        .watch(
          uid,
          {},
          (items) => setPayments((current) => ({ ...current, [id]: items })),
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
  const paymentsReady = list.items.every((debt) => debt.id in payments);
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
