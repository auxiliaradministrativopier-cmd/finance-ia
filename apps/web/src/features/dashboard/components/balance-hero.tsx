"use client";

import { Eye, EyeOff } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { Card, Overline } from "@/components/ui/card";
import { usePrivacy } from "@/providers/privacy-provider";
import { dailyAllowance } from "../data/derived";
import type { DashboardData } from "../data/types";

/** Card de destaque: saldo atual (único card Oceano da tela). */
export function BalanceHero({ data }: { data: DashboardData }) {
  const { hideValues, toggleHideValues } = usePrivacy();

  return (
    <Card variant="highlight" aria-labelledby="saldo-atual" className="justify-between">
      <div className="flex items-start justify-between gap-3">
        <Overline id="saldo-atual" className="text-on-deep-muted">
          Saldo atual
        </Overline>
        <button
          type="button"
          onClick={toggleHideValues}
          aria-pressed={hideValues}
          aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
          className="-mt-2 -mr-2 flex size-control-md cursor-pointer items-center justify-center rounded-md text-on-deep-muted hover:text-on-deep focus-visible:outline-on-deep"
        >
          {hideValues ? (
            <EyeOff className="size-5" aria-hidden="true" />
          ) : (
            <Eye className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
      <Amount cents={data.balance.current} className="text-amount-xl font-semibold" />
      <dl className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-on-deep-muted">Previsto para o fim do mês</dt>
          <dd>
            <Amount
              cents={data.balance.projectedEndOfMonth}
              className="text-amount font-semibold"
            />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-on-deep-muted">Pode gastar por dia</dt>
          <dd>
            <Amount cents={dailyAllowance(data)} className="text-amount font-semibold" />
          </dd>
        </div>
      </dl>
    </Card>
  );
}
