"use client";

import { Fuel, Gauge, Route, Wallet, Wrench } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import type { FuelLog, MaintenanceLog, Vehicle } from "@/components/car/car-types";
import type { CarStatsData } from "@/components/car/hooks/useCarStats";
import { formatCurrency } from "@/utils/format";

interface CarStatsProps {
  vehicle: Vehicle;
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  stats: CarStatsData;
}

export function CarStats({ vehicle, fuelLogs, maintenanceLogs, stats }: CarStatsProps) {
  const { currentMonthFuelLogs, monthlyFuelCost, avgKmL, totalMaintenanceCost, totalTransportMonthly, transportExpenses } =
    stats;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label="Combustível (mês atual)"
        value={formatCurrency(monthlyFuelCost)}
        hint={`${currentMonthFuelLogs.length} ${currentMonthFuelLogs.length === 1 ? "abastecimento" : "abastecimentos"}`}
        icon={Fuel}
      />
      <StatCard
        label="Média de consumo real"
        value={avgKmL > 0 ? `${avgKmL.toFixed(2)} km/L` : "—"}
        hint={fuelLogs.some((f) => f.kmL) ? "Histórico apurado" : `Estimado: ${vehicle.averageKmL} km/L`}
        icon={Gauge}
        tone="income"
      />
      <StatCard
        label="Total em manutenções"
        value={formatCurrency(totalMaintenanceCost)}
        hint={`${maintenanceLogs.length} ${maintenanceLogs.length === 1 ? "serviço" : "serviços"} no histórico`}
        icon={Wrench}
      />
      <StatCard
        label="Transporte (plano mensal)"
        value={formatCurrency(totalTransportMonthly)}
        hint={`${transportExpenses.length} ${transportExpenses.length === 1 ? "despesa" : "despesas"} em Despesas`}
        icon={Wallet}
        tone="primary"
      />
      <StatCard
        label="Odômetro atual"
        value={vehicle.currentKm > 0 ? `${vehicle.currentKm.toLocaleString("pt-BR")} km` : "—"}
        hint={`${vehicle.brand} ${vehicle.model}`}
        icon={Route}
      />
    </div>
  );
}
