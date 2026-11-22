import { cn } from "@/lib/cn";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: React.ReactNode;
}

/** Chip de filtro ou seleção. Use aria-pressed para indicar o estado ao leitor de tela. */
export function Chip({
  selected = false,
  icon,
  className,
  children,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-control-sm shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-label font-medium transition-colors [&_svg]:size-4",
        selected
          ? "border-brand bg-brand-soft text-brand"
          : "border-line-control bg-surface text-ink hover:bg-surface-sunken",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
