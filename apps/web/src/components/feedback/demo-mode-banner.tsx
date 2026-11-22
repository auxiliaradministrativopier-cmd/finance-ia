"use client";

import { FlaskConical } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";

/** Faixa fixa na área logada quando o app roda sem Firebase (somente em desenvolvimento). */
export function DemoModeBanner() {
  const { mode } = useAuth();
  if (mode !== "demo" && mode !== "emulator") return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-ai-soft px-4 py-1.5 text-caption font-medium text-ai">
      <FlaskConical className="size-4" aria-hidden="true" />
      {mode === "demo"
        ? "Modo demonstração: nada é salvo. Configure o Firebase em apps/web/.env.local."
        : "Conectado aos emuladores locais do Firebase."}
    </div>
  );
}
