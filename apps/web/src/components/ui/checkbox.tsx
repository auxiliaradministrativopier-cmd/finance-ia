import { Check } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  error?: string;
}

/** Caixa de seleção com rótulo clicável e área de toque de 44px. */
export function Checkbox({ label, error, id, className, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={inputId}
        className="flex min-h-control-md cursor-pointer items-start gap-3 py-2"
      >
        <span className="relative mt-px flex size-5 shrink-0">
          <input
            id={inputId}
            type="checkbox"
            className={cn(
              "peer size-5 cursor-pointer appearance-none rounded-sm border bg-surface transition-colors checked:border-brand checked:bg-brand",
              error ? "border-danger" : "border-line-control",
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...props}
          />
          <Check
            className="pointer-events-none absolute inset-0 m-auto size-3.5 text-on-brand opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden="true"
          />
        </span>
        <span className="text-body text-ink">{label}</span>
      </label>
      {error ? (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
