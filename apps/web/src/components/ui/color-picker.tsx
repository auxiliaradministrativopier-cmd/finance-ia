import { CATEGORY_COLORS } from "@finance-ia/shared";
import { cn } from "@/lib/cn";

export const colorNames: Record<string, string> = {
  "chart-1": "Verde",
  "chart-2": "Azul",
  "chart-3": "Âmbar",
  "chart-4": "Ameixa",
  "chart-5": "Coral",
  "chart-6": "Cinza",
};

/** Escolha entre as 6 cores de identificação do Design System. */
export function ColorPicker({
  value,
  onChange,
  legend = "Cor",
}: {
  value: string;
  onChange: (color: string) => void;
  legend?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-medium">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={value === color}
            aria-label={colorNames[color]}
            title={colorNames[color]}
            onClick={() => onChange(color)}
            className={cn(
              "flex size-control-md cursor-pointer items-center justify-center rounded-full border-2",
              value === color ? "border-ink" : "border-transparent",
            )}
          >
            <span className="size-7 rounded-full" style={{ background: `var(--${color})` }} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
