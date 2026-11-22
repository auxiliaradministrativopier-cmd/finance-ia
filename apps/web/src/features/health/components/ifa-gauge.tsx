import type { IfaBand } from "@finance-ia/finance-core";
import { gaugeArc } from "@/features/dashboard/components/ifa-card";
import { cn } from "@/lib/cn";

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
