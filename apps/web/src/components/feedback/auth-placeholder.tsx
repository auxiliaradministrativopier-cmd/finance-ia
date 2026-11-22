import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getScreen, type ScreenId } from "@/config/screens";

/** Tela de acesso reservada: o formulário real chega com o módulo de autenticação (Firebase Auth). */
export function AuthPlaceholder({ screen: id }: { screen: ScreenId }) {
  const screen = getScreen(id);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Badge tone="neutral" className="self-start">
          Fase {screen.phase} do roadmap
        </Badge>
        <h1 className="text-h1">{screen.title}</h1>
        <p className="text-body-lg text-ink-muted">{screen.objective}</p>
      </div>
      <p className="rounded-lg border border-dashed border-line px-4 py-6 text-body text-ink-muted">
        O formulário desta tela será conectado ao Firebase Authentication no módulo de autenticação.
      </p>
      <div className="flex flex-col gap-3">
        <Link href="/inicio" className={buttonVariants({ block: true, size: "lg" })}>
          Ver a estrutura do app
        </Link>
        <Link href="/boas-vindas" className={buttonVariants({ variant: "tertiary", block: true })}>
          Voltar às boas-vindas
        </Link>
      </div>
    </div>
  );
}
