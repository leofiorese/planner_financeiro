"use client";

import type { LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** Nome acessível do grupo. */
  "aria-label": string;
  size?: "sm" | "default";
  /** Ocupa toda a largura do container, sem quebrar linha (itens com a mesma largura). */
  fullWidth?: boolean;
  className?: string;
}

/** Seleção exclusiva em formato de botões segmentados (ToggleGroup do shadcn, `aria-pressed`). */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "default",
  fullWidth = false,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size={size}
      value={value}
      // O Radix devolve "" ao clicar no item já selecionado; mantemos a seleção atual.
      onValueChange={(next) => next && onValueChange(next as T)}
      aria-label={rest["aria-label"]}
      className={cn(fullWidth ? "w-full" : "flex-wrap justify-start", className)}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <ToggleGroupItem key={optionValue} value={optionValue} aria-label={label} className={cn("gap-1.5 px-3", fullWidth && "flex-1")}>
          {Icon && <Icon className="size-4" aria-hidden />}
          <span>{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
