import { cn } from "@/lib/cn";

/** Símbolo oficial: três barras ascendentes (crescimento) e o ponto de luz (inteligência). */
export function LogoMark({
  className,
  withTile = false,
}: {
  className?: string;
  withTile?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-8 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      {withTile ? <rect width="64" height="64" rx="16" fill="var(--deep)" /> : null}
      <g transform={withTile ? "translate(8 8) scale(0.75)" : undefined}>
        <rect x="10" y="34" width="11" height="20" rx="5.5" fill="var(--brand)" />
        <rect x="26.5" y="24" width="11" height="30" rx="5.5" fill="var(--brand)" />
        <rect x="43" y="16" width="11" height="38" rx="5.5" fill="var(--brand)" />
        <circle cx="48.5" cy="7" r="5" fill="var(--ai)" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark withTile className="size-8" />
      <span className="font-display text-h3 font-semibold tracking-tight">Finance IA</span>
    </span>
  );
}
