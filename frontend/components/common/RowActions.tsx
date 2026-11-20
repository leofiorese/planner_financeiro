"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface RowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  /** Nome do item, usado nos `aria-label` ("Editar <nome>"). */
  itemLabel?: string;
  /** `inline`: dois botões de ícone; `menu`: dropdown "⋯" para linhas densas. */
  variant?: "inline" | "menu";
  /** Ações extras exibidas no modo `menu` antes de Editar/Excluir. */
  children?: React.ReactNode;
  className?: string;
}

/** Ações de linha (editar/excluir) com ícones lucide, `aria-label` e alvo de toque adequado. */
export function RowActions({ onEdit, onDelete, itemLabel, variant = "inline", children, className }: RowActionsProps) {
  const suffix = itemLabel ? ` ${itemLabel}` : "";

  if (variant === "menu") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className} aria-label={`Ações${suffix}`}>
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {children}
          {children && (onEdit || onDelete) && <DropdownMenuSeparator />}
          {onEdit && (
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil aria-hidden /> Editar
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 aria-hidden /> Excluir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label={`Editar${suffix}`}
          title="Editar"
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
          aria-label={`Excluir${suffix}`}
          title="Excluir"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
