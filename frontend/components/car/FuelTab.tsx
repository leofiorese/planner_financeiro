"use client";

import { Fuel, Plus } from "lucide-react";
import { getFuelBadge } from "@/components/car/car-constants";
import type { FuelLog } from "@/components/car/car-types";
import { EmptyState } from "@/components/common/EmptyState";
import { RowActions } from "@/components/common/RowActions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";

interface FuelTabProps {
  logs: FuelLog[];
  canCreate: boolean;
  onCreate: () => void;
  onEdit: (log: FuelLog) => void;
  onDelete: (log: FuelLog) => void;
}

function KmLBadge({ kmL }: { kmL?: number }) {
  if (!kmL || kmL <= 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="rounded-full border border-income/30 bg-income/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-income">
      {kmL.toFixed(1)} km/L
    </span>
  );
}

export function FuelTab({ logs, canCreate, onCreate, onEdit, onDelete }: FuelTabProps) {
  const { formatCurrency } = useCurrency();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Histórico de abastecimentos ({logs.length})</h2>
          <p className="text-sm text-muted-foreground">
            Registre os abastecimentos para o cálculo automático de km/L e custo por litro
          </p>
        </div>
        <Button onClick={onCreate} disabled={!canCreate}>
          <Plus aria-hidden />
          Novo abastecimento
        </Button>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="Nenhum abastecimento registrado"
          description='Clique em "Novo abastecimento" para começar a controlar o consumo.'
        />
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Data</TableHead>
                  <TableHead>Combustível</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>Preço / L</TableHead>
                  <TableHead>Valor total</TableHead>
                  <TableHead>Odômetro</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead>Posto / obs.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((f) => {
                  const badge = getFuelBadge(f.fuelType);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{formatDate(f.date)}</TableCell>
                      <TableCell>
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", badge.bg)}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{f.liters.toFixed(2)} L</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(f.pricePerLiter)}</TableCell>
                      <TableCell className="font-semibold tabular-nums text-primary">{formatCurrency(f.totalCost)}</TableCell>
                      <TableCell className="tabular-nums">
                        {f.odometer ? `${f.odometer.toLocaleString("pt-BR")} km` : "—"}
                      </TableCell>
                      <TableCell>
                        <KmLBadge kmL={f.kmL} />
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-muted-foreground" title={f.station || f.notes}>
                        {f.station || f.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          className="justify-end"
                          itemLabel={`abastecimento de ${formatDate(f.date)}`}
                          onEdit={() => onEdit(f)}
                          onDelete={() => onDelete(f)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {logs.map((f) => {
              const badge = getFuelBadge(f.fuelType);
              return (
                <li key={f.id} className="space-y-2 rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{formatDate(f.date)}</div>
                      <span className={cn("mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium", badge.bg)}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold tabular-nums text-primary">{formatCurrency(f.totalCost)}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {f.liters.toFixed(2)} L · {formatCurrency(f.pricePerLiter)}/L
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="tabular-nums">
                        {f.odometer ? `${f.odometer.toLocaleString("pt-BR")} km` : "—"}
                      </span>
                      <KmLBadge kmL={f.kmL} />
                    </div>
                    <RowActions
                      itemLabel={`abastecimento de ${formatDate(f.date)}`}
                      onEdit={() => onEdit(f)}
                      onDelete={() => onDelete(f)}
                    />
                  </div>
                  {(f.station || f.notes) && <p className="text-xs text-muted-foreground">{f.station || f.notes}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
