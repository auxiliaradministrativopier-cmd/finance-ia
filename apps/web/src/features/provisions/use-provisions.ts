"use client";

import { provisionBalance, provisionPlan, todayIn } from "@finance-ia/finance-core";
import { useEffect, useMemo, useState } from "react";
import type { DataError } from "@/data/errors";
import { getRepositories } from "@/data/repositories";
import { useLiveList } from "@/data/use-live-list";
import { useAuth } from "@/features/auth/auth-provider";
import { createProvisionService } from "./service";
import type { Contribution, Provision, ProvisionView } from "./types";

let serviceInstance: ReturnType<typeof createProvisionService> | null = null;
export function getProvisionService() {
  serviceInstance ??= createProvisionService(getRepositories());
  return serviceInstance;
}

/** Data (YYYY-MM-DD) de criação do provisionamento, no fuso do app; hoje enquanto o servidor não confirma. */
function startDateOf(provision: Provision, today: string): string {
  return provision.createdAt ? todayIn("America/Sao_Paulo", provision.createdAt) : today;
}

/** Monta as visões (saldo + plano) e os totais a partir dos dados. Função pura, testada à parte. */
export function buildProvisionViews(
  provisions: Provision[],
  contributions: Record<string, Contribution[]>,
  today: string,
) {
  const views: ProvisionView[] = provisions.map((provision) => {
    const items = contributions[provision.id] ?? [];
    const balance = provisionBalance(items);
    return {
      provision,
      contributions: items,
      balance,
      plan: provisionPlan({
        targetAmount: provision.targetAmount,
        accumulated: balance,
        dueDate: provision.dueDate,
        startDate: startDateOf(provision, today),
        today,
      }),
    };
  });
  const open = views.filter((view) => view.plan.status !== "completed");
  return {
    views,
    totals: {
      /** Quanto guardar por mês somando todos os provisionamentos em aberto. */
      monthlyNeeded: open.reduce((sum, view) => sum + view.plan.monthlyNeeded, 0),
      target: views.reduce((sum, view) => sum + view.provision.targetAmount, 0),
      saved: views.reduce(
        (sum, view) => sum + Math.min(view.balance, view.provision.targetAmount),
        0,
      ),
      behind: views.filter(
        (view) => view.plan.status === "behind" || view.plan.status === "overdue",
      ).length,
      openCount: open.length,
    },
  };
}

/** Provisionamentos do usuário com seus aportes, em tempo real. */
export function useProvisions() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const list = useLiveList(getRepositories().provisions);
  const [contributions, setContributions] = useState<Record<string, Contribution[]>>({});
  const [contributionError, setContributionError] = useState<DataError | null>(null);
  const today = todayIn();

  // Um acompanhamento por provisionamento (subcoleção contributions de cada um).
  const ids = list.items.map((provision) => provision.id).join(",");
  useEffect(() => {
    if (!uid || !ids) return;
    const stops = ids.split(",").map((id) =>
      getRepositories()
        .provisionContributions(id)
        .watch(
          uid,
          {},
          (items) => setContributions((current) => ({ ...current, [id]: items })),
          (error) => setContributionError(error),
        ),
    );
    return () => stops.forEach((stop) => stop());
  }, [uid, ids]);

  const contributionsReady = list.items.every((provision) => provision.id in contributions);
  const { views, totals } = useMemo(
    () => buildProvisionViews(list.items, contributions, today),
    [list.items, contributions, today],
  );

  const error = list.status === "error" ? list.error : contributionError;
  return {
    status: error
      ? ("error" as const)
      : list.status === "ready" && contributionsReady
        ? ("ready" as const)
        : ("loading" as const),
    error,
    today,
    views,
    totals,
  };
}
