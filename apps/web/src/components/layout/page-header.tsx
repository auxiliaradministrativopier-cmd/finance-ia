import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  title: string;
  /** Linha de contexto acima do título, como o mês de referência. */
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? <p className="text-caption text-ink-muted">{eyebrow}</p> : null}
        <h1 className="text-h1">{title}</h1>
        {description ? (
          <p className="max-w-[65ch] text-body text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
