"use client";

import { useEffect, useState } from "react";
import { DateField, Field, MoneyInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import GoalBudgetFields from "@/components/budget/GoalBudgetFields";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoalCategory, GoalType, Priority, type CreateGoalInput, type Goal } from "@/types";
import { getGoalBudgetFormError } from "@/utils/budget/goalForm";
import { getGoalCategoryLabel, getPriorityLabel } from "@/utils/labels";

export const emptyGoalForm = (): CreateGoalInput => ({
  name: "",
  targetAmount: 0,
  targetDate: "",
  currentAmount: 0,
  description: "",
  category: GoalCategory.OTHER,
  priority: Priority.MEDIUM,
  isActive: true,
  goalType: GoalType.FIXED_AMOUNT,
  priorityOrder: 1,
  reserveFromBudget: false,
  budgetReserveOverride: null,
});

const goalToForm = (goal: Goal): CreateGoalInput => ({
  name: goal.name,
  targetAmount: goal.targetAmount,
  targetDate: goal.targetDate,
  currentAmount: goal.currentAmount,
  description: goal.description || "",
  category: goal.category,
  priority: goal.priority,
  isActive: goal.isActive,
  goalType: goal.goalType,
  priorityOrder: goal.priorityOrder,
  reserveFromBudget: goal.reserveFromBudget ?? false,
  budgetReserveOverride: goal.budgetReserveOverride ?? null,
});

interface GoalFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Meta em edição; `null` para criar. */
  goal: Goal | null;
  onSubmit: (values: CreateGoalInput) => Promise<void>;
}

export function GoalFormModal({ open, onOpenChange, goal, onSubmit }: GoalFormModalProps) {
  const [form, setForm] = useState<CreateGoalInput>(emptyGoalForm);
  const [submitting, setSubmitting] = useState(false);
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(goal ? goalToForm(goal) : emptyGoalForm());
      setBudgetFormError(null);
    }
  }, [open, goal]);

  const patch = (values: Partial<CreateGoalInput>) => setForm((prev) => ({ ...prev, ...values }));

  const handleSubmit = async () => {
    const budgetError = getGoalBudgetFormError(form);
    setBudgetFormError(budgetError);
    if (budgetError) return;

    setSubmitting(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch {
      /* o toast de erro é exibido por quem chama */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Editar meta" : "Nova meta"}
      submitLabel={goal ? "Salvar alterações" : "Adicionar meta"}
      submitting={submitting}
      onSubmit={handleSubmit}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Nome do objetivo" required>
          <Input
            type="text"
            required
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Ex: Fundo de Emergência, Viagem..."
          />
        </Field>

        <Field label="Categoria" required>
          {(p) => (
            <Select value={form.category} onValueChange={(v) => patch({ category: v as GoalCategory })}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(GoalCategory).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {getGoalCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Valor alvo" required>
          <MoneyInput
            required
            value={form.targetAmount || ""}
            onChange={(v) => patch({ targetAmount: parseFloat(v) || 0 })}
            placeholder="0,00"
          />
        </Field>

        <Field label="Valor atual">
          <MoneyInput
            value={form.currentAmount || ""}
            onChange={(v) => patch({ currentAmount: parseFloat(v) || 0 })}
            placeholder="0,00"
          />
        </Field>

        <Field label="Data alvo" required>
          {(p) => <DateField id={p.id} required value={form.targetDate} onChange={(v) => patch({ targetDate: v })} />}
        </Field>

        <Field label="Prioridade">
          {(p) => (
            <Select value={form.priority} onValueChange={(v) => patch({ priority: v as Priority })}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Priority).map((pr) => (
                  <SelectItem key={pr} value={pr}>
                    {getPriorityLabel(pr)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Descrição" className="md:col-span-3">
          <Input
            type="text"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Detalhes ou observações sobre o objetivo..."
          />
        </Field>
      </div>

      <GoalBudgetFields
        key={goal?.id ?? "new-goal"}
        value={form}
        onChange={patch}
        error={budgetFormError}
      />
    </FormModal>
  );
}
