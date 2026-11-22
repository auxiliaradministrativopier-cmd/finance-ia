"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../auth-provider";
import { AuthError } from "../errors";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.74Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3a7.2 7.2 0 0 1-10.71-3.78H1.35v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.36 14.32a7.2 7.2 0 0 1 0-4.64v-3.1H1.35a12 12 0 0 0 0 10.84l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.6 4.6 1.8l3.44-3.44A12 12 0 0 0 1.35 6.58l4.01 3.1A7.17 7.17 0 0 1 12 4.77Z"
      />
    </svg>
  );
}

/** Login com Google. O destino após entrar é decidido pelo guarda da tela. */
export function GoogleButton({ onError }: { onError: (message: string | null) => void }) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="secondary"
      size="lg"
      block
      loading={loading}
      onClick={async () => {
        onError(null);
        setLoading(true);
        try {
          await signInWithGoogle();
        } catch (error) {
          const authError = error instanceof AuthError ? error : null;
          if (!authError?.isSilent)
            onError(authError?.message ?? "Não foi possível entrar com o Google.");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? null : <GoogleLogo />}
      Continuar com Google
    </Button>
  );
}

export function AuthDivider() {
  return (
    <div
      className="flex items-center gap-3 text-caption text-ink-muted"
      role="separator"
      aria-label="ou"
    >
      <span className="h-px flex-1 bg-line" />
      ou
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
