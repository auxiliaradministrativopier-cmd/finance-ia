"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/cn";

const options = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
] as const;

/** Seletor de aparência: Sistema, Claro ou Escuro. No modo compacto, mostra só os ícones. */
export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  // O tema só é conhecido no navegador; evita divergência de hidratação.
  const mounted = useMounted();
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div
      role="radiogroup"
      aria-label="Aparência"
      className={cn("inline-flex rounded-md bg-surface-sunken p-1", className)}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-2.5 text-caption font-medium text-ink-muted transition-colors",
            current === value && "bg-surface text-ink shadow-sm",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          <span className={cn(compact && "sr-only")}>{label}</span>
        </button>
      ))}
    </div>
  );
}
