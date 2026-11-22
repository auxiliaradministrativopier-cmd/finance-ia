"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

/** Aviso discreto de falta de conexão (estado global "Offline"). */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-caption font-medium text-warning"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      Sem conexão. Seus lançamentos serão sincronizados quando a internet voltar.
    </div>
  );
}
