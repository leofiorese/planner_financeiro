"use client";

import { useState } from "react";
import { CreditCard, Database, Palette, Tags, Wallet, type LucideIcon } from "lucide-react";
import BudgetSettingsSection from "@/components/budget/BudgetSettingsSection";
import { PageHeader } from "@/components/common/PageHeader";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { CardsSection } from "@/components/settings/CardsSection";
import { CategoriesSection } from "@/components/settings/CategoriesSection";
import { DataSection } from "@/components/settings/DataSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SectionKey = "budget" | "categories" | "cards" | "data" | "appearance";

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "budget", label: "Budget", icon: Wallet },
  { key: "categories", label: "Categorias", icon: Tags },
  { key: "cards", label: "Cartões", icon: CreditCard },
  { key: "data", label: "Dados", icon: Database },
  { key: "appearance", label: "Aparência", icon: Palette },
];

export default function SystemSettingsPage() {
  const [section, setSection] = useState<SectionKey>("budget");

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Configurações do sistema"
        description="Budget mensal, categorias, cartões de crédito, importação/exportação de dados e aparência."
      />

      <Tabs
        value={section}
        onValueChange={(v) => setSection(v as SectionKey)}
        orientation="vertical"
        className="flex-col gap-6 lg:flex-row lg:items-start"
      >
        <TabsList
          aria-label="Seções das configurações"
          className="h-auto w-full justify-start overflow-x-auto p-1 lg:w-56 lg:shrink-0 lg:flex-col lg:items-stretch lg:overflow-visible"
        >
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="shrink-0 justify-start gap-2 px-3 py-2 lg:flex-none">
              <Icon className="size-4" aria-hidden />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="budget">
            <BudgetSettingsSection alwaysOpen />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesSection />
          </TabsContent>
          <TabsContent value="cards">
            <CardsSection />
          </TabsContent>
          <TabsContent value="data">
            <DataSection />
          </TabsContent>
          <TabsContent value="appearance">
            <AppearanceSection />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
