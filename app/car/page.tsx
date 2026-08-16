/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useFinancialState } from "@/context";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import { ExpenseCategory } from "@/types";
import { calculateMonthlyAmount } from "@/utils/expenseOperations";
import { formatDateDDMMYYYY } from "@/utils/dateFormatting";
import { ExpenseCategoryIcon } from "@/components/CategoryIcon";
import DatePicker from "@/components/DatePicker";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Vehicle {
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

interface FuelLog {
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

interface MaintenanceLog {
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

const FUEL_TYPES = [
  { value: "gasoline", label: "Gasolina Comum" },
  { value: "gasoline_premium", label: "Gasolina Aditivada / Premium" },
  { value: "ethanol", label: "Etanol" },
  { value: "diesel", label: "Diesel S10 / Comum" },
  { value: "cng", label: "GNV" },
  { value: "electric", label: "Elétrico (kWh)" },
];

const MAINTENANCE_TYPES = [
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

const getMaintenanceBadge = (type: string) => {
  switch (type) {
    case "oil_change":
      return { label: "Óleo & Filtros", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60" };
    case "brakes":
      return { label: "Freios", bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60" };
    case "tires":
      return { label: "Pneus", bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
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
      return { label: MAINTENANCE_TYPES.find((m) => m.value === type)?.label || type, bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
  }
};

const getFuelBadge = (fuelType: string) => {
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
      return { label: fuelType, bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
  }
};

// ─── Sparkline Component ─────────────────────────────────────────────────────
function Sparkline({ data, color = "#6366f1", height = 48 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 220;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 12) + 6;
    const y = h - ((v - min) / range) * (h - 14) - 7;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="w-full flex justify-center py-1">
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
        />
      </svg>
    </div>
  );
}

// ─── BarChart Component ──────────────────────────────────────────────────────
function BarChart({
  data,
  formatValue,
  color = "#6366f1",
}: {
  data: { name: string; value: number }[];
  formatValue: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-400">
        Nenhum registro no período.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-16 truncate" title={item.name}>
            {item.name}
          </span>
          <div className="flex-1 bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(6, (item.value / max) * 100))}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100 min-w-[70px] text-right">
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CarPage() {
  const state = useFinancialState();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "fuel" | "maintenance" | "expenses">("overview");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingFuel, setEditingFuel] = useState<FuelLog | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceLog | null>(null);

  const emptyVehicle = { name: "", brand: "", model: "", year: new Date().getFullYear(), licensePlate: "", currentKm: 0, averageKmL: 0, notes: "" };
  const emptyFuel = { vehicleId: "", date: new Date().toISOString().split("T")[0], liters: 0, pricePerLiter: 0, totalCost: 0, odometer: 0, kmL: 0, fuelType: "gasoline", station: "", notes: "" };
  const emptyMaint = { vehicleId: "", date: new Date().toISOString().split("T")[0], type: "oil_change", description: "", cost: 0, odometer: 0, nextDate: "", nextOdometer: 0, nextKmInterval: 0, workshop: "", notes: "" };

  const [vehicleForm, setVehicleForm] = useState<any>(emptyVehicle);
  const [fuelForm, setFuelForm] = useState<any>(emptyFuel);
  const [maintenanceForm, setMaintenanceForm] = useState<any>(emptyMaint);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/car");
      if (!res.ok) throw new Error("Falha ao carregar dados do carro");
      const data = await res.json();
      const loadedVehicles = data.vehicles || [];
      setVehicles(loadedVehicles);
      setFuelLogs(data.fuelLogs || []);
      setMaintenanceLogs(data.maintenanceLogs || []);
      if (loadedVehicles.length > 0) {
        setSelectedVehicleId((prev) => {
          if (prev && loadedVehicles.some((v: Vehicle) => v.id === prev)) {
            return prev;
          }
          return loadedVehicles[0].id;
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
  const vehicleFuelLogs = useMemo(() => fuelLogs.filter((f) => f.vehicleId === selectedVehicleId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [fuelLogs, selectedVehicleId]);
  const vehicleMaintenanceLogs = useMemo(() => maintenanceLogs.filter((m) => m.vehicleId === selectedVehicleId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [maintenanceLogs, selectedVehicleId]);

  const transportExpenses = useMemo(() =>
    state.userPlan.expenses.filter((e) => e.category === ExpenseCategory.TRANSPORTATION && e.isActive),
    [state.userPlan.expenses]
  );

  const totalTransportMonthly = useMemo(() =>
    transportExpenses.reduce((s, e) => s + calculateMonthlyAmount(e), 0),
    [transportExpenses]
  );

  const kmlChartData = useMemo(() =>
    vehicleFuelLogs.filter((f) => f.kmL && f.kmL > 0).slice(-12).reverse().map((f) => f.kmL!),
    [vehicleFuelLogs]
  );

  const currentMonthFuelLogs = useMemo(() => {
    const now = new Date();
    return vehicleFuelLogs.filter((f) => {
      const d = new Date(f.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [vehicleFuelLogs]);

  const monthlyFuelCost = useMemo(() => {
    return currentMonthFuelLogs.reduce((s, f) => s + f.totalCost, 0);
  }, [currentMonthFuelLogs]);

  const totalMaintenanceCost = useMemo(() =>
    vehicleMaintenanceLogs.reduce((s, m) => s + m.cost, 0),
    [vehicleMaintenanceLogs]
  );

  const avgKmL = useMemo(() => {
    const with_kml = vehicleFuelLogs.filter((f) => f.kmL && f.kmL > 0);
    if (with_kml.length === 0) return selectedVehicle?.averageKmL || 0;
    return with_kml.reduce((s, f) => s + f.kmL!, 0) / with_kml.length;
  }, [vehicleFuelLogs, selectedVehicle]);

  const upcomingMaintenance = useMemo(() => {
    const today = new Date();
    return vehicleMaintenanceLogs.filter((m) => {
      if (m.nextDate) {
        const d = new Date(m.nextDate);
        const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 45; // Upcoming within 45 days or overdue
      }
      if (m.nextOdometer && selectedVehicle) {
        return (m.nextOdometer - selectedVehicle.currentKm) <= 1500;
      }
      return false;
    });
  }, [vehicleMaintenanceLogs, selectedVehicle]);

  const fuelMonthlyChart = useMemo(() => {
    const months: Record<string, number> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    vehicleFuelLogs.forEach((f) => {
      const key = f.date.slice(0, 7);
      months[key] = (months[key] || 0) + f.totalCost;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, v]) => {
        const [year, month] = k.split("-");
        const mIdx = parseInt(month, 10) - 1;
        const name = mIdx >= 0 && mIdx < 12 ? `${monthNames[mIdx]}/${year.slice(2)}` : k;
        return { name, value: v };
      });
  }, [vehicleFuelLogs]);

  const apiSave = async (type: string, data: any) => {
    setSaving(true);
    try {
      const res = await fetch("/api/car", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (!res.ok) throw new Error("Erro ao salvar dados");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const apiDelete = async (type: string, id: string, namePrompt?: string) => {
    const msg = namePrompt
      ? `Tem certeza que deseja excluir ${namePrompt}?`
      : "Tem certeza que deseja excluir este registro?";
    if (!confirm(msg)) return;
    await fetch(`/api/car?type=${type}&id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiSave("vehicle", editingVehicle ? { ...vehicleForm, id: editingVehicle.id } : vehicleForm);
    setShowVehicleForm(false);
    setEditingVehicle(null);
    setVehicleForm(emptyVehicle);
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...fuelForm, vehicleId: selectedVehicleId };
    await apiSave("fuelLog", editingFuel ? { ...data, id: editingFuel.id } : data);
    setShowFuelForm(false);
    setEditingFuel(null);
    setFuelForm(emptyFuel);
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...maintenanceForm, vehicleId: selectedVehicleId };
    await apiSave("maintenanceLog", editingMaintenance ? { ...data, id: editingMaintenance.id } : data);
    setShowMaintenanceForm(false);
    setEditingMaintenance(null);
    setMaintenanceForm(emptyMaint);
  };

  useEffect(() => {
    if (fuelForm.liters && fuelForm.pricePerLiter) {
      setFuelForm((p: any) => ({ ...p, totalCost: +(fuelForm.liters * fuelForm.pricePerLiter).toFixed(2) }));
    }
  }, [fuelForm.liters, fuelForm.pricePerLiter]);

  const fmtDate = (val?: string | null): string => {
    if (!val) return "—";
    return formatDateDDMMYYYY(val) || "—";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Carregando dados do veículo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Executive Vehicle Header ─────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M3 13a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>Meu Carro & Veículos</span>
              {selectedVehicle && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70">
                  {selectedVehicle.licensePlate || `${selectedVehicle.brand} ${selectedVehicle.model}`}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Telemetria de abastecimentos, manutenções preventivas e controle de custo por km
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Multi-vehicle segmented selector if 2+ vehicles */}
          {vehicles.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              {vehicles.map((v) => {
                const isSelected = v.id === selectedVehicleId;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-600/80"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{v.name}</span>
                    {v.licensePlate && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                        ({v.licensePlate})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => {
              setEditingVehicle(null);
              setVehicleForm(emptyVehicle);
              setShowVehicleForm(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Adicionar Veículo</span>
          </button>
        </div>
      </div>

      {/* ── Maintenance Alerts Ribbon ────────────────────────────────── */}
      {upcomingMaintenance.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/70 flex items-start gap-3 shadow-2xs">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <span>Alerta de Manutenções e Revisões Próximas</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold">
                {upcomingMaintenance.length} {upcomingMaintenance.length === 1 ? "alerta" : "alertas"}
              </span>
            </h4>
            <ul className="mt-1.5 space-y-1 text-xs text-amber-800 dark:text-amber-300">
              {upcomingMaintenance.map((m) => {
                const badge = getMaintenanceBadge(m.type);
                return (
                  <li key={m.id} className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">• {badge.label}:</span>
                    <span>{m.description}</span>
                    {m.nextDate && (
                      <span className="font-semibold underline">
                        até {fmtDate(m.nextDate)}
                      </span>
                    )}
                    {m.nextOdometer && (
                      <span className="text-amber-700 dark:text-amber-400">
                        (ou até {m.nextOdometer.toLocaleString("pt-BR")} km)
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* ── KPI Telemetry Row ────────────────────────────────────────── */}
      {selectedVehicle && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="surface-card p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Combustível (Mês Atual)</span>
            <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {formatCurrency(monthlyFuelCost)}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              {currentMonthFuelLogs.length} {currentMonthFuelLogs.length === 1 ? "abastecimento" : "abastecimentos"}
            </div>
          </div>

          <div className="surface-card p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Média Consumo Real</span>
            <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {avgKmL > 0 ? `${avgKmL.toFixed(2)} km/L` : "—"}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              {vehicleFuelLogs.filter((f) => f.kmL).length > 0 ? "Histórico apurado" : `Estimado: ${selectedVehicle.averageKmL} km/L`}
            </div>
          </div>

          <div className="surface-card p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total em Manutenções</span>
            <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {formatCurrency(totalMaintenanceCost)}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              {vehicleMaintenanceLogs.length} {vehicleMaintenanceLogs.length === 1 ? "serviço" : "serviços"} no histórico
            </div>
          </div>

          <div className="surface-card p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Transporte (Plano Mensal)</span>
            <div className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1">
              {formatCurrency(totalTransportMonthly)}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              {transportExpenses.length} {transportExpenses.length === 1 ? "despesa" : "despesas"} no Ledger
            </div>
          </div>

          <div className="surface-card p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Odômetro Atual</span>
            <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {selectedVehicle.currentKm > 0 ? `${selectedVehicle.currentKm.toLocaleString("pt-BR")} km` : "—"}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">
              {selectedVehicle.brand} {selectedVehicle.model}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs Navigation & Surface ────────────────────────────────── */}
      <div className="surface-card overflow-hidden">
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 px-4 bg-slate-50/80 dark:bg-slate-900/60 overflow-x-auto scrollbar-none">
          {[
            { key: "overview", label: "Visão Geral" },
            { key: "fuel", label: `Abastecimentos (${vehicleFuelLogs.length})` },
            { key: "maintenance", label: `Manutenções (${vehicleMaintenanceLogs.length})` },
            { key: "expenses", label: `Despesas Transporte (${transportExpenses.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 shadow-2xs"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {!selectedVehicle ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M3 13a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Nenhum veículo cadastrado
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                    Cadastre seu veículo para registrar abastecimentos, manutenções preventivas e calcular o custo real de rodagem.
                  </p>
                  <button
                    onClick={() => {
                      setEditingVehicle(null);
                      setVehicleForm(emptyVehicle);
                      setShowVehicleForm(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    + Cadastrar Veículo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Vehicle Details Card */}
                  <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 shadow-2xs space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {selectedVehicle.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year ? `(${selectedVehicle.year})` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setVehicleForm({ ...selectedVehicle });
                            setEditingVehicle(selectedVehicle);
                            setShowVehicleForm(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                        >
                          Editar
                        </button>
                        {vehicles.length > 1 && (
                          <button
                            onClick={() => apiDelete("vehicle", selectedVehicle.id, selectedVehicle.name)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Excluir veículo"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Marca / Fabricante</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedVehicle.brand || "—"}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Modelo</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedVehicle.model || "—"}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Ano de Fabricação</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedVehicle.year || "—"}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Placa do Veículo</span>
                        <p className="font-semibold font-mono text-slate-800 dark:text-slate-200 mt-0.5">{selectedVehicle.licensePlate || "—"}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Odômetro Atual</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 tabular-nums">
                          {selectedVehicle.currentKm > 0 ? `${selectedVehicle.currentKm.toLocaleString("pt-BR")} km` : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Consumo Estimado</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 tabular-nums">
                          {selectedVehicle.averageKmL > 0 ? `${selectedVehicle.averageKmL} km/L` : "—"}
                        </p>
                      </div>
                    </div>

                    {selectedVehicle.notes && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Observações:</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 italic">{selectedVehicle.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* KmL Sparkline Card */}
                  <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Evolução de Consumo (km/L)
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Últimos abastecimentos
                        </span>
                      </div>
                      {kmlChartData.length > 1 ? (
                        <div className="space-y-3">
                          <Sparkline data={kmlChartData} color="#6366f1" height={56} />
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-center">
                            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Mínimo</span>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                {Math.min(...kmlChartData).toFixed(1)} km/L
                              </p>
                            </div>
                            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Médio Real</span>
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {avgKmL.toFixed(1)} km/L
                              </p>
                            </div>
                            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Máximo</span>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                {Math.max(...kmlChartData).toFixed(1)} km/L
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Registre pelo menos 2 abastecimentos com odômetro para calcular o consumo real (km/L).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly Fuel Chart */}
                  <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 shadow-2xs space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Gasto Mensal com Combustível
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Últimos 6 meses
                      </span>
                    </div>
                    <BarChart
                      data={fuelMonthlyChart}
                      formatValue={(v) => formatCurrency(v)}
                      color="#6366f1"
                    />
                  </div>

                  {/* Transportation Summary Box */}
                  <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/80 dark:border-slate-700/60">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Despesas de Transporte (Plano Geral)
                        </h3>
                        <span className="text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(totalTransportMonthly)} / mês
                        </span>
                      </div>
                      <div className="space-y-2 mt-3">
                        {transportExpenses.length === 0 ? (
                          <p className="text-xs text-slate-400 py-4 text-center">
                            Nenhuma despesa de transporte cadastrada no Ledger.
                          </p>
                        ) : (
                          transportExpenses.slice(0, 4).map((e) => (
                            <div key={e.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/50 dark:border-slate-700/40 last:border-0">
                              <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">
                                {e.name}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                {formatCurrency(calculateMonthlyAmount(e))} / mês
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="pt-2">
                      <Link
                        href="/expenses"
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>Gerenciar todas as despesas no Ledger</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FUEL TAB ────────────────────────────────────────────────── */}
          {activeTab === "fuel" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Histórico de Abastecimentos ({vehicleFuelLogs.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Registre os abastecimentos para cálculo automático de km/L e custo por litro
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingFuel(null);
                    setFuelForm({ ...emptyFuel, vehicleId: selectedVehicleId });
                    setShowFuelForm(true);
                  }}
                  disabled={!selectedVehicleId}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ Novo Abastecimento</span>
                </button>
              </div>

              {/* Fuel Form (Inline Card) */}
              {showFuelForm && (
                <div className="p-5 rounded-xl border border-indigo-200/90 dark:border-indigo-800/70 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      {editingFuel ? "Editar Registro de Abastecimento" : "Registrar Novo Abastecimento"}
                    </h4>
                    <button
                      onClick={() => setShowFuelForm(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      ✕ Fechar
                    </button>
                  </div>
                  <form onSubmit={handleFuelSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Data do Abastecimento *
                      </label>
                      <DatePicker
                        required
                        value={fuelForm.date}
                        onChange={(val) => setFuelForm((p: any) => ({ ...p, date: val }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tipo de Combustível *
                      </label>
                      <select
                        value={fuelForm.fuelType}
                        onChange={(e) => setFuelForm((p: any) => ({ ...p, fuelType: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        {FUEL_TYPES.map((ft) => (
                          <option key={ft.value} value={ft.value}>{ft.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Litros Abastecidos *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="Ex: 45.5"
                        value={fuelForm.liters || ""}
                        onChange={(e) => setFuelForm((p: any) => ({ ...p, liters: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold tabular-nums focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Preço por Litro (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.01"
                        required
                        placeholder="Ex: 5.89"
                        value={fuelForm.pricePerLiter || ""}
                        onChange={(e) => setFuelForm((p: any) => ({ ...p, pricePerLiter: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold tabular-nums focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Valor Total (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="Ex: 268.00"
                        value={fuelForm.totalCost || ""}
                        onChange={(e) => setFuelForm((p: any) => ({ ...p, totalCost: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold tabular-nums focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Odômetro Atual (km)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 45200"
                        value={fuelForm.odometer || ""}
                        onChange={(e) => setFuelForm((p: any) => ({ ...p, odometer: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs tabular-nums focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Posto / Estabelecimento
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Posto Shell - Av. Paulista"
                        value={fuelForm.station || ""}
                        onChange={(e) => setFuelForm((p: any) => ({ ...p, station: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Observações
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Tanque cheio"
                        value={fuelForm.notes || ""}
                        onChange={(e) => setFuelForm((p: any) => ({ ...p, notes: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowFuelForm(false)}
                        className="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        {saving ? "Salvando..." : editingFuel ? "Salvar Alterações" : "Registrar Abastecimento"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Fuel Table */}
              {vehicleFuelLogs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Nenhum abastecimento registrado para este veículo.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clique em &quot;+ Novo Abastecimento&quot; para começar a controlar o consumo.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-left font-semibold">
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-3">Combustível</th>
                        <th className="py-3 px-3">Litros</th>
                        <th className="py-3 px-3">Preço / L</th>
                        <th className="py-3 px-3">Valor Total</th>
                        <th className="py-3 px-3">Odômetro</th>
                        <th className="py-3 px-3">Consumo</th>
                        <th className="py-3 px-3">Posto / Obs</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 bg-white dark:bg-slate-900/40">
                      {vehicleFuelLogs.map((f) => {
                        const badge = getFuelBadge(f.fuelType);
                        return (
                          <tr key={f.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {fmtDate(f.date)}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                              {f.liters.toFixed(2)} L
                            </td>
                            <td className="py-3 px-3 tabular-nums text-slate-600 dark:text-slate-300">
                              {formatCurrency(f.pricePerLiter)}
                            </td>
                            <td className="py-3 px-3 font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(f.totalCost)}
                            </td>
                            <td className="py-3 px-3 tabular-nums text-slate-700 dark:text-slate-300">
                              {f.odometer ? `${f.odometer.toLocaleString("pt-BR")} km` : "—"}
                            </td>
                            <td className="py-3 px-3">
                              {f.kmL && f.kmL > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 tabular-nums">
                                  {f.kmL.toFixed(1)} km/L
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[140px]" title={f.station || f.notes}>
                              {f.station || f.notes || "—"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingFuel(f);
                                    setFuelForm({ ...f });
                                    setShowFuelForm(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                  title="Editar abastecimento"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => apiDelete("fuelLog", f.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                  title="Excluir abastecimento"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── MAINTENANCE TAB ─────────────────────────────────────────── */}
          {activeTab === "maintenance" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Histórico de Manutenções & Serviços ({vehicleMaintenanceLogs.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Controle trocas de óleo, pneus, freios e agendamento das próximas revisões
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingMaintenance(null);
                    setMaintenanceForm({ ...emptyMaint, vehicleId: selectedVehicleId });
                    setShowMaintenanceForm(true);
                  }}
                  disabled={!selectedVehicleId}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ Nova Manutenção</span>
                </button>
              </div>

              {/* Maintenance Form (Inline Card) */}
              {showMaintenanceForm && (
                <div className="p-5 rounded-xl border border-indigo-200/90 dark:border-indigo-800/70 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      {editingMaintenance ? "Editar Registro de Manutenção" : "Registrar Nova Manutenção"}
                    </h4>
                    <button
                      onClick={() => setShowMaintenanceForm(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      ✕ Fechar
                    </button>
                  </div>
                  <form onSubmit={handleMaintenanceSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Data do Serviço *
                      </label>
                      <DatePicker
                        required
                        value={maintenanceForm.date}
                        onChange={(val) => setMaintenanceForm((p: any) => ({ ...p, date: val }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tipo de Manutenção *
                      </label>
                      <select
                        required
                        value={maintenanceForm.type}
                        onChange={(e) => setMaintenanceForm((p: any) => ({ ...p, type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                      >
                        {MAINTENANCE_TYPES.map((mt) => (
                          <option key={mt.value} value={mt.value}>{mt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Custo do Serviço (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="Ex: 450.00"
                        value={maintenanceForm.cost || ""}
                        onChange={(e) => setMaintenanceForm((p: any) => ({ ...p, cost: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold tabular-nums focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Descrição do Serviço Realizado *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Troca de óleo 5W30, filtro de óleo e filtro de ar"
                        value={maintenanceForm.description || ""}
                        onChange={(e) => setMaintenanceForm((p: any) => ({ ...p, description: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Odômetro no Serviço (km)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 45000"
                        value={maintenanceForm.odometer || ""}
                        onChange={(e) => setMaintenanceForm((p: any) => ({ ...p, odometer: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs tabular-nums focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Oficina / Estabelecimento
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Concessionária / Bosch Car"
                        value={maintenanceForm.workshop || ""}
                        onChange={(e) => setMaintenanceForm((p: any) => ({ ...p, workshop: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Próxima Revisão (Data Prevista)
                      </label>
                      <DatePicker
                        value={maintenanceForm.nextDate || ""}
                        onChange={(val) => setMaintenanceForm((p: any) => ({ ...p, nextDate: val }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Próxima Revisão (Odômetro Previsto)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 55000"
                        value={maintenanceForm.nextOdometer || ""}
                        onChange={(e) => setMaintenanceForm((p: any) => ({ ...p, nextOdometer: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs tabular-nums focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowMaintenanceForm(false)}
                        className="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        {saving ? "Salvando..." : editingMaintenance ? "Salvar Alterações" : "Registrar Manutenção"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Maintenance Cards List */}
              {vehicleMaintenanceLogs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Nenhuma manutenção registrada para este veículo.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clique em &quot;+ Nova Manutenção&quot; para registrar trocas de óleo, revisões ou reparos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicleMaintenanceLogs.map((m) => {
                    const badge = getMaintenanceBadge(m.type);
                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {m.description}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-4 flex-wrap font-medium">
                            <span className="flex items-center gap-1">
                              <strong>Data:</strong> {fmtDate(m.date)}
                            </span>
                            {m.odometer && (
                              <span className="flex items-center gap-1">
                                <strong>Odômetro:</strong> {m.odometer.toLocaleString("pt-BR")} km
                              </span>
                            )}
                            {m.workshop && (
                              <span className="flex items-center gap-1">
                                <strong>Oficina:</strong> {m.workshop}
                              </span>
                            )}
                            {(m.nextDate || m.nextOdometer) && (
                              <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                                <strong>Próxima:</strong> {m.nextDate ? fmtDate(m.nextDate) : ""}{m.nextDate && m.nextOdometer ? " / " : ""}{m.nextOdometer ? `${m.nextOdometer.toLocaleString("pt-BR")} km` : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/40">
                          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                            {formatCurrency(m.cost)}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingMaintenance(m);
                                setMaintenanceForm({ ...m });
                                setShowMaintenanceForm(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                              title="Editar manutenção"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => apiDelete("maintenanceLog", m.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="Excluir manutenção"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── EXPENSES TAB ────────────────────────────────────────────── */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Despesas de Transporte Vinculadas ao Plano
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Todas as despesas da categoria Transporte registradas no Ledger financeiro
                  </p>
                </div>
                <Link
                  href="/expenses"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  Gerenciar no Ledger →
                </Link>
              </div>

              {transportExpenses.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Nenhuma despesa de transporte ativa encontrada.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cadastre despesas como Seguro, IPVA, Estacionamento ou Financiamento na página de Despesas.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 overflow-hidden shadow-2xs">
                  {transportExpenses.map((e) => (
                    <div key={e.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <ExpenseCategoryIcon category={ExpenseCategory.TRANSPORTATION} className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{e.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {e.recurring ? "Recorrente Mensal" : "Despesa Pontual"} • Vencimento dia {e.dueDate?.slice(8, 10) || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCurrency(calculateMonthlyAmount(e))}
                        </span>
                        <span className="text-[11px] text-slate-400 block">/ mês</span>
                      </div>
                    </div>
                  ))}
                  <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/60 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Total Mensal em Transporte:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {formatCurrency(totalTransportMonthly)} / mês
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Vehicle Modal ─────────────────────────────────── */}
      {showVehicleForm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowVehicleForm(false)}
        >
          <div
            className="surface-card w-full max-w-lg p-6 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80 dark:border-slate-700/60">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingVehicle ? "Editar Dados do Veículo" : "Cadastrar Novo Veículo"}
              </h3>
              <button
                onClick={() => setShowVehicleForm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVehicleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome de Identificação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Meu Civic, Carro da Família, Moto"
                  value={vehicleForm.name || ""}
                  onChange={(e) => setVehicleForm((p: any) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Marca / Fabricante *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Honda, Toyota, VW"
                    value={vehicleForm.brand || ""}
                    onChange={(e) => setVehicleForm((p: any) => ({ ...p, brand: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Civic Touring, Corolla"
                    value={vehicleForm.model || ""}
                    onChange={(e) => setVehicleForm((p: any) => ({ ...p, model: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ano de Fabricação
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    placeholder="Ex: 2022"
                    value={vehicleForm.year || ""}
                    onChange={(e) => setVehicleForm((p: any) => ({ ...p, year: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: BRA2E19 ou ABC-1234"
                    value={vehicleForm.licensePlate || ""}
                    onChange={(e) => setVehicleForm((p: any) => ({ ...p, licensePlate: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Odômetro Atual (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 45000"
                    value={vehicleForm.currentKm || ""}
                    onChange={(e) => setVehicleForm((p: any) => ({ ...p, currentKm: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs tabular-nums focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Consumo Estimado (km/L)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 11.5"
                    value={vehicleForm.averageKmL || ""}
                    onChange={(e) => setVehicleForm((p: any) => ({ ...p, averageKmL: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs tabular-nums focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Notas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chassi, seguro Tokio Marine, cor prata"
                  value={vehicleForm.notes || ""}
                  onChange={(e) => setVehicleForm((p: any) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowVehicleForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {saving ? "Salvando..." : editingVehicle ? "Salvar Alterações" : "Cadastrar Veículo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
