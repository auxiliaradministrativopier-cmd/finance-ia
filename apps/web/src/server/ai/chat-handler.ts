import { redactDeep, redactSensitive } from "@/features/assistant/redact";
import { chatRequestSchema, type ChatEvent, type ChatRequest } from "@/features/assistant/schema";
import type { VerifiedUser } from "../auth/verify-user";
import type { AiConfig } from "./config";
import { contextBlock, SYSTEM_PROMPT } from "./prompt";
import type { RateLimiter } from "./rate-limit";

/** Pedido já validado e mascarado, pronto para o modelo. */
export interface ModelRequest {
  apiKey: string;
  model: string;
  system: { stable: string; context: string };
  messages: ChatRequest["messages"];
  signal: AbortSignal;
}

/** Fala com o provedor de IA e devolve eventos (texto em partes, fim ou erro). */
export type ModelStreamer = (request: ModelRequest) => AsyncIterable<ChatEvent>;

export interface ChatHandlerDeps {
  verify: (authorization: string | null) => Promise<VerifiedUser | null>;
  limiter: RateLimiter;
  config: () => AiConfig;
  stream: ModelStreamer;
}

const MAX_BODY_BYTES = 128 * 1024;

function json(status: number, message: string, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

/**
 * POST /api/ia/chat. Ordem das verificações: identidade → limite de uso → tamanho e formato do
 * pedido → configuração. Só então os dados (já mascarados) seguem para o modelo.
 * Nada do conteúdo da conversa é registrado em log.
 */
export function createChatHandler(deps: ChatHandlerDeps) {
  return async function POST(request: Request): Promise<Response> {
    const user = await deps.verify(request.headers.get("authorization"));
    if (!user) return json(401, "Sua sessão expirou. Entre de novo para usar o assistente.");

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES)
      return json(413, "A conversa ficou longa demais. Comece uma nova.");
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES)
      return json(413, "A conversa ficou longa demais. Comece uma nova.");

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, "Pedido inválido.");
    }
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      // Só as mensagens escritas por nós (regras do schema) vão para a tela; o resto é genérico.
      const issue = parsed.error.issues[0];
      return json(
        400,
        issue?.code === "custom"
          ? issue.message
          : "Não foi possível enviar a pergunta. Atualize a página e tente de novo.",
      );
    }

    const limit = deps.limiter.take(user.uid);
    if (!limit.ok) {
      return json(
        429,
        "Você fez muitas perguntas em pouco tempo. Tente de novo em alguns minutos.",
        {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      );
    }

    const config = deps.config();
    if (!config.apiKey) return json(503, "O assistente ainda não foi configurado neste ambiente.");

    // Defesa em profundidade: mascara de novo no servidor, mesmo que o app já tenha mascarado.
    const context = redactDeep(parsed.data.context);
    const messages = parsed.data.messages.map((message) =>
      message.role === "user" ? { ...message, content: redactSensitive(message.content) } : message,
    );

    const encoder = new TextEncoder();
    const events = deps.stream({
      apiKey: config.apiKey,
      model: config.model,
      system: { stable: SYSTEM_PROMPT, context: contextBlock(context) },
      messages,
      signal: request.signal,
    });

    const body$ = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: ChatEvent) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        try {
          for await (const event of events) send(event);
        } catch (error) {
          if (!request.signal.aborted) {
            console.error(
              "Assistente IA: falha ao gerar resposta.",
              error instanceof Error ? error.name : "erro",
            );
            send({
              type: "error",
              code: "failed",
              message: "Não consegui responder agora. Tente de novo.",
            });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body$, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  };
}
