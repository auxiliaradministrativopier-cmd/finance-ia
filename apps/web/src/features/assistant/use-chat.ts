"use client";

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { redactSensitive } from "./redact";
import { MAX_MESSAGE_LENGTH, MAX_MESSAGES, type AssistantContext, type ChatEvent } from "./schema";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "stopped" | "error";
  /** A pergunta tinha dados pessoais, que foram removidos antes do envio. */
  redacted?: boolean;
}

const ENDPOINT = "/api/ia/chat";
let counter = 0;
const nextId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Histórico enviado ao servidor: só mensagens concluídas, as mais recentes, começando pelo usuário. */
export function historyFor(messages: ChatMessage[], question: string) {
  const turns = messages
    .filter(
      (message) => message.status === "done" || (message.status === "stopped" && message.content),
    )
    .map(({ role, content }) => ({
      role,
      content: role === "assistant" ? content.slice(0, 6000) : redactSensitive(content),
    }));
  // Dados pessoais da pergunta são removidos aqui, antes de sair do aparelho.
  const all = [...turns, { role: "user" as const, content: redactSensitive(question) }].slice(
    -MAX_MESSAGES,
  );
  while (all.length > 1 && all[0]!.role !== "user") all.shift();
  return all;
}

/** Conversa com o assistente. Fica só na memória da página: nada é salvo. */
export function useChat(context: AssistantContext | null) {
  const { getIdToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const update = (id: string, patch: (message: ChatMessage) => ChatMessage) =>
    setMessages((current) =>
      current.map((message) => (message.id === id ? patch(message) : message)),
    );

  const send = useCallback(
    async (text: string) => {
      const question = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!question || busy || !context) return;
      const history = historyFor(messages, question);
      const assistantId = nextId();
      setMessages((current) => [
        ...current,
        {
          id: nextId(),
          role: "user",
          content: question,
          status: "done",
          redacted: redactSensitive(question) !== question,
        },
        { id: assistantId, role: "assistant", content: "", status: "streaming" },
      ]);
      setBusy(true);
      const controller = new AbortController();
      abort.current = controller;
      const fail = (message: string) =>
        update(assistantId, (item) => ({ ...item, content: message, status: "error" }));

      try {
        const token = await getIdToken();
        if (!token) {
          fail("Sua sessão expirou. Entre de novo para usar o assistente.");
          return;
        }
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: history, context }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          fail(body?.message ?? "Não consegui responder agora. Tente de novo.");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as ChatEvent;
            if (event.type === "text")
              update(assistantId, (item) => ({ ...item, content: item.content + event.text }));
            else if (event.type === "error") {
              finished = true;
              fail(event.message);
            } else {
              finished = true;
              update(assistantId, (item) => ({ ...item, status: "done" }));
            }
          }
        }
        if (!finished)
          update(assistantId, (item) => ({
            ...item,
            status: item.content ? "done" : "error",
            content: item.content || "A resposta foi interrompida. Tente de novo.",
          }));
      } catch (error) {
        if (controller.signal.aborted)
          update(assistantId, (item) => ({ ...item, status: "stopped" }));
        else
          fail(
            error instanceof TypeError
              ? "Sem conexão com a internet. O assistente precisa estar online."
              : "Não consegui responder agora. Tente de novo.",
          );
      } finally {
        abort.current = null;
        setBusy(false);
      }
    },
    [busy, context, getIdToken, messages],
  );

  const stop = useCallback(() => abort.current?.abort(), []);
  const reset = useCallback(() => {
    abort.current?.abort();
    setMessages([]);
  }, []);

  return { messages, busy, send, stop, reset };
}
