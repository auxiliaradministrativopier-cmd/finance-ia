import { cn } from "@/lib/cn";

export interface StatTileProps {
  label: string;
  icon: React.ReactNode;
  /** Ex.: <Amount />. */
  value: React.ReactNode;
  /** Linha de contexto: o "e daí?" do número. */
  detail: React.ReactNode;
  footer?: React.ReactNode;
  href?: string;
  className?: string;
}

/** Indicador do Dashboard: rótulo, número grande e uma frase que explica o número. */
export function StatTile({ label, icon, value, detail, footer, className }: StatTileProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-surface p-4 shadow-sm",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-label font-medium text-ink-muted">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink [&_svg]:size-4">
          {icon}
        </span>
        {label}
      </p>
      <div className="text-amount-lg font-semibold">{value}</div>
      <p className="text-caption text-ink-muted">{detail}</p>
      {footer}
    </section>
  );
}
