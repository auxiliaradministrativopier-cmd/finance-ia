"use client";

import { formatMoney } from "@finance-ia/shared";
import { usePrivacy } from "@/providers/privacy-provider";
import { formatCompactCurrency } from "../data/format";

/** Formatadores que respeitam o modo "ocultar valores", para gráficos e textos livres. */
export function useMoneyFormatters() {
  const { hideValues } = usePrivacy();
  return {
    hideValues,
    money: (cents: number) => formatMoney(cents, { hidden: hideValues }),
    tick: (cents: number) => (hideValues ? "•••" : formatCompactCurrency(cents)),
    compactMoney: (cents: number) =>
      hideValues ? "R$ ••••" : `R$ ${formatCompactCurrency(cents)}`,
  };
}
