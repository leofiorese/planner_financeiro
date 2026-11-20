"use client";

import { useCallback, useEffect, useState } from "react";

export interface WishlistItem {
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

export interface WishlistFormValues {
  name: string;
  price: string;
  target_date: string;
  description: string;
  brand: string;
  link1: string;
  link2: string;
  link3: string;
}

export const emptyWishlistForm = (): WishlistFormValues => ({
  name: "",
  price: "",
  target_date: "",
  description: "",
  brand: "",
  link1: "",
  link2: "",
  link3: "",
});

/**
 * Dados da Wishlist (`/api/wishlist`). Salvar/excluir lançam erro quando a API falha;
 * quem chama exibe o toast.
 */
export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (!res.ok) throw new Error("Falha ao carregar a lista de desejos");
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setError(null);
      } else {
        throw new Error("Falha ao carregar a lista de desejos");
      }
    } catch (e) {
      console.error("Falha ao carregar wishlist", e);
      setError(e instanceof Error ? e.message : "Falha ao carregar a lista de desejos");
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
    async (values: WishlistFormValues, editingId?: string) => {
      const res = await fetch("/api/wishlist", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: values.name,
          price: parseFloat(values.price) || 0,
          target_date: values.target_date || null,
          description: values.description,
          brand: values.brand,
          links: [values.link1, values.link2, values.link3].filter((l) => l.trim() !== ""),
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar item");
      await loadData();
    },
    [loadData],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/wishlist?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir item");
      await loadData();
    },
    [loadData],
  );

  return { items, loading, error, retry, save, remove };
}
