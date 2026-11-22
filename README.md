# Finance IA

Aplicativo de finanças pessoais com inteligência artificial: fluxo de caixa, planejamento, patrimônio, IA financeira e o **IFA (Índice Finance IA)**, a nota de saúde financeira de 0 a 1000.

> Estado atual: **fundação técnica (Fase 0)**. Estrutura, tema, navegação, componentes, Firebase, autenticação e PWA. As funcionalidades financeiras chegam nas próximas fases.

## Requisitos

- Node.js 22 ou superior (`.nvmrc`)
- pnpm 10 (`corepack enable` instala a versão definida em `package.json`)

## Como rodar

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Sem configuração, o app roda em **modo demonstração**: qualquer e-mail e senha válidos entram e nada é salvo. Para usar o Firebase, escolha uma das opções abaixo.

### Opção A: emuladores locais (recomendado para desenvolver)

Não precisa de conta no Google. Requer Java 11 ou superior.

```bash
pnpm emulators      # Auth, Firestore e Storage; interface em http://127.0.0.1:4000
```

Em `apps/web/.env.local`:

```
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true
```

Os e-mails de verificação e de nova senha aparecem na interface do emulador (aba Authentication).

### Opção B: projeto Firebase real

1. Crie o projeto no [Console do Firebase](https://console.firebase.google.com), região `southamerica-east1`.
2. Ative **Authentication** (E-mail/senha e Google), **Firestore** e **Storage**.
3. Em Configurações do projeto → Seus apps, crie um app da Web e copie as chaves.
4. `cp apps/web/.env.example apps/web/.env.local` e preencha as variáveis `NEXT_PUBLIC_FIREBASE_*`.
5. `cp .firebaserc.example .firebaserc` com o ID do projeto e publique as regras:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

Páginas úteis:

| Rota                                   | O que é                                              |
| -------------------------------------- | ---------------------------------------------------- |
| `/`                                    | Splash: decide o destino conforme a sessão           |
| `/boas-vindas`, `/entrar`, `/cadastro` | Acesso (somente visitantes)                          |
| `/inicio`                              | Área logada (exige e-mail confirmado)                |
| `/dev/componentes`                     | Vitrine dos componentes (somente em desenvolvimento) |

## Scripts

| Comando          | O que faz                                                  |
| ---------------- | ---------------------------------------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento do app web                     |
| `pnpm build`     | Build de produção de todos os pacotes                      |
| `pnpm lint`      | ESLint                                                     |
| `pnpm typecheck` | Verificação de tipos (TypeScript strict)                   |
| `pnpm test`      | Testes (Vitest + Testing Library)                          |
| `pnpm check`     | Lint, tipos e testes de uma vez (use antes de abrir um PR) |
| `pnpm format`    | Prettier (com ordenação de classes do Tailwind)            |

## Estrutura

```
finance-ia/
├── apps/
│   └── web/                      PWA em Next.js (App Router)
│       ├── public/icons/         Ícones do PWA
│       └── src/
│           ├── app/
│           │   ├── (auth)/       Telas de acesso e onboarding (layout com painel da marca)
│           │   ├── (app)/        Área logada (menu lateral, barra superior, barra inferior)
│           │   ├── layout.tsx    Fontes, metadados, provedores
│           │   └── manifest.ts   Manifesto do PWA
│           ├── components/
│           │   ├── ui/           Componentes básicos do Design System
│           │   ├── layout/       Estrutura: AppShell, Sidebar, BottomNav, TopBar, menu da conta
│           │   ├── feedback/     Estados globais: splash, offline, modo demonstração
│           │   └── pwa/          Registro do service worker
│           ├── features/         Módulos de funcionalidade (cada um com components, testes, serviços)
│           │   ├── auth/         Autenticação: provedor, guardas, gateways, formulários
│           │   └── users/        Perfil do usuário no Firestore
│           ├── config/           Registro de telas e navegação
│           ├── hooks/            Hooks globais (conexão, instalação do PWA…)
│           ├── lib/              Utilitários, variáveis de ambiente, Firebase
│           ├── providers/        Tema, privacidade (ocultar valores), avisos
│           └── styles/           Tema visual (tokens do Design System)
├── firebase/                     Security Rules, índices e testes das regras
├── packages/
│   ├── shared/                   Tipos, constantes e utilitários compartilhados (web, API, mobile)
│   └── config/                   Configurações compartilhadas de TypeScript
└── docs/adr/                     Registro de decisões de arquitetura
```

## Stack

Next.js 16 · React 19 · TypeScript 5.9 (strict) · Tailwind CSS 4 · Firebase 12 · Zod 4 · Lucide · Vitest 4 · Turborepo · pnpm.

## Documentação de produto

- Design System: tokens, componentes e regras de uso (artefato no claude.ai).
- Decisões de arquitetura: [`docs/adr`](docs/adr).
