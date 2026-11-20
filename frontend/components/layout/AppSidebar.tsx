"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeMenu } from "@/components/layout/ThemeMenu";
import {
  APP_ICON,
  APP_NAME,
  NAV_GROUPS,
  SETTINGS_ITEM,
  isRouteActive,
  type NavItem,
} from "@/components/layout/nav-items";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * Estilos do estado recolhido, baseados em `html[data-sidebar="collapsed"]` (aplicado por um
 * script inline antes da hidratação). Assim o estado recolhido vale já no primeiro paint e não
 * há layout shift. As classes são literais completas para o Tailwind conseguir detectá-las.
 */
const WHEN_COLLAPSED = {
  center: "[[data-sidebar=collapsed]_&]:justify-center [[data-sidebar=collapsed]_&]:px-0",
  hide: "[[data-sidebar=collapsed]_&]:hidden",
  srOnly: "[[data-sidebar=collapsed]_&]:sr-only",
  tooltip: "hidden [[data-sidebar=collapsed]_&]:block",
  centerFlex: "[[data-sidebar=collapsed]_&]:flex [[data-sidebar=collapsed]_&]:justify-center",
};

interface SidebarNavProps {
  /** `true` na versão mobile (Sheet): sempre expandida. */
  forceExpanded?: boolean;
  onNavigate?: () => void;
}

function SidebarLink({
  item,
  active,
  forceExpanded,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  forceExpanded?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors pointer-coarse:h-11",
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
        !forceExpanded && WHEN_COLLAPSED.center,
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
        />
      )}
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className={cn("truncate", !forceExpanded && WHEN_COLLAPSED.hide)}>{item.label}</span>
    </Link>
  );

  if (forceExpanded) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className={WHEN_COLLAPSED.tooltip}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

/** Conteúdo da sidebar, compartilhado entre o desktop (aside) e o mobile (Sheet). */
export function SidebarNav({ forceExpanded, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const Logo = APP_ICON;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b px-4",
          !forceExpanded && WHEN_COLLAPSED.center,
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg"
          aria-label={`${APP_NAME} - início`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Logo className="size-4" aria-hidden />
          </span>
          <span
            className={cn(
              "truncate text-sm font-semibold tracking-tight",
              !forceExpanded && WHEN_COLLAPSED.hide,
            )}
          >
            {APP_NAME}
          </span>
        </Link>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => item.enabled !== false);
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p
                className={cn(
                  "mb-1.5 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                  !forceExpanded && WHEN_COLLAPSED.srOnly,
                )}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    active={isRouteActive(pathname, item.href)}
                    forceExpanded={forceExpanded}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-0.5 border-t px-3 py-3">
        <SidebarLink
          item={SETTINGS_ITEM}
          active={isRouteActive(pathname, SETTINGS_ITEM.href)}
          forceExpanded={forceExpanded}
          onNavigate={onNavigate}
        />
        <ThemeMenu forceExpanded={forceExpanded} />
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside
      aria-label="Menu lateral"
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r bg-card lg:block",
        "w-64 transition-[width] duration-200 ease-out",
        "[[data-sidebar=collapsed]_&]:w-16",
      )}
    >
      <SidebarNav />
    </aside>
  );
}
