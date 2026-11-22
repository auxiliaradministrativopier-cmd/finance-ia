import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/** Estado vazio que ensina e convida à primeira ação. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand [&_svg]:size-6">
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <h3 className="text-h3">{title}</h3>
        <p className="text-body text-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
