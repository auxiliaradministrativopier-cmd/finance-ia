"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "../auth-provider";
import { AuthError } from "../errors";
import { fieldErrors, resetPasswordSchema } from "../schemas";

/** Tela 06: Recuperar senha. A resposta é sempre neutra para não revelar contas. */
export function ResetPasswordForm() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = resetPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).email);
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(parsed.data.email);
      setSent(true);
    } catch (caught) {
      setFormError(caught instanceof AuthError ? caught.message : "Não foi possível enviar agora.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-6">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">Confira seu e-mail</h1>
          <p className="text-body-lg text-ink-muted">
            Se houver uma conta com {email.trim()}, você receberá um link para criar uma nova senha.
            O link vale por 1 hora.
          </p>
        </div>
        <Link href="/entrar" className={buttonVariants({ size: "lg", block: true })}>
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Recuperar senha</h1>
        <p className="text-body-lg text-ink-muted">
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>
      </div>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <Button type="submit" size="lg" block loading={submitting}>
          Enviar link
        </Button>
      </form>
      <Link href="/entrar" className={buttonVariants({ variant: "tertiary", block: true })}>
        Voltar para o login
      </Link>
    </div>
  );
}
