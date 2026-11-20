"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileUp, Upload } from "lucide-react";
import { DateField, Field } from "@/components/common/Field";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { actions, useFinancialContext } from "@/context";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getOrderedCategories } from "@/utils/categoryRules";
import { serializeToCSV, serializeToJSON } from "@/utils/dataExport";
import { importFinancialData } from "@/utils/dataImport";
import { downloadCSV, downloadJSON, formatFileSize, validateFileType } from "@/utils/fileOperations";

interface ImportSummary {
  type: "success" | "warning" | "error";
  message: string;
  details?: string[];
}

export function DataSection() {
  const { state, dispatch } = useFinancialContext();

  const [includeInactive, setIncludeInactive] = useState(true);
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesCount = useMemo(
    () => getOrderedCategories(state.userPlan?.expenseCategories).length,
    [state.userPlan?.expenseCategories],
  );

  const getFilteredPlanForExport = () => {
    const filtered = { ...state.userPlan };
    if (!includeInactive) {
      filtered.income = filtered.income.filter((i) => i.isActive);
      filtered.expenses = filtered.expenses.filter((e) => e.isActive);
      filtered.goals = filtered.goals.filter((g) => g.isActive);
    }
    if (dateRangeEnabled && startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      filtered.expenses = filtered.expenses.filter((exp) => {
        const d = new Date(exp.dueDate).getTime();
        return d >= s && d <= e;
      });
    }
    return filtered;
  };

  const runExport = (format: "JSON" | "CSV") => {
    setIsExporting(true);
    try {
      const plan = getFilteredPlanForExport();
      if (format === "JSON") downloadJSON(serializeToJSON(plan));
      else downloadCSV(serializeToCSV(plan));
      toast.success(`Dados exportados em ${format} com sucesso!`);
    } catch (error) {
      toast.error(
        `Erro ao exportar ${format}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  const processImportFile = async (file: File) => {
    setIsImporting(true);
    setSummary(null);
    try {
      if (!validateFileType(file.name, [".json", ".csv"])) {
        setSummary({
          type: "error",
          message: "Validação do arquivo falhou",
          details: ["Formato de arquivo inválido. Use .json ou .csv"],
        });
        toast.error("Formato de arquivo inválido. Use .json ou .csv");
        return;
      }

      const content = await file.text();
      const result = importFinancialData(content);

      if (result.success && result.userPlan) {
        dispatch(actions.loadSuccess(result.userPlan));
        const hasWarnings = result.warnings.length > 0;
        const message = `Dados importados de ${file.name} (${formatFileSize(file.size)}) com sucesso!`;
        setSummary({
          type: hasWarnings ? "warning" : "success",
          message,
          details: hasWarnings ? result.warnings : undefined,
        });
        if (hasWarnings) toast.warning(message);
        else toast.success(message);
      } else {
        setSummary({ type: "error", message: "Falha ao importar dados do arquivo", details: result.errors });
        toast.error("Falha ao importar dados do arquivo");
      }
    } catch (error) {
      const message = `Erro na importação: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
      setSummary({ type: "error", message });
      toast.error(message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processImportFile(file);
  };

  return (
    <SectionCard
      title="Importar / exportar dados"
      description="Exporte backups completos do seu planejamento em JSON ou CSV, ou importe dados salvos anteriormente."
      contentClassName="space-y-6"
    >
      {summary && (
        <div
          role={summary.type === "error" ? "alert" : "status"}
          className={cn(
            "rounded-xl border p-4 text-sm",
            summary.type === "success" && "border-income/40 bg-income/10 text-foreground",
            summary.type === "warning" && "border-warning/40 bg-warning/10 text-foreground",
            summary.type === "error" && "border-destructive/40 bg-destructive/10 text-foreground",
          )}
        >
          <div className="font-semibold">{summary.message}</div>
          {summary.details && summary.details.length > 0 && (
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
              {summary.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Download className="size-4" aria-hidden />
            Exportar dados do sistema
          </h3>
          <p className="text-sm text-muted-foreground">
            Baixe seus dados atuais ({state.userPlan.income.length} receitas, {state.userPlan.expenses.length}{" "}
            despesas, {state.userPlan.goals.length} metas e {categoriesCount} categorias).
          </p>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                id="export-inactive"
                checked={includeInactive}
                onCheckedChange={(v) => setIncludeInactive(v === true)}
              />
              <Label htmlFor="export-inactive" className="font-medium">
                Incluir itens inativos na exportação
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="export-range"
                checked={dateRangeEnabled}
                onCheckedChange={(v) => setDateRangeEnabled(v === true)}
              />
              <Label htmlFor="export-range" className="font-medium">
                Filtrar despesas por intervalo de datas
              </Label>
            </div>

            {dateRangeEnabled && (
              <div className="grid grid-cols-1 gap-3 pl-6 sm:grid-cols-2">
                <Field label="Data inicial">
                  {(p) => <DateField id={p.id} value={startDate} onChange={setStartDate} />}
                </Field>
                <Field label="Data final">
                  {(p) => <DateField id={p.id} value={endDate} onChange={setEndDate} />}
                </Field>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <Button type="button" onClick={() => runExport("JSON")} disabled={isExporting}>
              Exportar backup JSON
            </Button>
            <Button type="button" variant="secondary" onClick={() => runExport("CSV")} disabled={isExporting}>
              Exportar planilha CSV
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Upload className="size-4" aria-hidden />
            Importar / restaurar backup
          </h3>
          <p className="text-sm text-muted-foreground">
            Selecione ou arraste um arquivo <code>.json</code> ou <code>.csv</code> exportado anteriormente por este
            app.
          </p>

          <input
            ref={fileInputRef}
            id="import-file"
            type="file"
            accept=".json,.csv"
            className="peer sr-only"
            disabled={isImporting}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void processImportFile(file);
            }}
          />
          <label
            htmlFor="import-file"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
              "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
              dragActive ? "border-primary bg-primary/5" : "hover:border-primary/60",
            )}
          >
            <FileUp className="mb-2 size-7 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">
              {isImporting ? "Processando arquivo..." : "Clique para selecionar ou arraste o arquivo aqui"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">Suporta formatos JSON e CSV (máx. 10MB)</span>
          </label>
        </div>
      </div>
    </SectionCard>
  );
}
