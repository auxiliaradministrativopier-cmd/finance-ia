"use client";

import { ChevronRight, LogOut, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useUserProfile } from "../use-user-profile";
import { PersonalDataForm } from "./personal-data-form";
import { ProfileHeader } from "./profile-header";
import { SecurityCard } from "./security-card";

const shortcuts = [
  {
    href: "/configuracoes",
    label: "Configurações",
    description: "Aparência, mês financeiro e preferências",
    icon: Settings,
  },
  {
    href: "/configuracoes/privacidade",
    label: "Privacidade e dados",
    description: "Consentimentos e exportação dos seus dados",
    icon: ShieldCheck,
  },
] as const;

/** Tela 52: Perfil. */
export function ProfilePage() {
  const { user, signOut } = useAuth();
  const profileState = useUserProfile();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Perfil" description="Seus dados, sua segurança e sua sessão." />

      {profileState.status === "error" ? (
        <Alert tone="warning">{profileState.error.message}</Alert>
      ) : null}

      {profileState.status === "loading" ? (
        <Card className="flex-row items-center gap-5 p-5">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </Card>
      ) : (
        <ProfileHeader user={user} profile={profileState.profile} />
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {profileState.status === "loading" ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : (
          <PersonalDataForm
            key={profileState.profile?.displayName ?? user.displayName ?? ""}
            initialName={profileState.profile?.displayName || user.displayName || ""}
            email={user.email ?? ""}
          />
        )}
        <div className="flex flex-col gap-6">
          <SecurityCard />
          <Card as="nav" aria-label="Atalhos da conta" className="gap-1 p-2">
            {shortcuts.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-surface-sunken"
              >
                <Icon className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body font-medium">{label}</span>
                  <span className="text-caption text-ink-muted">{description}</span>
                </span>
                <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
              </Link>
            ))}
          </Card>
        </div>
      </div>

      <Card
        as="section"
        aria-labelledby="sessao"
        className="flex-row flex-wrap items-center justify-between gap-4"
      >
        <div className="flex flex-col gap-1">
          <CardTitle id="sessao">Sessão</CardTitle>
          <p className="text-body text-ink-muted">
            Você continua conectado neste dispositivo até sair.
          </p>
        </div>
        <Button
          variant="secondary"
          loading={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await signOut();
          }}
        >
          <LogOut aria-hidden="true" />
          Sair da conta
        </Button>
      </Card>
    </div>
  );
}
