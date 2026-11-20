import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  /** Quantidade de cards de KPI no topo. */
  stats?: number;
  /** Quantidade de linhas na lista/tabela. */
  rows?: number;
  className?: string;
}

/** Skeleton genérico de página: cabeçalho, grid de KPIs e lista. */
export function PageSkeleton({ stats = 4, rows = 5, className }: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando...</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Estado de carregamento compacto para áreas menores (um card, um gráfico). */
export function LoadingState({ className, label = "Carregando..." }: { className?: string; label?: string }) {
  return (
    <div
      className={cn("flex min-h-48 items-center justify-center", className)}
      role="status"
      aria-live="polite"
    >
      <Skeleton className="h-24 w-full max-w-md rounded-xl" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
