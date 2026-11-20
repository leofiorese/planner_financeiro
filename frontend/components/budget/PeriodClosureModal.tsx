"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Callout } from "@/components/common/Callout";
import { Field, NumberInput } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { BudgetGoalAllocation, Goal, UserPlan } from "@/types";
import { formatCurrency } from "@/utils/format";
import { computeClosureSummary, suggestClosureAllocations } from "@/utils/budget/budgetCalculator";
import type { BudgetPeriod } from "@/utils/budget/period";

export interface ClosureModalResult {
  status: "confirmed" | "skipped";
  allocations: BudgetGoalAllocation[];
  income: number;
  spent: number;
  budgetAmount: number;
}

interface PeriodClosurePanelProps {
  plan: UserPlan;
  period: BudgetPeriod;
  todayISO: string;
  /** Quantos períodos mais antigos serão gravados como "pulados" junto com a resposta */
  olderSkippedCount: number;
  /** Fechar (X, Esc ou "Perguntar depois"): não grava nada, pergunta de novo no próximo carregamento */
  onDismiss: () => void;
  onSubmit: (result: ClosureModalResult) => void;
}

const parseAmount = (text: string): number => {
  const n = Number(text.replace(",", "."));
  return text.trim() === "" ? 0 : n;
};

/** Metas que entram no fechamento: ativas, com opt-in. */
function optInGoals(plan: UserPlan): Goal[] {
  return plan.goals.filter((g) => g.isActive && g.reserveFromBudget);
}

/** Título do modal de fechamento. */
export const closureTitle = (periodLabel: string) => `Período ${periodLabel} encerrado`;

/**
 * Conteúdo do fechamento de período: resumo (receita, gasto, economia inferida), aporte sugerido
 * por meta (editável) e ações. Confirmar soma em `goal.currentAmount` (feito pelo reducer); Pular
 * grava só o registro. Não depende do Radix: o `Dialog` fica em `PeriodClosureModal`.
 */
export function PeriodClosurePanel({
  plan,
  period,
  todayISO,
  olderSkippedCount,
  onDismiss,
  onSubmit,
}: PeriodClosurePanelProps) {
  const summary = useMemo(() => computeClosureSummary(plan, period, todayISO), [plan, period, todayISO]);
  const suggestion = useMemo(() => suggestClosureAllocations(plan, period), [plan, period]);
  const goals = useMemo(() => optInGoals(plan), [plan]);

  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(suggestion.allocations.map((a) => [a.goalId, a.amount > 0 ? String(a.amount) : "0"])),
  );

  const parsed = goals.map((g) => ({ goal: g, value: parseAmount(amounts[g.id] ?? "0") }));
  const invalid = parsed.some((p) => !Number.isFinite(p.value) || p.value < 0);
  const total = parsed.reduce((sum, p) => sum + (Number.isFinite(p.value) && p.value > 0 ? p.value : 0), 0);

  const snapshot = {
    income: summary.income,
    spent: summary.spent,
    budgetAmount: summary.budgetAmount,
  };

  const handleConfirm = () => {
    if (invalid) return;
    onSubmit({
      status: "confirmed",
      allocations: parsed
        .filter((p) => p.value > 0)
        .map((p) => ({ goalId: p.goal.id, amount: Math.round(p.value * 100) / 100 })),
      ...snapshot,
    });
  };

  const handleSkip = () => onSubmit({ status: "skipped", allocations: [], ...snapshot });

  const hasGoals = goals.length > 0;
  const shortOfReserves = hasGoals && summary.inferredSavings > 0 && summary.inferredSavings < summary.reserveTotal;
  const savingsPositive = summary.inferredSavings >= 0;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border bg-muted/40 p-3">
          <dt className="text-xs font-medium text-muted-foreground">Receita</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(summary.income)}</dd>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3">
          <dt className="text-xs font-medium text-muted-foreground">Gasto</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(summary.spent)}</dd>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3">
          <dt className="text-xs font-medium text-muted-foreground">Economia inferida</dt>
          <dd className={cn("font-semibold tabular-nums", savingsPositive ? "text-income" : "text-expense")}>
            {savingsPositive ? "" : "−"}
            {formatCurrency(Math.abs(summary.inferredSavings))}
          </dd>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3">
          <dt className="text-xs font-medium text-muted-foreground">Budget</dt>
          <dd className="flex flex-wrap items-center gap-x-2 font-semibold tabular-nums">
            {formatCurrency(summary.budgetAmount)}
            {summary.budgetAmount > 0 &&
              (summary.withinBudget ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <CheckCircle2 className="size-4" aria-hidden /> dentro
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                  <XCircle className="size-4" aria-hidden /> estourou
                </span>
              ))}
          </dd>
        </div>
      </dl>

      {hasGoals ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Aporte nas metas</h3>
          {summary.inferredSavings <= 0 && (
            <Callout tone="warning" role="status">
              <p>Não houve economia estimada neste período, então a sugestão é zero. Você pode editar os valores.</p>
            </Callout>
          )}
          {shortOfReserves && (
            <Callout tone="warning" role="status">
              <p>A economia estimada não cobre todas as reservas; os valores foram distribuídos proporcionalmente.</p>
            </Callout>
          )}
          <ul className="space-y-2">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Field label={goal.name} className="flex items-center justify-between gap-3 space-y-0">
                  <NumberInput
                    min="0"
                    step="0.01"
                    className="w-36 text-right"
                    value={amounts[goal.id] ?? "0"}
                    onChange={(v) => setAmounts((prev) => ({ ...prev, [goal.id]: v }))}
                  />
                </Field>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Total do aporte</span>
            <strong className="tabular-nums">{formatCurrency(total)}</strong>
          </div>
          {invalid && (
            <p role="alert" className="text-xs font-medium text-destructive">
              Use valores maiores ou iguais a zero.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma meta reserva do budget, então não há aporte para registrar.</p>
      )}

      {olderSkippedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {olderSkippedCount === 1
            ? "Há outro período mais antigo sem fechamento; ele será marcado como pulado."
            : `Há outros ${olderSkippedCount} períodos mais antigos sem fechamento; eles serão marcados como pulados.`}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDismiss}>
          Perguntar depois
        </Button>
        {hasGoals && (
          <Button type="button" variant="secondary" onClick={handleSkip}>
            Pular este período
          </Button>
        )}
        <Button type="button" onClick={handleConfirm} disabled={invalid}>
          {hasGoals ? "Confirmar aporte" : "Ok"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Modal de fim de período. O `Dialog` (Radix) cuida de `role="dialog"`, foco preso, Esc e
 * devolução do foco; fechar por X/Esc equivale a "Perguntar depois".
 */
export default function PeriodClosureModal(props: PeriodClosurePanelProps) {
  const label = useMemo(
    () => computeClosureSummary(props.plan, props.period, props.todayISO).label,
    [props.plan, props.period, props.todayISO],
  );

  return (
    <Dialog open onOpenChange={(open) => !open && props.onDismiss()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{closureTitle(label)}</DialogTitle>
          <DialogDescription>Veja como foi o período e registre o aporte nas suas metas.</DialogDescription>
        </DialogHeader>
        <PeriodClosurePanel {...props} />
      </DialogContent>
    </Dialog>
  );
}
