/**
 * Exportação CSV do histórico de investimentos, no padrão pt-BR das outras exportações:
 * ponto e vírgula, vírgula decimal sem separador de milhar, datas DD/MM/AAAA e cabeçalhos em português.
 * Uma linha por classe-folha de cada lançamento (formato "longo", bom para tabela dinâmica).
 */
import type { InvestmentClass, InvestmentSnapshot } from "@/types";
import { sortSnapshotsAsc } from "./totals";

const DELIMITER = ";";

export const INVESTMENT_CSV_HEADERS = ["Mês", "Data", "Categoria", "Classe", "Saldo", "Aportes", "Resgates"] as const;

function escapeCell(value: string): string {
  return /[;,"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const num = (n: number) => n.toFixed(2).replace(".", ",");

/** "2026-11-05" → "05/11/2026" (sem passar por Date: não sofre com fuso). */
function brDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** "2026-11" → "11/2026". */
function brMonth(month: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  return m ? `${m[2]}/${m[1]}` : month;
}

export function serializeInvestmentsCSV(classes: InvestmentClass[], snapshots: InvestmentSnapshot[]): string {
  const byId = new Map(classes.map((c) => [c.id, c]));
  const lines: string[] = [INVESTMENT_CSV_HEADERS.join(DELIMITER)];

  for (const snapshot of sortSnapshotsAsc(snapshots)) {
    for (const entry of snapshot.entries) {
      const cls = byId.get(entry.classId);
      const parent = cls?.parentId ? byId.get(cls.parentId) : undefined;
      // Folha sob uma categoria: Categoria = pai, Classe = filha. Categoria sem filhos: Categoria = ela.
      const category = parent ? parent.name : (cls?.name ?? "Classe removida");
      const klass = parent ? (cls?.name ?? "") : "";
      lines.push(
        [
          brMonth(snapshot.month),
          brDate(snapshot.date),
          escapeCell(category),
          escapeCell(klass),
          num(entry.balance),
          num(entry.contributions),
          num(entry.withdrawals),
        ].join(DELIMITER),
      );
    }
  }
  return lines.join("\n");
}

/** Nome do arquivo: investimentos-AAAA-MM-DD.csv (`today` é parâmetro). */
export function investmentsCsvFilename(today: string): string {
  return `investimentos-${today}.csv`;
}
