"use client";

import Link from "next/link";
import { ArrowRight, Car, Plus } from "lucide-react";
import { BarChart, Sparkline } from "@/components/car/car-charts";
import type { Vehicle } from "@/components/car/car-types";
import type { CarStatsData } from "@/components/car/hooks/useCarStats";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/CurrencyContext";
import { calculateMonthlyAmount } from "@/utils/expenseOperations";

interface OverviewTabProps {
  vehicle: Vehicle | undefined;
  vehicleCount: number;
  stats: CarStatsData;
  onCreateVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicle: Vehicle) => void;
}

function Detail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

export function OverviewTab({
  vehicle,
  vehicleCount,
  stats,
  onCreateVehicle,
  onEditVehicle,
  onDeleteVehicle,
}: OverviewTabProps) {
  const { formatCurrency } = useCurrency();
  const { kmlChartData, avgKmL, fuelMonthlyChart, transportExpenses, totalTransportMonthly } = stats;

  if (!vehicle) {
    return (
      <EmptyState
        icon={Car}
        title="Nenhum veículo cadastrado"
        description="Cadastre seu veículo para registrar abastecimentos, manutenções preventivas e calcular o custo real de rodagem."
        action={
          <Button onClick={onCreateVehicle}>
            <Plus aria-hidden />
            Cadastrar veículo
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SectionCard
        title={vehicle.name}
        description={`${vehicle.brand} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onEditVehicle(vehicle)}>
              Editar
            </Button>
            {vehicleCount > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDeleteVehicle(vehicle)}
              >
                Excluir
              </Button>
            )}
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Detail label="Marca / fabricante" value={vehicle.brand || "—"} />
          <Detail label="Modelo" value={vehicle.model || "—"} />
          <Detail label="Ano de fabricação" value={vehicle.year || "—"} />
          <Detail label="Placa" value={vehicle.licensePlate || "—"} mono />
          <Detail
            label="Odômetro atual"
            value={vehicle.currentKm > 0 ? `${vehicle.currentKm.toLocaleString("pt-BR")} km` : "—"}
          />
          <Detail
            label="Consumo estimado"
            value={vehicle.averageKmL > 0 ? `${vehicle.averageKmL} km/L` : "—"}
          />
        </dl>
        {vehicle.notes && (
          <div className="mt-4 border-t pt-3">
            <span className="text-xs font-medium text-muted-foreground">Observações:</span>
            <p className="mt-0.5 text-sm italic">{vehicle.notes}</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Evolução de consumo (km/L)" description="Últimos abastecimentos">
        {kmlChartData.length > 1 ? (
          <div className="space-y-3">
            <Sparkline
              data={kmlChartData}
              height={64}
              label={`Evolução do consumo: de ${Math.min(...kmlChartData).toFixed(1)} a ${Math.max(
                ...kmlChartData,
              ).toFixed(1)} km/L, média ${avgKmL.toFixed(1)} km/L`}
            />
            <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
              <div className="rounded-lg border bg-muted/40 p-2">
                <dt className="text-xs font-medium text-muted-foreground">Mínimo</dt>
                <dd className="text-sm font-semibold tabular-nums">{Math.min(...kmlChartData).toFixed(1)} km/L</dd>
              </div>
              <div className="rounded-lg border bg-muted/40 p-2">
                <dt className="text-xs font-medium text-muted-foreground">Médio real</dt>
                <dd className="text-sm font-semibold tabular-nums text-income">{avgKmL.toFixed(1)} km/L</dd>
              </div>
              <div className="rounded-lg border bg-muted/40 p-2">
                <dt className="text-xs font-medium text-muted-foreground">Máximo</dt>
                <dd className="text-sm font-semibold tabular-nums">{Math.max(...kmlChartData).toFixed(1)} km/L</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Registre pelo menos 2 abastecimentos com odômetro para calcular o consumo real (km/L).
          </p>
        )}
      </SectionCard>

      <SectionCard title="Gasto mensal com combustível" description="Últimos 6 meses">
        <BarChart data={fuelMonthlyChart} formatValue={(v) => formatCurrency(v)} />
      </SectionCard>

      <SectionCard
        title="Despesas de transporte (plano geral)"
        actions={
          <span className="text-sm font-semibold tabular-nums text-primary">
            {formatCurrency(totalTransportMonthly)} / mês
          </span>
        }
      >
        {transportExpenses.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma despesa de transporte cadastrada em Despesas.
          </p>
        ) : (
          <ul className="divide-y">
            {transportExpenses.slice(0, 4).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate font-medium">{e.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCurrency(calculateMonthlyAmount(e))} / mês
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/expenses"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Gerenciar todas as despesas
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </SectionCard>
    </div>
  );
}
