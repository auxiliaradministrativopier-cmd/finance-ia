"use client";

import { ArrowUp, RotateCcw, ShieldCheck, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { usePrivacy } from "@/providers/privacy-provider";
import { MAX_MESSAGE_LENGTH, type AssistantContext } from "../schema";
import { useAssistantContext } from "../use-assistant-context";
import { useChat, type ChatMessage } from "../use-chat";
import { MessageContent } from "./message-content";

export const SUGGESTED_QUESTIONS = [
  "Quanto posso gastar?",
  "Como economizar?",
  "Qual minha maior despesa?",
  "Quando atinjo minha meta?",
  "Devo quitar minha dívida?",
];

/** Tela 46: Assistente IA. */
export function AssistantPage() {
  const { status, error, context } = useAssistantContext();
  const { messages, busy, send, stop, reset } = useChat(context);
  const { hideValues } = usePrivacy();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lastContent = messages.at(-1)?.content;
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [messages.length, lastContent]);

  const ask = (text: string) => {
    if (!text.trim() || busy) return;
    void send(text);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Assistente IA"
        description="Pergunte sobre o seu dinheiro. As respostas usam apenas os seus dados no Finance IA."
        actions={
          messages.length > 0 ? (
            <Button variant="ghost" onClick={reset}>
              <RotateCcw aria-hidden="true" />
              Nova conversa
            </Button>
          ) : null
        }
      />
      {status === "error" ? <Alert tone="danger">{error?.message}</Alert> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-h-[420px] gap-4 p-0" aria-label="Conversa">
          <div
            className="flex flex-1 flex-col gap-4 p-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {status === "loading" ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : messages.length === 0 ? (
              <Welcome context={context} onAsk={ask} />
            ) : (
              messages.map((message) => (
                <Message key={message.id} message={message} hideValues={hideValues} />
              ))
            )}
            <div ref={endRef} />
          </div>

          <form
            className="sticky bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-2 rounded-b-lg border-t border-line bg-surface p-4 lg:bottom-0"
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
          >
            {messages.length > 0 && !busy ? (
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Sugestões">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <Button
                    key={question}
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => ask(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            ) : null}
            <label htmlFor="pergunta" className="text-label font-medium">
              Sua pergunta
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="pergunta"
                ref={inputRef}
                rows={2}
                maxLength={MAX_MESSAGE_LENGTH}
                value={draft}
                disabled={status !== "ready"}
                placeholder="Ex.: Quanto posso gastar até o fim do mês?"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    ask(draft);
                  }
                }}
                className="min-h-control-lg flex-1 resize-none rounded-md border border-line-control bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-muted focus:border-brand focus:outline-2 focus:outline-brand disabled:opacity-40"
              />
              {busy ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Parar resposta"
                  onClick={stop}
                >
                  <Square aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="ai"
                  size="icon"
                  aria-label="Enviar pergunta"
                  disabled={!draft.trim() || status !== "ready"}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
              )}
            </div>
            <p className="text-caption text-ink-muted">
              Enter envia; Shift + Enter quebra a linha. Orientação educativa, não é recomendação de
              investimento.
            </p>
          </form>
        </Card>

        <PrivacyPanel context={context} />
      </div>
    </div>
  );
}

function Welcome({
  context,
  onAsk,
}: {
  context: AssistantContext | null;
  onAsk: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-2">
      <span className="flex size-12 items-center justify-center rounded-full bg-ai-soft text-ai">
        <Sparkles className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">Como posso ajudar com o seu dinheiro?</h2>
        <p className="max-w-[60ch] text-body text-ink-muted">
          Eu analiso seus lançamentos, metas, dívidas e o seu IFA para responder. Escolha uma
          pergunta ou escreva a sua.
        </p>
      </div>
      {context && !context.hasData ? (
        <Alert tone="info">
          Você ainda não tem lançamentos. Registre receitas e despesas em Fluxo de caixa para
          respostas com os seus números.
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2" aria-label="Perguntas sugeridas">
        {SUGGESTED_QUESTIONS.map((question) => (
          <Button
            key={question}
            variant="ai"
            size="sm"
            disabled={!context}
            onClick={() => onAsk(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Message({ message, hideValues }: { message: ChatMessage; hideValues: boolean }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="max-w-[85%] rounded-lg rounded-br-sm bg-surface-sunken px-3 py-2 text-body whitespace-pre-wrap text-ink">
          <span className="sr-only">Você: </span>
          {message.content}
        </p>
        {message.redacted ? (
          <span className="flex items-center gap-1 text-caption text-ink-muted">
            <ShieldCheck className="size-3.5 text-brand" aria-hidden="true" />
            Dados pessoais removidos antes do envio.
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <article
      aria-label="Resposta do Finance IA"
      aria-busy={message.status === "streaming"}
      className={cn(
        "flex max-w-[92%] flex-col gap-2 rounded-lg rounded-bl-sm px-4 py-3",
        message.status === "error" ? "border border-line bg-surface" : "bg-ai-soft",
      )}
    >
      <span className="flex items-center gap-1.5 text-overline font-semibold tracking-[0.06em] text-ai uppercase">
        <Sparkles className="size-3.5" aria-hidden="true" />
        Finance IA
      </span>
      {message.status === "streaming" && !message.content ? (
        <span className="flex items-center gap-2 text-body text-ink-muted">
          <Spinner className="size-4" />
          Analisando seus dados…
        </span>
      ) : message.status === "error" ? (
        <p className="text-body text-ink">{message.content}</p>
      ) : (
        <MessageContent text={message.content} hideValues={hideValues} />
      )}
      {message.status === "stopped" ? (
        <span className="text-caption text-ink-muted">Resposta interrompida.</span>
      ) : null}
    </article>
  );
}

function PrivacyPanel({ context }: { context: AssistantContext | null }) {
  return (
    <Card aria-labelledby="privacidade-ia" className="gap-3">
      <h2 id="privacidade-ia" className="flex items-center gap-2 text-h3">
        <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
        Seus dados com o assistente
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body text-ink-muted">
        <li>
          O assistente vê só um resumo: totais do mês, categorias, maiores despesas, metas, dívidas
          e o IFA.
        </li>
        <li>
          Nunca enviamos seu nome, e-mail, documentos, nomes de contas, números de conta ou de
          cartão.
        </li>
        <li>
          CPF, telefones, e-mails e números longos são removidos das descrições e das perguntas
          antes do envio.
        </li>
        <li>A conversa não fica salva: ao sair da tela, ela é apagada.</li>
      </ul>
      {context ? (
        <details className="group">
          <summary className="cursor-pointer text-label font-semibold text-brand">
            Ver o resumo enviado
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-surface-sunken p-3 font-mono text-caption whitespace-pre-wrap text-ink">
            {JSON.stringify(context, null, 2)}
          </pre>
        </details>
      ) : null}
    </Card>
  );
}
