"use client";

import { useState } from "react";
import { Download, LineChart, Plus } from "lucide-react";
import { Callout } from "@/components/common/Callout";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { AllocationChart } from "@/components/investments/AllocationChart";
import { ClassPerformanceTable } from "@/components/investments/ClassPerformanceTable";
import { useInvestmentSummary } from "@/components/investments/hooks/useInvestmentSummary";
import { InvestmentKpis } from "@/components/investments/InvestmentKpis";
import { useInvestmentsContext } from "@/components/investments/InvestmentsProvider";
import { ReturnChart } from "@/components/investments/ReturnChart";
import { SnapshotFormModal } from "@/components/investments/SnapshotFormModal";
import { SnapshotHistory } from "@/components/investments/SnapshotHistory";
import { WealthEvolutionChart } from "@/components/investments/WealthEvolutionChart";
import { WealthGoalCard } from "@/components/investments/WealthGoalCard";
import { Button } from "@/components/ui/button";
import { useTodayISO } from "@/hooks/useTodayISO";
import { toast, withToast } from "@/lib/toast";
import type { InvestmentSnapshot } from "@/types";
import { serializeInvestmentsCSV, investmentsCsvFilename } from "@/utils/investments/csv";
import { downloadFile } from "@/utils/fileOperations";
import { formatMonth } from "@/utils/format";

export default function InvestmentsPage() {
  const { data, loading, error, retry, deleteSnapshot } = useInvestmentsContext();
  const summary = useInvestmentSummary(data);
  const today = useTodayISO();
  const confirm = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentSnapshot | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (snapshot: InvestmentSnapshot) => {
    setEditing(snapshot);
    setModalOpen(true);
  };

  const handleDelete = async (snapshot: InvestmentSnapshot) => {
    const ok = await confirm({
      title: `Excluir o lançamento de ${formatMonth(snapshot.month)}?`,
      description: "Esta ação não pode ser desfeita. A evolução e a rentabilidade serão recalculadas sem este mês.",
      confirmText: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await withToast(deleteSnapshot(snapshot.id), {
        success: "Lançamento excluído",
        error: (e) => (e instanceof Error && e.message ? e.message : "Não foi possível excluir o lançamento"),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    if (!data) return;
    downloadFile(serializeInvestmentsCSV(data.classes, data.snapshots), "csv", {
      filename: investmentsCsvFilename(today),
    });
    toast.success("Histórico exportado em CSV");
  };

  if (loading && !data) return <PageSkeleton stats={4} rows={3} />;

  if (!data) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Investimentos" />
        <Callout tone="danger" role="alert">
          <p>{error ?? "Não foi possível carregar os investimentos."}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            Tentar novamente
          </Button>
        </Callout>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Investimentos"
        description="Evolução do patrimônio da carteira e rentabilidade contra a sua meta."
        actions={
          <>
            <Button variant="outline" onClick={handleExport} disabled={!summary.hasData}>
              <Download aria-hidden />
              Exportar CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Novo lançamento
            </Button>
          </>
        }
      />

      {!summary.hasData ? (
        <EmptyState
          icon={LineChart}
          headingLevel={2}
          title="Nenhum lançamento ainda"
          description="Informe o saldo de cada classe de ativo para começar a acompanhar a evolução do seu patrimônio. O app vai lembrar você todo mês."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Fazer o primeiro lançamento
            </Button>
          }
        />
      ) : (
        <>
          <InvestmentKpis summary={summary} settings={data.settings} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <WealthEvolutionChart evolution={summary.evolution} />
            <ReturnChart returns={summary.returns} targetAnnualPct={data.settings.targetReturnAnnual} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <AllocationChart snapshot={summary.latest} classes={data.classes} />
            <WealthGoalCard summary={summary} settings={data.settings} />
          </div>

          <ClassPerformanceTable classes={data.classes} snapshots={data.snapshots} latest={summary.latest} />

          <SnapshotHistory snapshots={data.snapshots} returns={summary.returns} onEdit={openEdit} onDelete={handleDelete} />
        </>
      )}

      <SnapshotFormModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} />
    </div>
  );
}
