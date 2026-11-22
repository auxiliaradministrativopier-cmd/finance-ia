# ADR-09: Firebase como plataforma de dados

**Status:** aceita · substitui ADR-04 e ADR-05

## Contexto

O produto precisa de sincronização em tempo real, funcionamento offline no PWA, push unificado (web, Android, iOS) e custo inicial próximo de zero.

## Decisão

Usar Cloud Firestore (dados), Firebase Authentication, Cloud Storage for Firebase, Cloud Functions 2ª geração (gatilhos e jobs) e Firebase Cloud Messaging, na região `southamerica-east1`.

## Consequências

- Totais e saldos são pré-calculados por Cloud Functions em documentos de agregação, com idempotência por `eventId` e reconciliação mensal.
- Isolamento por usuário via caminho `users/{uid}` + Security Rules testadas no emulador.
- Busca textual exige serviço externo na escala (Typesense ou Algolia).
