"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoalCategory } from "@/types";
import { getGoalCategoryLabel } from "@/utils/labels";

export type GoalSortBy = "name" | "targetDate" | "progress" | "priority";

interface GoalFiltersProps {
  category: GoalCategory | "all";
  onCategoryChange: (category: GoalCategory | "all") => void;
  sortBy: GoalSortBy;
  onSortByChange: (sortBy: GoalSortBy) => void;
  shown: number;
  total: number;
}

export function GoalFilters({ category, onCategoryChange, sortBy, onSortByChange, shown, total }: GoalFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={category} onValueChange={(v) => onCategoryChange(v as GoalCategory | "all")}>
          <SelectTrigger aria-label="Filtrar por categoria" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {Object.values(GoalCategory).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {getGoalCategoryLabel(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as GoalSortBy)}>
          <SelectTrigger aria-label="Ordenar metas" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="targetDate">Ordenar por data alvo</SelectItem>
            <SelectItem value="name">Ordenar por nome</SelectItem>
            <SelectItem value="progress">Ordenar por progresso</SelectItem>
            <SelectItem value="priority">Ordenar por prioridade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Mostrando <strong className="font-semibold text-foreground">{shown}</strong> de{" "}
        <strong className="font-semibold text-foreground">{total}</strong> metas
      </p>
    </div>
  );
}
