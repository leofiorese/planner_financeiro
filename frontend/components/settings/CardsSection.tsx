"use client";

import { useMemo, useState } from "react";
import { CreditCard, Plus } from "lucide-react";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { CardFormModal, type CardDraft } from "@/components/settings/CardFormModal";
import { InvoiceSimulator } from "@/components/settings/InvoiceSimulator";
import { Button } from "@/components/ui/button";
import { useFinancialContext } from "@/context";
import { formatCurrency } from "@/utils/format";
import { withToast } from "@/lib/toast";
import { PaymentMethod, type CreditCardAccountInfo } from "@/types";

export function CardsSection() {
  const { state, addCreditCardAccount, updateCreditCardAccount, deleteCreditCardAccount } =
    useFinancialContext();
  const confirm = useConfirm();

  const cards = useMemo(
    () => state.userPlan?.creditCardAccounts || [],
    [state.userPlan?.creditCardAccounts],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCardAccountInfo | null>(null);

  const cardStats = useMemo(() => {
    const stats: Record<string, { count: number; totalAmount: number }> = {};
    cards.forEach((c) => {
      stats[c.id] = { count: 0, totalAmount: 0 };
    });
    (state.userPlan?.expenses || []).forEach((exp) => {
      if (!exp.isActive || exp.paymentMethod !== PaymentMethod.CREDIT_CARD) return;
      const match = cards.find(
        (c) =>
          c.id === exp.creditCardAccount ||
          c.name.toLowerCase() === (exp.creditCardAccount || "").toLowerCase(),
      );
      if (match && stats[match.id]) {
        stats[match.id].count += 1;
        stats[match.id].totalAmount += exp.amount;
      }
    });
    return stats;
  }, [cards, state.userPlan?.expenses]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (card: CreditCardAccountInfo) => {
    setEditing(card);
    setModalOpen(true);
  };

  const handleSubmit = async (draft: CardDraft) => {
    const payload = {
      name: draft.name,
      closingDay: draft.closingDay,
      dueDay: draft.dueDay,
      color: draft.color,
      isActive: draft.isActive,
    };
    if (editing) {
      await withToast(updateCreditCardAccount({ id: editing.id, ...payload }), {
        success: "Cartão atualizado",
        error: "Não foi possível salvar o cartão",
      });
    } else {
      await withToast(addCreditCardAccount(payload), {
        success: "Cartão adicionado",
        error: "Não foi possível salvar o cartão",
      });
    }
  };

  const handleDelete = async (card: CreditCardAccountInfo) => {
    const linked = (state.userPlan?.expenses || []).filter(
      (exp) =>
        exp.paymentMethod === PaymentMethod.CREDIT_CARD &&
        (exp.creditCardAccount === card.id ||
          exp.creditCardAccount?.toLowerCase() === card.name.toLowerCase()),
    );
    const ok = await confirm({
      title: `Remover o cartão "${card.name}"?`,
      description:
        linked.length > 0
          ? `Existem ${linked.length} despesa(s) associada(s) a este cartão. Deseja realmente removê-lo?`
          : "Essa ação não pode ser desfeita.",
      confirmText: "Remover",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await withToast(deleteCreditCardAccount(card.id), {
        success: "Cartão removido",
        error: "Não foi possível remover o cartão",
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SectionCard
      title="Cartões de crédito e faturas"
      description="Cadastre seus cartões, defina os dias de fechamento e vencimento e simule a melhor data de compra."
      actions={
        <Button onClick={openCreate}>
          <Plus aria-hidden />
          Novo cartão
        </Button>
      }
      contentClassName="space-y-6"
    >
      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Cadastre um cartão para associar despesas às faturas."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Novo cartão
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const stat = cardStats[card.id] || { count: 0, totalAmount: 0 };
            const accent = card.color || "#6366f1";
            return (
              <article key={card.id} className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
                <div className="h-1.5 w-full" style={{ backgroundColor: accent }} aria-hidden />
                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      >
                        {card.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{card.name}</h3>
                        <span
                          className={
                            card.isActive
                              ? "text-xs font-medium text-income"
                              : "text-xs font-medium text-muted-foreground"
                          }
                        >
                          {card.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                    <RowActions
                      itemLabel={`cartão ${card.name}`}
                      onEdit={() => openEdit(card)}
                      onDelete={() => handleDelete(card)}
                    />
                  </div>

                  <dl className="grid grid-cols-2 gap-2.5 rounded-xl border bg-muted/40 p-2.5 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Fechamento</dt>
                      <dd className="font-semibold tabular-nums">Dia {card.closingDay}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Vencimento</dt>
                      <dd className="font-semibold tabular-nums text-primary">Dia {card.dueDay}</dd>
                    </div>
                  </dl>

                  <div className="flex items-center justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">{stat.count} despesas vinculadas</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(stat.totalAmount)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <InvoiceSimulator cards={cards} />

      <CardFormModal open={modalOpen} onOpenChange={setModalOpen} card={editing} onSubmit={handleSubmit} />
    </SectionCard>
  );
}
