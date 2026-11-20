export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  currentKm: number;
  averageKmL: number;
  notes?: string;
  createdAt?: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometer: number;
  kmL?: number;
  fuelType: string;
  station?: string;
  notes?: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  date: string;
  type: string;
  description: string;
  cost: number;
  odometer?: number;
  nextDate?: string;
  nextOdometer?: number;
  nextKmInterval?: number;
  workshop?: string;
  notes?: string;
}

/** Valores editáveis do formulário de veículo. */
export type VehicleFormValues = Omit<Vehicle, "id" | "createdAt"> & { id?: string };

/** Valores editáveis do formulário de abastecimento. */
export type FuelFormValues = Omit<FuelLog, "id"> & { id?: string };

/** Valores editáveis do formulário de manutenção. */
export type MaintenanceFormValues = Omit<MaintenanceLog, "id"> & { id?: string };

export type CarEntity = "vehicle" | "fuelLog" | "maintenanceLog";
