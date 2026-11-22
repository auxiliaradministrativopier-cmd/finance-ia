"use client";

import { Alert } from "@/components/ui/alert";
import { useAuth } from "../auth-provider";

/** Explica quando o app não está ligado a um projeto Firebase real. */
export function BackendModeNotice({ className }: { className?: string }) {
  const { mode } = useAuth();

  if (mode === "demo") {
    return (
      <Alert tone="info" title="Modo demonstração" className={className}>
        O Firebase não está configurado. Qualquer e-mail e senha válidos funcionam e nada é enviado
        a um servidor.
      </Alert>
    );
  }
  if (mode === "emulator") {
    return (
      <Alert tone="info" title="Emuladores locais" className={className}>
        Conectado aos emuladores do Firebase. Os e-mails de verificação aparecem na interface do
        emulador.
      </Alert>
    );
  }
  if (mode === "unconfigured") {
    return (
      <Alert tone="warning" title="Serviço indisponível" className={className}>
        O app ainda não está conectado ao servidor. Tente novamente mais tarde.
      </Alert>
    );
  }
  return null;
}
