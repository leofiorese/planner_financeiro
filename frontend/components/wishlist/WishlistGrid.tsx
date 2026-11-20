"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { WishlistCard } from "@/components/wishlist/WishlistCard";
import type { WishlistItem } from "@/components/wishlist/useWishlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortBy = "recent" | "price-desc" | "price-asc" | "date" | "name";

interface WishlistGridProps {
  items: WishlistItem[];
  onCreate: () => void;
  onEdit: (item: WishlistItem) => void;
  onDelete: (item: WishlistItem) => void;
}

export function WishlistGrid({ items, onCreate, onEdit, onDelete }: WishlistGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.brand && i.brand.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)),
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

  return (
    <section aria-label="Itens desejados" className="rounded-xl border bg-card p-6 shadow-xs">
      <div className="mb-6 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            Itens desejados
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredItems.length} {filteredItems.length === 1 ? "item" : "itens"})
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Filtre ou priorize conforme suas metas financeiras</p>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
            <div className="relative min-w-52 flex-1 sm:flex-initial">
              <Label htmlFor="wishlist-search" className="sr-only">
                Buscar itens
              </Label>
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="wishlist-search"
                type="search"
                placeholder="Buscar por nome ou marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger aria-label="Ordenar itens por" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="price-desc">Maior valor</SelectItem>
                <SelectItem value="price-asc">Menor valor</SelectItem>
                <SelectItem value="date">Data prevista</SelectItem>
                <SelectItem value="name">Nome (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhum item encontrado"
          description="Adicione produtos que você deseja comprar para simular seu impacto no fluxo de caixa."
          action={
            <Button onClick={onCreate}>
              <Plus aria-hidden />
              Adicionar item
            </Button>
          }
        />
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">Nenhum item encontrado para &quot;{searchTerm}&quot;.</p>
          <Button variant="link" onClick={() => setSearchTerm("")}>
            Limpar busca
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <WishlistCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
