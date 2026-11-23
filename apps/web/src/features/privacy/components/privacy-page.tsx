"use client";

import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { clearDemoData } from "@/data/store";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthError } from "@/features/auth/errors";
import { today } from "@/lib/time";
import { requestAccountDeletion } from "../delete-account";
import { collectUserData, exportFileName } from "../export-data";

/** Tela 56: Privacidade e dados (LGPD: acesso, portabilidade e eliminação). */
export function PrivacyPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function download() {
    if (!user) return;
    setExporting(true);
    try {
      const data = await collectUserData(user.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(today());
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Arquivo com seus dados baixado." });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Não foi possível exportar.",
        tone: "error",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Privacidade e dados"
        description="Seus dados são seus. Veja o que guardamos, baixe uma cópia ou exclua sua conta."
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card as="section" aria-labelledby="o-que-guardamos" className="gap-3">
          <CardTitle id="o-que-guardamos" className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" aria-hidden="true" />O que guardamos
          </CardTitle>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body text-ink-muted">
            <li>Seu nome, e-mail e preferências do app.</li>
            <li>O que você cadastra: contas, cartões, lançamentos, provisionamentos e dívidas.</li>
            <li>Só você acessa esses dados. Ninguém da equipe vê seus lançamentos.</li>
            <li>O Assistente IA recebe só um resumo, sem nome, e-mail ou números de conta.</li>
            <li>
              Itens que você exclui ficam 30 dias para poder desfazer e depois são apagados de vez.
            </li>
          </ul>
        </Card>

        <div className="flex flex-col gap-4">
          <Card as="section" aria-labelledby="baixar-dados" className="items-start gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle id="baixar-dados">Baixar meus dados</CardTitle>
              <CardDescription>
                Um arquivo JSON com tudo o que você cadastrou, para guardar ou levar para outro app.
              </CardDescription>
            </div>
            <Button variant="secondary" loading={exporting} onClick={() => void download()}>
              <Download aria-hidden="true" />
              Baixar meus dados
            </Button>
          </Card>

          <Card as="section" aria-labelledby="excluir-conta" className="items-start gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle id="excluir-conta">Excluir minha conta</CardTitle>
              <CardDescription>
                Apaga sua conta e todos os seus dados de forma definitiva. Não é possível desfazer.
              </CardDescription>
            </div>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden="true" />
              Excluir minha conta
            </Button>
          </Card>
        </div>
      </div>

      <Sheet
        open={deleting}
        onOpenChange={setDeleting}
        title="Excluir minha conta"
        description="Esta ação apaga tudo e não pode ser desfeita."
      >
        {deleting ? <DeleteAccountForm onCancel={() => setDeleting(false)} /> : null}
      </Sheet>
    </div>
  );
}

function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const { user, mode, reauthenticate, getIdToken, signOut } = useAuth();
  const toast = useToast();
  const usesPassword = user?.providerIds.includes("password") ?? false;
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    if (!confirmed) {
      setErrors({ confirmed: "Marque a caixa para confirmar." });
      return;
    }
    if (usesPassword && !password) {
      setErrors({ password: "Informe sua senha." });
      return;
    }
    setSaving(true);
    try {
      await reauthenticate(usesPassword ? password : null);
      const token = await getIdToken(true);
      if (!token) throw new AuthError("requires-recent-login");
      await requestAccountDeletion(token);
      if (mode === "demo") clearDemoData();
      toast({ title: "Sua conta e seus dados foram excluídos." });
      await signOut();
    } catch (error) {
      if (error instanceof AuthError && error.code === "wrong-current-password") {
        setErrors({ password: error.message });
      } else {
        setFormError(error instanceof Error ? error.message : "Não foi possível excluir a conta.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <p className="text-body text-ink">
        Vamos apagar sua conta, lançamentos, contas, cartões, provisionamentos, dívidas e
        preferências. Se quiser, baixe seus dados antes.
      </p>
      {usesPassword ? (
        <TextField
          label="Sua senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
      ) : (
        <p className="text-body text-ink-muted">Para confirmar, vamos abrir a janela do Google.</p>
      )}
      <Checkbox
        label="Entendo que a exclusão é definitiva."
        checked={confirmed}
        onChange={(event) => setConfirmed(event.target.checked)}
        error={errors.confirmed}
      />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" loading={saving}>
          Excluir minha conta
        </Button>
      </div>
    </form>
  );
}
