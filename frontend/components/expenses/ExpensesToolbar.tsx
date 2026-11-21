"use client";

import { Search, X } from "lucide-react";
import { ExpenseFilters } from "@/components/expenses/ExpenseFilters";
import type { ExpenseFiltersState } from "@/components/expenses/hooks/useExpenseFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExpensesToolbarProps {
  filtersState: ExpenseFiltersState;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
}

export function ExpensesToolbar({ filtersState, filtersOpen, onFiltersOpenChange }: ExpensesToolbarProps) {
  const { filters, setFilter, clearFilters, activeFiltersCount } = filtersState;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <div className="relative w-full min-w-48 sm:max-w-md sm:flex-1">
        <Label htmlFor="expense-search" className="sr-only">
          Buscar despesas por nome, valor, cartão ou categoria
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
          placeholder="Buscar por nome, valor, cartão ou categoria..."
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
    </div>
  );
}
