# ADR-10: Base do app web

**Status:** aceita

## Decisão

- **Monorepo** pnpm + Turborepo: `apps/web` e `packages/{shared,config}`. API e mobile entram como novos apps.
- **Next.js (App Router)** com grupos de rotas `(auth)` e `(app)`; rotas em português, alinhadas ao Mapa de Telas.
- **Tailwind CSS 4** com os tokens do Design System expostos como utilitários (`bg-surface`, `text-ink`, `text-amount-lg`).
- **Tema** claro, escuro e sistema via `next-themes` (`data-theme` no `<html>`).
- **Componentes próprios** (sem biblioteca de UI fechada), com variantes em `class-variance-authority`.
- **Diálogos e folhas** com o `<dialog>` nativo (foco preso e Esc sem dependências).
- **PWA**: manifesto e ícones nesta fase; o service worker com fila offline entra junto com o módulo de transações.
- Versões das dependências fixadas (sem `^`), publicadas há pelo menos duas semanas.

## Consequências

- Um registro único de telas (`config/screens.ts`) é testado contra as páginas existentes.
- Componentes acessíveis por padrão: rótulos ligados aos campos, `aria-current` na navegação, foco visível, `prefers-reduced-motion`.
