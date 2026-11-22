"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "../auth-provider";
import { AuthError } from "../errors";
import { fieldErrors, loginSchema } from "../schemas";
import { BackendModeNotice } from "./backend-mode-notice";
import { AuthDivider, GoogleButton } from "./google-button";
import { PasswordField } from "./password-field";

/** Tela 03: Entrar. */
export function LoginForm() {
  const { signInWithEmail } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmail(parsed.data.email, parsed.data.password);
      // O guarda da tela leva ao destino (início, verificação de e-mail ou página pedida).
    } catch (error) {
      setFormError(error instanceof AuthError ? error.message : "Não foi possível entrar agora.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Entrar</h1>
        <p className="text-body-lg text-ink-muted">Que bom ver você de novo.</p>
      </div>
      <BackendModeNotice />
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <GoogleButton onError={setFormError} />
      <AuthDivider />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          value={values.email}
          onChange={update("email")}
          error={errors.email || undefined}
        />
        <PasswordField
          label="Senha"
          name="password"
          autoComplete="current-password"
          value={values.password}
          onChange={update("password")}
          error={errors.password || undefined}
        />
        <Link
          href="/recuperar-senha"
          className="self-end text-label font-semibold text-brand hover:underline"
        >
          Esqueci minha senha
        </Link>
        <Button type="submit" size="lg" block loading={submitting}>
          Entrar
        </Button>
      </form>
      <p className="text-center text-body text-ink-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-brand hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}
