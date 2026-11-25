import {
  ArrowLeftRight,
  BookOpen,
  CreditCard,
  Flag,
  FileText,
  Gauge,
  House,
  Landmark,
  Receipt,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { isScreenAvailable } from "./screens";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Menu lateral completo (desktop), agrupado pelos pilares do produto. */
const fullSidebarNavigation: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { label: "Início", href: "/inicio", icon: House },
      { label: "Saúde financeira", href: "/saude-financeira", icon: Gauge },
    ],
  },
  {
    label: "Dinheiro",
    items: [
      { label: "Fluxo de caixa", href: "/fluxo", icon: ArrowLeftRight },
      { label: "Contas", href: "/contas", icon: Landmark },
      { label: "Cartões", href: "/cartoes", icon: CreditCard },
      { label: "Dívidas", href: "/patrimonio/dividas", icon: Receipt },
    ],
  },
  {
    label: "Futuro",
    items: [
      { label: "Planejamento", href: "/planejar", icon: Target },
      { label: "Metas", href: "/planejar/metas", icon: Flag },
      { label: "Investimentos", href: "/patrimonio/investimentos", icon: TrendingUp },
      { label: "Patrimônio", href: "/patrimonio", icon: Wallet },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { label: "Assistente IA", href: "/ia", icon: Sparkles },
      { label: "Relatórios", href: "/relatorios", icon: FileText },
      { label: "Aprender", href: "/aprender", icon: BookOpen },
    ],
  },
];

/** Menu lateral exibido: só telas já lançadas (as demais entram quando ficarem prontas). */
export const sidebarNavigation: NavGroup[] = fullSidebarNavigation
  .map((group) => ({ ...group, items: group.items.filter((item) => isScreenAvailable(item.href)) }))
  .filter((group) => group.items.length > 0);

export const accountNavigation: NavItem[] = [
  { label: "Perfil", href: "/perfil", icon: UserRound },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export interface TabItem extends NavItem {
  /** Prefixos de rota que deixam esta aba ativa. */
  matches: string[];
}

/** Barra inferior (celular). O botão central "+" fica entre a segunda e a terceira aba. */
export const tabNavigation: [TabItem, TabItem, TabItem, TabItem] = [
  {
    label: "Início",
    href: "/inicio",
    icon: House,
    matches: [
      "/inicio",
      "/notificacoes",
      "/busca",
      "/perfil",
      "/configuracoes",
      "/planos",
      "/ajuda",
    ],
  },
  {
    label: "Fluxo",
    href: "/fluxo",
    icon: ArrowLeftRight,
    matches: ["/fluxo", "/lancamentos", "/contas", "/cartoes"],
  },
  {
    label: "Planejar",
    href: "/planejar",
    icon: Target,
    matches: ["/planejar", "/patrimonio"],
  },
  {
    label: "IA",
    href: "/ia",
    icon: Sparkles,
    matches: ["/ia", "/saude-financeira", "/aprender", "/relatorios"],
  },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Retorna o href do item com o prefixo mais longo que corresponde à rota atual. */
export function findActiveHref(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (matchesPrefix(pathname, href) && (best === null || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}

export function isTabActive(pathname: string, tab: TabItem): boolean {
  return tab.matches.some((prefix) => matchesPrefix(pathname, prefix));
}

export const allSidebarHrefs: string[] = [
  ...sidebarNavigation.flatMap((group) => group.items.map((item) => item.href)),
  ...accountNavigation.map((item) => item.href),
];
