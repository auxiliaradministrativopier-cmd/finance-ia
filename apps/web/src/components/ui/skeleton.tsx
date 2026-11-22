import { cn } from "@/lib/cn";

/** Placeholder de carregamento no formato do conteúdo. Nunca use spinner de tela cheia. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-shimmer rounded-md bg-surface-sunken", className)}
      {...props}
    />
  );
}
