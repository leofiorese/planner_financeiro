"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { RowActions } from "@/components/common/RowActions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExpenseCategoryConfig } from "@/types";

interface SortableCategoryRowProps {
  category: ExpenseCategoryConfig;
  index: number;
  total: number;
  expenseCount: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onEdit: (category: ExpenseCategoryConfig) => void;
  onDelete: (category: ExpenseCategoryConfig) => void;
}

/**
 * Linha de categoria ordenável: arraste pela alça (mouse, toque ou teclado: Espaço + setas) ou use
 * os botões ↑↓.
 */
export function SortableCategoryRow({
  category: cat,
  index,
  total,
  expenseCount,
  onMove,
  onEdit,
  onDelete,
}: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-col justify-between gap-3 bg-card p-3.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:px-4",
        isDragging && "relative z-10 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Arrastar ${cat.name} para reordenar`}
            className="flex size-9 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            disabled={index === 0}
            onClick={() => onMove(index, "up")}
            aria-label={`Subir ${cat.name}`}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            disabled={index === total - 1}
            onClick={() => onMove(index, "down")}
            aria-label={`Descer ${cat.name}`}
          >
            <ArrowDown aria-hidden />
          </Button>
        </div>

        <span className="w-6 text-center font-mono text-xs font-semibold text-muted-foreground">#{index + 1}</span>

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
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Base</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {expenseCount} {expenseCount === 1 ? "despesa vinculada" : "despesas vinculadas"}
          </div>
        </div>
      </div>

      <RowActions
        itemLabel={`categoria ${cat.name}`}
        onEdit={() => onEdit(cat)}
        onDelete={() => onDelete(cat)}
        className="self-end sm:self-center"
      />
    </li>
  );
}
