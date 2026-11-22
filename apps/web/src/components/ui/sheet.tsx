"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Folha inferior no celular e diálogo centralizado no desktop.
 * Usa o <dialog> nativo: foco preso, tecla Esc e camada superior de graça.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        // Clique no fundo escurecido fecha a folha.
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-xl border border-line bg-surface p-0 text-ink shadow-lg",
        "backdrop:bg-[rgba(4,12,15,0.55)]",
        "sm:m-auto sm:max-w-lg sm:rounded-xl",
        className,
      )}
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-2">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-h2">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-body text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="-mr-2 flex size-control-md shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink"
            aria-label="Fechar"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? (
          <footer className="border-t border-line px-5 pt-3 pb-safe-plus">{footer}</footer>
        ) : null}
      </div>
    </dialog>
  );
}
