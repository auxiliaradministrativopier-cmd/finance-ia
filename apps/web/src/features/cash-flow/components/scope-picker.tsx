import { cn } from "@/lib/cn";
import type { ChangeScope } from "../types";

const options: { value: ChangeScope; label: string; description: string }[] = [
  { value: "one", label: "Só este", description: "Os outros continuam como estão." },
  { value: "following", label: "Este e os próximos", description: "Os anteriores não mudam." },
  { value: "all", label: "Todos", description: "Toda a série, inclusive os anteriores." },
];

/** Escolha do escopo de uma edição ou exclusão em parcelamentos e recorrências. */
export function ScopePicker({
  value,
  onChange,
  legend,
}: {
  value: ChangeScope;
  onChange: (scope: ChangeScope) => void;
  legend: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-medium">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex cursor-pointer flex-col items-start rounded-md border px-3 py-2.5 text-left",
              value === option.value
                ? "border-brand bg-brand-soft"
                : "border-line hover:bg-surface-sunken",
            )}
          >
            <span className="text-body font-medium">{option.label}</span>
            <span className="text-caption text-ink-muted">{option.description}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
