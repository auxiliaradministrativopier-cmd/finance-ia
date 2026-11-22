"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MoneyField } from "@/components/ui/money-field";
import { TextField } from "@/components/ui/text-field";
import { getRepositories } from "@/data/repositories";
import { DataError } from "@/data/errors";

/** Primeira conta, criada dentro do formulário de lançamento (sem sair da tela). */
export function QuickAccountForm({
  uid,
  today,
  onCreated,
}: {
  uid: string;
  today: string;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const id = await getRepositories().accounts.create(uid, {
        name,
        type: "checking",
        color: "chart-2",
        icon: "landmark",
        initialBalance: balance,
        initialBalanceDate: today,
      });
      onCreated(id);
    } catch (error) {
      setErrors(
        error instanceof DataError ? error.fields : { name: "Não foi possível criar a conta." },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-sunken p-4">
      <Alert tone="info" title="Cadastre sua primeira conta">
        Os lançamentos ficam ligados a uma conta. Informe o nome e quanto tem nela hoje.
      </Alert>
      <TextField
        label="Nome da conta"
        placeholder="Ex.: Nubank"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />
      <MoneyField
        label="Saldo atual"
        value={balance}
        onChange={setBalance}
        error={errors.initialBalance}
      />
      <Button variant="secondary" loading={saving} onClick={create}>
        Criar conta
      </Button>
    </div>
  );
}
