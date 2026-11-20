"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { SectionCard } from "@/components/common/SectionCard";
import { SortableCategoryRow } from "@/components/settings/SortableCategoryRow";
import {
  CategoryFormModal,
  type CategoryDraft,
} from "@/components/settings/CategoryFormModal";
import { Button } from "@/components/ui/button";
import { useFinancialContext } from "@/context";
import { toast, withToast } from "@/lib/toast";
import type { ExpenseCategoryConfig } from "@/types";
import { DEFAULT_EXPENSE_CATEGORIES, getOrderedCategories } from "@/utils/categoryRules";

const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Para reordenar, pressione Espaço ou Enter, use as setas para cima e para baixo para mover e pressione Espaço ou Enter novamente para soltar. Esc cancela.",
};

const DND_ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `Categoria ${String(active.id)} selecionada.`,
  onDragOver: ({ over }) => (over ? `Movida para a posição da categoria ${String(over.id)}.` : "Fora da lista."),
  onDragEnd: ({ over }) => (over ? "Categoria solta na nova posição." : "Reordenação cancelada."),
  onDragCancel: () => "Reordenação cancelada.",
};

export function CategoriesSection() {
  const { state, setExpenseCategories } = useFinancialContext();
  const confirm = useConfirm();

  const orderedCategories = useMemo(
    () => getOrderedCategories(state.userPlan?.expenseCategories),
    [state.userPlan?.expenseCategories],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategoryConfig | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (cat: ExpenseCategoryConfig) => {
    setEditing(cat);
    setModalOpen(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Persiste uma nova ordem (reindexa `order`). */
  const persistOrder = async (reordered: ExpenseCategoryConfig[]) => {
    try {
      await withToast(setExpenseCategories(reordered.map((cat, idx) => ({ ...cat, order: idx }))), {
        success: "Ordem das categorias atualizada",
        error: "Não foi possível reordenar as categorias",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= orderedCategories.length) return;
    await persistOrder(arrayMove(orderedCategories, index, target));
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = orderedCategories.findIndex((c) => c.id === active.id);
    const to = orderedCategories.findIndex((c) => c.id === over.id);
    if (from < 0 || to < 0) return;
    await persistOrder(arrayMove(orderedCategories, from, to));
  };

  const handleSubmit = async (draft: CategoryDraft) => {
    const name = draft.name.trim();
    if (!name) return;

    if (editing) {
      const updated = orderedCategories.map((c) =>
        c.id === editing.id
          ? { ...c, emoji: draft.emoji.trim() || "📦", name, color: draft.color || c.color }
          : c,
      );
      await withToast(setExpenseCategories(updated), {
        success: "Categoria atualizada",
        error: "Não foi possível salvar a categoria",
      });
      return;
    }

    const newCategory: ExpenseCategoryConfig = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      emoji: draft.emoji.trim() || "🏷️",
      color: draft.color || "#6366f1",
      order: orderedCategories.length,
      isDefault: false,
    };
    await withToast(setExpenseCategories([...orderedCategories, newCategory]), {
      success: "Categoria adicionada",
      error: "Não foi possível adicionar a categoria",
    });
  };

  const handleDelete = async (cat: ExpenseCategoryConfig) => {
    if (orderedCategories.length <= 1) {
      toast.error("O sistema deve possuir pelo menos uma categoria.");
      return;
    }
    const linkedCount = (state.userPlan?.expenses || []).filter((e) => e.category === cat.id).length;
    const ok = await confirm({
      title: `Retirar a categoria "${cat.emoji} ${cat.name}"?`,
      description:
        linkedCount > 0
          ? `Existem ${linkedCount} despesa(s) vinculada(s) a ela que serão movidas para "📦 Outros / Diversos".`
          : undefined,
      confirmText: "Retirar",
      tone: "danger",
    });
    if (!ok) return;
    const remaining = orderedCategories.filter((c) => c.id !== cat.id).map((c, idx) => ({ ...c, order: idx }));
    try {
      await withToast(setExpenseCategories(remaining), {
        success: "Categoria retirada",
        error: "Não foi possível retirar a categoria",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRestore = async () => {
    const ok = await confirm({
      title: "Restaurar categorias base?",
      description: "As 9 categorias base e a sequência padrão do sistema serão restauradas.",
      confirmText: "Restaurar",
    });
    if (!ok) return;
    try {
      await withToast(setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES), {
        success: "Categorias base restauradas",
        error: "Não foi possível restaurar as categorias",
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SectionCard
      title="Categorias do sistema"
      description="Defina a sequência de exibição, o emoji e o nome de cada categoria; adicione novas ou retire as que não usa."
      actions={
        <>
          <Button variant="outline" onClick={handleRestore}>
            <RotateCcw aria-hidden />
            Restaurar base
          </Button>
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            Nova categoria
          </Button>
        </>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {orderedCategories.length} categorias configuradas. Arraste pela alça ou use as setas para mudar a ordem.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements: DND_ANNOUNCEMENTS, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
      >
        <SortableContext items={orderedCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {orderedCategories.map((cat, idx) => (
              <SortableCategoryRow
                key={cat.id}
                category={cat}
                index={idx}
                total={orderedCategories.length}
                expenseCount={(state.userPlan?.expenses || []).filter((e) => e.category === cat.id).length}
                onMove={handleMove}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <CategoryFormModal open={modalOpen} onOpenChange={setModalOpen} category={editing} onSubmit={handleSubmit} />
    </SectionCard>
  );
}
