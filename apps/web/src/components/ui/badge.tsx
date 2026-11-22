import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex h-[22px] shrink-0 items-center gap-1 rounded-sm px-2 text-caption font-semibold whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        success: "bg-brand-soft text-brand",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        ai: "bg-ai-soft text-ai",
        neutral: "bg-surface-sunken text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

/** Badge de estado. Sempre acompanhado de uma palavra: a cor nunca carrega o significado sozinha. */
export function Badge({ tone, icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {icon}
      {children}
    </span>
  );
}
