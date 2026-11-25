import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { isScreenAvailable } from "@/config/screens";
import { Logo } from "./logo";
import { PrivacyToggle } from "./privacy-toggle";
import { UserMenu } from "./user-menu";

/** Barra superior: logo no celular; busca, privacidade, notificações e conta em todos os tamanhos. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 pt-safe backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-content items-center gap-1 px-4 lg:h-16 lg:px-8">
        <Link
          href="/inicio"
          aria-label="Finance IA, ir para o início"
          className="mr-auto rounded-md lg:hidden"
        >
          <Logo />
        </Link>
        <div className="mr-auto hidden lg:block" />
        {isScreenAvailable("/busca") ? (
          <Link
            href="/busca"
            aria-label="Buscar"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Search aria-hidden="true" />
          </Link>
        ) : null}
        <PrivacyToggle />
        {isScreenAvailable("/notificacoes") ? (
          <Link
            href="/notificacoes"
            aria-label="Notificações"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Bell aria-hidden="true" />
          </Link>
        ) : null}
        <div className="ml-1">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
