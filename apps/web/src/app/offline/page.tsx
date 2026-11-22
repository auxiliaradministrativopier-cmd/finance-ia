import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { LogoMark } from "@/components/layout/logo";

export const metadata: Metadata = { title: "Sem conexão" };

/** Página exibida pelo service worker quando não há internet. Precisa funcionar sem dados do servidor. */
export default function OfflinePage() {
  return (
    <main
      id="conteudo"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center"
    >
      <LogoMark withTile className="size-14" />
      <span className="flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning">
        <WifiOff className="size-6" aria-hidden="true" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-h1">Você está sem conexão</h1>
        <p className="text-body-lg text-ink-muted">
          Assim que a internet voltar, o Finance IA continua de onde parou. Seus dados ficam
          guardados com segurança.
        </p>
      </div>
      {/* Link simples (sem JavaScript) para tentar de novo. */}
      <a
        href="/inicio"
        className="inline-flex h-control-lg items-center rounded-md bg-brand px-6 text-[15px] font-semibold text-on-brand"
      >
        Tentar de novo
      </a>
    </main>
  );
}
