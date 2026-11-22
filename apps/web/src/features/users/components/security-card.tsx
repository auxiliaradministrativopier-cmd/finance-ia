"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { PasswordField } from "@/features/auth/components/password-field";
import { AuthError } from "@/features/auth/errors";
import { changePasswordSchema, fieldErrors } from "@/features/auth/schemas";

const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Troca de senha (somente contas com e-mail e senha). */
export function SecurityCard() {
  const { user, changePassword } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasPassword = user?.providerIds.includes("password") ?? false;

  const update = (field: keyof typeof empty) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      await changePassword(parsed.data.currentPassword, parsed.data.newPassword);
      setValues(empty);
      setOpen(false);
      toast({ title: "Senha alterada." });
    } catch (error) {
      if (error instanceof AuthError && error.code === "wrong-current-password") {
        setErrors({ currentPassword: error.message });
      } else {
        setFormError(
          error instanceof AuthError ? error.message : "Não foi possível alterar a senha.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="seguranca">
      <div className="flex flex-col gap-1">
        <CardTitle id="seguranca">Segurança</CardTitle>
        <CardDescription>
          {hasPassword
            ? "Use uma senha forte e que você não usa em outros sites."
            : "Você entra com o Google. A senha é gerenciada pela sua conta Google."}
        </CardDescription>
      </div>
      {hasPassword && !open ? (
        <div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <KeyRound aria-hidden="true" />
            Alterar senha
          </Button>
        </div>
      ) : null}
      {hasPassword && open ? (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <PasswordField
            label="Senha atual"
            name="currentPassword"
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={update("currentPassword")}
            error={errors.currentPassword || undefined}
          />
          <PasswordField
            label="Nova senha"
            name="newPassword"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={update("newPassword")}
            error={errors.newPassword || undefined}
            showRequirements
          />
          <PasswordField
            label="Repita a nova senha"
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={update("confirmPassword")}
            error={errors.confirmPassword || undefined}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setValues(empty);
                setErrors({});
                setFormError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar nova senha
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
