import { BRAND } from "@finance-ia/shared";
import { ShieldCheck } from "lucide-react";
import { Logo, LogoMark } from "./logo";

/** Estrutura das telas de acesso: painel da marca no desktop e conteúdo centralizado. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-deep p-10 text-on-deep lg:flex lg:flex-col lg:justify-between">
        <span className="inline-flex items-center gap-2.5">
          <LogoMark className="size-9" />
          <span className="font-display text-h3 font-semibold">Finance IA</span>
        </span>
        <div className="relative z-10 flex max-w-sm flex-col gap-4">
          <p className="font-display text-display font-semibold tracking-[-0.02em] text-balance">
            {BRAND.tagline}
          </p>
          <p className="text-body-lg text-on-deep-muted">
            Organize o dia a dia, planeje o futuro e acompanhe sua saúde financeira com a ajuda da
            inteligência artificial.
          </p>
        </div>
        <p className="relative z-10 flex items-center gap-2 text-caption text-on-deep-muted">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Seus dados são criptografados e você pode excluí-los quando quiser.
        </p>
        {/* Composição de marca: as barras ascendentes em escala de painel. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 320 400"
          className="pointer-events-none absolute right-0 bottom-0 h-[52%] w-auto opacity-90"
        >
          <rect x="40" y="250" width="64" height="170" rx="32" fill="var(--brand)" opacity="0.35" />
          <rect x="128" y="170" width="64" height="250" rx="32" fill="var(--brand)" opacity="0.6" />
          <rect x="216" y="90" width="64" height="330" rx="32" fill="var(--brand)" />
          <circle cx="248" cy="40" r="28" fill="var(--ai)" />
        </svg>
      </aside>
      <main id="conteudo" className="flex flex-col px-4 py-8 sm:px-8 lg:px-16">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
