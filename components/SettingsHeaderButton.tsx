"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function SettingsHeaderButton() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isActive = pathname?.startsWith("/settings");
  const title = language === "en" ? "System Settings" : "Configurações do Sistema";

  return (
    <Link
      href="/settings"
      title={title}
      aria-label={title}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isActive
          ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 shadow-xs"
          : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 border-slate-200/60 dark:border-slate-700/60"
      }`}
    >
      <span className="text-sm leading-none select-none" role="img" aria-hidden="true">
        ⚙️
      </span>
      <span className="hidden xl:inline">
        {language === "en" ? "Settings" : "Configurações"}
      </span>
    </Link>
  );
}
