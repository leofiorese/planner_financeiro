"use client";

import { useEffect, useMemo, useState } from "react";
import { DateField, Field, MoneyInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { useInvestmentsContext } from "@/components/investments/InvestmentsProvider";
import MonthPicker from "@/components/MonthPicker";
import { useTodayISO } from "@/hooks/useTodayISO";
import { withToast } from "@/lib/toast";
import type { InvestmentSnapshot } from "@/types";
import { daysInMonth } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import {
  buildSnapshotDraft,
  changeDraftMonth,
  draftBalanceTotal,
  draftToPayload,
  formLeafClasses,
  type EntryDraft,
  type SnapshotDraft,
  type SnapshotDraftErrors,
} from "@/utils/investments/snapshotForm";
import { buildClassTree } from "@/utils/investments/totals";

interface SnapshotFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lançamento em edição; `null` para um novo. */
  editing: InvestmentSnapshot | null;
  /** Mês sugerido para um lançamento novo (padrão: mês corrente). */
  initialMonth?: string;
}

const COLUMNS = [
  { key: "balance", label: "Saldo atual" },
  { key: "contributions", label: "Aportes no mês" },
  { key: "withdrawals", label: "Resgates no mês" },
] as const;

/** Lançamento mensal do patrimônio: saldo, aportes e resgates por classe de ativo. */
export function SnapshotFormModal({ open, onOpenChange, editing, initialMonth }: SnapshotFormModalProps) {
  const { data, saveSnapshot } = useInvestmentsContext();
  const today = useTodayISO();
  const classes = useMemo(() => data?.classes ?? [], [data?.classes]);
  const snapshots = useMemo(() => data?.snapshots ?? [], [data?.snapshots]);

  const [draft, setDraft] = useState<SnapshotDraft | null>(null);
  const [errors, setErrors] = useState<SnapshotDraftErrors>({ classes: {} });
  const [submitting, setSubmitting] = useState(false);

  // Sempre que abre, parte do lançamento em edição (ou de um novo, com os saldos do anterior).
  useEffect(() => {
    if (!open) return;
    setDraft(
      buildSnapshotDraft({
        month: initialMonth ?? today.slice(0, 7),
        today,
        classes,
        snapshots,
        editing,
      }),
    );
    setErrors({ classes: {} });
    // `today`/`classes`/`snapshots` mudando com o modal aberto não deve apagar o que foi digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, initialMonth]);

  const leafIds = useMemo(() => new Set(formLeafClasses(classes, editing).map((c) => c.id)), [classes, editing]);
  const groups = useMemo(
    () =>
      buildClassTree(classes, true)
        .map((node) => ({
          root: node.cls,
          hasChildren: node.children.length > 0,
          leaves: (node.children.length > 0 ? node.children : [node.cls]).filter((c) => leafIds.has(c.id)),
        }))
        .filter((g) => g.leaves.length > 0),
    [classes, leafIds],
  );

  if (!draft) return null;

  const [year, monthNum] = draft.month.split("-").map(Number);
  const validMonth = Boolean(year && monthNum);
  const total = draftBalanceTotal(draft);

  const setEntry = (classId: string, field: keyof EntryDraft, value: string) =>
    setDraft((d) => (d ? { ...d, entries: { ...d.entries, [classId]: { ...d.entries[classId], [field]: value } } } : d));

  const handleSubmit = async () => {
    const result = draftToPayload(draft, snapshots, editing?.id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({ classes: {} });
    setSubmitting(true);
    try {
      await withToast(saveSnapshot(result.value), {
        success: editing ? "Lançamento atualizado" : "Lançamento salvo",
        error: (e) => (e instanceof Error && e.message ? e.message : "Não foi possível salvar o lançamento"),
      });
      onOpenChange(false);
    } catch {
      /* o toast de erro já foi exibido; o modal continua aberto */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={editing ? "Editar lançamento" : "Lançar patrimônio"}
      description="Informe o saldo atual de cada classe e o que você aportou ou resgatou no mês. Deixe em branco o que não tem."
      submitLabel={editing ? "Salvar alterações" : "Salvar lançamento"}
      submitting={submitting}
      onSubmit={handleSubmit}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mês" required error={errors.month}>
            {(p) => (
              <MonthPicker
                id={p.id}
                value={draft.month || null}
                onChange={(m) => setDraft((d) => (d ? changeDraftMonth(d, m, today) : d))}
                placeholder="Escolha o mês"
              />
            )}
          </Field>
          <Field label="Data do lançamento" required error={errors.date} hint="Dia em que você conferiu os saldos.">
            {(p) => (
              <DateField
                id={p.id}
                value={draft.date}
                onChange={(date) => setDraft((d) => (d ? { ...d, date } : d))}
                min={validMonth ? `${draft.month}-01` : undefined}
                max={validMonth ? `${draft.month}-${String(daysInMonth(year, monthNum - 1)).padStart(2, "0")}` : undefined}
              />
            )}
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm" aria-live="polite">
          <span className="text-muted-foreground">Patrimônio informado</span>
          <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
        </div>

        {errors.entries && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.entries}
          </p>
        )}

        <div className="space-y-4">
          <div
            aria-hidden
            className="hidden grid-cols-[minmax(0,1fr)_repeat(3,9rem)] gap-3 px-1 text-xs font-medium text-muted-foreground md:grid"
          >
            <span>Classe</span>
            {COLUMNS.map((c) => (
              <span key={c.key}>{c.label}</span>
            ))}
          </div>

          {groups.map((group) => (
            <section key={group.root.id} aria-label={group.root.name} className="space-y-2">
              {group.hasChildren && <h3 className="px-1 text-sm font-semibold">{group.root.name}</h3>}
              <ul className="divide-y overflow-hidden rounded-xl border">
                {group.leaves.map((leaf) => {
                  const entry = draft.entries[leaf.id];
                  const rowError = errors.classes[leaf.id];
                  return (
                    <li key={leaf.id} className="space-y-2 bg-card p-3">
                      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,1fr)_repeat(3,9rem)]">
                        <div className="flex min-h-9 items-center gap-2 text-sm font-medium md:pr-2">
                          <span className="truncate">{leaf.name}</span>
                          {leaf.archived && <span className="text-xs text-muted-foreground">(arquivada)</span>}
                        </div>
                        {COLUMNS.map((c) => (
                          <Field key={c.key} label={`${leaf.name}: ${c.label}`} srOnlyLabel>
                            {(p) => (
                              <div>
                                <span className="mb-1 block text-xs text-muted-foreground md:hidden" aria-hidden>
                                  {c.label}
                                </span>
                                <MoneyInput
                                  {...p}
                                  value={entry?.[c.key] ?? ""}
                                  onChange={(v) => setEntry(leaf.id, c.key, v)}
                                  placeholder="0,00"
                                />
                              </div>
                            )}
                          </Field>
                        ))}
                      </div>
                      {rowError && (
                        <p role="alert" className="text-xs font-medium text-destructive">
                          {rowError}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </FormModal>
  );
}
