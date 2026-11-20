"use client";

import { useMemo, useState } from "react";
import { Building2, Link2, Plus, RefreshCw, ShoppingBag, Tag, TriangleAlert } from "lucide-react";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/LoadingState";
import { StatCard } from "@/components/common/StatCard";
import { WishlistFormModal } from "@/components/wishlist/WishlistFormModal";
import { WishlistGrid } from "@/components/wishlist/WishlistGrid";
import { useWishlist, type WishlistFormValues, type WishlistItem } from "@/components/wishlist/useWishlist";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format";
import { withToast } from "@/lib/toast";

export default function WishlistPage() {
  const confirm = useConfirm();
  const { items, loading, error, retry, save, remove } = useWishlist();

  const [modal, setModal] = useState<{ open: boolean; item: WishlistItem | null }>({ open: false, item: null });

  const totalValue = useMemo(() => items.reduce((s, i) => s + (Number(i.price) || 0), 0), [items]);
  const uniqueBrandsCount = useMemo(
    () => new Set(items.map((i) => i.brand?.trim()).filter(Boolean)).size,
    [items],
  );
  const itemsWithLinksCount = useMemo(() => items.filter((i) => i.link1 || i.link2 || i.link3).length, [items]);

  const handleSubmit = async (values: WishlistFormValues) => {
    const editing = modal.item;
    await withToast(save(values, editing?.id), {
      loading: "Salvando item...",
      success: editing ? "Item atualizado" : "Item adicionado",
      error: "Não foi possível salvar o item",
    });
  };

  const handleDelete = async (item: WishlistItem) => {
    const ok = await confirm({
      title: "Excluir item?",
      description: `O item "${item.name}" será removido da lista. Essa ação não pode ser desfeita.`,
      confirmText: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await withToast(remove(item.id), {
        success: "Item excluído",
        error: "Não foi possível excluir o item",
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <PageSkeleton stats={4} rows={3} />;

  if (error && items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Wishlist" description="Organize seus desejos de consumo e controle suas futuras compras" />
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center"
        >
          <TriangleAlert className="size-6 text-destructive" aria-hidden />
          <p className="text-sm font-medium">{error}</p>
          <Button variant="outline" onClick={retry}>
            <RefreshCw aria-hidden />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Wishlist"
        description="Organize seus desejos de consumo e controle suas futuras compras"
        actions={
          <Button onClick={() => setModal({ open: true, item: null })}>
            <Plus aria-hidden />
            Adicionar item
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Valor total"
            value={formatCurrency(totalValue)}
            hint="Capital total planejado"
            icon={Tag}
            tone="primary"
          />
          <StatCard
            label="Média por item"
            value={formatCurrency(items.length > 0 ? totalValue / items.length : 0)}
            hint="Ticket médio planejado"
            icon={ShoppingBag}
          />
          <StatCard
            label="Marcas e lojas"
            value={uniqueBrandsCount}
            hint="Fabricantes catalogados"
            icon={Building2}
          />
          <StatCard
            label="Com links"
            value={itemsWithLinksCount}
            hint="Referências salvas"
            icon={Link2}
          />
        </div>
      </PageHeader>

      <WishlistGrid
        items={items}
        onCreate={() => setModal({ open: true, item: null })}
        onEdit={(item) => setModal({ open: true, item })}
        onDelete={handleDelete}
      />

      <WishlistFormModal
        open={modal.open}
        onOpenChange={(open) => setModal((prev) => ({ ...prev, open }))}
        item={modal.item}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
