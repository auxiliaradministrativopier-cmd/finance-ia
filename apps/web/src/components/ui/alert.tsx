import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

const alertVariants = cva("flex items-start gap-3 rounded-lg px-4 py-3 text-body", {
  variants: {
    tone: {
      info: "bg-ai-soft text-ink",
      success: "bg-brand-soft text-ink",
      warning: "bg-warning-soft text-ink",
      danger: "bg-danger-soft text-ink",
    },
  },
  defaultVariants: { tone: "info" },
});

const icons = {
  info: { Icon: Info, className: "text-ai" },
  success: { Icon: CircleCheck, className: "text-brand" },
  warning: { Icon: TriangleAlert, className: "text-warning" },
  danger: { Icon: CircleAlert, className: "text-danger" },
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
}

/** Mensagem em destaque dentro da tela. Erros usam role="alert" para serem anunciados. */
export function Alert({ tone = "info", title, className, children, ...props }: AlertProps) {
  const { Icon, className: iconClass } = icons[tone ?? "info"];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
