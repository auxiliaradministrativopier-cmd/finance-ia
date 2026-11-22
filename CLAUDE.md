# Finance IA: convenções do projeto

Leia antes de alterar o código. Estas regras valem para pessoas e para assistentes de IA.

## Comandos

- `pnpm check` antes de considerar uma tarefa concluída (lint + tipos + testes).
- `pnpm dev` sobe o app em http://localhost:3000. A vitrine de componentes fica em `/dev/componentes`.

## Regras invioláveis

- **Dinheiro é sempre inteiro em centavos** (`Cents`). Nunca use `float` para valores. Formate só na borda, com `formatMoney` ou `<Amount>`.
- **Cores e tipografia vêm dos tokens** em `apps/web/src/styles/globals.css` (espelho do Design System). Não use cores literais nem tamanhos de fonte fora da escala (`text-h1`, `text-body`, `text-amount-lg`…).
- Valores monetários usam algarismos tabulares (`tabular`) e o sinal de menos tipográfico (−).
- Azul `ai` é exclusivo do que vem da IA Financeira. Despesas são neutras (`text-expense`); vermelho só para problemas reais.
- Todo estado de cor leva texto ou ícone junto. Contraste mínimo 4.5:1 nos dois temas.
- Textos da interface em português do Brasil, caixa de frase, verbos de ação nos botões, sem emojis.

## Autenticação e dados

- Componentes usam `useAuth()`; nunca importe `firebase/auth` fora de `features/auth/gateway`.
- **Dados só pela camada `src/data`.** Telas usam os repositórios (`getRepositories().categories`, `useLiveList`, `createUserRepository`); nunca importe `firebase/firestore` em componentes.
- Entidade nova: schema Zod em `src/data/models/entities.ts`, repositório em `src/data/repositories/index.ts`, regra em `firebase/firestore.rules` e um caso em `firebase/tests/entities.rules.test.ts`.
- Exclusão é sempre lógica (`remove` grava `deletedAt`). Campos calculados pelo servidor não entram nos schemas de entrada.
- Erros da camada de dados são `DataError` (mensagem em português e `fields` por campo): mostre `error.fields` nos formulários.
- Toda coleção nova precisa de regra em `firebase/firestore.rules` **e** teste em `firebase/tests` (`pnpm test:rules`). Sem regra, o acesso é negado.
- Os guardas (`RequireAuth`, `GuestOnly`, `RequireSession`) cuidam da navegação; a segurança dos dados é das Security Rules.
- Variáveis públicas passam por `src/lib/env.ts`. Segredos nunca usam o prefixo `NEXT_PUBLIC_`.

## IA

- Chamadas à IA só pela rota `POST /api/ia/chat` (`src/server/ai`). A chave (`ANTHROPIC_API_KEY`) é lida só em `src/server`, que importa `server-only`.
- O que vai para a IA sai de `features/assistant/context.ts`: só agregados, sem nome, e-mail, ids ou nomes e números de contas. Todo texto livre passa por `redactSensitive` (no app e de novo no servidor). Campo novo no resumo precisa de limite no `assistantContextSchema` e de teste.
- Nunca registre em log o conteúdo das perguntas, das respostas ou do resumo.

## Organização

- Nova tela: registre em `src/config/screens.ts` e crie a página no grupo certo (`(app)` ou `(auth)`). O teste de rotas falha se faltar a página.
- Item de menu: `src/config/navigation.ts`.
- Componente reutilizável: `src/components/ui`, com teste em `__tests__` quando houver lógica.
- Funcionalidade de negócio: `src/features/<modulo>/` (componentes, serviços, schemas e testes juntos).
- Código compartilhado entre web, API e mobile: `packages/shared`.
- **Regras financeiras puras** (parcelas, faturas, recorrências, resumos, saldos, provisionamentos, juros e amortização de dívidas, IFA) ficam em `packages/finance-core`, sem React nem Firebase, sempre com teste. Telas e serviços só chamam essas funções.
- Operações que gravam vários documentos (parcelamento, recorrência, exclusão em série) usam `buildCreate`/`buildUpdate`/`buildRemove` + `getRepositories().commit()`: tudo ou nada.
- Estilos: utilitários do Tailwind + `cn()` para combinar classes. Variantes com `class-variance-authority`.

## Decisões

Registradas em `docs/adr`. Não reverta uma decisão sem um novo ADR.
