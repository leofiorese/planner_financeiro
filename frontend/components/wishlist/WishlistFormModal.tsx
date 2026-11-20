"use client";

import { useEffect, useState } from "react";
import { DateField, Field, MoneyInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import {
  emptyWishlistForm,
  type WishlistFormValues,
  type WishlistItem,
} from "@/components/wishlist/useWishlist";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface WishlistFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item em edição; `null` para criar. */
  item: WishlistItem | null;
  onSubmit: (values: WishlistFormValues) => Promise<void>;
}

export function WishlistFormModal({ open, onOpenChange, item, onSubmit }: WishlistFormModalProps) {
  const [form, setForm] = useState<WishlistFormValues>(emptyWishlistForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      item
        ? {
            name: item.name,
            price: String(item.price),
            target_date: item.target_date ? String(item.target_date).slice(0, 10) : "",
            description: item.description || "",
            brand: item.brand || "",
            link1: item.link1 || "",
            link2: item.link2 || "",
            link3: item.link3 || "",
          }
        : emptyWishlistForm(),
    );
  }, [open, item]);

  const patch = (values: Partial<WishlistFormValues>) => setForm((prev) => ({ ...prev, ...values }));

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
      title={item ? "Editar item" : "Novo item"}
      submitLabel="Salvar"
      submitting={submitting}
      onSubmit={handleSubmit}
    >
      <Field label="Nome" required>
        <Input
          type="text"
          required
          placeholder="Ex: MacBook Pro M3"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Preço" required>
          <MoneyInput required placeholder="0,00" value={form.price} onChange={(v) => patch({ price: v })} />
        </Field>
        <Field label="Data desejada">
          {(p) => <DateField id={p.id} value={form.target_date} onChange={(v) => patch({ target_date: v })} />}
        </Field>
      </div>

      <Field label="Marca">
        <Input
          type="text"
          placeholder="Ex: Apple, Nike, Sony"
          value={form.brand}
          onChange={(e) => patch({ brand: e.target.value })}
        />
      </Field>

      <Field label="Descrição">
        <Textarea
          rows={2}
          placeholder="Notas, modelos e especificações..."
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none">Links (máx. 3)</legend>
        <div className="space-y-2">
          <Input
            type="url"
            aria-label="Link 1"
            placeholder="Link 1 (https://...)"
            value={form.link1}
            onChange={(e) => patch({ link1: e.target.value })}
          />
          <Input
            type="url"
            aria-label="Link 2"
            placeholder="Link 2 (https://...)"
            value={form.link2}
            onChange={(e) => patch({ link2: e.target.value })}
          />
          <Input
            type="url"
            aria-label="Link 3"
            placeholder="Link 3 (https://...)"
            value={form.link3}
            onChange={(e) => patch({ link3: e.target.value })}
          />
        </div>
      </fieldset>
    </FormModal>
  );
}
