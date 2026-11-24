import {
  Car,
  Gift,
  LayoutDashboard,
  LineChart,
  PiggyBank,
  Receipt,
  Settings,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Itens com `enabled: false` não são exibidos (rota ainda não existe). */
  enabled?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** A rota `/budget` existe (Sprint 1 integrada): o item "Budget" é exibido na sidebar. */
export const BUDGET_ROUTE_ENABLED = true;

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/budget", label: "Budget", icon: Wallet, enabled: BUDGET_ROUTE_ENABLED },
    ],
  },
  {
    label: "Movimentações",
    items: [
      { href: "/income", label: "Receitas", icon: TrendingUp },
      { href: "/expenses", label: "Despesas", icon: Receipt },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { href: "/goals", label: "Metas", icon: Target },
      { href: "/wishlist", label: "Wishlist", icon: Gift },
    ],
  },
  {
    label: "Patrimônio",
    items: [
      { href: "/investments", label: "Investimentos", icon: LineChart },
      { href: "/car", label: "Carro", icon: Car },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Configurações",
  icon: Settings,
};

export const APP_NAME = "Planner Financeiro";
export const APP_ICON = PiggyBank;

export function isRouteActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (href === "/") return normalized === "/";
  return normalized === href || normalized.startsWith(href + "/");
}

export function getPageTitle(pathname: string | null): string {
  const all = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];
  return all.find((item) => isRouteActive(pathname, item.href))?.label ?? APP_NAME;
}
