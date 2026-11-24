"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FolderPlus, Plus, RotateCcw, Archive } from "lucide-react";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import type { InvestmentsApi } from "@/components/investments/hooks/useInvestments";
import {
  InvestmentClassFormModal,
  type ClassFormMode,
} from "@/components/investments/InvestmentClassFormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast, withToast } from "@/lib/toast";
import type { InvestmentClass, InvestmentsData } from "@/types";
import { buildClassTree } from "@/utils/investments/totals";

const errorMessage = (fallback: string) => (e: unknown) => (e instanceof Error && e.message ? e.message : fallback);

interface InvestmentClassesCardProps {
  data: InvestmentsData;
  api: Pick<InvestmentsApi, "saveClass" | "saveClasses" | "deleteClass">;
}

/** Árvore de classes de ativos (2 níveis): criar, renomear, reordenar, arquivar e excluir. */
export function InvestmentClassesCard({ data, api }: InvestmentClassesCardProps) {
  const confirm = useConfirm();
  const { classes, snapshots } = data;
  const tree = useMemo(() => buildClassTree(classes, true), [classes]);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<ClassFormMode>({ kind: "create", parent: null });

  const classesWithHistory = useMemo(
    () => new Set(snapshots.flatMap((s) => s.entries.map((e) => e.classId))),
    [snapshots],
  );

  const openModal = (next: ClassFormMode) => {
    setMode(next);
    setModalOpen(true);
  };

  const handleSubmit = async (name: string) => {
    if (mode.kind === "edit") {
      const { cls } = mode;
      await withToast(api.saveClass({ id: cls.id, parentId: cls.parentId, name, archived: cls.archived }), {
        success: "Classe atualizada",
        error: errorMessage("Não foi possível salvar a classe"),
      });
      return;
    }
    await withToast(api.saveClass({ parentId: mode.parent?.id ?? null, name }), {
      success: mode.parent ? "Subclasse adicionada" : "Categoria adicionada",
      error: errorMessage("Não foi possível adicionar a classe"),
    });
  };

  const openAddChild = (parent: InvestmentClass) => {
    if (classesWithHistory.has(parent.id)) {
      toast.error(`"${parent.name}" já tem lançamentos e não pode ser dividida em subclasses.`);
      return;
    }
    openModal({ kind: "create", parent });
  };

  const handleMove = async (siblings: InvestmentClass[], index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const changed = reordered
      .map((c, i) => ({ cls: c, sortOrder: i }))
      .filter(({ cls, sortOrder }) => cls.sortOrder !== sortOrder);
    try {
      await withToast(
        api.saveClasses(
          changed.map(({ cls, sortOrder }) => ({
            id: cls.id,
            parentId: cls.parentId,
            name: cls.name,
            archived: cls.archived,
            sortOrder,
          })),
        ),
        { success: "Ordem atualizada", error: errorMessage("Não foi possível reordenar") },
      );
    } catch (error) {
      console.error(error);
    }
  };

  const setArchived = async (cls: InvestmentClass, archived: boolean) => {
    const hasChildren = classes.some((c) => c.parentId === cls.id);
    if (archived) {
      const ok = await confirm({
        title: `Arquivar "${cls.name}"?`,
        description: `${hasChildren ? "As subclasses também serão arquivadas. " : ""}Ela some dos lançamentos novos, mas continua nos históricos e gráficos.`,
        confirmText: "Arquivar",
      });
      if (!ok) return;
    }
    try {
      await withToast(api.saveClass({ id: cls.id, parentId: cls.parentId, name: cls.name, archived }), {
        success: archived ? "Classe arquivada" : "Classe reativada",
        error: errorMessage("Não foi possível alterar a classe"),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (cls: InvestmentClass) => {
    if (classes.some((c) => c.parentId === cls.id)) {
      toast.error("Remova ou arquive as subclasses antes de excluir esta categoria.");
      return;
    }
    const hasHistory = classesWithHistory.has(cls.id);
    const ok = await confirm({
      title: hasHistory ? `Arquivar "${cls.name}"?` : `Excluir "${cls.name}"?`,
      description: hasHistory
        ? "Esta classe tem lançamentos, então não pode ser apagada. Ela será arquivada: some dos lançamentos novos, mas continua nos históricos e gráficos."
        : "Esta ação não pode ser desfeita.",
      confirmText: hasHistory ? "Arquivar" : "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await withToast(api.deleteClass(cls.id), {
        success: (r) => (r.archived ? "Classe arquivada" : "Classe excluída"),
        error: errorMessage("Não foi possível excluir a classe"),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderRow = (cls: InvestmentClass, siblings: InvestmentClass[], index: number, depth: 0 | 1) => {
    const childCount = depth === 0 ? classes.filter((c) => c.parentId === cls.id).length : 0;
    return (
      <li
        key={cls.id}
        className={cn(
          "flex items-center justify-between gap-3 bg-card p-3 transition-colors hover:bg-accent/40 sm:px-4",
          depth === 1 && "pl-8 sm:pl-12",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={index === 0}
              onClick={() => handleMove(siblings, index, "up")}
              aria-label={`Subir ${cls.name}`}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={index === siblings.length - 1}
              onClick={() => handleMove(siblings, index, "down")}
              aria-label={`Descer ${cls.name}`}
            >
              <ArrowDown aria-hidden />
            </Button>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("truncate text-sm", depth === 0 ? "font-semibold" : "font-medium", cls.archived && "text-muted-foreground")}>
                {cls.name}
              </span>
              {cls.archived && <Badge variant="outline">Arquivada</Badge>}
            </div>
            {depth === 0 && childCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {childCount} {childCount === 1 ? "subclasse" : "subclasses"} · o total é a soma delas
              </p>
            )}
          </div>
        </div>

        <RowActions
          variant="menu"
          itemLabel={cls.name}
          onEdit={() => openModal({ kind: "edit", cls })}
          onDelete={() => handleDelete(cls)}
        >
          {depth === 0 && !cls.archived && (
            <DropdownMenuItem onSelect={() => openAddChild(cls)}>
              <FolderPlus aria-hidden /> Adicionar subclasse
            </DropdownMenuItem>
          )}
          {cls.archived ? (
            <DropdownMenuItem onSelect={() => setArchived(cls, false)}>
              <RotateCcw aria-hidden /> Reativar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setArchived(cls, true)}>
              <Archive aria-hidden /> Arquivar
            </DropdownMenuItem>
          )}
        </RowActions>
      </li>
    );
  };

  const rootSiblings = tree.map((n) => n.cls);

  return (
    <SectionCard
      title="Classes de ativos"
      description="As categorias e subclasses que compõem a sua carteira. Os valores são lançados nas subclasses (ou na categoria, quando ela não tem subclasses)."
      actions={
        <Button onClick={() => openModal({ kind: "create", parent: null })}>
          <Plus aria-hidden />
          Nova categoria
        </Button>
      }
    >
      {tree.length === 0 ? (
        <EmptyState
          title="Nenhuma classe cadastrada"
          description="Crie ao menos uma categoria para começar a lançar o patrimônio."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {tree.map((node, i) => (
            <li key={node.cls.id} className="list-none">
              <ul className="divide-y">
                {renderRow(node.cls, rootSiblings, i, 0)}
                {node.children.map((child, j) => renderRow(child, node.children, j, 1))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <InvestmentClassFormModal open={modalOpen} onOpenChange={setModalOpen} mode={mode} onSubmit={handleSubmit} />
    </SectionCard>
  );
}
