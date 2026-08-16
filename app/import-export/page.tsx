"use client";

import { useState } from "react";
import { useFinancialContext } from "@/context";
import { FinancialActionType } from "@/context/types";
import {
  serializeToJSON,
  serializeToCSV,
  validateExportData,
  ExportFormat,
} from "@/utils/dataExport";
import { importFinancialData, ImportResult } from "@/utils/dataImport";
import {
  downloadJSON,
  downloadCSV,
  uploadFinancialData,
  isBrowserCompatible,
} from "@/utils/fileOperations";
import { formatDateDDMMYYYY } from "@/utils/dateFormatting";

export default function ImportExportPage() {
  const { state, dispatch } = useFinancialContext();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportValidation, setExportValidation] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const browserSupport = isBrowserCompatible();

  const handleExport = async () => {
    if (!state.userPlan) {
      alert("Nenhum dado financeiro disponível para exportação.");
      return;
    }

    setIsExporting(true);
    setExportValidation(null);

    try {
      const validation = validateExportData(state.userPlan);
      setExportValidation(validation);

      if (!validation.isValid) {
        setIsExporting(false);
        return;
      }

      let exportData: string;

      if (exportFormat === "json") {
        exportData = serializeToJSON(state.userPlan);
        downloadJSON(exportData);
      } else {
        exportData = serializeToCSV(state.userPlan);
        downloadCSV(exportData);
      }

      alert(
        `Plano financeiro exportado com sucesso no formato ${exportFormat.toUpperCase()}!`
      );
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        `Falha ao exportar: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const fileData = await uploadFinancialData();
      const result = importFinancialData(fileData.content);
      setImportResult(result);

      if (result.success && result.userPlan) {
        const hasExistingData =
          state.userPlan &&
          ((state.userPlan.income && state.userPlan.income.length > 0) ||
            (state.userPlan.expenses && state.userPlan.expenses.length > 0) ||
            (state.userPlan.goals && state.userPlan.goals.length > 0) ||
            (state.userPlan.creditCardAccounts &&
              state.userPlan.creditCardAccounts.length > 0));

        if (hasExistingData) {
          const confirmReplace = confirm(
            "Esta ação substituirá os dados financeiros atuais no navegador. Deseja prosseguir?"
          );

          if (!confirmReplace) {
            setIsImporting(false);
            return;
          }
        }

        dispatch({
          type: FinancialActionType.LOAD_SUCCESS,
          payload: result.userPlan,
        });

        alert("Plano financeiro importado com sucesso!");
        setTimeout(() => setImportResult(null), 5000);
      }
    } catch (error) {
      console.error("Import failed:", error);
      setImportResult({
        success: false,
        errors: [error instanceof Error ? error.message : "Erro desconhecido"],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const dataStats = {
    income: state.userPlan?.income?.length || 0,
    expenses: state.userPlan?.expenses?.length || 0,
    goals: state.userPlan?.goals?.length || 0,
    cards: state.userPlan?.creditCardAccounts?.length || 0,
    totalRecords:
      (state.userPlan?.income?.length || 0) +
      (state.userPlan?.expenses?.length || 0) +
      (state.userPlan?.goals?.length || 0) +
      (state.userPlan?.creditCardAccounts?.length || 0),
  };

  const rawJson = state.userPlan ? serializeToJSON(state.userPlan) : "";
  const lastUpdatedFormatted = state.userPlan?.updatedAt
    ? formatDateDDMMYYYY(state.userPlan.updatedAt)
    : formatDateDDMMYYYY(new Date().toISOString());

  const handleCopyJson = async () => {
    if (!rawJson) return;
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Executive Header ────────────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span>Importação & Exportação</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60">
              Soberania de Dados
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gere cópias de segurança locais e restaure seus dados em JSON ou CSV
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-right shrink-0">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total de Registros
          </div>
          <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
            {dataStats.totalRecords}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {dataStats.income} receitas, {dataStats.expenses} despesas, {dataStats.goals} metas, {dataStats.cards} cartões
          </div>
        </div>
      </div>

      {/* ── Browser Compatibility Alert ─────────────────────────────── */}
      {(!browserSupport.download || !browserSupport.upload) && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-start gap-3 shadow-xs">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="text-xs text-amber-900 dark:text-amber-100">
            <h4 className="font-bold">Aviso de Compatibilidade do Navegador</h4>
            <p className="mt-0.5 text-amber-800 dark:text-amber-200">
              Alguns recursos de download ou upload podem estar limitados nas permissões deste navegador.
            </p>
          </div>
        </div>
      )}

      {/* ── Action Grid ─────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 1. Export Card */}
        <div className="surface-card p-6 flex flex-col justify-between space-y-5 border border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Exportar Dados do Plano
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Última atualização: {lastUpdatedFormatted}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Baixe seu plano financeiro completo em arquivo autônomo para backup seguro ou análise detalhada.
            </p>

            {/* Format Radio Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Formato de Exportação
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`relative flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    exportFormat === "json"
                      ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="json"
                    checked={exportFormat === "json"}
                    onChange={() => setExportFormat("json")}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>JSON</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        Recomendado
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight">
                      Backup integral com histórico, cartões e configurações
                    </div>
                  </div>
                </label>

                <label
                  className={`relative flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    exportFormat === "csv"
                      ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === "csv"}
                    onChange={() => setExportFormat("csv")}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold">CSV</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight">
                      Tabelas estruturadas para Excel e Google Sheets
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {exportValidation && !exportValidation.isValid && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 text-xs text-rose-900 dark:text-rose-200">
              <span className="font-bold block mb-1">Erros de validação:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {exportValidation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{isExporting ? "Gerando Arquivo..." : `Exportar como ${exportFormat.toUpperCase()}`}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>{showJsonPreview ? "Ocultar Pré-visualização JSON" : "Pré-visualizar Dados (JSON)"}</span>
            </button>
          </div>
        </div>

        {/* 2. Import Card */}
        <div className="surface-card p-6 flex flex-col justify-between space-y-5 border border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Restaurar / Importar Dados
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Formato JSON ou CSV
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Carregue um arquivo JSON ou CSV salvo anteriormente para restaurar todo o seu estado financeiro.
            </p>

            <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto shadow-xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Suporta arquivos JSON e CSV compatíveis
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Detecção automática de formato, parse seguro e validação de schema antes da substituição
              </div>
            </div>
          </div>

          {importResult && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border shadow-xs ${
                importResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200"
              }`}
            >
              {importResult.success ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Plano financeiro importado com sucesso!</span>
                </div>
              ) : (
                <div>
                  <span className="font-bold block mb-1 text-rose-950 dark:text-rose-100">
                    Falha na importação:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={isImporting}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{isImporting ? "Lendo Arquivo..." : "Selecionar Arquivo para Importar"}</span>
          </button>
        </div>
      </div>

      {/* ── JSON Preview Container ──────────────────────────────────── */}
      {showJsonPreview && (
        <div className="surface-card p-6 space-y-4 border border-slate-200/80 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs" />
                Pré-visualização do Plano (JSON)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Estrutura de dados serializada pronta para exportação • Data: {lastUpdatedFormatted}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copiar JSON</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowJsonPreview(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Formato
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                JSON v1.0.0
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Tamanho
              </span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {(new Blob([rawJson]).size / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Registros
              </span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {dataStats.totalRecords} itens
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Data (DD/MM/YYYY)
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {lastUpdatedFormatted}
              </span>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-inner">
            <pre className="p-4 bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-200 font-mono text-xs overflow-x-auto max-h-72 leading-relaxed">
              <code>{rawJson || "Nenhum dado disponível"}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

