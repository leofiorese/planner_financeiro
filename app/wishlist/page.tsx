"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import DatePicker from "@/components/DatePicker";

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

function fmtDate(val?: string | null): string {
  if (!val) return "—";
  const s = String(val).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // fallback
  }
  return "—";
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function WishlistPage() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "price-desc" | "price-asc" | "date" | "name">("recent");

  const emptyForm = {
    name: "",
    price: "",
    target_date: "",
    description: "",
    brand: "",
    link1: "",
    link2: "",
    link3: "",
  };
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

  useEffect(() => {
    loadData();
  }, []);

  const openForm = (item?: WishlistItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name,
        price: String(item.price),
        target_date: item.target_date ? String(item.target_date).slice(0, 10) : "",
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
          price: parseFloat(form.price) || 0,
          target_date: form.target_date || null,
          description: form.description,
          brand: form.brand,
          links: [form.link1, form.link2, form.link3].filter(
            (l) => l.trim() !== ""
          ),
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

  const totalValue = useMemo(() => {
    return items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.brand && i.brand.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "price-desc":
          return Number(b.price) - Number(a.price);
        case "price-asc":
          return Number(a.price) - Number(b.price);
        case "date":
          if (!a.target_date) return 1;
          if (!b.target_date) return -1;
          return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return result;
  }, [items, searchTerm, sortBy]);

  const uniqueBrandsCount = useMemo(() => {
    return new Set(items.map((i) => i.brand?.trim()).filter(Boolean)).size;
  }, [items]);

  const itemsWithLinksCount = useMemo(() => {
    return items.filter((i) => i.link1 || i.link2 || i.link3).length;
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Carregando lista de desejos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Executive Header ────────────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5 flex-wrap">
            <span>{t("wishlist.pageTitle")}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70">
              {items.length} {items.length === 1 ? "Item Mapeado" : "Itens Mapeados"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {t("wishlist.pageSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-right min-w-[160px]">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {t("wishlist.totalValue")}
            </div>
            <div className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Capital total planejado
            </div>
          </div>

          <button
            onClick={() => openForm()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>+ {t("wishlist.add")}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="surface-card p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("wishlist.totalItems")}
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {items.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {items.length === 1 ? "Item no radar" : "Itens no radar"}
          </div>
        </div>

        <div className="surface-card p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Média por Item
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {items.length > 0
              ? formatCurrency(totalValue / items.length)
              : formatCurrency(0)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Ticket médio planejado</div>
        </div>

        <div className="surface-card p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Marcas & Lojas
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {uniqueBrandsCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Fabricantes catalogados
          </div>
        </div>

        <div className="surface-card p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Com Links
            </span>
            <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {itemsWithLinksCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Referências salvas
          </div>
        </div>
      </div>

      {/* ── Items Grid ──────────────────────────────────────────────── */}
      <div className="surface-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Itens Desejados</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({filteredItems.length} {filteredItems.length === 1 ? "item" : "itens"})
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filtre ou priorize conforme suas metas financeiras
            </p>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <input
                  type="text"
                  placeholder="Buscar por nome ou marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all"
                />
                <svg
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recent" | "price-desc" | "price-asc" | "date" | "name")}
                aria-label="Ordenar itens por"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-medium focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none cursor-pointer"
              >
                <option value="recent">Mais recentes</option>
                <option value="price-desc">Maior valor</option>
                <option value="price-asc">Menor valor</option>
                <option value="date">Data prevista</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t("wishlist.empty")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
              Adicione produtos que você deseja comprar para simular seu impacto no fluxo de caixa.
            </p>
            <button
              onClick={() => openForm()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              + {t("wishlist.add")}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Nenhum item encontrado para &quot;{searchTerm}&quot;.
            </p>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const links = [item.link1, item.link2, item.link3].filter(
                (l) => l && l.trim() !== ""
              );

              return (
                <div
                  key={item.id}
                  className="group p-4.5 rounded-xl border border-slate-200/90 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-600/70 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        {item.brand && (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60 px-2 py-0.5 rounded-md mb-1.5">
                            {item.brand}
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openForm(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="text-base font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mb-2.5">
                      {formatCurrency(Number(item.price) || 0)}
                    </div>

                    {item.target_date && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/40 text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-3">
                        <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Previsão: <strong className="font-semibold text-slate-900 dark:text-slate-100">{fmtDate(item.target_date)}</strong></span>
                      </div>
                    )}

                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {links.length > 0 && (
                    <div className="pt-3 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                      {links.map((link, idx) => (
                        <a
                          key={idx}
                          href={sanitizeUrl(link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800/90 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all shadow-2xs inline-flex items-center gap-1.5"
                        >
                          <svg
                            className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          <span>Link {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Form Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowForm(false)}
        >
          <div
            className="surface-card w-full max-w-lg p-6 sm:p-7 shadow-2xl relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingItem ? t("wishlist.edit") : t("wishlist.add")}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                  setForm(emptyForm);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("wishlist.form.name")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  placeholder="Ex: MacBook Pro M3"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("wishlist.form.price")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-mono font-bold focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="0,00"
                    value={form.price}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, price: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("wishlist.form.date")}
                  </label>
                  <DatePicker
                    value={form.target_date}
                    onChange={(val) =>
                      setForm((p) => ({ ...p, target_date: val }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("wishlist.form.brand")}
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  placeholder="Ex: Apple, Nike, Sony"
                  value={form.brand}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, brand: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("wishlist.form.description")}
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  placeholder="Notas, modelos e especificações..."
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("wishlist.form.links") || "Links de Referência (Máx 3)"}
                </label>
                <div className="space-y-1.5">
                  <input
                    type="url"
                    className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="Link 1 (https://...)"
                    value={form.link1}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, link1: e.target.value }))
                    }
                  />
                  <input
                    type="url"
                    className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="Link 2 (https://...)"
                    value={form.link2}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, link2: e.target.value }))
                    }
                  />
                  <input
                    type="url"
                    className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="Link 3 (https://...)"
                    value={form.link3}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, link3: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                    setForm(emptyForm);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

