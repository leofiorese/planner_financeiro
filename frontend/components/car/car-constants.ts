import type {
  FuelFormValues,
  MaintenanceFormValues,
  VehicleFormValues,
} from "@/components/car/car-types";
import { todayLocalISO } from "@/utils/dates";

export const FUEL_TYPES = [
  { value: "gasoline", label: "Gasolina Comum" },
  { value: "gasoline_premium", label: "Gasolina Aditivada / Premium" },
  { value: "ethanol", label: "Etanol" },
  { value: "diesel", label: "Diesel S10 / Comum" },
  { value: "cng", label: "GNV" },
  { value: "electric", label: "Elétrico (kWh)" },
];

export const MAINTENANCE_TYPES = [
  { value: "oil_change", label: "Troca de Óleo & Filtros" },
  { value: "tires", label: "Pneus & Alinhamento" },
  { value: "brakes", label: "Freios (Pastilhas / Discos)" },
  { value: "suspension", label: "Suspensão & Amortecedores" },
  { value: "battery", label: "Bateria & Sistema Elétrico" },
  { value: "revision", label: "Revisão Periódica" },
  { value: "insurance", label: "Seguro Automotivo" },
  { value: "ipva_taxes", label: "IPVA & Licenciamento" },
  { value: "car_wash", label: "Estética & Higienização" },
  { value: "ac_cooling", label: "Ar-condicionado & Climatização" },
  { value: "engine_transmission", label: "Motor & Câmbio" },
  { value: "other", label: "Outros Reparos" },
];

const NEUTRAL = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";

export function getMaintenanceBadge(type: string) {
  switch (type) {
    case "oil_change":
      return { label: "Óleo & Filtros", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60" };
    case "brakes":
      return { label: "Freios", bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60" };
    case "tires":
      return { label: "Pneus", bg: NEUTRAL };
    case "suspension":
      return { label: "Suspensão", bg: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/60" };
    case "battery":
      return { label: "Elétrica", bg: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200/80 dark:border-yellow-800/60" };
    case "revision":
      return { label: "Revisão", bg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60" };
    case "insurance":
    case "ipva_taxes":
      return { label: "Impostos/Seguro", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60" };
    default:
      return { label: MAINTENANCE_TYPES.find((m) => m.value === type)?.label || type, bg: NEUTRAL };
  }
}

export function getFuelBadge(fuelType: string) {
  switch (fuelType) {
    case "gasoline":
      return { label: "Gasolina Comum", bg: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200/80 dark:border-red-800/60" };
    case "gasoline_premium":
      return { label: "Aditivada", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60" };
    case "ethanol":
      return { label: "Etanol", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60" };
    case "diesel":
      return { label: "Diesel", bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60" };
    case "cng":
      return { label: "GNV", bg: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-800/60" };
    case "electric":
      return { label: "Elétrico", bg: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60" };
    default:
      return { label: fuelType, bg: NEUTRAL };
  }
}

const todayIso = todayLocalISO;

export const emptyVehicleForm = (): VehicleFormValues => ({
  name: "",
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  licensePlate: "",
  currentKm: 0,
  averageKmL: 0,
  notes: "",
});

export const emptyFuelForm = (vehicleId = ""): FuelFormValues => ({
  vehicleId,
  date: todayIso(),
  liters: 0,
  pricePerLiter: 0,
  totalCost: 0,
  odometer: 0,
  kmL: 0,
  fuelType: "gasoline",
  station: "",
  notes: "",
});

export const emptyMaintenanceForm = (vehicleId = ""): MaintenanceFormValues => ({
  vehicleId,
  date: todayIso(),
  type: "oil_change",
  description: "",
  cost: 0,
  odometer: 0,
  nextDate: "",
  nextOdometer: 0,
  nextKmInterval: 0,
  workshop: "",
  notes: "",
});
