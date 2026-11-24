"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { Input } from "@/components/ui/input";
import type { InvestmentClass } from "@/types";

export type ClassFormMode =
  | { kind: "create"; parent: InvestmentClass | null }
  | { kind: "edit"; cls: InvestmentClass };

interface InvestmentClassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ClassFormMode;
  onSubmit: (name: string) => Promise<void>;
}

function copyFor(mode: ClassFormMode) {
  if (mode.kind === "edit") {
    return {
      title: mode.cls.parentId ? "Renomear subclasse" : "Renomear categoria",
      description: undefined,
      submit: "Salvar alterações",
    };
  }
  return mode.parent
    ? { title: "Nova subclasse", description: `Será criada dentro de "${mode.parent.name}".`, submit: "Adicionar subclasse" }
    : {
        title: "Nova categoria",
        description: "Categorias agrupam subclasses. Se não tiver subclasses, a própria categoria recebe valores.",
        submit: "Adicionar categoria",
      };
}

/** Criar/renomear uma classe de ativo. */
export function InvestmentClassFormModal({ open, onOpenChange, mode, onSubmit }: InvestmentClassFormModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setName(mode.kind === "edit" ? mode.cls.name : "");
  }, [open, mode]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(name.trim());
      onOpenChange(false);
    } catch {
      /* o toast de erro é exibido por quem chama; o modal continua aberto */
    } finally {
      setSubmitting(false);
    }
  };

  const copy = copyFor(mode);

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
      submitLabel={copy.submit}
      submitting={submitting}
      submitDisabled={!name.trim()}
      onSubmit={handleSubmit}
    >
      <Field label="Nome" required>
        <Input
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Tesouro Direto, Private Equity..."
        />
      </Field>
    </FormModal>
  );
}
