"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { displayNameSchema } from "@/features/auth/schemas";
import { useProfileActions } from "../use-profile-actions";

export function PersonalDataForm({ initialName, email }: { initialName: string; email: string }) {
  const { saveDisplayName } = useProfileActions();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const dirty = name.trim() !== savedName.trim();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      await saveDisplayName(parsed.data);
      setSavedName(parsed.data);
      setName(parsed.data);
      toast({ title: "Nome atualizado." });
    } catch (caught) {
      toast({
        title: caught instanceof Error ? caught.message : "Não foi possível salvar.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="dados-pessoais">
      <div className="flex flex-col gap-1">
        <CardTitle id="dados-pessoais">Dados pessoais</CardTitle>
        <CardDescription>Como você aparece no Finance IA.</CardDescription>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nome"
          name="displayName"
          autoComplete="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <TextField
          label="E-mail"
          type="email"
          value={email}
          readOnly
          disabled
          hint="O e-mail identifica sua conta. Para trocá-lo, fale com o suporte."
        />
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!dirty}>
            Salvar nome
          </Button>
        </div>
      </form>
    </Card>
  );
}
