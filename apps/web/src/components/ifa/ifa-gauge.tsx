import type { IfaBand } from "@finance-ia/finance-core";
import { cn } from "@/lib/cn";

/** Arco de 240° (de 150° a 390°), proporcional à nota de 0 a 1000. */
export function gaugeArc(score: number, radius = 80, center = 100): string {
  const start = 150;
  const sweep = (240 * Math.min(Math.max(score, 0), 1000)) / 1000;
  const point = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return `${(center + radius * Math.cos(rad)).toFixed(2)} ${(center + radius * Math.sin(rad)).toFixed(2)}`;
  };
  if (sweep <= 0) return "";
  return `M${point(start)} A${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${point(start + sweep)}`;
}

/** Tom do badge de cada faixa (sempre acompanhado do nome da faixa). */
export const bandTone = {
  critical: "danger",
  attention: "warning",
  healthy: "success",
  excellent: "ai",
} as const;

export const bandStroke: Record<IfaBand, string> = {
  critical: "var(--ifa-critical)",
  attention: "var(--ifa-attention)",
  healthy: "var(--ifa-healthy)",
  excellent: "var(--ifa-excellent)",
};

/** Medidor do IFA (arco de 240°). `onDeep` para usar sobre o card de destaque. */
export function IfaGauge({
  score,
  band,
  bandLabel,
  onDeep = false,
  className,
}: {
  score: number;
  band: IfaBand;
  bandLabel: string;
  onDeep?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 160"
      className={cn("h-auto w-full max-w-[240px]", className)}
      role="img"
      aria-label={`IFA ${score} de 1000, faixa ${bandLabel}`}
    >
      <path
        d={gaugeArc(1000)}
        fill="none"
        stroke={
          onDeep ? "color-mix(in srgb, var(--on-deep) 16%, transparent)" : "var(--surface-sunken)"
        }
        strokeWidth={14}
        strokeLinecap="round"
      />
      <path
        d={gaugeArc(score)}
        fill="none"
        stroke={bandStroke[band]}
        strokeWidth={14}
        strokeLinecap="round"
      />
      <text
        x="100"
        y="108"
        textAnchor="middle"
        className={cn(
          "font-display text-[52px] font-semibold tabular",
          onDeep ? "fill-on-deep" : "fill-ink",
        )}
      >
        {score}
      </text>
      <text
        x="100"
        y="132"
        textAnchor="middle"
        className={cn("text-[12px]", onDeep ? "fill-on-deep-muted" : "fill-ink-muted")}
      >
        de 1000
      </text>
    </svg>
  );
}
