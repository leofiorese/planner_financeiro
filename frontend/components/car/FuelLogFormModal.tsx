"use client";

import { useEffect, useState } from "react";
import { FUEL_TYPES, emptyFuelForm } from "@/components/car/car-constants";
import type { FuelFormValues, FuelLog } from "@/components/car/car-types";
import { DateField, Field, MoneyInput, NumberInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FuelLogFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  /** Registro em edição; `null` para criar. */
  log: FuelLog | null;
  onSubmit: (values: FuelFormValues) => Promise<void>;
}

export function FuelLogFormModal({ open, onOpenChange, vehicleId, log, onSubmit }: FuelLogFormModalProps) {
  const [form, setForm] = useState<FuelFormValues>(() => emptyFuelForm(vehicleId));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(log ? { ...log } : emptyFuelForm(vehicleId));
  }, [open, log, vehicleId]);

  const patch = (values: Partial<FuelFormValues>) => setForm((prev) => ({ ...prev, ...values }));

  // O valor total é recalculado quando litros ou preço por litro mudam.
  const withTotal = (next: Partial<FuelFormValues>) =>
    setForm((prev) => {
      const merged = { ...prev, ...next };
      if (merged.liters && merged.pricePerLiter) {
        merged.totalCost = +(merged.liters * merged.pricePerLiter).toFixed(2);
      }
      return merged;
    });

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
      title={log ? "Editar abastecimento" : "Registrar novo abastecimento"}
      submitLabel={log ? "Salvar alterações" : "Registrar abastecimento"}
      submitting={submitting}
      onSubmit={handleSubmit}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Data do abastecimento" required>
          {(p) => <DateField id={p.id} required value={form.date} onChange={(v) => patch({ date: v })} />}
        </Field>

        <Field label="Tipo de combustível" required>
          {(p) => (
            <Select value={form.fuelType} onValueChange={(v) => patch({ fuelType: v })}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field label="Litros abastecidos" required>
          <NumberInput
            step="0.01"
            min="0.01"
            required
            placeholder="Ex: 45.5"
            value={form.liters || ""}
            onChange={(v) => withTotal({ liters: parseFloat(v) || 0 })}
          />
        </Field>

        <Field label="Preço por litro" required>
          <MoneyInput
            step="0.001"
            min="0.01"
            required
            placeholder="Ex: 5.89"
            value={form.pricePerLiter || ""}
            onChange={(v) => withTotal({ pricePerLiter: parseFloat(v) || 0 })}
          />
        </Field>

        <Field label="Valor total" required>
          <MoneyInput
            required
            placeholder="Ex: 268.00"
            value={form.totalCost || ""}
            onChange={(v) => patch({ totalCost: parseFloat(v) || 0 })}
          />
        </Field>

        <Field label="Odômetro atual (km)">
          <NumberInput
            min="0"
            placeholder="Ex: 45200"
            value={form.odometer || ""}
            onChange={(v) => patch({ odometer: parseFloat(v) || 0 })}
          />
        </Field>

        <Field label="Posto / estabelecimento" className="sm:col-span-2">
          <Input
            type="text"
            placeholder="Ex: Posto Shell - Av. Paulista"
            value={form.station || ""}
            onChange={(e) => patch({ station: e.target.value })}
          />
        </Field>

        <Field label="Observações">
          <Input
            type="text"
            placeholder="Ex: Tanque cheio"
            value={form.notes || ""}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </Field>
      </div>
    </FormModal>
  );
}
