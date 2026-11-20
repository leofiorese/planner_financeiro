"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Callout } from "@/components/common/Callout";
import { Field, MoneyInput, NumberInput } from "@/components/common/Field";
import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFinancialContext } from "@/context";
import { useTodayISO } from "@/hooks/useTodayISO";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/utils/format";
import { createDefaultBudget } from "@/utils/budget/normalize";
import { formatPeriodLabel, formatShortDate, getDaysRemaining, getPeriodForDate } from "@/utils/budget/period";
import { getBudgetAmountForPeriod } from "@/utils/budget/budgetCalculator";
import { getTotalReserve } from "@/utils/budget/goalReservation";

/**
 * Aba "Budget" da página de Configurações: ativação, valor por período, dia de virada,
 * pré-visualização do período e histórico dos valores.
 */
export default function BudgetSettingsSection() {
  const { state, setBudgetSettings, setBudgetAmount } = useFinancialContext();
  const todayISO = useTodayISO();
  const switchId = useId();

  const budget = state.userPlan.budget ?? createDefaultBudget();
  const goals = state.userPlan.goals;

  // Valores salvos (referência para "mudou?" e para o selo)
  const savedPeriod = getPeriodForDate(todayISO, budget.rolloverDay);
  const savedAmount = getBudgetAmountForPeriod(budget.amountHistory, savedPeriod);

  // Rascunho do formulário
  const [enabled, setEnabled] = useState(budget.enabled);
  const [amountInput, setAmountInput] = useState(savedAmount > 0 ? String(savedAmount) : "");
  const [dayInput, setDayInput] = useState(String(budget.rolloverDay));

  // O plano carrega de forma assíncrona: re-sincroniza o rascunho quando o valor salvo muda
  useEffect(() => {
    setEnabled(budget.enabled);
    setAmountInput(savedAmount > 0 ? String(savedAmount) : "");
    setDayInput(String(budget.rolloverDay));
  }, [budget.enabled, budget.rolloverDay, savedAmount]);

  const parsedAmount = Number(amountInput.replace(",", "."));
  const amountValid = amountInput.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const parsedDay = Number(dayInput);
  const dayValid = dayInput.trim() !== "" && Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 31;

  // Previews calculados com o rascunho
  const draftDay = dayValid ? parsedDay : budget.rolloverDay;
  const draftPeriod = useMemo(() => getPeriodForDate(todayISO, draftDay), [todayISO, draftDay]);
  const daysLeft = getDaysRemaining(draftPeriod, todayISO);
  const reserve = useMemo(() => getTotalReserve(goals, draftPeriod, draftDay), [goals, draftPeriod, draftDay]);
  const draftEffective = amountValid ? Math.max(0, parsedAmount - reserve.total) : null;

  const history = useMemo(
    () => [...budget.amountHistory].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1)),
    [budget.amountHistory],
  );

  const dirty =
    enabled !== budget.enabled ||
    (dayValid && parsedDay !== budget.rolloverDay) ||
    (amountValid && parsedAmount !== savedAmount);

  // Erros ao vivo: o botão Salvar fica desabilitado enquanto houver erro, e o motivo aparece no campo.
  const errors = {
    day: dayValid ? undefined : "Informe um dia de virada entre 1 e 31.",
    amount: enabled && !amountValid ? "Informe um valor maior que zero para ativar o budget." : undefined,
  };
  const hasErrors = Boolean(errors.day || errors.amount);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) return;

    setBudgetSettings({ enabled, rolloverDay: parsedDay });
    if (amountValid && (parsedAmount !== savedAmount || budget.amountHistory.length === 0)) {
      setBudgetAmount(parsedAmount);
    }
    toast.success(enabled ? "Budget salvo." : "Budget desativado.");
  };

  const badge = budget.enabled ? `${formatCurrency(savedAmount)} · vira dia ${budget.rolloverDay}` : "Desativado";

  return (
    <SectionCard
      title="Budget mensal"
      description="Defina quanto pode gastar por período, o dia em que o mês financeiro vira e reserve parte para as suas metas."
      actions={<Badge variant={budget.enabled ? "secondary" : "outline"}>{badge}</Badge>}
    >
      <form onSubmit={handleSave} className="space-y-5" noValidate>
        <div className="flex items-center gap-3">
          <Switch id={switchId} checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor={switchId} className="cursor-pointer text-sm font-semibold">
            Ativar budget mensal
          </Label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Valor do budget por período"
            error={errors.amount}
            hint={amountValid ? `${formatCurrency(parsedAmount)} por período` : undefined}
          >
            <MoneyInput value={amountInput} onChange={setAmountInput} placeholder="5000" />
          </Field>
          <Field
            label="Dia de virada"
            error={errors.day}
            hint="Se o mês não tiver esse dia, a virada acontece no último dia do mês."
          >
            <NumberInput min="1" max="31" step="1" inputMode="numeric" value={dayInput} onChange={setDayInput} />
          </Field>
        </div>

        <Callout tone="info">
          <p>
            Período atual: <strong>{formatPeriodLabel(draftPeriod, todayISO)}</strong> · faltam {daysLeft}{" "}
            {daysLeft === 1 ? "dia" : "dias"}
          </p>
          <p>
            {reserve.total > 0 ? (
              <>
                Metas reservando: <strong>{formatCurrency(reserve.total)}</strong>
                {draftEffective !== null && (
                  <>
                    {" "}
                    → disponível para gastar: <strong>{formatCurrency(draftEffective)}</strong>
                  </>
                )}{" "}
                ·{" "}
                <Link href="/goals" className="font-medium text-primary underline underline-offset-2">
                  ver metas
                </Link>
              </>
            ) : (
              <>
                Nenhuma meta reserva do budget ainda.{" "}
                <Link href="/goals" className="font-medium text-primary underline underline-offset-2">
                  Ir para Metas
                </Link>
              </>
            )}
          </p>
        </Callout>

        {history.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Histórico do valor</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {history.map((entry) => (
                <li key={entry.effectiveFrom}>
                  a partir de {formatShortDate(entry.effectiveFrom)}:{" "}
                  <strong className="text-foreground">{formatCurrency(entry.amount)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button type="submit" disabled={!dirty || hasErrors}>
          Salvar
        </Button>
      </form>
    </SectionCard>
  );
}
