# ADR-14: Índice Finance IA (IFA) calculado no app

**Status:** aceita, temporária até as Cloud Functions

## Contexto

O Modelo de Dados prevê o IFA gravado por Cloud Functions em `users/{uid}.ifa` e `healthScores` (somente leitura para o cliente). As funções ainda não existem, e a tela de Saúde Financeira e o Dashboard precisam da nota agora.

## Decisão

- **Cálculo puro em `packages/finance-core/src/health.ts`** (`healthScore`, `healthHistory`), testado isoladamente e reaproveitável pelas Cloud Functions.
- **Seis pilares, 1000 pontos**: Controle de gastos 250, Reserva 200, Dívidas 200, Pagamentos 150, Investimentos 100, Metas 100. Base: os últimos 3 meses de registros (receitas e despesas previstas e pagas).
  - Controle de gastos: taxa de poupança (−20% → 0; 0% → 0,4; 10% → 0,7; 20% → 0,9; 30% → 1).
  - Reserva: saldo das contas + investimentos marcados como reserva, em meses de despesa (6 meses = nota cheia).
  - Dívidas: parcelas ÷ renda; dívida cara (rotativo, cheque especial ou ≥ 4% a.m.) multiplica por 0,75; parcela abaixo dos juros limita a 0,15. Sem dívidas = nota cheia.
  - Pagamentos: contas (fora do cartão) pagas em dia; atrasada = registrada antes e não paga no vencimento; paga com atraso = mais de 5 dias depois. Parcela de dívida vencida desconta.
  - Investimentos: investimentos (fora da reserva) + o que passa de 6 meses de reserva, em meses de despesa; rendimentos recebidos somam um bônus.
  - Metas: provisionamentos e metas no ritmo; sem nenhum, 0,3 (planejar faz parte da saúde financeira).
- Pilar sem como medir (ex.: nenhuma conta a pagar) sai da conta e a nota é reescalada para 0–1000.
- **Trava**: gastar mais do que ganha com menos de 1 mês de reserva limita a nota a 399 (Crítico).
- Faixas do Design System: Crítico 0–399, Atenção 400–599, Saudável 600–799, Excelente 800–1000.
- **Sem nota** enquanto não houver ao menos uma receita e uma despesa nos últimos 3 meses.
- **Evolução histórica reconstruída** a partir dos dados de cada mês (último dia do mês; o atual, hoje), sem gravar nada. Metas e vencimentos de dívida só existem "hoje" e entram apenas na nota atual. Lançamentos registrados depois não contam como atraso.
- As recomendações (`features/health/labels.ts`) são regras fixas, ordenadas pelos pontos que cada pilar ainda pode ganhar. Não usam o azul `ai`, porque não vêm de um modelo.

## Consequências

- A nota muda na hora com qualquer lançamento, dívida ou aporte, inclusive offline.
- Editar um lançamento antigo muda a evolução daquele mês. Com as Cloud Functions, os meses fechados passam a ser gravados em `healthScores` e ficam fixos.
