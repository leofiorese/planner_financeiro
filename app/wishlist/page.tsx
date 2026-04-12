"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  target_date: string;
  description: string;
  brand: string;
  link1: string;
  link2: string;
  link3: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CARD_COLORS = [
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-blue-500",
  "from-fuchsia-500 to-pink-500",
];

function hashColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return CARD_COLORS[Math.abs(h) % CARD_COLORS.length];
}

function fmtDate(val?: string | null): string {
  if (!val) return "—";
  const s = String(val).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WishlistPage() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  // Form
  const emptyForm = { name: "", price: "", target_date: "", description: "", brand: "", link1: "", link2: "", link3: "" };
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const loadData = async () => {
    try {
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (e) {
      console.error("Falha ao carregar wishlist", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openForm = (item?: WishlistItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name,
        price: String(item.price),
        target_date: item.target_date ? new Date(item.target_date).toISOString().split("T")[0] : "",
        description: item.description || "",
        brand: item.brand || "",
        link1: item.link1 || "",
        link2: item.link2 || "",
        link3: item.link3 || "",
      });
    } else {
      setEditingItem(null);
      setForm(emptyForm);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem?.id,
          name: form.name,
          price: parseFloat(form.price),
          target_date: form.target_date || null,
          description: form.description,
          brand: form.brand,
          links: [form.link1, form.link2, form.link3].filter((l) => l.trim() !== ""),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setEditingItem(null);
        setForm(emptyForm);
        await loadData();
      }
    } catch (e) {
      console.error("Erro ao salvar", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("wishlist.deleteConfirm"))) return;
    await fetch(`/api/wishlist?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  // computed
  const totalValue = items.reduce((s, i) => s + Number(i.price), 0);

  // ── Reusable classes (same as car page) ─────────────────────────────────
  const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const btnPrimary = "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50";
  const btnGhost = "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm transition-colors";

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Carregando lista de compras…</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header (same pattern as car page) ───────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">🛍️ {t("wishlist.pageTitle")}</h1>
            <p className="mt-1 text-indigo-200 text-sm">{t("wishlist.pageSubtitle")}</p>
          </div>
          <button className="bg-white text-indigo-700 font-semibold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-sm" onClick={() => openForm()}>
            + {t("wishlist.add")}
          </button>
        </div>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: "📦", label: t("wishlist.totalItems"), value: String(items.length), sub: items.length === 1 ? "item na lista" : "itens na lista", color: "from-blue-500 to-cyan-500" },
          { icon: "💰", label: t("wishlist.totalValue"), value: formatCurrency(totalValue), sub: "soma de todos os itens", color: "from-emerald-500 to-green-500" },
          { icon: "🏷️", label: "Marcas", value: String(new Set(items.map(i => i.brand).filter(Boolean)).size), sub: "marcas diferentes", color: "from-purple-500 to-indigo-500" },
          { icon: "🔗", label: "Com Links", value: String(items.filter(i => i.link1 || i.link2 || i.link3).length), sub: "itens com referências", color: "from-orange-500 to-amber-500" },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} p-4 rounded-xl text-white shadow`}>
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-lg font-bold">{card.value}</div>
            <div className="text-xs opacity-80 mt-0.5">{card.label}</div>
            <div className="text-xs opacity-60 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📋 Meus Desejos</h2>
          <span className="text-sm text-gray-400">{items.length} {items.length === 1 ? "item" : "itens"}</span>
        </div>

        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">{t("wishlist.empty")}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Adicione produtos que você deseja comprar no futuro para ter um melhor planejamento financeiro.
              </p>
              <button className={btnPrimary + " mx-auto"} onClick={() => openForm()}>
                + {t("wishlist.add")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((item) => {
                const initial = (item.brand || item.name).charAt(0).toUpperCase();
                const gradient = hashColor(item.brand || item.name);
                const links = [item.link1, item.link2, item.link3].filter(Boolean);

                return (
                  <div key={item.id} className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-all overflow-hidden">
                    {/* Top color bar */}
                    <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        {/* Avatar */}
                        <div className={`w-11 h-11 shrink-0 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{item.name}</h3>
                          {item.brand && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{item.brand}</span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-indigo-500 hover:text-indigo-700 text-xs p-1" title={t("common.edit")} onClick={() => openForm(item)}>✏️</button>
                          <button className="text-red-400 hover:text-red-600 text-xs p-1" title={t("common.delete")} onClick={() => handleDelete(item.id)}>🗑️</button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-3">
                        {formatCurrency(Number(item.price))}
                      </div>

                      {/* Meta: date */}
                      {item.target_date && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <span>📅</span> {fmtDate(item.target_date)}
                        </div>
                      )}

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{item.description}</p>
                      )}

                      {/* Links */}
                      {links.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                          {links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                              🔗 Link {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Form Modal (same pattern as car page) ──────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 p-6 pb-0">
              🛍️ {editingItem ? t("wishlist.edit") : t("wishlist.add")}
            </h3>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className={labelCls}>{t("wishlist.form.name")} *</label>
                <input type="text" required className={inputCls} placeholder="Ex: MacBook Pro M3" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t("wishlist.form.price")} *</label>
                  <input type="number" step="0.01" required min="0" className={inputCls} placeholder="0.00" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>{t("wishlist.form.date")}</label>
                  <input type="date" className={inputCls} value={form.target_date} onChange={(e) => setForm((p) => ({ ...p, target_date: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={labelCls}>{t("wishlist.form.brand")}</label>
                <input type="text" className={inputCls} placeholder="Ex: Apple" value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} />
              </div>

              <div>
                <label className={labelCls}>{t("wishlist.form.description")}</label>
                <textarea rows={2} className={inputCls} placeholder="Observações sobre o produto..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>

              <div>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wide">🔗 {t("wishlist.form.links")}</p>
                <div className="space-y-2">
                  <input type="url" className={inputCls} placeholder="Link 1 (https://...)" value={form.link1} onChange={(e) => setForm((p) => ({ ...p, link1: e.target.value }))} />
                  <input type="url" className={inputCls} placeholder="Link 2 (https://...)" value={form.link2} onChange={(e) => setForm((p) => ({ ...p, link2: e.target.value }))} />
                  <input type="url" className={inputCls} placeholder="Link 3 (https://...)" value={form.link3} onChange={(e) => setForm((p) => ({ ...p, link3: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className={btnGhost} onClick={() => { setShowForm(false); setEditingItem(null); setForm(emptyForm); }}>Cancelar</button>
                <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Salvando..." : "💾 Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
