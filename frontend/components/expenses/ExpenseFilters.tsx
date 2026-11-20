"use client";

import { Filter, X } from "lucide-react";
import { DateField, Field } from "@/components/common/Field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useFinancialState } from "@/context";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { PaymentMethod } from "@/types";
import { getOrderedCategories, getCategoryInfo } from "@/utils/categoryRules";
import { formatLocalizedDate } from "@/utils/dateFormatting";
import { getPaymentMethodLabel, getScheduleTypeLabel } from "@/utils/labels";
import type {
  ExpenseFiltersState,
  ScheduleTypeFilter,
  StatusFilter,
} from "@/components/expenses/hooks/useExpenseFilters";

type FilterProps = Pick<ExpenseFiltersState, "filters" | "setFilter" | "clearFilters" | "activeFiltersCount">;

function FiltersForm({ filters, setFilter, clearFilters, activeFiltersCount }: FilterProps) {
  const state = useFinancialState();
  const categories = getOrderedCategories(state.userPlan.expenseCategories);
  const creditCards = state.userPlan.creditCardAccounts || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Categoria">
          {(p) => (
            <Select value={filters.category} onValueChange={(v) => setFilter("category", v)}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Tipo">
          {(p) => (
            <Select
              value={filters.scheduleType}
              onValueChange={(v) => setFilter("scheduleType", v as ScheduleTypeFilter)}
            >
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="one_time">Única</SelectItem>
                <SelectItem value="recurring">Recorrente</SelectItem>
                <SelectItem value="installment">Parcelada</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Forma de pagamento">
          {(p) => (
            <Select
              value={filters.paymentMethod}
              onValueChange={(v) => setFilter("paymentMethod", v as PaymentMethod | "all")}
            >
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as formas</SelectItem>
                {Object.values(PaymentMethod).map((method) => (
                  <SelectItem key={method} value={method}>
                    {getPaymentMethodLabel(method)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Cartão de crédito">
          {(p) => (
            <Select value={filters.cardAccount} onValueChange={(v) => setFilter("cardAccount", v)}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cartões</SelectItem>
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name} (fecha {card.closingDay} / vence {card.dueDay})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Data início">
          {(p) => <DateField id={p.id} value={filters.startDate} onChange={(v) => setFilter("startDate", v)} />}
        </Field>

        <Field label="Data fim">
          {(p) => <DateField id={p.id} value={filters.endDate} onChange={(v) => setFilter("endDate", v)} />}
        </Field>

        <Field label="Status">
          {(p) => (
            <Select value={filters.status} onValueChange={(v) => setFilter("status", v as StatusFilter)}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Apenas ativas</SelectItem>
                <SelectItem value="inactive">Apenas inativas</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={clearFilters} disabled={activeFiltersCount === 0}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

interface ExpenseFiltersProps extends FilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Filtros avançados: Popover no desktop e Sheet (lateral) no mobile. O gatilho é o botão
 * "Filtros" com a contagem de filtros ativos.
 */
export function ExpenseFilters({ open, onOpenChange, ...filterProps }: ExpenseFiltersProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { activeFiltersCount } = filterProps;

  const trigger = (
    <Button
      type="button"
      variant={activeFiltersCount > 0 ? "secondary" : "outline"}
      onClick={isDesktop ? undefined : () => onOpenChange(true)}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <Filter aria-hidden />
      Filtros
      {activeFiltersCount > 0 && <Badge className="ml-0.5 px-1.5">{activeFiltersCount}</Badge>}
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="w-[36rem] max-w-[calc(100vw-2rem)]">
          <FiltersForm {...filterProps} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Refine a lista de despesas.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FiltersForm {...filterProps} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Chips removíveis dos filtros ativos, exibidos abaixo da toolbar. */
export function ActiveFilterChips({ filters, setFilter }: Pick<ExpenseFiltersState, "filters" | "setFilter">) {
  const state = useFinancialState();
  const creditCards = state.userPlan.creditCardAccounts || [];

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.category !== "all") {
    chips.push({
      key: "category",
      label: getCategoryInfo(filters.category, state.userPlan.expenseCategories).fullLabel,
      onRemove: () => setFilter("category", "all"),
    });
  }
  if (filters.scheduleType !== "all") {
    chips.push({
      key: "scheduleType",
      label: getScheduleTypeLabel(filters.scheduleType),
      onRemove: () => setFilter("scheduleType", "all"),
    });
  }
  if (filters.paymentMethod !== "all") {
    chips.push({
      key: "paymentMethod",
      label: getPaymentMethodLabel(filters.paymentMethod),
      onRemove: () => setFilter("paymentMethod", "all"),
    });
  }
  if (filters.cardAccount !== "all") {
    chips.push({
      key: "cardAccount",
      label: `Cartão: ${creditCards.find((c) => c.id === filters.cardAccount)?.name || filters.cardAccount}`,
      onRemove: () => setFilter("cardAccount", "all"),
    });
  }
  if (filters.startDate) {
    chips.push({
      key: "startDate",
      label: `De: ${formatLocalizedDate(filters.startDate)}`,
      onRemove: () => setFilter("startDate", ""),
    });
  }
  if (filters.endDate) {
    chips.push({
      key: "endDate",
      label: `Até: ${formatLocalizedDate(filters.endDate)}`,
      onRemove: () => setFilter("endDate", ""),
    });
  }
  if (filters.status !== "all") {
    chips.push({
      key: "status",
      label: `Status: ${filters.status === "active" ? "ativas" : "inativas"}`,
      onRemove: () => setFilter("status", "all"),
    });
  }

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Badge variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 text-xs font-medium">
            {chip.label}
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={`Remover filtro ${chip.label}`}
              className="flex size-5 items-center justify-center rounded-full hover:bg-foreground/10"
            >
              <X className="size-3" aria-hidden />
            </button>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
