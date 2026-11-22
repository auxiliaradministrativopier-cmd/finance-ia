import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonCva = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent",
    "font-sans text-label font-semibold transition-[filter,background-color] duration-150 ease-out",
    "hover:brightness-[.92] active:brightness-[.86] cursor-pointer select-none",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100",
    "[&_svg]:size-5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand text-on-brand",
        secondary: "border-line-control bg-surface text-ink",
        tertiary: "bg-transparent px-2 text-brand hover:bg-brand-soft hover:brightness-100",
        ai: "bg-ai-soft text-ai",
        danger: "bg-danger text-on-brand",
        ghost:
          "bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink hover:brightness-100",
      },
      size: {
        sm: "h-control-sm px-3 [&_svg]:size-4",
        md: "h-control-md px-4",
        lg: "h-control-lg px-6 text-[15px]",
        icon: "size-control-md p-0",
        "icon-sm": "size-control-sm p-0 [&_svg]:size-4",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/** Classes do botão já resolvidas (também usadas para estilizar links como botões). */
export function buttonVariants(props?: VariantProps<typeof buttonCva>): string {
  return cn(buttonCva(props));
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonCva> {
  /** Mostra um indicador de carregamento no lugar do ícone e mantém a largura. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonCva({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
