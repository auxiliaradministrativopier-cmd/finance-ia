"use client";

import { useEffect } from "react";

/**
 * Registra o service worker em produção. Em desenvolvimento ele ficaria em cache
 * e esconderia mudanças, por isso não é registrado.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error) => {
          console.error("Falha ao registrar o service worker.", error);
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
