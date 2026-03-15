"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

const navItems = [
  { href: "/",            key: "nav.dashboard",    icon: "⊞",  label: "Painel" },
  { href: "/income",      key: "nav.income",       icon: "↑",  label: "Renda" },
  { href: "/expenses",    key: "nav.expenses",     icon: "↓",  label: "Despesas" },
  { href: "/car",         key: "nav.car",          icon: "🚗", label: "Meu Carro" },
  { href: "/goals",       key: "nav.goals",        icon: "◎",  label: "Metas" },
  { href: "/forecast",    key: "nav.forecast",     icon: "⟳",  label: "Previsão" },
  { href: "/goal-plan",   key: "nav.goalPlanning", icon: "▦",  label: "Planejamento" },
  { href: "/import-export", key: "nav.importExport", icon: "⇅", label: "Import" },
];

export default function Navigation() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setIsMobileOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop nav ─────────────────────────────────────────────────────── */}
      <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all duration-200 group whitespace-nowrap
                ${active
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/70 dark:hover:bg-gray-700/50"
                }
              `}
            >
              <span className={`text-xs leading-none transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                {item.icon}
              </span>
              <span>{t(item.key)}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile hamburger ────────────────────────────────────────────────── */}
      <button
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setIsMobileOpen(true)}
        aria-label={t("nav.toggleMenu")}
        aria-expanded={isMobileOpen}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute top-0 right-0 h-full w-72 bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">FP</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Finance Planner</span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t("nav.closeMenu")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Drawer links */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${active
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                      }
                    `}
                  >
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors
                      ${active
                        ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{t(item.key)}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </Link>
                );
              })}
            </nav>
            {/* Drawer footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-600">Finance Planner © 2026</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
