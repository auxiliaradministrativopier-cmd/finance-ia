import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
}

/** Seleção nativa (melhor no celular), com o visual dos campos do Design System. */
export function SelectField({ label, hint, options, id, className, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={selectId} className="text-label font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-describedby={hint ? `${selectId}-hint` : undefined}
          className="h-control-md w-full cursor-pointer appearance-none rounded-md border border-line-control bg-surface pr-10 pl-3 text-body text-ink focus:border-brand focus:shadow-[0_0_0_1px_var(--brand)] focus:outline-none"
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      </div>
      {hint ? (
        <p id={`${selectId}-hint`} className="text-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
