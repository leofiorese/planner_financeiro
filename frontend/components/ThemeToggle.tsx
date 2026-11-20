"use client";

import React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const label = theme === "light" ? t("theme.toggle.dark") : t("theme.toggle.light");
  const Icon = theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors border border-border"
      title={`${label} (${theme})`}
      aria-label={`${label} (${theme})`}
    >
      <Icon className="size-4" />
    </button>
  );
}
