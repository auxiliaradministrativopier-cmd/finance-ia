"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // O envio para o Sentry entra com o módulo de observabilidade.
    console.error(error);
  }, [error]);

  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={<TriangleAlert aria-hidden="true" />}
        title="Algo não saiu como esperado"
        description="Seus dados estão seguros. Tente de novo; se o problema continuar, fale com o suporte."
        action={<Button onClick={reset}>Tentar de novo</Button>}
      />
    </main>
  );
}
