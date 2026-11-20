"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CarEntity,
  FuelLog,
  MaintenanceLog,
  Vehicle,
} from "@/components/car/car-types";

/**
 * Dados do módulo Carro (`/api/car`): carregamento, seleção de veículo, salvar e excluir.
 * Salvar/excluir lançam erro quando a API falha; quem chama exibe o toast.
 */
export function useCarData() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/car");
      if (!res.ok) throw new Error("Falha ao carregar dados do carro");
      const data = await res.json();
      const loadedVehicles: Vehicle[] = data.vehicles || [];
      setVehicles(loadedVehicles);
      setFuelLogs(data.fuelLogs || []);
      setMaintenanceLogs(data.maintenanceLogs || []);
      setError(null);
      if (loadedVehicles.length > 0) {
        setSelectedVehicleId((prev) =>
          prev && loadedVehicles.some((v) => v.id === prev) ? prev : loadedVehicles[0].id,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados do carro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const retry = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  const save = useCallback(
    async (type: CarEntity, data: object) => {
      const res = await fetch("/api/car", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (!res.ok) throw new Error("Erro ao salvar dados");
      await loadData();
    },
    [loadData],
  );

  const remove = useCallback(
    async (type: CarEntity, id: string) => {
      const res = await fetch(`/api/car?type=${type}&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir registro");
      await loadData();
    },
    [loadData],
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId),
    [vehicles, selectedVehicleId],
  );

  const vehicleFuelLogs = useMemo(
    () =>
      fuelLogs
        .filter((f) => f.vehicleId === selectedVehicleId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [fuelLogs, selectedVehicleId],
  );

  const vehicleMaintenanceLogs = useMemo(
    () =>
      maintenanceLogs
        .filter((m) => m.vehicleId === selectedVehicleId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [maintenanceLogs, selectedVehicleId],
  );

  return {
    vehicles,
    selectedVehicle,
    selectedVehicleId,
    setSelectedVehicleId,
    vehicleFuelLogs,
    vehicleMaintenanceLogs,
    loading,
    error,
    retry,
    save,
    remove,
  };
}

export type CarData = ReturnType<typeof useCarData>;
