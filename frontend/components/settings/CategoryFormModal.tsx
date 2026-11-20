"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { EmojiPicker } from "@/components/settings/EmojiPicker";
import { Input } from "@/components/ui/input";
import type { ExpenseCategoryConfig } from "@/types";

export interface CategoryDraft {
  emoji: string;
  name: string;
  color: string;
}

export const NEW_CATEGORY_DRAFT: CategoryDraft = { emoji: "🏷️", name: "", color: "#6366f1" };

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categoria em edição; `null` para criar uma nova. */
  category: ExpenseCategoryConfig | null;
  onSubmit: (draft: CategoryDraft) => Promise<void>;
}

export function CategoryFormModal({ open, onOpenChange, category, onSubmit }: CategoryFormModalProps) {
  const [draft, setDraft] = useState<CategoryDraft>(NEW_CATEGORY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  // Sempre que o modal abre, parte do estado da categoria (ou de uma nova, vazia).
  useEffect(() => {
    if (open) {
      setDraft(
        category ? { emoji: category.emoji, name: category.name, color: category.color } : NEW_CATEGORY_DRAFT,
      );
    }
  }, [open, category]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } catch {
      /* o toast de erro é exibido por quem chama; o modal continua aberto */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Editar categoria" : "Nova categoria"}
      description="Defina o emoji, o nome e a cor usada nos gráficos."
      submitLabel={category ? "Salvar alterações" : "Adicionar categoria"}
      submitting={submitting}
      submitDisabled={!draft.name.trim()}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Emoji" hint="Digite ou escolha um da lista">
          {(p) => (
            <div className="flex items-center gap-2">
              <Input
                {...p}
                value={draft.emoji}
                onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                maxLength={4}
                className="w-16 text-center text-base"
                placeholder="🏷️"
              />
              <EmojiPicker onSelect={(emoji) => setDraft({ ...draft, emoji })} />
            </div>
          )}
        </Field>

        <Field label="Cor no gráfico">
          {(p) => (
            <div className="flex items-center gap-2">
              <input
                {...p}
                type="color"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="size-9 cursor-pointer rounded-md border bg-card p-0.5 pointer-coarse:size-11"
              />
              <span className="font-mono text-xs text-muted-foreground">{draft.color}</span>
            </div>
          )}
        </Field>

        <Field label="Nome da categoria" required className="sm:col-span-2">
          <Input
            type="text"
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Ex: Pets, Assinaturas, Impostos..."
          />
        </Field>
      </div>
    </FormModal>
  );
}
