"use client";

import React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/context/ThemeContext";

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const label = theme === "light" ? "Alternar para modo escuro" : "Alternar para modo claro";
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
