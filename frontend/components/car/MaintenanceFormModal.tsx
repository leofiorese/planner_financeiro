"use client";

import { useEffect, useState } from "react";
import { MAINTENANCE_TYPES, emptyMaintenanceForm } from "@/components/car/car-constants";
import type { MaintenanceFormValues, MaintenanceLog } from "@/components/car/car-types";
import { DateField, Field, MoneyInput, NumberInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MaintenanceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  /** Registro em edição; `null` para criar. */
  log: MaintenanceLog | null;
  onSubmit: (values: MaintenanceFormValues) => Promise<void>;
}

export function MaintenanceFormModal({ open, onOpenChange, vehicleId, log, onSubmit }: MaintenanceFormModalProps) {
  const [form, setForm] = useState<MaintenanceFormValues>(() => emptyMaintenanceForm(vehicleId));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(log ? { ...log } : emptyMaintenanceForm(vehicleId));
  }, [open, log, vehicleId]);

  const patch = (values: Partial<MaintenanceFormValues>) => setForm((prev) => ({ ...prev, ...values }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ ...form, vehicleId });
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
      title={log ? "Editar manutenção" : "Registrar nova manutenção"}
      submitLabel={log ? "Salvar alterações" : "Registrar manutenção"}
      submitting={submitting}
      onSubmit={handleSubmit}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Data do serviço" required>
          {(p) => <DateField id={p.id} required value={form.date} onChange={(v) => patch({ date: v })} />}
        </Field>

        <Field label="Tipo de manutenção" required>
          {(p) => (
            <Select value={form.type} onValueChange={(v) => patch({ type: v })}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map((mt) => (
                  <SelectItem key={mt.value} value={mt.value}>
                    {mt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Custo do serviço" required>
          <MoneyInput
            required
            placeholder="Ex: 450.00"
            value={form.cost || ""}
            onChange={(v) => patch({ cost: parseFloat(v) || 0 })}
          />
        </Field>

        <Field label="Descrição do serviço realizado" required className="sm:col-span-2">
          <Input
            type="text"
            required
            placeholder="Ex: Troca de óleo 5W30, filtro de óleo e filtro de ar"
            value={form.description || ""}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>

        <Field label="Odômetro no serviço (km)">
          <NumberInput
            min="0"
            placeholder="Ex: 45000"
            value={form.odometer || ""}
            onChange={(v) => patch({ odometer: parseFloat(v) || 0 })}
          />
        </Field>

        <Field label="Oficina / estabelecimento">
          <Input
            type="text"
            placeholder="Ex: Concessionária / Bosch Car"
            value={form.workshop || ""}
            onChange={(e) => patch({ workshop: e.target.value })}
          />
        </Field>

        <Field label="Próxima revisão (data prevista)">
          {(p) => <DateField id={p.id} value={form.nextDate || ""} onChange={(v) => patch({ nextDate: v })} />}
        </Field>

        <Field label="Próxima revisão (odômetro previsto)">
          <NumberInput
            min="0"
            placeholder="Ex: 55000"
            value={form.nextOdometer || ""}
            onChange={(v) => patch({ nextOdometer: parseFloat(v) || 0 })}
          />
        </Field>
      </div>
    </FormModal>
  );
}
