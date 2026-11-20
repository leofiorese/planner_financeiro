"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

interface ThemeMenuProps {
  /** Mantém o rótulo visível mesmo com a sidebar recolhida (ex.: drawer mobile). */
  forceExpanded?: boolean;
  className?: string;
}

/** Seletor de tema (Claro / Escuro / Sistema) usado no rodapé da sidebar. */
export function ThemeMenu({ forceExpanded = false, className }: ThemeMenuProps) {
  const { theme, setTheme } = useTheme();
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Tema: ${current.label}`}
        className={cn(
          "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors pointer-coarse:h-11",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          !forceExpanded &&
            "[[data-sidebar=collapsed]_&]:justify-center [[data-sidebar=collapsed]_&]:px-0",
          className,
        )}
      >
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className={cn("truncate", !forceExpanded && "[[data-sidebar=collapsed]_&]:hidden")}>
          Tema: {current.label}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
          {OPTIONS.map(({ value, label, icon: ItemIcon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <ItemIcon className="size-4" aria-hidden />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
