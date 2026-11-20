"use client";

import { Plus, Wrench } from "lucide-react";
import { getMaintenanceBadge } from "@/components/car/car-constants";
import type { MaintenanceLog } from "@/components/car/car-types";
import { EmptyState } from "@/components/common/EmptyState";
import { RowActions } from "@/components/common/RowActions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/utils/format";

interface MaintenanceTabProps {
  logs: MaintenanceLog[];
  canCreate: boolean;
  onCreate: () => void;
  onEdit: (log: MaintenanceLog) => void;
  onDelete: (log: MaintenanceLog) => void;
}

export function MaintenanceTab({ logs, canCreate, onCreate, onEdit, onDelete }: MaintenanceTabProps) {

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Histórico de manutenções e serviços ({logs.length})</h2>
          <p className="text-sm text-muted-foreground">
            Controle trocas de óleo, pneus, freios e o agendamento das próximas revisões
          </p>
        </div>
        <Button onClick={onCreate} disabled={!canCreate}>
          <Plus aria-hidden />
          Nova manutenção
        </Button>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Nenhuma manutenção registrada"
          description='Clique em "Nova manutenção" para registrar trocas de óleo, revisões ou reparos.'
        />
      ) : (
        <ul className="space-y-3">
          {logs.map((m) => {
            const badge = getMaintenanceBadge(m.type);
            return (
              <li
                key={m.id}
                className="flex flex-col justify-between gap-3.5 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                        badge.bg,
                      )}
                    >
                      {badge.label}
                    </span>
                    <span className="text-sm font-semibold">{m.description}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      <strong className="font-semibold">Data:</strong> {formatDate(m.date)}
                    </span>
                    {m.odometer ? (
                      <span>
                        <strong className="font-semibold">Odômetro:</strong> {m.odometer.toLocaleString("pt-BR")} km
                      </span>
                    ) : null}
                    {m.workshop && (
                      <span>
                        <strong className="font-semibold">Oficina:</strong> {m.workshop}
                      </span>
                    )}
                    {(m.nextDate || m.nextOdometer) && (
                      <span className="font-semibold text-warning">
                        <strong>Próxima:</strong> {m.nextDate ? formatDate(m.nextDate) : ""}
                        {m.nextDate && m.nextOdometer ? " / " : ""}
                        {m.nextOdometer ? `${m.nextOdometer.toLocaleString("pt-BR")} km` : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
                  <span className="text-base font-semibold tabular-nums">{formatCurrency(m.cost)}</span>
                  <RowActions
                    itemLabel={`manutenção ${m.description}`}
                    onEdit={() => onEdit(m)}
                    onDelete={() => onDelete(m)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
