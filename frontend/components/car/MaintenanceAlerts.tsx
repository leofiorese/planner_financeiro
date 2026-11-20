import { TriangleAlert } from "lucide-react";
import { getMaintenanceBadge } from "@/components/car/car-constants";
import type { MaintenanceLog } from "@/components/car/car-types";
import { formatDate } from "@/utils/format";

export function MaintenanceAlerts({ alerts }: { alerts: MaintenanceLog[] }) {
  if (alerts.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 shadow-xs"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          Manutenções e revisões próximas
          <span className="rounded bg-warning/20 px-1.5 py-0.5 text-xs font-medium text-warning">
            {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
          </span>
        </h2>
        <ul className="mt-1.5 space-y-1 text-sm">
          {alerts.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold">• {getMaintenanceBadge(m.type).label}:</span>
              <span>{m.description}</span>
              {m.nextDate && <span className="font-semibold underline">até {formatDate(m.nextDate)}</span>}
              {m.nextOdometer ? (
                <span className="text-muted-foreground">(ou até {m.nextOdometer.toLocaleString("pt-BR")} km)</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
