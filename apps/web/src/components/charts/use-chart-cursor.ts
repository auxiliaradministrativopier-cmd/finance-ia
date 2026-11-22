"use client";

import { useCallback, useState } from "react";

/**
 * Ponto ativo de um gráfico, controlado por ponteiro e teclado (setas, Home, End).
 * O mesmo detalhe que aparece no hover aparece no foco do teclado.
 */
export function useChartCursor(count: number) {
  const [active, setActive] = useState<number | null>(null);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (count === 0) return;
      const current = active ?? count - 1;
      const keys: Record<string, number> = {
        ArrowRight: Math.min(current + 1, count - 1),
        ArrowLeft: Math.max(current - 1, 0),
        Home: 0,
        End: count - 1,
      };
      if (event.key in keys) {
        event.preventDefault();
        setActive(keys[event.key] ?? null);
      } else if (event.key === "Escape") {
        setActive(null);
      }
    },
    [active, count],
  );

  return {
    active,
    setActive,
    containerProps: {
      tabIndex: 0,
      onKeyDown,
      onFocus: () => setActive((value) => value ?? count - 1),
      onBlur: () => setActive(null),
      onPointerLeave: () => setActive(null),
    },
  };
}
