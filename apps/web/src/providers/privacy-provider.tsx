"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "finance-ia:hide-values";

interface PrivacyContextValue {
  /** Quando verdadeiro, valores monetários aparecem como "R$ ••••". */
  hideValues: boolean;
  toggleHideValues: () => void;
  setHideValues: (hidden: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hideValues, setHideValues] = useState(false);

  useEffect(() => {
    try {
      // Lido após a montagem para não divergir do HTML do servidor.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHideValues(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // Armazenamento indisponível (navegação privada): mantém o padrão.
    }
  }, []);

  const toggleHideValues = useCallback(() => {
    setHideValues((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignora: a preferência vale apenas nesta sessão.
      }
      return next;
    });
  }, []);

  const setHidden = useCallback((hidden: boolean) => {
    setHideValues(hidden);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(hidden));
    } catch {
      // Ignora: a preferência vale apenas nesta sessão.
    }
  }, []);

  const value = useMemo(
    () => ({ hideValues, toggleHideValues, setHideValues: setHidden }),
    [hideValues, toggleHideValues, setHidden],
  );
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyContextValue {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error("usePrivacy deve ser usado dentro de <PrivacyProvider>.");
  return context;
}
