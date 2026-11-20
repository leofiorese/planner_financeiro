"use client";

import { useEffect, useState } from "react";
import { todayLocalISO } from "@/utils/dates";

/**
 * Data de hoje (local, "YYYY-MM-DD") como estado, para o budget virar de dia sem
 * reload: reavalia quando a aba volta ao foco e a cada minuto.
 */
export function useTodayISO(): string {
  const [today, setToday] = useState<string>(() => todayLocalISO());

  useEffect(() => {
    const refresh = () => setToday(todayLocalISO());
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 60_000);
    // cobre a janela entre o primeiro render (SSR/hidratação) e o mount
    refresh();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
      window.clearInterval(interval);
    };
  }, []);

  return today;
}
