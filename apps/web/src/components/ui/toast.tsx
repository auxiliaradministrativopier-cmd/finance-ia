"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

interface ToastOptions {
  title: string;
  tone?: ToastTone;
  /** Ação opcional, como "Desfazer". */
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, "title" | "tone">> {
  id: number;
  action?: ToastOptions["action"];
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    ({ title, tone = "success", action, durationMs = 5000 }: ToastOptions) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, title, tone, action }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing-tabbar)+16px+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-body shadow-md",
            )}
          >
            {toast.tone === "error" ? (
              <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden="true" />
            ) : (
              <CircleCheck
                className={cn("size-5 shrink-0", toast.tone === "info" ? "text-ai" : "text-brand")}
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 flex-1">{toast.title}</span>
            {toast.action ? (
              <button
                type="button"
                className="cursor-pointer text-label font-semibold text-brand"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Fechar aviso"
              className="cursor-pointer text-ink-muted hover:text-ink"
              onClick={() => dismiss(toast.id)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (options: ToastOptions) => void {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de <ToastProvider>.");
  return context;
}
