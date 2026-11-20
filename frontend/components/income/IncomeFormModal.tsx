"use client";

import { useEffect, useState } from "react";
import { DateField, Field, MoneyInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Frequency, type CreateIncomeInput, type Income } from "@/types";
import { getFrequencyLabel } from "@/utils/format";

// TODO(Sprint 1 merge): usar utils/dates (data local) quando o helper existir.
const todayIso = () => new Date().toISOString().split("T")[0];

export const emptyIncomeForm = (): CreateIncomeInput => ({
  name: "",
  amount: 0,
  frequency: Frequency.MONTHLY,
  description: "",
  startDate: todayIso(),
  endDate: "",
  isActive: true,
});

const incomeToForm = (income: Income): CreateIncomeInput => ({
  name: income.name,
  amount: income.amount,
  frequency: income.frequency,
  description: income.description || "",
  startDate: income.startDate ? income.startDate.split("T")[0] : todayIso(),
  endDate: income.endDate ? income.endDate.split("T")[0] : "",
  isActive: income.isActive,
});

interface IncomeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Renda em edição; `null` para criar. */
  income: Income | null;
  onSubmit: (values: CreateIncomeInput) => Promise<void>;
}

export function IncomeFormModal({ open, onOpenChange, income, onSubmit }: IncomeFormModalProps) {
  const [form, setForm] = useState<CreateIncomeInput>(emptyIncomeForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(income ? incomeToForm(income) : emptyIncomeForm());
  }, [open, income]);

  const patch = (values: Partial<CreateIncomeInput>) => setForm((prev) => ({ ...prev, ...values }));

  const handleSubmit = async () => {
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
      title={income ? "Editar fonte de renda" : "Nova fonte de renda"}
      submitLabel={income ? "Salvar alterações" : "Adicionar renda"}
      submitting={submitting}
      onSubmit={handleSubmit}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Nome da renda" required>
          <Input
            type="text"
            required
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="ex: Salário, Freelance, Investimentos"
          />
        </Field>

        <Field label="Valor (BRL)" required>
          <MoneyInput
            required
            value={form.amount === 0 ? "" : form.amount}
            onChange={(v) => patch({ amount: parseFloat(v) || 0 })}
            placeholder="0,00"
          />
        </Field>

        <Field label="Frequência" required>
          {(p) => (
            <Select value={form.frequency} onValueChange={(v) => patch({ frequency: v as Frequency })}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Frequency).map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    {getFrequencyLabel(freq)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Data de início">
          {(p) => <DateField id={p.id} value={form.startDate} onChange={(v) => patch({ startDate: v })} />}
        </Field>

        <Field label="Data de término">
          {(p) => (
            <DateField id={p.id} value={form.endDate} onChange={(v) => patch({ endDate: v })} min={form.startDate} />
          )}
        </Field>

        <div className="flex items-end">
          <div className="flex w-full items-center gap-2.5 rounded-lg border bg-muted/40 p-2.5">
            <Checkbox
              id="income-active"
              checked={form.isActive}
              onCheckedChange={(v) => patch({ isActive: v === true })}
            />
            <Label htmlFor="income-active" className="font-medium">
              Fonte ativa (incluir no total mensal)
            </Label>
          </div>
        </div>

        <Field label="Descrição" className="md:col-span-3">
          <Input
            type="text"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Detalhes adicionais sobre esta fonte de renda..."
          />
        </Field>
      </div>
    </FormModal>
  );
}
