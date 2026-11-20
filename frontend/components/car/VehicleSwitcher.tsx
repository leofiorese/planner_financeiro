"use client";

import { SegmentedControl } from "@/components/common/SegmentedControl";
import type { Vehicle } from "@/components/car/car-types";

interface VehicleSwitcherProps {
  vehicles: Vehicle[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Seletor de veículo (só aparece com 2 ou mais). */
export function VehicleSwitcher({ vehicles, selectedId, onSelect }: VehicleSwitcherProps) {
  if (vehicles.length < 2) return null;
  return (
    <SegmentedControl
      aria-label="Veículo"
      value={selectedId}
      onValueChange={onSelect}
      options={vehicles.map((v) => ({
        value: v.id,
        label: v.licensePlate ? `${v.name} (${v.licensePlate})` : v.name,
      }))}
    />
  );
}
