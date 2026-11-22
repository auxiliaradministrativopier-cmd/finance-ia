import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Verdadeiro apenas no navegador, após a hidratação. Evita divergência entre servidor e cliente. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
