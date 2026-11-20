import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "primary" | "income" | "expense" | "warning";

const TONE_ICON: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  warning: "bg-warning/10 text-warning",
};

const TONE_VALUE: Record<StatTone, string> = {
  default: "text-foreground",
  primary: "text-foreground",
  income: "text-income",
  expense: "text-expense",
  warning: "text-warning",
};

export interface StatTrend {
  /** Texto exibido, ex.: "+12% vs. mês anterior". */
  label: string;
  direction: "up" | "down" | "flat";
  /** Se `true`, subir é ruim (ex.: despesas). Define a cor da seta. */
  inverted?: boolean;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: StatTrend;
  icon?: LucideIcon;
  tone?: StatTone;
  /** Valor em `text-lg` (para grids de muitos cards com valores monetários longos). */
  compact?: boolean;
  className?: string;
}

function TrendBadge({ trend }: { trend: StatTrend }) {
  const Icon = trend.direction === "up" ? ArrowUpRight : trend.direction === "down" ? ArrowDownRight : Minus;
  const good =
    trend.direction === "flat" ? null : (trend.direction === "up") !== Boolean(trend.inverted);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        good === null ? "text-muted-foreground" : good ? "text-income" : "text-expense",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {trend.label}
    </span>
  );
}

export function StatCard({ label, value, hint, trend, icon: Icon, tone = "default", compact, className }: StatCardProps) {
  return (
    <div className={cn("min-w-0 rounded-xl border bg-card p-4 shadow-xs sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE_ICON[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-2 truncate font-semibold tabular-nums",
          compact ? "text-lg" : "text-2xl",
          TONE_VALUE[tone],
        )}
      >
        {value}
      </div>
      {(hint || trend) && (
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {trend && <TrendBadge trend={trend} />}
          {hint && <span className="min-w-0 truncate">{hint}</span>}
        </div>
      )}
    </div>
  );
}
