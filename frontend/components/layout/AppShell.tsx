"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { InvestmentReminder } from "@/components/investments/InvestmentReminder";
import { AppSidebar, SidebarNav } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { readSidebarCollapsed, writeSidebarCollapsed } from "@/components/layout/sidebar-state";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

/**
 * Casca da aplicação: sidebar colapsável (desktop), Sheet (mobile), topbar e área principal.
 * O estado recolhido vive em `html[data-sidebar]` (ver `sidebar-state.ts`); aqui apenas o espelhamos
 * no React para o botão/atalho.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(readSidebarCollapsed());
  }, []);

  // Fecha o drawer ao trocar de rota.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      writeSidebarCollapsed(!prev);
      return !prev;
    });
  }, []);

  // Atalho Ctrl+B / Cmd+B
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  return (
    <div className="flex min-h-screen">
      <a
        href="#conteudo"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-[100] focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Pular para o conteúdo
      </a>
      <AppSidebar />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-0 p-0 lg:hidden" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SheetDescription className="sr-only">Navegue entre as páginas do aplicativo</SheetDescription>
          <SidebarNav forceExpanded onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
      <InvestmentReminder />
    </div>
  );
}
