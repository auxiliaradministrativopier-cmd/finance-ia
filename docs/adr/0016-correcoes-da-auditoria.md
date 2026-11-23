# ADR-16: Correções da auditoria técnica

**Status:** aceita

## Contexto

A auditoria de novembro de 2026 apontou 31 problemas: operação (git, CI, deploy), números financeiros (fatura do cartão), desempenho, segurança, LGPD e organização. Este ADR registra as decisões tomadas ao corrigi-los. O que foi feito está no `CHANGELOG.md`.

## Decisões

- **Pagamento de fatura** é uma transferência da conta para o cartão (`type: "transfer"`, `cardId`, `invoiceMonth`, `toAccountId: null`, `linkedEntity: invoice`). O saldo da conta cai e a despesa não conta duas vezes, porque transferências ficam fora de receitas e despesas. Faturas que venceram antes desta versão não são descontadas, porque não há como saber se foram pagas. Só as faturas a vencer entram na reserva do IFA e no "Quanto posso gastar?".
- **Saldo da dívida por soma atômica** (`increment`): funciona offline e entre aparelhos sem uma gravação sobrescrever a outra. Cada pagamento guarda `previousDueDate`; desfazer o pagamento mais recente restaura o vencimento exato.
- **Leitura validada**: todo documento passa pelo schema Zod também na leitura. Um documento inválido sai da lista com um aviso no console em vez de quebrar a tela; campos novos recebem o padrão do schema (migração suave). O resultado fica em cache por documento e `updatedAt`.
- **E-mail confirmado** é exigido pelas Security Rules para dados financeiros (contas em diante) em contas com senha. Perfil, preferências e categorias seguem liberados, porque são criados no cadastro, antes da confirmação.
- **Content-Security-Policy** estática no `next.config.ts`. Scripts inline continuam permitidos porque o Next.js os usa na hidratação; CSP com nonce exigiria renderizar todas as páginas no servidor e fica como evolução.
- **Cache local apagado ao sair** (`terminate` + `clearIndexedDbPersistence`). Com outra aba do app aberta, o navegador só deixa apagar na próxima saída.
- **LGPD**: exportação em JSON feita no app; exclusão da conta pela rota `POST /api/conta/excluir`, que exige login nos últimos 5 minutos e apaga dados, arquivos e login com o Firebase Admin. A limpeza definitiva do que foi excluído há mais de 30 dias roda em `POST /api/manutencao/limpeza`, protegida por `MAINTENANCE_SECRET`, chamada uma vez por dia pelo Cloud Scheduler, com índices de grupo de coleções em `deletedAt`.
- **Servidor**: o Firebase Admin fica em `src/server/firebase-admin.ts`. Tokens são verificados com revogação (`checkRevoked`). O App Check é verificado nas rotas quando há chave de site configurada. O limite de uso da IA é contado no Firestore (coleção `rateLimits`, sem regra, logo sem acesso pelo app), compartilhado entre instâncias.
- **Hospedagem**: Firebase App Hosting (`apps/web/apphosting.yaml`), com `ANTHROPIC_API_KEY` e `MAINTENANCE_SECRET` no Secret Manager.
- **Organização**: componentes usados por mais de um módulo moram em `src/components` (`ChartCard`, `StatTile`, `IfaGauge`). Formatação fica em `src/lib/format.ts`, "hoje" no fuso do usuário em `src/lib/time.ts`, e cálculo de dívidas (`debtSnapshot`, `debtEvolution`) e faturas no `finance-core`. Uma regra de lint impede importar componentes internos de outro módulo (exceções: `auth` e o layout).
- **Dependências**: `@grpc/grpc-js` forçado para 1.14.7 (`pnpm-workspace.yaml`). O alerta `GHSA-3wf4-68gx-mph8` é ignorado por ser falso positivo: o audit confunde a pasta `firebase` com o pacote npm.

## O que não foi resolvido por completo

- **Leitura de todos os lançamentos (A2).** O saldo de cada conta depende de todo o histórico. Limitar a consulta por período mudaria os saldos. A correção real são agregados mensais e saldos gravados por Cloud Functions (ADR-13). Por ora o custo foi reduzido evitando recálculos: os dados do fluxo são memorizados e o IFA só olha a janela de 3 meses.
- **Pilar Metas do IFA (M4).** O módulo de Metas ainda não existe; o pilar mede provisionamentos e metas com valor mensurável. Fica completo quando o módulo de Metas for construído.
- **Push para o GitHub (C1).** O repositório local tem commits e CI configurado, mas não há remoto. É preciso criar o repositório e configurar o `origin`.
- **Instabilidade do emulador nos testes de ponta a ponta.** Às vezes o emulador do Firestore avalia uma escrita feita logo após recarregar a página com um login incompleto ("evaluation error" em `request.auth`), inclusive com as regras originais. O Playwright repete o teste até 2 vezes. Não foi observado contra o Firebase real.
- **Foto de perfil (B7).** Ela usa URL de download com token: quem tiver o link vê a foto. Aceito para uma foto de perfil.

## Consequências

- Apagar uma conta é definitivo, e a exportação é a forma de o usuário guardar uma cópia.
- Em produção é preciso configurar o Cloud Scheduler (limpeza diária), os segredos do App Hosting e o App Check com aplicação obrigatória no Firestore e no Storage (Console do Firebase).
