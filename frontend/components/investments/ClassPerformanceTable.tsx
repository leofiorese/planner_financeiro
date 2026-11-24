"use client";

import { useMemo } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { InvestmentClass, InvestmentSnapshot } from "@/types";
import { formatCurrency } from "@/utils/format";
import { classReturns } from "@/utils/investments/returns";
import { formatPercent } from "@/utils/investments/series";
import { buildClassTree, classBalance, snapshotTotal } from "@/utils/investments/totals";

interface ClassPerformanceTableProps {
  classes: InvestmentClass[];
  snapshots: InvestmentSnapshot[];
  latest: InvestmentSnapshot | undefined;
}

interface Row {
  id: string;
  name: string;
  depth: 0 | 1;
  balance: number;
  share: number | null;
  accumulated: number | null;
  annualized: number | null;
}

const signClass = (v: number | null) => (v === null ? "" : v > 0 ? "text-income" : v < 0 ? "text-expense" : "");

/** Saldo, participação e rentabilidade de cada categoria e subclasse. */
export function ClassPerformanceTable({ classes, snapshots, latest }: ClassPerformanceTableProps) {
  const rows = useMemo<Row[]>(() => {
    if (!latest) return [];
    const total = snapshotTotal(latest);
    const usedIds = new Set(snapshots.flatMap((s) => s.entries.map((e) => e.classId)));
    const make = (cls: InvestmentClass, depth: 0 | 1): Row => {
      const r = classReturns(snapshots, cls.id, classes);
      const balance = classBalance(latest, cls.id, classes);
      return {
        id: cls.id,
        name: cls.name,
        depth,
        balance,
        share: total > 0 ? balance / total : null,
        accumulated: r.accumulated,
        annualized: r.annualized,
      };
    };

    const out: Row[] = [];
    for (const node of buildClassTree(classes, true)) {
      const children = node.children.filter((c) => usedIds.has(c.id));
      if (node.children.length === 0) {
        if (usedIds.has(node.cls.id)) out.push(make(node.cls, 0));
        continue;
      }
      if (children.length === 0) continue;
      out.push(make(node.cls, 0));
      // Com uma única subclasse usada, a linha da categoria já diz tudo.
      if (children.length > 1) children.forEach((c) => out.push(make(c, 1)));
    }
    return out;
  }, [classes, snapshots, latest]);

  if (rows.length === 0) return null;

  return (
    <SectionCard title="Desempenho por classe" description="Rentabilidade acumulada desde o primeiro lançamento de cada classe.">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Classe</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">% da carteira</TableHead>
              <TableHead className="text-right">Acumulada</TableHead>
              <TableHead className="text-right">Anualizada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className={cn(r.depth === 0 ? "font-semibold" : "pl-8 text-muted-foreground")}>{r.name}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(r.balance)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPercent(r.share, 1)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", signClass(r.accumulated))}>{formatPercent(r.accumulated)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", signClass(r.annualized))}>{formatPercent(r.annualized)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
