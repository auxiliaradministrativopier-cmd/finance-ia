"use client";

import { Download, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar, getInitials } from "@/components/ui/avatar";
import { DropdownMenu, type DropdownItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const { canInstall, install } = useInstallPrompt();
  const name = user?.displayName || user?.email || "Você";

  const items: DropdownItem[] = [
    { type: "link", label: "Perfil", href: "/perfil", icon: <UserRound aria-hidden="true" /> },
    {
      type: "link",
      label: "Configurações",
      href: "/configuracoes",
      icon: <Settings aria-hidden="true" />,
    },
  ];
  if (canInstall) {
    items.push({
      type: "action",
      label: "Instalar o app",
      icon: <Download aria-hidden="true" />,
      onSelect: () => void install(),
    });
  }
  items.push(
    { type: "separator" },
    {
      type: "action",
      label: "Sair",
      tone: "danger",
      icon: <LogOut aria-hidden="true" />,
      onSelect: async () => {
        // O guarda da área logada leva às boas-vindas.
        await signOut();
        toast({ title: "Você saiu da sua conta.", tone: "info" });
      },
    },
  );

  return (
    <DropdownMenu
      // Sem foto, as iniciais aparecem no botão: entram no nome acessível (comando de voz, WCAG 2.5.3).
      triggerLabel={
        user?.photoUrl
          ? `Menu da conta de ${name}`
          : `${getInitials(name)}, menu da conta de ${name}`
      }
      trigger={<Avatar name={name} src={user?.photoUrl} />}
      header={
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-body font-semibold">{name}</span>
          {user?.email ? (
            <span className="truncate text-caption text-ink-muted">{user.email}</span>
          ) : null}
        </div>
      }
      items={items}
    />
  );
}
