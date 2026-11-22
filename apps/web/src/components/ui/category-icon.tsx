import {
  Backpack,
  CalendarCheck,
  Flag,
  FileText,
  ShieldCheck,
  Briefcase,
  Building2,
  Car,
  CircleDashed,
  CreditCard,
  Ellipsis,
  Film,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Smartphone,
  Sparkle,
  Store,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/** Ícones disponíveis para categorias (nomes Lucide salvos no Firestore). */
export const categoryIcons: Record<string, LucideIcon> = {
  house: House,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  car: Car,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  receipt: Receipt,
  repeat: Repeat,
  film: Film,
  "shopping-bag": ShoppingBag,
  sparkle: Sparkle,
  "paw-print": PawPrint,
  landmark: Landmark,
  "credit-card": CreditCard,
  "hand-heart": HandHeart,
  ellipsis: Ellipsis,
  briefcase: Briefcase,
  "building-2": Building2,
  laptop: Laptop,
  store: Store,
  "trending-up": TrendingUp,
  "rotate-ccw": RotateCcw,
  gift: Gift,
  plane: Plane,
  shirt: Shirt,
  smartphone: Smartphone,
  wrench: Wrench,
  "piggy-bank": PiggyBank,
  backpack: Backpack,
  "file-text": FileText,
  "shield-check": ShieldCheck,
  "calendar-check": CalendarCheck,
  flag: Flag,
  wallet: Wallet,
};

/** Ícone de categoria em um círculo tingido com a cor da categoria (Design System). */
export function CategoryIcon({
  icon,
  color,
  className,
}: {
  icon: string;
  color: string;
  className?: string;
}) {
  const Icon = categoryIcons[icon] ?? CircleDashed;
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", className)}
      style={{
        color: `var(--${color})`,
        background: `color-mix(in srgb, var(--${color}) 14%, transparent)`,
      }}
    >
      <Icon className="size-4" />
    </span>
  );
}
