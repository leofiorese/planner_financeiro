/**
 * Lembrete mensal de lançamento (puro: `today` é sempre parâmetro).
 *
 * Aparece a partir do dia X do mês (mês curto usa o último dia) enquanto o mês corrente não tiver
 * lançamento. "Lembrar depois" esconde só no dia em que foi clicado. Um mês que passou sem
 * lançamento não gera lembrete próprio: vale sempre o mês corrente.
 */
import { clampDay, parseLocalDate, toLocalISODate, toLocalISOMonth } from "../dates";

export interface ReminderInput {
  /** "YYYY-MM-DD" (hora local) */
  today: string;
  /** 1–31 */
  reminderDay: number;
  /** Meses já lançados ("YYYY-MM") */
  snapshotMonths: readonly string[];
  /** Dia ("YYYY-MM-DD") em que o usuário escolheu "Lembrar depois", se houver */
  snoozedOn?: string | null;
}

/** Data ("YYYY-MM-DD") em que o lembrete do mês de `today` começa a valer. */
export function reminderDueDate(today: string, reminderDay: number): string {
  const d = parseLocalDate(today);
  return toLocalISODate(clampDay(d.getFullYear(), d.getMonth(), reminderDay));
}

export function shouldShowReminder({ today, reminderDay, snapshotMonths, snoozedOn }: ReminderInput): boolean {
  const d = parseLocalDate(today);
  if (isNaN(d.getTime())) return false;
  if (snapshotMonths.includes(toLocalISOMonth(d))) return false;
  if (snoozedOn && snoozedOn === today) return false;
  return today >= reminderDueDate(today, reminderDay);
}
