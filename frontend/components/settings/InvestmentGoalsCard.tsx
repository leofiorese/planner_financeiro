"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, MoneyInput, NumberInput } from "@/components/common/Field";
import { SectionCard } from "@/components/common/SectionCard";
import type { InvestmentsApi } from "@/components/investments/hooks/useInvestments";
import MonthPicker from "@/components/MonthPicker";
import { Button } from "@/components/ui/button";
import { withToast } from "@/lib/toast";
import type { InvestmentSettings } from "@/types";
import {
  draftToSettings,
  settingsToDraft,
  type SettingsDraft,
  type SettingsDraftErrors,
} from "@/utils/investments/normalize";

interface InvestmentGoalsCardProps {
  settings: InvestmentSettings;
  saveSettings: InvestmentsApi["saveSettings"];
}

/** Dia do lembrete mensal, meta de rentabilidade (% a.a.) e meta de patrimônio (R$ até um mês). */
export function InvestmentGoalsCard({ settings, saveSettings }: InvestmentGoalsCardProps) {
  const saved = useMemo(() => settingsToDraft(settings), [settings]);
  const [draft, setDraft] = useState<SettingsDraft>(saved);
  const [errors, setErrors] = useState<SettingsDraftErrors>({});
  const [saving, setSaving] = useState(false);

  // Recarregou do servidor: o formulário volta a refletir o que está salvo.
  useEffect(() => {
    setDraft(saved);
    setErrors({});
  }, [saved]);

  const dirty = (Object.keys(saved) as (keyof SettingsDraft)[]).some((k) => saved[k] !== draft[k]);
  const patch = (changes: Partial<SettingsDraft>) => setDraft((d) => ({ ...d, ...changes }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = draftToSettings(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await withToast(saveSettings(result.value), {
        success: "Configurações de investimentos salvas",
        error: (err) => (err instanceof Error && err.message ? err.message : "Não foi possível salvar"),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Lançamento mensal e metas"
      description="Quando o app deve pedir o lançamento do patrimônio e as metas que a carteira acompanha."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Dia do lembrete"
            required
            error={errors.reminderDay}
            hint="A partir deste dia, o app pede o lançamento do mês até você registrar. Em meses sem esse dia, vale o último."
          >
            <NumberInput
              min={1}
              max={31}
              step={1}
              inputMode="numeric"
              value={draft.reminderDay}
              onChange={(v) => patch({ reminderDay: v })}
            />
          </Field>

          <Field
            label="Meta de rentabilidade (% ao ano)"
            error={errors.targetReturnAnnual}
            hint="Ex.: 12 para 12% ao ano. Vazio = sem meta."
          >
            <NumberInput
              step="0.1"
              value={draft.targetReturnAnnual}
              onChange={(v) => patch({ targetReturnAnnual: v })}
              placeholder="12"
            />
          </Field>

          <Field label="Meta de patrimônio" error={errors.wealthTargetAmount} hint="Valor que você quer alcançar. Vazio = sem meta.">
            <MoneyInput
              value={draft.wealthTargetAmount}
              onChange={(v) => patch({ wealthTargetAmount: v })}
              placeholder="1000000"
            />
          </Field>

          <Field label="Alcançar até" error={errors.wealthTargetDate}>
            {(p) => (
              <div className="flex items-center gap-2">
                <MonthPicker
                  id={p.id}
                  value={draft.wealthTargetDate || null}
                  onChange={(v) => patch({ wealthTargetDate: v })}
                  placeholder="Escolha o mês"
                  className="min-w-0 flex-1"
                />
                {draft.wealthTargetDate && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => patch({ wealthTargetDate: "" })}>
                    Limpar
                  </Button>
                )}
              </div>
            )}
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
