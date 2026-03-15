"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useFinancialState } from "@/context";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import { ExpenseCategory } from "@/types";
import { calculateMonthlyAmount } from "@/utils/expenseOperations";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year?: number;
  licensePlate?: string;
  currentKm: number;
  averageKmL: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometer?: number;
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

const MAINTENANCE_TYPES = [
  { value: "oil_change", label: "Troca de Óleo" },
  { value: "tire_rotation", label: "Rodízio de Pneus" },
  { value: "brake_inspection", label: "Inspeção de Freios" },
  { value: "alignment", label: "Alinhamento/Balanceamento" },
  { value: "filter", label: "Troca de Filtro" },
  { value: "belt", label: "Correia Dentada" },
  { value: "battery", label: "Bateria" },
  { value: "revisao", label: "Revisão Geral" },
  { value: "other", label: "Outro" },
];

const FUEL_TYPES = [
  { value: "gasoline", label: "Gasolina" },
  { value: "ethanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "gnv", label: "GNV" },
  { value: "electric", label: "Elétrico" },
];

// ─── Mini Chart (SVG sparkline) ─────────────────────────────────────────────
function Sparkline({ data, color = "#6366f1", height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(pts.split(" ").pop()!.split(",")[0])} cy={parseFloat(pts.split(" ").pop()!.split(",")[1])} r="3" fill={color} />
    </svg>
  );
}

// ─── Bar Chart ──────────────────────────────────────────────────────────────
function BarChart({ data, label, color = "#6366f1" }: { data: { name: string; value: number }[]; label: string; color?: string }) {
  if (!data || data.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-24 truncate" title={item.name}>{item.name}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-16 text-right">{item.value.toFixed(1)}</span>
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

  // Server state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<"overview" | "fuel" | "maintenance" | "expenses">("overview");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingFuel, setEditingFuel] = useState<FuelLog | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceLog | null>(null);

  // Forms
  const emptyVehicle = { name: "", brand: "", model: "", year: new Date().getFullYear(), licensePlate: "", currentKm: 0, averageKmL: 0, notes: "" };
  const emptyFuel = { vehicleId: "", date: new Date().toISOString().split("T")[0], liters: 0, pricePerLiter: 0, totalCost: 0, odometer: 0, kmL: 0, fuelType: "gasoline", station: "", notes: "" };
  const emptyMaint = { vehicleId: "", date: new Date().toISOString().split("T")[0], type: "oil_change", description: "", cost: 0, odometer: 0, nextDate: "", nextOdometer: 0, nextKmInterval: 0, workshop: "", notes: "" };

  const [vehicleForm, setVehicleForm] = useState<any>(emptyVehicle);
  const [fuelForm, setFuelForm] = useState<any>(emptyFuel);
  const [maintenanceForm, setMaintenanceForm] = useState<any>(emptyMaint);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/car");
      if (!res.ok) throw new Error("Falha ao carregar dados do carro");
      const data = await res.json();
      setVehicles(data.vehicles || []);
      setFuelLogs(data.fuelLogs || []);
      setMaintenanceLogs(data.maintenanceLogs || []);
      if (data.vehicles?.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(data.vehicles[0].id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedVehicleId]);

  useEffect(() => { loadData(); }, []);

  // ── Selected vehicle helper ────────────────────────────────────────────────
  const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
  const vehicleFuelLogs = useMemo(() => fuelLogs.filter(f => f.vehicleId === selectedVehicleId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [fuelLogs, selectedVehicleId]);
  const vehicleMaintenanceLogs = useMemo(() => maintenanceLogs.filter(m => m.vehicleId === selectedVehicleId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [maintenanceLogs, selectedVehicleId]);

  // ── Transport expenses from main app ──────────────────────────────────────
  const transportExpenses = useMemo(() =>
    state.userPlan.expenses.filter(e => e.category === ExpenseCategory.TRANSPORTATION && e.isActive),
    [state.userPlan.expenses]
  );
  const totalTransportMonthly = useMemo(() =>
    transportExpenses.reduce((s, e) => s + calculateMonthlyAmount(e), 0),
    [transportExpenses]
  );

  // ── KmL chart data ─────────────────────────────────────────────────────────
  const kmlChartData = useMemo(() =>
    vehicleFuelLogs.filter(f => f.kmL && f.kmL > 0).slice(-12).reverse().map(f => f.kmL!),
    [vehicleFuelLogs]
  );

  // ── Monthly fuel spend ─────────────────────────────────────────────────────
  const monthlyFuelCost = useMemo(() => {
    const now = new Date();
    return vehicleFuelLogs
      .filter(f => {
        const d = new Date(f.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, f) => s + f.totalCost, 0);
  }, [vehicleFuelLogs]);

  // ── Total maintenance cost ─────────────────────────────────────────────────
  const totalMaintenanceCost = useMemo(() =>
    vehicleMaintenanceLogs.reduce((s, m) => s + m.cost, 0),
    [vehicleMaintenanceLogs]
  );

  // ── Average KmL ────────────────────────────────────────────────────────────
  const avgKmL = useMemo(() => {
    const with_kml = vehicleFuelLogs.filter(f => f.kmL && f.kmL > 0);
    if (with_kml.length === 0) return selectedVehicle?.averageKmL || 0;
    return with_kml.reduce((s, f) => s + f.kmL!, 0) / with_kml.length;
  }, [vehicleFuelLogs, selectedVehicle]);

  // ── Next maintenance alerts ────────────────────────────────────────────────
  const upcomingMaintenance = useMemo(() => {
    const today = new Date();
    return vehicleMaintenanceLogs.filter(m => {
      if (m.nextDate) {
        const d = new Date(m.nextDate);
        const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 30 && diff >= -1;
      }
      if (m.nextOdometer && selectedVehicle) {
        return (m.nextOdometer - selectedVehicle.currentKm) <= 1000;
      }
      return false;
    });
  }, [vehicleMaintenanceLogs, selectedVehicle]);

  // ── Fuel monthly bar chart ─────────────────────────────────────────────────
  const fuelMonthlyChart = useMemo(() => {
    const months: Record<string, number> = {};
    vehicleFuelLogs.forEach(f => {
      const key = f.date.slice(0, 7);
      months[key] = (months[key] || 0) + f.totalCost;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([k, v]) => ({ name: k.slice(0, 7), value: v }));
  }, [vehicleFuelLogs]);

  // ─── API Helpers ────────────────────────────────────────────────────────────
  const apiSave = async (type: string, data: any) => {
    setSaving(true);
    try {
      const res = await fetch("/api/car", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const apiDelete = async (type: string, id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    await fetch(`/api/car?type=${type}&id=${id}`, { method: "DELETE" });
    await loadData();
  };

  // ─── Form Handlers ──────────────────────────────────────────────────────────
  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiSave("vehicle", editingVehicle ? { ...vehicleForm, id: editingVehicle.id } : vehicleForm);
    setShowVehicleForm(false); setEditingVehicle(null); setVehicleForm(emptyVehicle);
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // km/L is calculated server-side from odometer readings — just send the raw form data
    const data = { ...fuelForm, vehicleId: selectedVehicleId };
    await apiSave("fuelLog", editingFuel ? { ...data, id: editingFuel.id } : data);
    setShowFuelForm(false); setEditingFuel(null); setFuelForm(emptyFuel);
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...maintenanceForm, vehicleId: selectedVehicleId };
    await apiSave("maintenanceLog", editingMaintenance ? { ...data, id: editingMaintenance.id } : data);
    setShowMaintenanceForm(false); setEditingMaintenance(null); setMaintenanceForm(emptyMaint);
  };

  // ─── Auto-calculate total cost on fuel form ─────────────────────────────────
  useEffect(() => {
    if (fuelForm.liters && fuelForm.pricePerLiter) {
      setFuelForm((p: any) => ({ ...p, totalCost: +(fuelForm.liters * fuelForm.pricePerLiter).toFixed(2) }));
    }
  }, [fuelForm.liters, fuelForm.pricePerLiter]);

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Carregando dados do carro...</p>
      </div>
    </div>
  );

  /** Safely formats a YYYY-MM-DD string as dd/MM/yyyy without timezone shifts. */
  const fmtDate = (val?: string | null): string => {
    if (!val) return "—";
    const s = String(val).slice(0, 10); // take only YYYY-MM-DD
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return "—";
    return `${d}/${m}/${y}`;
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const btnPrimary = "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50";
  const btnGhost = "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm transition-colors";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">🚗 Meu Carro</h1>
            <p className="mt-1 text-indigo-200 text-sm">Controle de combustível, manutenções e despesas do veículo</p>
          </div>
          {vehicles.length === 0 ? (
            <button className="bg-white text-indigo-700 font-semibold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-sm" onClick={() => setShowVehicleForm(true)}>
              + Adicionar Veículo
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}
                className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white">
                {vehicles.map(v => <option key={v.id} value={v.id} className="text-gray-900">{v.name}</option>)}
              </select>
              <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors" onClick={() => setShowVehicleForm(true)}>+ Veículo</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {upcomingMaintenance.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">Manutenção Próxima</p>
              <ul className="mt-1 space-y-1">
                {upcomingMaintenance.map(m => (
                  <li key={m.id} className="text-sm text-amber-700 dark:text-amber-300">
                    • {m.type}: {m.description} {m.nextDate ? `— até ${fmtDate(m.nextDate)}` : ""}
                    {m.nextOdometer ? ` — até ${m.nextOdometer.toLocaleString()} km` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      {selectedVehicle && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "⛽", label: "Combustível (mês)", value: formatCurrency(monthlyFuelCost), sub: `${vehicleFuelLogs.length} abastecimentos`, color: "from-blue-500 to-cyan-500" },
            { icon: "📏", label: "Média km/L", value: `${avgKmL.toFixed(2)} km/L`, sub: kmlChartData.length > 0 ? "↑ gráfico ao lado" : "Sem dados suficientes", color: "from-emerald-500 to-green-500" },
            { icon: "🔧", label: "Total Manutenções", value: formatCurrency(totalMaintenanceCost), sub: `${vehicleMaintenanceLogs.length} registros`, color: "from-orange-500 to-amber-500" },
            { icon: "🚘", label: "Km Atual", value: `${selectedVehicle.currentKm.toLocaleString()} km`, sub: selectedVehicle.licensePlate || selectedVehicle.model, color: "from-purple-500 to-indigo-500" },
          ].map(card => (
            <div key={card.label} className={`bg-gradient-to-br ${card.color} p-4 rounded-xl text-white shadow`}>
              <div className="text-2xl mb-1">{card.icon}</div>
              <div className="text-lg font-bold">{card.value}</div>
              <div className="text-xs opacity-80 mt-0.5">{card.label}</div>
              <div className="text-xs opacity-60 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {[
            { key: "overview", label: "📊 Visão Geral" },
            { key: "fuel", label: "⛽ Combustível" },
            { key: "maintenance", label: "🔧 Manutenções" },
            { key: "expenses", label: "💸 Despesas de Transporte" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.key
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {!selectedVehicle ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚗</div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Nenhum veículo cadastrado</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Adicione seu carro para começar a registrar combustível e manutenções</p>
                  <button className={btnPrimary} onClick={() => setShowVehicleForm(true)}>🚗 Adicionar Veículo</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Vehicle Info Card */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">🚘 {selectedVehicle.name}</h3>
                      <button className={btnGhost} onClick={() => { setVehicleForm({ ...selectedVehicle }); setEditingVehicle(selectedVehicle); setShowVehicleForm(true); }}>✏️ Editar</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        ["Marca/Modelo", `${selectedVehicle.brand} ${selectedVehicle.model}`],
                        ["Ano", selectedVehicle.year?.toString() || "—"],
                        ["Placa", selectedVehicle.licensePlate || "—"],
                        ["Km Atual", `${selectedVehicle.currentKm.toLocaleString()} km`],
                        ["Média Estimada", `${selectedVehicle.averageKmL} km/L`],
                        ["Média Real", `${avgKmL.toFixed(2)} km/L`],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{k}</span>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{v}</p>
                        </div>
                      ))}
                    </div>
                    {selectedVehicle.notes && <p className="text-sm text-gray-500 dark:text-gray-400 italic">{selectedVehicle.notes}</p>}
                  </div>

                  {/* KmL sparkline */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">📈 Evolução km/L (últimos abastecimentos)</h3>
                    {kmlChartData.length > 1 ? (
                      <div className="flex items-end gap-4">
                        <Sparkline data={kmlChartData} color="#6366f1" height={60} />
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          <p>Min: <strong>{Math.min(...kmlChartData).toFixed(1)}</strong></p>
                          <p>Max: <strong>{Math.max(...kmlChartData).toFixed(1)}</strong></p>
                          <p>Avg: <strong>{avgKmL.toFixed(1)}</strong></p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Registre abastecimentos com km para ver o gráfico</p>
                    )}
                  </div>

                  {/* Monthly fuel chart */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">📊 Gasto Mensal com Combustível</h3>
                    <BarChart data={fuelMonthlyChart.map(d => ({ name: d.name, value: d.value }))} label="R$" color="#6366f1" />
                  </div>

                  {/* Transport expenses summary */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">💸 Despesas de Transporte (mensal)</h3>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalTransportMonthly)}</p>
                    <p className="text-xs text-gray-400 mt-1">{transportExpenses.length} despesas ativas da categoria Transporte</p>
                    <div className="mt-3 space-y-1">
                      {transportExpenses.slice(0, 5).map(e => (
                        <div key={e.id} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300 truncate">{e.name}</span>
                          <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(calculateMonthlyAmount(e))}</span>
                        </div>
                      ))}
                      {transportExpenses.length > 5 && <p className="text-xs text-gray-400">+{transportExpenses.length - 5} mais</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FUEL TAB ──────────────────────────────────────────────────── */}
          {activeTab === "fuel" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">⛽ Histórico de Abastecimentos</h2>
                <button className={btnPrimary} onClick={() => { setFuelForm({ ...emptyFuel, vehicleId: selectedVehicleId }); setShowFuelForm(true); }} disabled={!selectedVehicleId}>
                  + Registrar Abastecimento
                </button>
              </div>

              {/* Fuel form */}
              {showFuelForm && (
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-5 border border-indigo-200 dark:border-indigo-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editingFuel ? "Editar Abastecimento" : "Novo Abastecimento"}</h3>
                  <form onSubmit={handleFuelSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Data *</label><input type="date" required className={inputCls} value={fuelForm.date} onChange={e => setFuelForm((p: any) => ({ ...p, date: e.target.value }))} /></div>
                    <div><label className={labelCls}>Litros *</label><input type="number" step="0.001" min="0" required className={inputCls} value={fuelForm.liters || ""} onChange={e => setFuelForm((p: any) => ({ ...p, liters: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 40.5" /></div>
                    <div><label className={labelCls}>Preço/Litro *</label><input type="number" step="0.001" min="0" required className={inputCls} value={fuelForm.pricePerLiter || ""} onChange={e => setFuelForm((p: any) => ({ ...p, pricePerLiter: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 5.89" /></div>
                    <div><label className={labelCls}>Total (calculado)</label><input type="number" step="0.01" className={inputCls + " bg-gray-100 dark:bg-gray-600"} value={fuelForm.totalCost || ""} onChange={e => setFuelForm((p: any) => ({ ...p, totalCost: parseFloat(e.target.value) || 0 }))} /></div>
                    <div><label className={labelCls}>Odômetro (km)</label><input type="number" min="0" className={inputCls} value={fuelForm.odometer || ""} onChange={e => setFuelForm((p: any) => ({ ...p, odometer: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 52300" /></div>
                    <div><label className={labelCls}>Tipo de Combustível</label>
                      <select className={inputCls} value={fuelForm.fuelType} onChange={e => setFuelForm((p: any) => ({ ...p, fuelType: e.target.value }))}>
                        {FUEL_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Posto</label><input type="text" className={inputCls} value={fuelForm.station || ""} onChange={e => setFuelForm((p: any) => ({ ...p, station: e.target.value }))} placeholder="Ex: Posto Shell" /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Observações</label><input type="text" className={inputCls} value={fuelForm.notes || ""} onChange={e => setFuelForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
                    <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                      <button type="button" className={btnGhost} onClick={() => { setShowFuelForm(false); setEditingFuel(null); setFuelForm(emptyFuel); }}>Cancelar</button>
                      <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Salvando..." : "💾 Salvar"}</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Fuel table */}
              {vehicleFuelLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">⛽</div>
                  <p>Nenhum abastecimento registrado ainda</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {["Data", "Litros", "Preço/L", "Total", "Odômetro", "km/L", "Combustível", "Posto", ""].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {vehicleFuelLogs.map(f => (
                        <tr key={f.id} className="bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{fmtDate(f.date)}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{f.liters.toFixed(2)} L</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatCurrency(f.pricePerLiter)}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-400">{formatCurrency(f.totalCost)}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{f.odometer ? `${f.odometer.toLocaleString()} km` : "—"}</td>
                          <td className="px-4 py-3">
                            {f.kmL ? (
                              <span className={`font-bold ${f.kmL >= (selectedVehicle?.averageKmL || 0) ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                                {f.kmL.toFixed(1)}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{FUEL_TYPES.find(ft => ft.value === f.fuelType)?.label || f.fuelType}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{f.station || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button className="text-indigo-500 hover:text-indigo-700 text-xs" onClick={() => { setFuelForm({ ...f }); setEditingFuel(f); setShowFuelForm(true); }}>✏️</button>
                              <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => apiDelete("fuelLog", f.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── MAINTENANCE TAB ────────────────────────────────────────────── */}
          {activeTab === "maintenance" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">🔧 Histórico de Manutenções</h2>
                <button className={btnPrimary} onClick={() => { setMaintenanceForm({ ...emptyMaint, vehicleId: selectedVehicleId }); setShowMaintenanceForm(true); }} disabled={!selectedVehicleId}>
                  + Nova Manutenção
                </button>
              </div>

              {/* Maintenance form */}
              {showMaintenanceForm && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-5 border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editingMaintenance ? "Editar Manutenção" : "Nova Manutenção"}</h3>
                  <form onSubmit={handleMaintenanceSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Data *</label><input type="date" required className={inputCls} value={maintenanceForm.date} onChange={e => setMaintenanceForm((p: any) => ({ ...p, date: e.target.value }))} /></div>
                    <div><label className={labelCls}>Tipo *</label>
                      <select required className={inputCls} value={maintenanceForm.type} onChange={e => setMaintenanceForm((p: any) => ({ ...p, type: e.target.value }))}>
                        {MAINTENANCE_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Custo (R$) *</label><input type="number" step="0.01" min="0" required className={inputCls} value={maintenanceForm.cost || ""} onChange={e => setMaintenanceForm((p: any) => ({ ...p, cost: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 250.00" /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Descrição *</label><input type="text" required className={inputCls} value={maintenanceForm.description || ""} onChange={e => setMaintenanceForm((p: any) => ({ ...p, description: e.target.value }))} placeholder="Ex: Troca de óleo 5W30 Sintético" /></div>
                    <div><label className={labelCls}>Odômetro (km)</label><input type="number" min="0" className={inputCls} value={maintenanceForm.odometer || ""} onChange={e => setMaintenanceForm((p: any) => ({ ...p, odometer: parseFloat(e.target.value) || 0 }))} placeholder="Km no momento" /></div>
                    <div><label className={labelCls}>Oficina</label><input type="text" className={inputCls} value={maintenanceForm.workshop || ""} onChange={e => setMaintenanceForm((p: any) => ({ ...p, workshop: e.target.value }))} placeholder="Nome da oficina" /></div>

                    <div className="sm:col-span-3"><p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mt-2 mb-2 uppercase tracking-wide">📅 Próxima Manutenção</p></div>
                    <div><label className={labelCls}>Próxima Data</label><input type="date" className={inputCls} value={maintenanceForm.nextDate || ""} onChange={e => setMaintenanceForm((p: any) => ({ ...p, nextDate: e.target.value }))} /></div>
                    <div><label className={labelCls}>Próximo Odômetro (km)</label><input type="number" min="0" className={inputCls} value={maintenanceForm.nextOdometer || ""} onChange={e => setMaintenanceForm((p: any) => ({ ...p, nextOdometer: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 57000" /></div>
                    <div><label className={labelCls}>Intervalo (km)</label><input type="number" min="0" className={inputCls} value={maintenanceForm.nextKmInterval || ""} onChange={e => setMaintenanceForm((p: any) => ({ ...p, nextKmInterval: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 5000" /></div>
                    <div className="sm:col-span-2 lg:col-span-3"><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={maintenanceForm.notes || ""} onChange={e => setMaintenanceForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
                    <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                      <button type="button" className={btnGhost} onClick={() => { setShowMaintenanceForm(false); setEditingMaintenance(null); setMaintenanceForm(emptyMaint); }}>Cancelar</button>
                      <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Salvando..." : "💾 Salvar"}</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Maintenance list */}
              {vehicleMaintenanceLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">🔧</div>
                  <p>Nenhuma manutenção registrada ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {vehicleMaintenanceLogs.map(m => {
                    const isNextSoon = m.nextDate && (() => {
                      const [y, mo, d] = m.nextDate!.slice(0, 10).split("-").map(Number);
                      const next = new Date(y, mo - 1, d);
                      return (next.getTime() - Date.now()) / 86400000 <= 30;
                    })();
                    return (
                      <div key={m.id} className={`rounded-xl border p-4 transition-all hover:shadow-md ${isNextSoon ? "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}>
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full">
                                {MAINTENANCE_TYPES.find(mt => mt.value === m.type)?.label || m.type}
                              </span>
                              {isNextSoon && <span className="text-xs font-semibold px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full">⚠️ Próxima em breve</span>}
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{m.description}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                              <span>📅 {fmtDate(m.date)}</span>
                              {m.odometer && <span>📏 {m.odometer.toLocaleString()} km</span>}
                              {m.workshop && <span>🏭 {m.workshop}</span>}
                            </div>
                            {(m.nextDate || m.nextOdometer) && (
                              <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                                🔄 Próxima: {m.nextDate ? fmtDate(m.nextDate) : ""} {m.nextOdometer ? `| ${m.nextOdometer.toLocaleString()} km` : ""}
                              </div>
                            )}
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end gap-3">
                            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(m.cost)}</span>
                            <div className="flex gap-2">
                              <button className={btnGhost + " text-xs"} onClick={() => { setMaintenanceForm({ ...m }); setEditingMaintenance(m); setShowMaintenanceForm(true); }}>✏️ Editar</button>
                              <button className="text-red-400 hover:text-red-600 text-xs border border-red-200 dark:border-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => apiDelete("maintenanceLog", m.id)}>🗑️</button>
                            </div>
                          </div>
                        </div>
                        {m.notes && <p className="mt-2 text-sm text-gray-400 italic">{m.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── EXPENSES TAB ────────────────────────────────────────────────── */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">💸 Despesas de Transporte</h2>
                <a href="/expenses" className={btnPrimary + " no-underline"}>+ Gerenciar Despesas</a>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Total Mensal</p>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(totalTransportMonthly)}</p>
                  <p className="text-xs text-indigo-400">{transportExpenses.length} despesas ativas</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4">
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Anual</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(totalTransportMonthly * 12)}</p>
                  <p className="text-xs text-purple-400">Projeção anual</p>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-900/30 rounded-xl p-4">
                  <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">Combustível (mês)</p>
                  <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{formatCurrency(monthlyFuelCost)}</p>
                  <p className="text-xs text-cyan-400">Abastecimentos este mês</p>
                </div>
              </div>

              {/* Expenses table */}
              {transportExpenses.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">💸</div>
                  <p>Nenhuma despesa de transporte encontrada</p>
                  <a href="/expenses" className="inline-block mt-3 text-indigo-500 hover:underline text-sm">Adicionar na página de Despesas →</a>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {["Nome", "Valor", "Frequência", "Vencimento", "Pagamento", "Status"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {transportExpenses.map(e => (
                        <tr key={e.id} className="bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{e.name}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-400">{formatCurrency(calculateMonthlyAmount(e))}<span className="text-gray-400 font-normal text-xs">/mês</span></td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">{e.recurring ? (e.frequency || "Mensal") : "Único"}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(e.dueDate)}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">{e.paymentMethod?.replace("_", " ") || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700"}`}>
                              {e.isActive ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Vehicle Form Modal ──────────────────────────────────────────────── */}
      {showVehicleForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowVehicleForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">🚗 {editingVehicle ? "Editar Veículo" : "Adicionar Veículo"}</h3>
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div><label className={labelCls}>Nome do veículo *</label><input type="text" required className={inputCls} value={vehicleForm.name || ""} onChange={e => setVehicleForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="Ex: Meu Civic" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Marca *</label><input type="text" required className={inputCls} value={vehicleForm.brand || ""} onChange={e => setVehicleForm((p: any) => ({ ...p, brand: e.target.value }))} placeholder="Honda" /></div>
                <div><label className={labelCls}>Modelo *</label><input type="text" required className={inputCls} value={vehicleForm.model || ""} onChange={e => setVehicleForm((p: any) => ({ ...p, model: e.target.value }))} placeholder="Civic" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Ano</label><input type="number" min="1900" max={new Date().getFullYear() + 1} className={inputCls} value={vehicleForm.year || ""} onChange={e => setVehicleForm((p: any) => ({ ...p, year: parseInt(e.target.value) || 0 }))} /></div>
                <div><label className={labelCls}>Placa</label><input type="text" className={inputCls} value={vehicleForm.licensePlate || ""} onChange={e => setVehicleForm((p: any) => ({ ...p, licensePlate: e.target.value.toUpperCase() }))} placeholder="ABC-1234" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Km Atual</label><input type="number" min="0" className={inputCls} value={vehicleForm.currentKm || ""} onChange={e => setVehicleForm((p: any) => ({ ...p, currentKm: parseFloat(e.target.value) || 0 }))} placeholder="52000" /></div>
                <div><label className={labelCls}>Média km/L</label><input type="number" step="0.1" min="0" className={inputCls} value={vehicleForm.averageKmL || ""} onChange={e => setVehicleForm((p: any) => ({ ...p, averageKmL: parseFloat(e.target.value) || 0 }))} placeholder="12.5" /></div>
              </div>
              <div><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={vehicleForm.notes || ""} onChange={e => setVehicleForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className={btnGhost} onClick={() => { setShowVehicleForm(false); setEditingVehicle(null); setVehicleForm(emptyVehicle); }}>Cancelar</button>
                <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Salvando..." : "💾 Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 text-red-700 dark:text-red-300 flex items-center gap-2">
          <span>⚠️</span> {error}
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>Fechar</button>
        </div>
      )}
    </div>
  );
}
