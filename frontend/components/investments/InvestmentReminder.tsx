"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { useInvestmentsContext } from "@/components/investments/InvestmentsProvider";
import { SnapshotFormModal } from "@/components/investments/SnapshotFormModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTodayISO } from "@/hooks/useTodayISO";
import { formatMonth } from "@/utils/format";
import { shouldShowReminder } from "@/utils/investments/reminder";

const SNOOZE_KEY = "fp-investments-snooze";

function readSnooze(): string | null {
  try {
    return window.localStorage.getItem(SNOOZE_KEY);
  } catch {
    return null;
  }
}

function writeSnooze(day: string): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, day);
  } catch {
    /* sem localStorage (janela privada etc.): o aviso só não é lembrado entre recarregamentos */
  }
}

/**
 * Popup mensal: a partir do dia X (Configurações → Investimentos), até o mês estar lançado, pede o
 * lançamento do patrimônio. "Lembrar depois" (ou fechar) esconde o aviso até amanhã.
 */
export function InvestmentReminder() {
  const { data } = useInvestmentsContext();
  const today = useTodayISO();
  const [snoozedOn, setSnoozedOn] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    setSnoozedOn(readSnooze());
    setReady(true);
  }, []);

  const snooze = useCallback(() => {
    writeSnooze(today);
    setSnoozedOn(today);
  }, [today]);

  const due =
    ready &&
    data !== null &&
    shouldShowReminder({
      today,
      reminderDay: data.settings.reminderDay,
      snapshotMonths: data.snapshots.map((s) => s.month),
      snoozedOn,
    });

  const month = today.slice(0, 7);

  return (
    <>
      <Dialog open={due && !formOpen} onOpenChange={(open) => !open && snooze()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
              <CalendarClock className="size-5" />
            </div>
            <DialogTitle>Hora de lançar seu patrimônio</DialogTitle>
            <DialogDescription>
              Registre o saldo atual de cada classe de investimento e o que você aportou ou resgatou em {formatMonth(month)}.
              Leva um minuto e mantém a rentabilidade da carteira em dia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={snooze}>
              Lembrar depois
            </Button>
            <Button onClick={() => setFormOpen(true)}>Lançar agora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SnapshotFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          // Fechou sem salvar: não reabre o aviso até amanhã. (Salvando, o mês fica lançado e o aviso some.)
          if (!open) snooze();
        }}
        editing={null}
        initialMonth={month}
      />
    </>
  );
}
