# ADR-12: Camada de dados com armazenamento substituível

**Status:** aceita

## Contexto

O app precisa ler e gravar as entidades do Modelo de Dados no Firestore, funcionar sem Firebase no modo demonstração e ter testes rápidos sem emulador.

## Decisão

- Interface `DataStore` (get, query, watch, set, update, batch, now) com duas implementações: **Firestore** (projeto real e emuladores) e **memória** (demonstração, salva no navegador, e testes).
- Um **repositório genérico** (`createEntityRepository`) dá CRUD a cada entidade: listar, acompanhar em tempo real, ler, criar, atualizar, excluir (lógico) e restaurar.
- Validação com **Zod** antes de escrever; na atualização, o documento resultante inteiro é validado, para as regras entre campos continuarem valendo.
- As **Security Rules** repetem as validações no servidor, protegem os campos calculados pelas Cloud Functions e proíbem exclusão física. Cada entidade tem testes no emulador.
- Listas filtram `deletedAt == null` e ordenam no app, sem índices compostos.
- Escritas feitas sem internet não travam a tela: vão para o cache local do Firestore e sincronizam depois.
- **Configuração inicial** (`ensureUserSetup`): perfil com consentimento, preferências e 24 categorias padrão, em um lote; idempotente e executada em todo login, o que completa contas antigas.

## Consequências

- Telas não conhecem o Firestore; trocar ou simular o banco não muda componentes.
- Dados calculados (saldos, faturas, resumos, IFA) e subcoleções (aportes, pagamentos, movimentações) entram com as Cloud Functions.
