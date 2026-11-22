import { cn } from "@/lib/cn";

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export interface AvatarProps {
  name: string;
  /** Foto do usuário. Sem foto, mostra as iniciais. */
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
  if (src) {
    return (
      // A foto vem do Storage com URL assinada; a otimização do Next exigiria um proxy público.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className={cn("size-9 shrink-0 rounded-full bg-surface-sunken object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-label font-semibold text-brand",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
