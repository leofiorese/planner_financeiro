"use client";

import { useEffect, useState } from "react";
import { emptyVehicleForm } from "@/components/car/car-constants";
import type { Vehicle, VehicleFormValues } from "@/components/car/car-types";
import { Field, NumberInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { Input } from "@/components/ui/input";

interface VehicleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Veículo em edição; `null` para cadastrar. */
  vehicle: Vehicle | null;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
}

export function VehicleFormModal({ open, onOpenChange, vehicle, onSubmit }: VehicleFormModalProps) {
  const [form, setForm] = useState<VehicleFormValues>(emptyVehicleForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(vehicle ? { ...vehicle } : emptyVehicleForm());
  }, [open, vehicle]);

  const patch = (values: Partial<VehicleFormValues>) => setForm((prev) => ({ ...prev, ...values }));

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
      title={vehicle ? "Editar dados do veículo" : "Cadastrar novo veículo"}
      submitLabel={vehicle ? "Salvar alterações" : "Cadastrar veículo"}
      submitting={submitting}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome de identificação" required className="sm:col-span-2">
          <Input
            type="text"
            required
            placeholder="Ex: Meu Civic, Carro da Família, Moto"
            value={form.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>

        <Field label="Marca / fabricante" required>
          <Input
            type="text"
            required
            placeholder="Ex: Honda, Toyota, VW"
            value={form.brand || ""}
            onChange={(e) => patch({ brand: e.target.value })}
          />
        </Field>
        <Field label="Modelo" required>
          <Input
            type="text"
            required
            placeholder="Ex: Civic Touring, Corolla"
            value={form.model || ""}
            onChange={(e) => patch({ model: e.target.value })}
          />
        </Field>

        <Field label="Ano de fabricação">
          <NumberInput
            min="1950"
            max={new Date().getFullYear() + 1}
            step="1"
            placeholder="Ex: 2022"
            value={form.year || ""}
            onChange={(v) => patch({ year: parseInt(v) || 0 })}
          />
        </Field>
        <Field label="Placa do veículo">
          <Input
            type="text"
            className="font-mono uppercase"
            placeholder="Ex: BRA2E19 ou ABC-1234"
            value={form.licensePlate || ""}
            onChange={(e) => patch({ licensePlate: e.target.value.toUpperCase() })}
          />
        </Field>

        <Field label="Odômetro atual (km)">
          <NumberInput
            min="0"
            placeholder="Ex: 45000"
            value={form.currentKm || ""}
            onChange={(v) => patch({ currentKm: parseFloat(v) || 0 })}
          />
        </Field>
        <Field label="Consumo estimado (km/L)">
          <NumberInput
            step="0.1"
            min="0"
            placeholder="Ex: 11.5"
            value={form.averageKmL || ""}
            onChange={(v) => patch({ averageKmL: parseFloat(v) || 0 })}
          />
        </Field>

        <Field label="Observações / notas" className="sm:col-span-2">
          <Input
            type="text"
            placeholder="Ex: Chassi, seguro, cor prata"
            value={form.notes || ""}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </Field>
      </div>
    </FormModal>
  );
}
