"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { Preferences, PreferencesPatch } from "@/data/models/user";
import { usePrivacy } from "@/providers/privacy-provider";
import { usePreferences } from "../use-preferences";

const themes = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
] as const;

const frequencies = [
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "off", label: "Desligada" },
] as const;

const days = Array.from({ length: 28 }, (_, index) => ({
  value: String(index + 1),
  label: `Dia ${index + 1}`,
}));

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card as="section" aria-labelledby={id} className="gap-2">
      <div className="flex flex-col gap-1 pb-2">
        <CardTitle id={id}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      {children}
    </Card>
  );
}

/** Tela 53: Configurações. Cada mudança é salva na hora. */
export function SettingsPage() {
  const { status, preferences, error, update } = usePreferences();
  const { setTheme } = useTheme();
  const { setHideValues } = usePrivacy();
  const toast = useToast();

  async function save(patch: PreferencesPatch, success = "Configuração salva.") {
    try {
      await update(patch);
      toast({ title: success });
    } catch (caught) {
      toast({
        title: caught instanceof Error ? caught.message : "Não foi possível salvar.",
        tone: "error",
      });
    }
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Configurações" />
        <Alert tone="danger">{error.message}</Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Ajuste o Finance IA ao seu jeito. As mudanças são salvas na hora."
      />
      {status === "loading" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <SettingsSections
          preferences={preferences}
          onSave={save}
          onTheme={(theme) => {
            setTheme(theme);
            void save({ theme });
          }}
          onHideValues={(hidden) => {
            setHideValues(hidden);
            void save({ hideValues: hidden });
          }}
        />
      )}
    </div>
  );
}

function SettingsSections({
  preferences,
  onSave,
  onTheme,
  onHideValues,
}: {
  preferences: Preferences;
  onSave: (patch: PreferencesPatch, success?: string) => Promise<void>;
  onTheme: (theme: Preferences["theme"]) => void;
  onHideValues: (hidden: boolean) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Section
        id="aparencia"
        title="Aparência"
        description="O tema acompanha o sistema ou fica fixo."
      >
        <div role="radiogroup" aria-label="Tema" className="flex flex-wrap gap-2">
          {themes.map(({ value, label, icon: Icon }) => (
            <Chip
              key={value}
              role="radio"
              aria-checked={preferences.theme === value}
              aria-pressed={undefined}
              selected={preferences.theme === value}
              icon={<Icon aria-hidden="true" />}
              onClick={() => onTheme(value)}
            >
              {label}
            </Chip>
          ))}
        </div>
        <Switch
          label="Ocultar valores ao abrir"
          description="Mostra R$ •••• até você tocar no ícone de olho."
          checked={preferences.hideValues}
          onCheckedChange={onHideValues}
        />
      </Section>

      <Section
        id="mes-financeiro"
        title="Mês financeiro"
        description="Defina quando o seu mês começa, como o dia do salário."
      >
        <SelectField
          label="O mês começa no"
          value={String(preferences.monthStartDay)}
          options={days}
          hint="Relatórios, orçamento e o resumo do Início seguem este dia."
          onChange={(event) => void onSave({ monthStartDay: Number(event.target.value) })}
        />
      </Section>

      <Section
        id="notificacoes"
        title="Notificações"
        description="Escolha por onde quer ser avisado."
      >
        <Switch
          label="No celular (push)"
          checked={preferences.notifications.push}
          onCheckedChange={(push) => void onSave({ notifications: { push } })}
        />
        <Switch
          label="Por e-mail"
          checked={preferences.notifications.email}
          onCheckedChange={(email) => void onSave({ notifications: { email } })}
        />
        <Switch
          label="Dentro do app"
          checked={preferences.notifications.inApp}
          onCheckedChange={(inApp) => void onSave({ notifications: { inApp } })}
        />
      </Section>

      <Section id="ia" title="IA Financeira" description="Como a Finance IA ajuda você.">
        <Switch
          label="Ativar a IA Financeira"
          description="Insights e respostas usam valores e categorias agregados, nunca seus documentos."
          checked={preferences.ai.enabled}
          onCheckedChange={(enabled) => void onSave({ ai: { enabled } })}
        />
        <Switch
          label="Sugerir categorias automaticamente"
          checked={preferences.ai.autoCategorize}
          disabled={!preferences.ai.enabled}
          onCheckedChange={(autoCategorize) => void onSave({ ai: { autoCategorize } })}
        />
        <fieldset className="flex flex-col gap-2 pt-2" disabled={!preferences.ai.enabled}>
          <legend className="pb-2 text-body font-medium">Frequência dos insights</legend>
          <div
            role="radiogroup"
            aria-label="Frequência dos insights"
            className="flex flex-wrap gap-2"
          >
            {frequencies.map((option) => (
              <Chip
                key={option.value}
                role="radio"
                aria-checked={preferences.ai.insightsFrequency === option.value}
                aria-pressed={undefined}
                selected={preferences.ai.insightsFrequency === option.value}
                disabled={!preferences.ai.enabled}
                onClick={() => void onSave({ ai: { insightsFrequency: option.value } })}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      </Section>
    </div>
  );
}
