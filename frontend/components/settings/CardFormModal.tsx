"use client";

import { useEffect, useState } from "react";
import { Field, NumberInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { CreditCardAccountInfo } from "@/types";

export const CARD_COLOR_PALETTE = [
  { name: "Laranja (Inter)", hex: "#f97316" },
  { name: "Azul (XP / BTG)", hex: "#3b82f6" },
  { name: "Roxo (Nubank)", hex: "#8b5cf6" },
  { name: "Vermelho (Santander / Bradesco)", hex: "#ef4444" },
  { name: "Amarelo (C6 / BB)", hex: "#eab308" },
  { name: "Verde (Sicredi / Stone)", hex: "#10b981" },
  { name: "Grafite (Black / Infinite)", hex: "#334155" },
  { name: "Rosa", hex: "#ec4899" },
];

export interface CardDraft {
  name: string;
  closingDay: number;
  dueDay: number;
  color: string;
  isActive: boolean;
}

const NEW_CARD_DRAFT: CardDraft = { name: "", closingDay: 11, dueDay: 18, color: "#f97316", isActive: true };

interface CardFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cartão em edição; `null` para cadastrar um novo. */
  card: CreditCardAccountInfo | null;
  onSubmit: (draft: CardDraft) => Promise<void>;
}

export function CardFormModal({ open, onOpenChange, card, onSubmit }: CardFormModalProps) {
  const [draft, setDraft] = useState<CardDraft>(NEW_CARD_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraft(
      card
        ? {
            name: card.name,
            closingDay: card.closingDay,
            dueDay: card.dueDay,
            color: card.color || "#6366f1",
            isActive: card.isActive,
          }
        : NEW_CARD_DRAFT,
    );
  }, [open, card]);

  const handleSubmit = async () => {
    setError(null);
    if (!draft.name.trim()) {
      setError("Informe o nome do cartão.");
      return;
    }
    if (draft.closingDay < 1 || draft.closingDay > 31 || draft.dueDay < 1 || draft.dueDay > 31) {
      setError("Os dias de fechamento e vencimento devem estar entre 1 e 31.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ ...draft, name: draft.name.trim() });
      onOpenChange(false);
    } catch {
      setError("Não foi possível salvar o cartão.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={card ? `Editar cartão: ${card.name}` : "Novo cartão de crédito"}
      description="Defina os dias de fechamento e vencimento da fatura."
      submitLabel={card ? "Salvar alterações" : "Adicionar cartão"}
      submitting={submitting}
      onSubmit={handleSubmit}
    >
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nome do cartão / emissor" required className="sm:col-span-3">
          <Input
            type="text"
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Ex: Nubank, Inter, XP..."
          />
        </Field>

        <Field label="Dia de fechamento" required>
          <NumberInput
            min={1}
            max={31}
            step="1"
            required
            value={draft.closingDay}
            onChange={(v) => setDraft({ ...draft, closingDay: parseInt(v, 10) || 1 })}
          />
        </Field>

        <Field label="Dia de vencimento" required>
          <NumberInput
            min={1}
            max={31}
            step="1"
            required
            value={draft.dueDay}
            onChange={(v) => setDraft({ ...draft, dueDay: parseInt(v, 10) || 1 })}
          />
        </Field>

        <Field label="Cartão ativo">
          {(p) => (
            <div className="flex h-9 items-center pointer-coarse:h-11">
              <Switch
                id={p.id}
                checked={draft.isActive}
                onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked })}
              />
            </div>
          )}
        </Field>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium leading-none" id="card-color-label">
          Cor de identificação
        </span>
        <div role="group" aria-labelledby="card-color-label" className="flex flex-wrap items-center gap-2 pt-1">
          {CARD_COLOR_PALETTE.map((swatch) => (
            <button
              key={swatch.hex}
              type="button"
              aria-pressed={draft.color === swatch.hex}
              aria-label={swatch.name}
              onClick={() => setDraft({ ...draft, color: swatch.hex })}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors pointer-coarse:h-11",
                draft.color === swatch.hex ? "border-foreground bg-accent" : "hover:bg-accent/60",
              )}
            >
              <span className="size-3 rounded-full" style={{ backgroundColor: swatch.hex }} aria-hidden />
              {swatch.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>
    </FormModal>
  );
}
