import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const cardVariants = cva("flex min-w-0 flex-col", {
  variants: {
    variant: {
      /** Card padrão: superfície branca, borda suave. */
      default: "gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm",
      /** Card de destaque (saldo, patrimônio). No máximo um por tela. */
      highlight: "gap-4 rounded-xl border border-line bg-deep p-5 text-on-deep",
      /** Card de insight: a voz da IA Financeira. */
      insight: "gap-2 rounded-lg bg-ai-soft p-4",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof cardVariants> {
  as?: "section" | "article" | "div" | "nav";
}

export function Card({ as: Component = "section", variant, className, ...props }: CardProps) {
  return <Component className={cn(cardVariants({ variant }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-h3 font-semibold", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body text-ink-muted", className)} {...props} />;
}

export function Overline({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-overline font-semibold tracking-[0.06em] uppercase", className)}
      {...props}
    />
  );
}
