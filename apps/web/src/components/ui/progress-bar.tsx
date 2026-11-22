import { cn } from "@/lib/cn";

export type ProgressTone = "brand" | "warning" | "danger" | "auto";

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** "auto" segue o Design System: verde até 80%, âmbar até 100%, vermelho acima. */
  tone?: ProgressTone;
  label: string;
  className?: string;
}

export function resolveProgressTone(
  ratio: number,
  tone: ProgressTone,
): Exclude<ProgressTone, "auto"> {
  if (tone !== "auto") return tone;
  if (ratio > 1) return "danger";
  if (ratio >= 0.8) return "warning";
  return "brand";
}

const fillClass = { brand: "bg-brand", warning: "bg-warning", danger: "bg-danger" } as const;

export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  label,
  className,
}: ProgressBarProps) {
  const ratio = max > 0 ? value / max : 0;
  const width = Math.min(Math.max(ratio, 0), 1) * 100;
  const resolved = resolveProgressTone(ratio, tone);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", fillClass[resolved])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
