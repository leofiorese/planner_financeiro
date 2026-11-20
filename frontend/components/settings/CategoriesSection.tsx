"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import {
  CategoryFormModal,
  type CategoryDraft,
} from "@/components/settings/CategoryFormModal";
import { Button } from "@/components/ui/button";
import { useFinancialContext } from "@/context";
import { toast, withToast } from "@/lib/toast";
import type { ExpenseCategoryConfig } from "@/types";
import { DEFAULT_EXPENSE_CATEGORIES, getOrderedCategories } from "@/utils/categoryRules";

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

  const handleMove = async (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= orderedCategories.length) return;
    const updated = [...orderedCategories];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);
    try {
      await withToast(setExpenseCategories(updated.map((cat, idx) => ({ ...cat, order: idx }))), {
        success: "Ordem das categorias atualizada",
        error: "Não foi possível reordenar as categorias",
      });
    } catch (error) {
      console.error(error);
    }
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
        {orderedCategories.length} categorias configuradas. Use as setas para mudar a ordem.
      </p>

      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {orderedCategories.map((cat, idx) => {
          const expenseCount = (state.userPlan?.expenses || []).filter((e) => e.category === cat.id).length;
          return (
            <li
              key={cat.id}
              className="flex flex-col justify-between gap-3 p-3.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:px-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, "up")}
                    aria-label={`Subir ${cat.name}`}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    disabled={idx === orderedCategories.length - 1}
                    onClick={() => handleMove(idx, "down")}
                    aria-label={`Descer ${cat.name}`}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </div>

                <span className="w-6 text-center font-mono text-xs font-semibold text-muted-foreground">
                  #{idx + 1}
                </span>

                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border text-lg"
                  style={{ backgroundColor: `${cat.color}15`, borderColor: `${cat.color}40` }}
                  aria-hidden
                >
                  {cat.emoji}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">{cat.name}</span>
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                      title={`Cor: ${cat.color}`}
                      aria-hidden
                    />
                    {cat.isDefault && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Base
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {expenseCount} {expenseCount === 1 ? "despesa vinculada" : "despesas vinculadas"}
                  </div>
                </div>
              </div>

              <RowActions
                itemLabel={`categoria ${cat.name}`}
                onEdit={() => openEdit(cat)}
                onDelete={() => handleDelete(cat)}
                className="self-end sm:self-center"
              />
            </li>
          );
        })}
      </ul>

      <CategoryFormModal open={modalOpen} onOpenChange={setModalOpen} category={editing} onSubmit={handleSubmit} />
    </SectionCard>
  );
}
