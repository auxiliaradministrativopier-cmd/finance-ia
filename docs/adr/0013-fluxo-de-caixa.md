# ADR-13: Fluxo de caixa com parcelas e recorrências geradas no app

**Status:** aceita, temporária até as Cloud Functions

## Contexto

O Modelo de Dados prevê que parcelas, ocorrências de recorrências, saldos, faturas e resumos sejam calculados por Cloud Functions. Elas ainda não existem, e o módulo de Fluxo de Caixa precisa funcionar agora.

## Decisão

- **Regras puras em `packages/finance-core`**: divisão de parcelas (sobra na 1ª), fatura pela data de fechamento, datas de recorrência, resumo mensal, saldos e série de evolução. Testadas isoladamente e reaproveitáveis pelas Cloud Functions.
- **Parcelamento**: o app grava o plano (`installmentPlans`) e todas as parcelas (`transactions`) em um único lote.
- **Recorrência**: o app grava a regra (`recurrences`) e as ocorrências até 3 meses à frente, com ids determinísticos (`{recorrência}_{AAAAMMDD}`) e o marcador `generatedUntil`. Ao abrir o app, as recorrências são estendidas; repetir a operação nunca duplica.
- **Edição e exclusão em série** com escopo "só este / este e os próximos / todos". Valor, data e status mudam só no lançamento escolhido; numa recorrência, o novo valor vale para as próximas ocorrências ainda não pagas.
- **Saldos, faturas, resumos e o Dashboard** são calculados no app a partir dos lançamentos acompanhados em tempo real. O Dashboard mostra dados de exemplo enquanto o usuário não tem conta nem lançamento.
- Compras no cartão não alteram o saldo da conta; o dinheiro sai quando a fatura é paga (módulo de cartões).

## Consequências

- O app lê todos os lançamentos do usuário. Adequado para o volume inicial; com as Cloud Functions, o Dashboard passa a ler os documentos de agregação (cerca de 14 leituras).
- Ao criar as Cloud Functions, a geração migra para o servidor sem mudar o formato dos documentos.

## Adendo: Provisionamentos

- O saldo de cada provisionamento é a soma dos aportes da subcoleção `provisions/{id}/contributions` (depósitos menos retiradas), calculada no app enquanto `accumulatedAmount` (campo do servidor) não existe.
- Aportes **não** viram lançamentos: separar dinheiro para o IPVA não é gastar. A despesa entra no Fluxo de Caixa quando for paga.
- O plano (`provisionPlan` no `finance-core`) conta os meses de aporte do mês atual ao mês do vencimento e arredonda o valor mensal para cima, para nunca faltar.
- Listas vazias vindas só do cache local são ignoradas enquanto há internet: o app espera o servidor para não mostrar "sem dados" (e o Dashboard de exemplo) por engano.

## Adendo: Controle de Dívidas

- Quatro grupos na interface (Empréstimos, Financiamentos, Cartões, Parcelamentos), gravados nos tipos já previstos em `debts.type` (mais `credit_card_installment` e `installment_purchase`) e com o novo campo `endDate` (data final do contrato).
- Os cálculos ficam em `packages/finance-core/src/debts.ts`: juros compostos mensais sobre o saldo, sistemas Price, SAC e sem juros, cronograma até a quitação, percentual pago, evolução do saldo (`balanceHistory`) e simulação de antecipação (valor hoje reduzindo prazo ou parcela, ou valor a mais por mês).
- Cada pagamento fica em `debts/{id}/payments` com `interest` e `principal` separados. Parcela normal paga primeiro os juros do mês; antecipação abate direto do saldo (CDC, art. 52). O app grava em um lote: o pagamento, o novo `currentBalance`, o próximo vencimento e, se o usuário escolher uma conta, a despesa no Fluxo de Caixa (categoria "Dívidas e juros", `linkedEntity` = dívida). Excluir o pagamento devolve o principal ao saldo e exclui a despesa.
- As parcelas que faltam vêm da data final do contrato (serve para dívidas cadastradas no meio) ou, sem ela, do número de parcelas menos as pagas no app.
- Parcela menor que os juros do mês marca a dívida como "crescendo" e gera alerta na lista e no Dashboard. O Dashboard soma só as dívidas em aberto e mostra a próxima parcela em "Próximas contas".
- A evolução usa os pagamentos registrados; o trecho entre o início do contrato e o cadastro é estimado em linha reta e aparece como "Estimado" na tabela do gráfico.
