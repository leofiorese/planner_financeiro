"use client";

import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { APP_NAME, getPageTitle } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import BudgetHeaderIndicator from "@/components/budget/BudgetHeaderIndicator";

interface TopbarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMobileMenu: () => void;
}

/**
 * Barra superior: botão de menu (mobile), recolher sidebar (desktop) e breadcrumb da página.
 * As ações contextuais de cada página ficam no `PageHeader` (prop `actions`).
 */
export function Topbar({ collapsed, onToggleCollapsed, onOpenMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="glass-header sticky top-0 z-30 flex h-14 items-center gap-2 px-4 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileMenu}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        aria-pressed={collapsed}
        title={`${collapsed ? "Expandir" : "Recolher"} menu (Ctrl+B)`}
      >
        <CollapseIcon className="size-5" aria-hidden />
      </Button>

      <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
        <ol className="flex items-center gap-1.5">
          <li className="hidden text-muted-foreground sm:block">{APP_NAME}</li>
          <li aria-hidden className="hidden text-muted-foreground sm:block">
            /
          </li>
          <li className="truncate font-medium" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>

      <div className="ml-auto shrink-0">
        <BudgetHeaderIndicator />
      </div>
    </header>
  );
}
