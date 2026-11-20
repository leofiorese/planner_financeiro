"use client";

import React, { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { Callout } from "@/components/common/Callout";
import { Field, MoneyInput } from "@/components/common/Field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFinancialState } from "@/context";
import { useTodayISO } from "@/hooks/useTodayISO";
import type { Goal } from "@/types";
import { GoalType } from "@/types";
import { formatCurrency } from "@/utils/format";
import { createDefaultBudget } from "@/utils/budget/normalize";
import { countPeriodsBetween, getPeriodForDate } from "@/utils/budget/period";
import { getGoalReserve, getSuggestedGoalReserve, getTotalReserve } from "@/utils/budget/goalReservation";

type GoalBudgetDraft = Pick<
  Goal,
  "goalType" | "targetAmount" | "currentAmount" | "targetDate" | "reserveFromBudget" | "budgetReserveOverride"
>;

interface GoalBudgetFieldsProps {
  value: GoalBudgetDraft;
  onChange: (patch: Partial<Pick<Goal, "reserveFromBudget" | "budgetReserveOverride">>) => void;
  error?: string | null;
}

/**
 * Campos de "Reservar do budget mensal" do formulário de metas.
 * Use `key` (ex.: id da meta em edição) para reiniciar o estado local ao trocar de meta.
 */
export default function GoalBudgetFields({ value, onChange, error }: GoalBudgetFieldsProps) {
  const { userPlan } = useFinancialState();
  const todayISO = useTodayISO();
  const switchId = useId();
  const budget = userPlan.budget ?? createDefaultBudget();

  const isOpenEnded = value.goalType === GoalType.OPEN_ENDED;
  const [manualMode, setManualMode] = useState(
    value.budgetReserveOverride !== null && value.budgetReserveOverride !== undefined,
  );
  const [manualText, setManualText] = useState(
    value.budgetReserveOverride !== null && value.budgetReserveOverride !== undefined
      ? String(value.budgetReserveOverride)
      : "",
  );

  const currentPeriod = getPeriodForDate(todayISO, budget.rolloverDay);
  const draftGoal = useMemo(() => ({ id: "draft", isActive: true, ...value }) as Goal, [value]);
  const suggested = value.targetDate ? getSuggestedGoalReserve(draftGoal, currentPeriod, budget.rolloverDay) : 0;
  const periodsLeft = value.targetDate
    ? Math.max(1, countPeriodsBetween(currentPeriod, value.targetDate, budget.rolloverDay))
    : 0;
  const showManual = isOpenEnded || manualMode;

  const startManual = () => {
    const initial = suggested > 0 ? String(Math.round(suggested * 100) / 100) : "";
    setManualMode(true);
    setManualText(initial);
    onChange({ budgetReserveOverride: initial === "" ? null : Number(initial) });
  };

  const backToAuto = () => {
    setManualMode(false);
    setManualText("");
    onChange({ budgetReserveOverride: null });
  };

  const handleManualChange = (text: string) => {
    setManualText(text);
    const n = Number(text.replace(",", "."));
    onChange({ budgetReserveOverride: text.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n });
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <div className="flex items-center gap-3">
        <Switch
          id={switchId}
          checked={Boolean(value.reserveFromBudget)}
          onCheckedChange={(checked) => onChange({ reserveFromBudget: checked })}
        />
        <Label htmlFor={switchId} className="cursor-pointer text-sm font-semibold">
          Reservar do budget mensal
        </Label>
      </div>

      {value.reserveFromBudget && !budget.enabled && (
        <Callout tone="warning" role="status">
          <p>
            Ative o budget em{" "}
            <Link href="/settings" className="font-semibold underline underline-offset-2">
              Configurações
            </Link>{" "}
            para usar a reserva.
          </p>
        </Callout>
      )}

      {value.reserveFromBudget && (
        <div className="space-y-3 text-sm">
          {!isOpenEnded && !manualMode && (
            <p className="flex flex-wrap items-center gap-x-2">
              {value.targetDate ? (
                <span>
                  Reserva sugerida: <strong>{formatCurrency(suggested)}/período</strong> (
                  {periodsLeft === 1 ? "falta 1 período" : `faltam ${periodsLeft} períodos`})
                </span>
              ) : (
                <span>Informe a data alvo para calcular a reserva sugerida.</span>
              )}
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={startManual}>
                Definir valor manualmente
              </Button>
            </p>
          )}

          {showManual && (
            <div className="flex flex-wrap items-end gap-3">
              <Field
                label={`Reserva manual por período${isOpenEnded ? " *" : ""}`}
                className="w-48"
                hint={
                  isOpenEnded
                    ? "Esta meta não tem valor final, então não há como sugerir uma reserva automática."
                    : undefined
                }
              >
                <MoneyInput value={manualText} onChange={handleManualChange} placeholder="0,00" />
              </Field>
              {!isOpenEnded && (
                <Button type="button" variant="link" size="sm" className="mb-1.5 h-auto p-0" onClick={backToAuto}>
                  Voltar ao automático
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <Callout tone="danger" role="alert">
          <p>{error}</p>
        </Callout>
      )}
    </div>
  );
}

/** Selo da lista: "Reserva R$ 412/período" (ou "manual"). Não renderiza sem opt-in. */
export function GoalBudgetBadge({ goal }: { goal: Goal }) {
  const { userPlan } = useFinancialState();
  const todayISO = useTodayISO();
  const budget = userPlan.budget ?? createDefaultBudget();

  if (!goal.reserveFromBudget || !goal.isActive) return null;
  const period = getPeriodForDate(todayISO, budget.rolloverDay);
  const amount = getGoalReserve(goal, period, budget.rolloverDay);
  const isManual = goal.budgetReserveOverride !== null && goal.budgetReserveOverride !== undefined;

  return (
    <Badge
      variant="outline"
      className="border-success/40 bg-success/10 text-success"
      title={isManual ? "Reserva definida manualmente" : "Reserva calculada automaticamente"}
    >
      <Target aria-hidden /> Reserva {formatCurrency(amount)}/período{isManual ? " (manual)" : ""}
    </Badge>
  );
}

/** Resumo "Total reservado do budget: R$ 800/período". Não renderiza se nenhuma meta reserva. */
export function GoalsBudgetSummary({ goals }: { goals: Goal[] }) {
  const { userPlan } = useFinancialState();
  const todayISO = useTodayISO();
  const budget = userPlan.budget ?? createDefaultBudget();

  const { total, byGoal } = useMemo(
    () => getTotalReserve(goals, getPeriodForDate(todayISO, budget.rolloverDay), budget.rolloverDay),
    [goals, todayISO, budget.rolloverDay],
  );
  if (byGoal.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-5 py-3 text-sm shadow-xs">
      <span className="text-muted-foreground">
        Total reservado do budget: <strong className="tabular-nums text-foreground">{formatCurrency(total)}/período</strong>{" "}
        ({byGoal.length} {byGoal.length === 1 ? "meta" : "metas"})
      </span>
      {!budget.enabled && (
        <Link href="/settings" className="font-semibold text-warning underline underline-offset-2">
          Budget desativado: ative em Configurações
        </Link>
      )}
    </div>
  );
}
