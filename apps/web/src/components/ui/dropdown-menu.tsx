"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type DropdownItem =
  | { type: "link"; label: string; href: string; icon?: React.ReactNode }
  | {
      type: "action";
      label: string;
      onSelect: () => void;
      icon?: React.ReactNode;
      tone?: "default" | "danger";
    }
  | { type: "separator" };

export interface DropdownMenuProps {
  /** Conteúdo do botão que abre o menu. */
  trigger: React.ReactNode;
  triggerLabel: string;
  items: DropdownItem[];
  /** Conteúdo fixo no topo do menu, como o nome e o e-mail do usuário. */
  header?: React.ReactNode;
  align?: "start" | "end";
}

/**
 * Menu suspenso acessível: abre com clique ou teclado, navega com as setas,
 * fecha com Esc ou ao clicar fora, e devolve o foco ao botão.
 */
export function DropdownMenu({
  trigger,
  triggerLabel,
  items,
  header,
  align = "end",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const focusItem = (index: number) => {
    const elements = rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!elements || elements.length === 0) return;
    const wrapped = (index + elements.length) % elements.length;
    elements[wrapped]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    focusItem(0);
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const elements = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const current = elements.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(elements.length - 1);
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  const itemClass =
    "flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-body text-ink outline-none hover:bg-surface-sunken focus-visible:bg-surface-sunken [&_svg]:size-5 [&_svg]:shrink-0";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex cursor-pointer items-center rounded-full"
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute top-[calc(100%+8px)] z-40 w-64 rounded-lg border border-line bg-surface p-1 shadow-md",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {header ? <div className="border-b border-line px-3 pt-2 pb-3">{header}</div> : null}
          {items.map((item, index) => {
            if (item.type === "separator") {
              return <hr key={`separator-${index}`} className="my-1 border-line" />;
            }
            if (item.type === "link") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={itemClass}
                  onClick={() => close(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={cn(itemClass, item.tone === "danger" && "text-danger")}
                onClick={() => {
                  close(false);
                  item.onSelect();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
