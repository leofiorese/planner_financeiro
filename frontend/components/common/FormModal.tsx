"use client";

import { useLayoutEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Chamado no submit do formulário (Enter ou botão Salvar). */
  onSubmit: () => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  /** Mostra spinner no botão e desabilita os controles. */
  submitting?: boolean;
  submitDisabled?: boolean;
  /** Ação à esquerda do rodapé (ex.: botão "Excluir" ao editar). */
  footerStart?: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}

/**
 * Modal central padrão para criar/editar. Fecha com Esc, prende o foco (Radix) e devolve o foco
 * ao elemento que o abriu. O corpo rola (`max-h-[85vh]` no total) e o footer fica fixo.
 */
export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  submitting = false,
  submitDisabled = false,
  footerStart,
  size = "md",
  className,
}: FormModalProps) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Guarda o elemento focado antes de abrir (o Radix só restaura o foco quando há <Trigger>).
  useLayoutEffect(() => {
    if (open) previouslyFocused.current = document.activeElement as HTMLElement | null;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 rounded-2xl p-0",
          size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl",
          className,
        )}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          previouslyFocused.current?.focus?.();
        }}
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <fieldset disabled={submitting} className="m-0 min-w-0 space-y-4 border-0 p-0">
              {children}
            </fieldset>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
            {footerStart && <div className="sm:mr-auto">{footerStart}</div>}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={submitting || submitDisabled}>
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
