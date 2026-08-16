"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface NavItemDef {
  href: string;
  key: string;
  icon: (active: boolean) => React.ReactNode;
}

const navItems: NavItemDef[] = [
  {
    href: "/",
    key: "nav.dashboard",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/income",
    key: "nav.income",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-5 5m5-5l5 5" />
      </svg>
    ),
  },
  {
    href: "/expenses",
    key: "nav.expenses",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5" />
      </svg>
    ),
  },
  {
    href: "/cards",
    key: "nav.cards",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    href: "/car",
    key: "nav.car",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M3 13a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2z" />
      </svg>
    ),
  },
  {
    href: "/wishlist",
    key: "nav.wishlist",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    href: "/goals",
    key: "nav.goals",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/forecast",
    key: "nav.forecast",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16M20 4v16" />
      </svg>
    ),
  },
  {
    href: "/goal-plan",
    key: "nav.goalPlanning",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/import-export",
    key: "nav.importExport",
    icon: (active) => (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
];

export default function Navigation() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Track scroll state for fade indicators
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  // Scroll active item into view on mount / pathname change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeLink = el.querySelector("[data-active='true']") as HTMLElement;
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    const timer = setTimeout(updateScrollState, 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop nav ──────────────────────────────────────── */}
      <nav className="hidden lg:block relative" aria-label="Main navigation">
        {/* Left fade indicator */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-white dark:from-slate-900 to-transparent" />
        )}
        {/* Right fade indicator */}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-white dark:from-slate-900 to-transparent" />
        )}

        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                className={`
                  relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                  transition-all duration-150 group whitespace-nowrap shrink-0
                  ${active
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/60 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                  }
                `}
              >
                <span className={`transition-transform duration-150 ${active ? "scale-105" : "group-hover:scale-105"}`}>
                  {item.icon(active)}
                </span>
                <span>{t(item.key)}</span>
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile hamburger ────────────────────────────────────────────── */}
      <button
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        onClick={() => setIsMobileOpen(true)}
        aria-label={t("nav.toggleMenu")}
        aria-expanded={isMobileOpen}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute top-0 right-0 h-full w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
                  <span className="text-white text-xs font-bold tracking-tight">FP</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Finance Planner</span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={t("nav.closeMenu")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer links */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${active
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }
                    `}
                  >
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors
                      ${active
                        ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {item.icon(active)}
                    </span>
                    <span>{t(item.key)}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer footer */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 dark:text-slate-500">Finance Planner workstation © 2026</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
