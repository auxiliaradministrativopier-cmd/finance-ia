import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatEvent } from "@/features/assistant/schema";
import type { ModelRequest, ModelStreamer } from "./chat-handler";

const clients = new Map<string, Anthropic>();
function clientFor(apiKey: string): Anthropic {
  let client = clients.get(apiKey);
  if (!client) {
    client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 });
    clients.set(apiKey, client);
  }
  return client;
}

/**
 * Chama a API do Claude com streaming. Recusas por segurança caem automaticamente em outro
 * modelo (fallback no servidor); se toda a cadeia recusar, o app mostra uma mensagem neutra.
 */
export const anthropicStreamer: ModelStreamer = async function* (request: ModelRequest) {
  const client = clientFor(request.apiKey);
  try {
    const stream = client.beta.messages.stream(
      {
        model: request.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // Conversa curta e objetiva: esforço médio equilibra qualidade e tempo de resposta.
        output_config: { effort: "medium" },
        system: [
          { type: "text", text: request.system.stable, cache_control: { type: "ephemeral" } },
          { type: "text", text: request.system.context },
        ],
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      },
      { signal: request.signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text", text: event.delta.text } satisfies ChatEvent;
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      yield {
        type: "error",
        code: "refusal",
        message:
          "Não posso ajudar com esse pedido. Tente perguntar de outro jeito sobre as suas finanças.",
      };
      return;
    }
    yield { type: "done", stopReason: final.stop_reason };
  } catch (error) {
    if (request.signal.aborted) return;
    if (
      error instanceof Anthropic.RateLimitError ||
      (error instanceof Anthropic.APIError && (error.status ?? 0) >= 500)
    ) {
      yield {
        type: "error",
        code: "overloaded",
        message: "O assistente está muito requisitado agora. Tente de novo em instantes.",
      };
      return;
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Assistente IA: erro da API", error.status);
      yield {
        type: "error",
        code: "failed",
        message: "Não consegui responder agora. Tente de novo.",
      };
      return;
    }
    throw error;
  }
};
