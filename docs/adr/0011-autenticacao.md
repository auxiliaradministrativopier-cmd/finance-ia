# ADR-11: Autenticação com gateway substituível

**Status:** aceita

## Contexto

O app precisa funcionar com um projeto Firebase real, com os emuladores locais e, durante o desenvolvimento, sem nenhuma configuração. As telas não devem depender do provedor.

## Decisão

- A interface `AuthGateway` define as operações (entrar, cadastrar, Google, recuperar senha, verificar e-mail, sair).
- Implementações: **Firebase** (projeto real ou emuladores), **demonstração** (apenas em desenvolvimento, sem servidor) e **indisponível** (produção sem configuração: o app explica em vez de quebrar).
- O modo é decidido por `resolveBackendMode` a partir das variáveis de ambiente.
- `AuthProvider` expõe o estado (`loading`, `authenticated`, `unauthenticated`) e as ações; os guardas cuidam da navegação.
- No cadastro, o e-mail de verificação sai antes da criação do perfil; o perfil (`users/{uid}` + preferências, com o consentimento) é recriado no próximo login se a primeira tentativa falhar.
- O perfil (tela 52) grava cada mudança nos dois lugares que a exibem: `users/{uid}` no Firestore e a conta do Firebase Auth. A foto vai para `users/{uid}/avatar/` no Storage (JPG, PNG ou WEBP, até 5 MB).
- A troca de senha exige a senha atual (reautenticação); contas só com Google não têm senha no Finance IA.
- A proteção dos dados é das Security Rules, testadas no emulador. Os guardas do cliente cuidam só da experiência.

## Consequências

- Testes de tela usam o gateway de demonstração, sem rede.
- Sessões de servidor (cookies de sessão do Firebase) entram quando houver renderização de dados no servidor ou a API própria.
- Login com Apple e verificação em duas etapas (tela 07) entram em uma etapa posterior; a rota já existe.
