"use client";

import { useMemo } from "react";
import { MoneyText } from "@/components/common/MoneyText";
import { RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { InvestmentSnapshot } from "@/types";
import { formatDate, formatMonth } from "@/utils/format";
import type { ReturnSeries } from "@/utils/investments/returns";
import { formatPercent } from "@/utils/investments/series";
import { snapshotFlows, snapshotTotal, sortSnapshotsAsc } from "@/utils/investments/totals";

interface SnapshotHistoryProps {
  snapshots: InvestmentSnapshot[];
  returns: ReturnSeries;
  onEdit: (snapshot: InvestmentSnapshot) => void;
  onDelete: (snapshot: InvestmentSnapshot) => void;
}

/** Histórico dos lançamentos (mais recente primeiro), com edição e exclusão. */
export function SnapshotHistory({ snapshots, returns, onEdit, onDelete }: SnapshotHistoryProps) {
  const rows = useMemo(() => {
    const byMonth = new Map(returns.points.map((p) => [p.month, p.periodReturn]));
    return sortSnapshotsAsc(snapshots)
      .reverse()
      .map((s) => ({ snapshot: s, total: snapshotTotal(s), flows: snapshotFlows(s), ret: byMonth.get(s.month) ?? null }));
  }, [snapshots, returns.points]);

  return (
    <SectionCard title="Histórico de lançamentos" description="Cada linha é um mês lançado. Edite para corrigir um valor.">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Patrimônio</TableHead>
              <TableHead className="text-right">Aportes líquidos</TableHead>
              <TableHead className="text-right">Rentabilidade</TableHead>
              <TableHead className="w-24 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ snapshot, total, flows, ret }) => (
              <TableRow key={snapshot.id}>
                <TableCell className="font-medium first-letter:uppercase">{formatMonth(snapshot.month)}</TableCell>
                <TableCell className="tabular-nums">{formatDate(snapshot.date)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  <MoneyText value={total} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <MoneyText value={flows.net} tone="auto" showPlus />
                </TableCell>
                <TableCell className={cn("text-right tabular-nums", ret !== null && ret > 0 && "text-income", ret !== null && ret < 0 && "text-expense")}>
                  {formatPercent(ret)}
                </TableCell>
                <TableCell className="text-right">
                  <RowActions
                    itemLabel={`lançamento de ${formatMonth(snapshot.month)}`}
                    onEdit={() => onEdit(snapshot)}
                    onDelete={() => onDelete(snapshot)}
                    className="justify-end"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
