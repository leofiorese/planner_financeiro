"use client";

import { useMemo } from "react";
import { useFinancialState } from "@/context";
import { ExpenseCategory } from "@/types";
import { calculateMonthlyAmount } from "@/utils/expenseOperations";
import type { FuelLog, MaintenanceLog, Vehicle } from "@/components/car/car-types";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Indicadores derivados do veículo selecionado e das despesas de transporte do plano. */
export function useCarStats(
  vehicle: Vehicle | undefined,
  fuelLogs: FuelLog[],
  maintenanceLogs: MaintenanceLog[],
) {
  const state = useFinancialState();

  const transportExpenses = useMemo(
    () =>
      state.userPlan.expenses.filter((e) => e.category === ExpenseCategory.TRANSPORTATION && e.isActive),
    [state.userPlan.expenses],
  );

  const totalTransportMonthly = useMemo(
    () => transportExpenses.reduce((s, e) => s + calculateMonthlyAmount(e), 0),
    [transportExpenses],
  );

  const kmlChartData = useMemo(
    () => fuelLogs.filter((f) => f.kmL && f.kmL > 0).slice(-12).reverse().map((f) => f.kmL!),
    [fuelLogs],
  );

  const currentMonthFuelLogs = useMemo(() => {
    const now = new Date();
    return fuelLogs.filter((f) => {
      const d = new Date(f.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [fuelLogs]);

  const monthlyFuelCost = useMemo(
    () => currentMonthFuelLogs.reduce((s, f) => s + f.totalCost, 0),
    [currentMonthFuelLogs],
  );

  const totalMaintenanceCost = useMemo(
    () => maintenanceLogs.reduce((s, m) => s + m.cost, 0),
    [maintenanceLogs],
  );

  const avgKmL = useMemo(() => {
    const withKml = fuelLogs.filter((f) => f.kmL && f.kmL > 0);
    if (withKml.length === 0) return vehicle?.averageKmL || 0;
    return withKml.reduce((s, f) => s + f.kmL!, 0) / withKml.length;
  }, [fuelLogs, vehicle]);

  const upcomingMaintenance = useMemo(() => {
    const today = new Date();
    return maintenanceLogs.filter((m) => {
      if (m.nextDate) {
        const d = new Date(m.nextDate);
        const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 45; // próximas em até 45 dias, ou vencidas
      }
      if (m.nextOdometer && vehicle) {
        return m.nextOdometer - vehicle.currentKm <= 1500;
      }
      return false;
    });
  }, [maintenanceLogs, vehicle]);

  const fuelMonthlyChart = useMemo(() => {
    const months: Record<string, number> = {};
    fuelLogs.forEach((f) => {
      const key = f.date.slice(0, 7);
      months[key] = (months[key] || 0) + f.totalCost;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, v]) => {
        const [year, month] = k.split("-");
        const mIdx = parseInt(month, 10) - 1;
        const name = mIdx >= 0 && mIdx < 12 ? `${MONTH_NAMES[mIdx]}/${year.slice(2)}` : k;
        return { name, value: v };
      });
  }, [fuelLogs]);

  return {
    transportExpenses,
    totalTransportMonthly,
    kmlChartData,
    currentMonthFuelLogs,
    monthlyFuelCost,
    totalMaintenanceCost,
    avgKmL,
    upcomingMaintenance,
    fuelMonthlyChart,
  };
}

export type CarStatsData = ReturnType<typeof useCarStats>;
