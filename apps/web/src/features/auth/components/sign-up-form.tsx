"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "../auth-provider";
import { AuthError } from "../errors";
import { fieldErrors, signUpSchema } from "../schemas";
import { BackendModeNotice } from "./backend-mode-notice";
import { AuthDivider, GoogleButton } from "./google-button";
import { PasswordField } from "./password-field";

/** Tela 04: Criar conta. */
export function SignUpForm() {
  const { signUpWithEmail } = useAuth();
  const [values, setValues] = useState({ name: "", email: "", password: "", acceptTerms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update =
    (field: "name" | "email" | "password") => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setErrors((current) => ({ ...current, [field]: "" }));
    };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      await signUpWithEmail({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      });
      // O guarda leva à verificação de e-mail.
    } catch (error) {
      setFormError(
        error instanceof AuthError ? error.message : "Não foi possível criar a conta agora.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Criar conta</h1>
        <p className="text-body-lg text-ink-muted">Leva menos de um minuto.</p>
      </div>
      <BackendModeNotice />
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <GoogleButton onError={setFormError} />
      <p className="-mt-3 text-caption text-ink-muted">
        Ao continuar com o Google, você aceita os{" "}
        <Link href="/termos" className="underline">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="underline">
          Política de Privacidade
        </Link>
        .
      </p>
      <AuthDivider />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nome"
          name="name"
          autoComplete="name"
          placeholder="Como você quer ser chamado"
          value={values.name}
          onChange={update("name")}
          error={errors.name || undefined}
        />
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
          autoComplete="new-password"
          value={values.password}
          onChange={update("password")}
          error={errors.password || undefined}
          showRequirements
        />
        <Checkbox
          name="acceptTerms"
          checked={values.acceptTerms}
          onChange={(event) => {
            setValues((current) => ({ ...current, acceptTerms: event.target.checked }));
            setErrors((current) => ({ ...current, acceptTerms: "" }));
          }}
          error={errors.acceptTerms || undefined}
          label={
            <>
              Li e aceito os{" "}
              <Link href="/termos" className="font-semibold text-brand underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" className="font-semibold text-brand underline">
                Política de Privacidade
              </Link>
              .
            </>
          }
        />
        <Button type="submit" size="lg" block loading={submitting}>
          Criar conta
        </Button>
      </form>
      <p className="text-center text-body text-ink-muted">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
