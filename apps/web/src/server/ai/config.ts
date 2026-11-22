import "server-only";

/**
 * Configuração da IA, lida só no servidor. A chave NUNCA usa o prefixo NEXT_PUBLIC_
 * e nunca vai para o navegador.
 */
export function aiConfig() {
  return {
    apiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
    model: process.env.FINANCE_IA_AI_MODEL?.trim() || "claude-opus-5-5",
  };
}

export type AiConfig = ReturnType<typeof aiConfig>;
