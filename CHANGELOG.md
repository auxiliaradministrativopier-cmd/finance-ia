# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Os códigos entre colchetes (C1, A3, M7…) são os itens da auditoria técnica de novembro de 2026. As decisões estão em `docs/adr/0016-correcoes-da-auditoria.md`.

## [0.2.0] - 2026-11-23

Correções da auditoria técnica. O funcionamento e o padrão visual foram mantidos; as telas novas (pagar fatura, privacidade) seguem o Design System.

### Corrigido

- **Fatura do cartão** [C2]: novo "Pagar fatura" na tela de Cartões. O pagamento é uma transferência da conta para o cartão: o saldo da conta cai e a despesa não conta duas vezes. O cartão mostra quanto já foi pago, o limite usado desconta os pagamentos e o Dashboard mostra só o que falta pagar.
- **Números que ignoravam a fatura** [C2, M5]: a reserva do IFA desconta as faturas a vencer. O "Quanto posso gastar?" do Assistente separa as faturas do mês e as parcelas de dívidas já vencidas.
- **Desfazer pagamento de dívida** [A6]: excluir um pagamento antigo não mexe mais no vencimento; desfazer o mais recente (inclusive uma quitação) devolve o vencimento exato.
- **Saldo da dívida entre aparelhos** [A7]: pagamentos atualizam o saldo por soma atômica, sem uma gravação sobrescrever a outra (inclusive offline).
- **Documentos inválidos derrubando telas** [A8]: a leitura valida cada documento; um inválido sai da lista com aviso, e campos novos recebem o valor padrão.
- **Configuração inicial interrompida** (encontrado nos testes de ponta a ponta): se a página recarregava logo após o cadastro, o usuário ficava sem perfil e sem as categorias padrão. A configuração agora também roda ao abrir a sessão e nunca em paralelo.
- **Token antigo após confirmar o e-mail**: ao abrir a sessão, se o e-mail está confirmado e o token salvo não, o token é renovado antes de liberar o app.
- **Pagamentos de dívidas de outro usuário em memória** [B9]: o estado é marcado com o dono e descartado ao trocar de conta.
- **Fechar a resposta da IA depois de cancelar** [B2]: não lança mais erro no servidor.
- **Mês diferente da data em lançamentos** [B4]: as Security Rules recusam.
- **Instabilidade da regra de e-mail confirmado**: a regra não falha mais com tokens sem o campo `firebase`.

### Segurança

- **E-mail confirmado** [M7]: as Security Rules exigem e-mail confirmado para dados financeiros em contas com senha (como a rota da IA já exigia). O login com Google não é afetado.
- **Content-Security-Policy** [A4]: o app só carrega e conversa com ele mesmo, o Firebase e o Google.
- **Dados apagados ao sair** [A3]: o cache local do Firestore é removido do navegador no logout.
- **Tokens revogados** [M9]: as rotas `/api` recusam tokens revogados.
- **App Check nas rotas** [M8]: com App Check configurado, as rotas só aceitam pedidos do app.
- **Limite de uso da IA compartilhado** [M10]: contado no Firestore, vale para todas as instâncias do servidor.
- **Dependências** [M12]: `@grpc/grpc-js` atualizado para 1.14.7; um falso positivo do audit foi documentado e ignorado.

### Adicionado

- **Privacidade e dados (LGPD)** [A5]: nova tela em Configurações para baixar todos os dados (JSON) e excluir a conta. A exclusão pede a senha e apaga dados, arquivos e login. Há também a rotina diária `POST /api/manutencao/limpeza`, que apaga de vez o que foi excluído há mais de 30 dias.
- **Testes de ponta a ponta no repositório** [C1]: Playwright com emuladores e uma IA falsa, cobrindo pagamento de fatura, dívidas, IFA, assistente (com checagem do que é enviado à IA), exportação, exclusão de conta e limpeza diária (`pnpm --filter @finance-ia/web e2e`).
- **CI no GitHub Actions** [C1]: formatação, lint, tipos, testes, build, Security Rules e testes de ponta a ponta.
- **Hospedagem** [M11]: Firebase App Hosting (`apps/web/apphosting.yaml`), com segredos no Secret Manager.
- **Fuso horário do usuário** [B6]: as contas de "hoje" seguem o fuso das preferências.
- Testes novos: faturas, situação e evolução de dívidas, desfazer pagamentos, saldo atômico, leitura validada, limite de uso, exportação, telas disponíveis e regras (pagamento de fatura, e-mail confirmado, vencimento anterior).

### Alterado

- **Desempenho** [A1]: os dados do Fluxo de caixa são memorizados, então Dashboard, IFA e Assistente só recalculam quando os dados mudam. O IFA olha só os lançamentos da janela de 3 meses.
- **Menos conexões** [B5]: os pagamentos são escutados só nas dívidas em aberto (e na que está aberta no detalhe).
- **Organização** [M1, M2, M3]:
  - Componentes compartilhados foram para `src/components`: `ChartCard`, `StatTile` e `IfaGauge`.
  - A formatação foi unificada em `src/lib/format.ts`.
  - O cálculo de dívidas (`debtSnapshot`, `debtEvolution`) e de faturas foi para o `finance-core`.
  - Os ciclos entre módulos foram quebrados, e uma regra de lint impede novos.
- **Recomendações do IFA** [M6]: não levam mais para telas que ainda são esboço.
- **Assistente no celular** [B8]: o campo de pergunta fica fixo acima da barra inferior.
- **Tipos** [B3]: as conversões desnecessárias em dívidas foram removidas.

### Removido

- **Código morto** [B1]: `lib/firebase/paths.ts`, `data/index.ts`, `frequencyLabel`, `liveMonthTitle`, `reportsIcon`, o tipo `InstallmentPlan`, os rótulos duplicados das faixas do IFA e o medidor duplicado.

### Pendente

- **Leitura de todos os lançamentos** [A2]: exige saldos e agregados gravados por Cloud Functions; limitar a consulta no app mudaria os saldos.
- **Pilar Metas** [M4]: fica completo quando o módulo de Metas existir.
- **Push** [C1]: o repositório não tem remoto configurado.
- **Configuração em produção**: Cloud Scheduler para a limpeza diária, aplicação obrigatória do App Check e alertas de orçamento, no Console do Firebase e do GCP.
- **Foto de perfil** [B7]: o link com token foi aceito e documentado.
