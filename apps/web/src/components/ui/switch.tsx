import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Interruptor liga/desliga com rótulo e descrição. Toda a linha é clicável (alvo de 44px). */
export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex min-h-control-md items-center justify-between gap-4 py-2", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-body font-medium text-ink">
          {label}
        </label>
        {description ? (
          <p id={`${id}-description`} className="text-caption text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          checked ? "border-brand bg-brand" : "border-line-control bg-surface-sunken",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-5 rounded-full shadow-sm transition-transform",
            checked ? "translate-x-[22px] bg-on-brand" : "translate-x-[3px] bg-ink-muted",
          )}
        />
      </button>
    </div>
  );
}
