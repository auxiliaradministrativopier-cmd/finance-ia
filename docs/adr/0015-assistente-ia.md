# ADR-15: Assistente IA pela rota do servidor, com dados mínimos e mascarados

**Status:** aceita

## Contexto

O Assistente IA responde perguntas sobre as finanças do usuário ("Quanto posso gastar?", "Devo quitar minha dívida?"). Ele precisa de dados reais, mas a chave da API de IA não pode ir para o navegador, e dados pessoais não podem sair do app sem necessidade.

## Decisão

- **Provedor:** API do Claude (Anthropic), SDK oficial `@anthropic-ai/sdk`, modelo `claude-opus-5-5` (troca por `FINANCE_IA_AI_MODEL`), esforço `medium`, streaming. Recusas por segurança usam o fallback do servidor (`fallbacks: "default"`); se toda a cadeia recusar, o app mostra uma mensagem neutra.
- **Rota única no servidor:** `POST /api/ia/chat` (Next.js, runtime Node). A chave fica em `ANTHROPIC_API_KEY`, sem `NEXT_PUBLIC_`, lida só em `src/server` (`import "server-only"`).
- **Identidade:** o app envia o ID token do Firebase (`Authorization: Bearer`). O servidor valida assinatura, projeto, validade e e-mail confirmado com o Firebase Admin, que só precisa do id do projeto. No modo demonstração (desenvolvimento sem Firebase) aceita o marcador `demo`; em produção, nunca.
- **Dados mínimos:** o navegador monta um resumo (`features/assistant/context.ts`) só com agregados: totais do mês, 6 meses de histórico, categorias, até 8 maiores despesas, contas a vencer, metas, dívidas com simulação, IFA e "quanto posso gastar" (`finance-core/planning.ts`). Não vão nome, e-mail, uid, ids, nomes de contas nem instituições. O usuário vê o resumo exato em "Ver o resumo enviado".
- **Mascaramento em duas camadas:** `redactSensitive` remove e-mail, CPF, CNPJ, cartão (Luhn), telefone, chave Pix, links e números longos (agência, conta, protocolo) das perguntas e dos textos livres. Roda no navegador e de novo no servidor.
- **Validação e limites:** o corpo tem no máximo 128 KB e passa por um schema Zod com limite em todo campo (20 mensagens, 1.500 caracteres por pergunta). Cada usuário tem até 12 perguntas a cada 10 minutos e 80 por dia (memória do processo). Logs nunca incluem o conteúdo.
- **Prompt:** instruções fixas primeiro (com cache) e os dados entre `<dados_financeiros>`, tratados como dados e não como instruções (descrições são texto do usuário). Orientação educativa, sem indicar produtos específicos, sem pedir ou repetir documentos e senhas.
- **Sem histórico salvo:** a conversa vive só na memória da página.

## Consequências

- O resumo é montado pelo cliente: um usuário pode alterar o próprio resumo, mas isso só afeta as respostas dele. A rota não lê dados de terceiros, e as Security Rules continuam protegendo o Firestore.
- O limite de uso em memória vale por instância. Com várias instâncias, migrar para um contador compartilhado.
- Em produção, `ANTHROPIC_API_KEY` vai para o gerenciador de segredos da hospedagem, e o projeto do Firebase precisa estar em `NEXT_PUBLIC_FIREBASE_PROJECT_ID` para validar os tokens.
