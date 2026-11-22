"use client";

import { MailOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "../auth-provider";
import { AuthError } from "../errors";
import { ROUTES } from "../redirect";

const RESEND_COOLDOWN_SECONDS = 60;

/** Mascara o e-mail: juliana@gmail.com → j•••@gmail.com. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}•••@${domain}`;
}

/** Tela 05: Verificação de e-mail. */
export function VerifyEmailPanel() {
  const { user, refreshUser, sendVerificationEmail, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.emailVerified) router.replace(ROUTES.home);
  }, [user?.emailVerified, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  // Ao voltar do app de e-mail, confere automaticamente se a verificação foi feita.
  useEffect(() => {
    const onFocus = () => void refreshUser().catch(() => undefined);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUser]);

  async function checkNow() {
    setError(null);
    setChecking(true);
    try {
      const refreshed = await refreshUser();
      if (!refreshed?.emailVerified)
        setError("Ainda não identificamos a confirmação. Abra o link enviado e tente de novo.");
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Não foi possível verificar agora.");
    } finally {
      setChecking(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await sendVerificationEmail();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast({ title: "Enviamos um novo link." });
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Não foi possível reenviar agora.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <MailOpen className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Confirme seu e-mail</h1>
        <p className="text-body-lg text-ink-muted">
          Enviamos um link para{" "}
          <strong className="text-ink">{user?.email ? maskEmail(user.email) : "seu e-mail"}</strong>
          . Abra a mensagem e toque em confirmar para liberar sua conta.
        </p>
      </div>
      {error ? <Alert tone="warning">{error}</Alert> : null}
      <div className="flex flex-col gap-3">
        <Button size="lg" block loading={checking} onClick={checkNow}>
          Já confirmei
        </Button>
        <Button variant="secondary" size="lg" block disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
        </Button>
        <Button
          variant="tertiary"
          block
          onClick={async () => {
            await signOut();
            router.replace(ROUTES.signUp);
          }}
        >
          Usar outro e-mail
        </Button>
      </div>
    </div>
  );
}
