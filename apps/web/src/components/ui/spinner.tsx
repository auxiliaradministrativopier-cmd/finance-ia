import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({
  className,
  label = "Carregando",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" className={cn("inline-flex text-ink-muted", className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
