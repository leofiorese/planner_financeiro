"use client";

import { CalendarDays, List, Search, X } from "lucide-react";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ExpenseFilters } from "@/components/expenses/ExpenseFilters";
import { getGroupByLabel, getSortByLabel } from "@/components/expenses/expense-labels";
import type { ExpenseFiltersState } from "@/components/expenses/hooks/useExpenseFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseGroupBy, ExpenseSortBy } from "@/utils/expenseOperations";

export type ExpenseViewMode = "list" | "calendar";

interface ExpensesToolbarProps {
  viewMode: ExpenseViewMode;
  onViewModeChange: (mode: ExpenseViewMode) => void;
  filtersState: ExpenseFiltersState;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
}

export function ExpensesToolbar({
  viewMode,
  onViewModeChange,
  filtersState,
  filtersOpen,
  onFiltersOpenChange,
}: ExpensesToolbarProps) {
  const { filters, setFilter, clearFilters, activeFiltersCount, sortBy, setSortBy, groupBy, setGroupBy } =
    filtersState;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-xs">
        <SegmentedControl<ExpenseViewMode>
          aria-label="Modo de visualização"
          value={viewMode}
          onValueChange={onViewModeChange}
          options={[
            { value: "list", label: "Lista", icon: List },
            { value: "calendar", label: "Calendário (12 meses)", icon: CalendarDays },
          ]}
        />

        <div className="relative w-full min-w-48 sm:w-60">
          <Label htmlFor="expense-search" className="sr-only">
            Buscar despesas
          </Label>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="expense-search"
            type="search"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilter("search", "")}
              aria-label="Limpar busca"
              className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <ExpenseFilters
          open={filtersOpen}
          onOpenChange={onFiltersOpenChange}
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          activeFiltersCount={activeFiltersCount}
        />

        {activeFiltersCount > 0 && (
          <Button type="button" variant="link" className="h-auto p-0 text-destructive" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}

      {viewMode === "list" && (
        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as ExpenseSortBy)}>
            <SelectTrigger aria-label="Ordenar por" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ExpenseSortBy).map((option) => (
                <SelectItem key={option} value={option}>
                  {getSortByLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as ExpenseGroupBy)}>
            <SelectTrigger aria-label="Agrupar por" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ExpenseGroupBy).map((option) => (
                <SelectItem key={option} value={option}>
                  {getGroupByLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
