"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { useTheme, type Theme } from "@/context/ThemeContext";

export function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <SectionCard
      title="Aparência"
      description="Escolha o tema da interface. No modo Sistema, o app acompanha a preferência do seu sistema operacional."
    >
      <div className="space-y-3">
        <SegmentedControl<Theme>
          aria-label="Tema da interface"
          value={theme}
          onValueChange={setTheme}
          options={[
            { value: "light", label: "Claro", icon: Sun },
            { value: "dark", label: "Escuro", icon: Moon },
            { value: "system", label: "Sistema", icon: Monitor },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Tema aplicado agora: {resolvedTheme === "dark" ? "escuro" : "claro"}.
        </p>
      </div>
    </SectionCard>
  );
}
