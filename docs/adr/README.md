# Registro de decisões de arquitetura (ADR)

| ADR | Decisão                                                                                      | Status                                                  |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 01  | TypeScript em toda a stack                                                                   | Aceita                                                  |
| 02  | Monólito modular                                                                             | Aceita                                                  |
| 03  | API própria para IA e regras complexas                                                       | Aceita                                                  |
| 04  | PostgreSQL (Supabase) como banco                                                             | **Substituída pelo ADR-09**                             |
| 05  | Filas com pg-boss                                                                            | **Substituída pelo ADR-09** (Cloud Functions agendadas) |
| 06  | Dinheiro em centavos (inteiros)                                                              | Aceita                                                  |
| 07  | Claude via Messages API + tool use                                                           | Aceita                                                  |
| 08  | A IA explica, o código calcula                                                               | Aceita                                                  |
| 09  | [Firebase (Firestore, Auth, Storage, Functions, FCM)](0009-firebase.md)                      | Aceita                                                  |
| 10  | [Base do app web](0010-base-web.md)                                                          | Aceita                                                  |
| 11  | [Autenticação com gateway substituível](0011-autenticacao.md)                                | Aceita                                                  |
| 12  | [Camada de dados com armazenamento substituível](0012-camada-de-dados.md)                    | Aceita                                                  |
| 13  | [Fluxo de caixa: parcelas e recorrências geradas no app](0013-fluxo-de-caixa.md)             | Aceita (temporária)                                     |
| 14  | [Índice Finance IA (IFA) calculado no app](0014-indice-finance-ia.md)                        | Aceita (temporária)                                     |
| 15  | [Assistente IA pela rota do servidor, com dados mínimos e mascarados](0015-assistente-ia.md) | Aceita                                                  |
| 16  | [Correções da auditoria técnica](0016-correcoes-da-auditoria.md)                             | Aceita                                                  |
