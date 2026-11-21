"use client";

import Link from "next/link";
import { Info, Settings, Trash2 } from "lucide-react";
import { DateField, Field, MoneyInput, NumberInput } from "@/components/common/Field";
import { FormModal } from "@/components/common/FormModal";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import type { ExpenseFormState } from "@/components/expenses/hooks/useExpenseForm";
import MonthPicker from "@/components/MonthPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Frequency, PaymentMethod, type CreditCardAccountInfo, type ExpenseCategoryConfig } from "@/types";
import { formatLocalizedDate } from "@/utils/dateFormatting";
import { getFrequencyLabel } from "@/utils/format";

type ScheduleKind = "one_time" | "recurring" | "installment";

/** PIX e Dinheiro são a mesma opção na tela; o valor salvo continua sendo `pix` ou `cash`. */
type PaymentChoice = "pix_cash" | PaymentMethod.CREDIT_CARD | PaymentMethod.DEBIT_CARD;

const PAYMENT_CHOICES: { value: PaymentChoice; label: string }[] = [
  { value: "pix_cash", label: "PIX / Dinheiro" },
  { value: PaymentMethod.CREDIT_CARD, label: "Cartão de Crédito" },
  { value: PaymentMethod.DEBIT_CARD, label: "Cartão de Débito" },
];

function toPaymentChoice(method: PaymentMethod | undefined): PaymentChoice {
  if (method === PaymentMethod.CREDIT_CARD || method === PaymentMethod.DEBIT_CARD) return method;
  return "pix_cash";
}

interface ExpenseFormModalProps {
  form: ExpenseFormState;
  categories: ExpenseCategoryConfig[];
  /** Chamado pelo botão "Excluir" (só aparece ao editar uma despesa existente). */
  onDelete?: (expenseId: string) => void;
}

export function ExpenseFormModal({ form, categories, onDelete }: ExpenseFormModalProps) {
  const {
    isOpen,
    editingId,
    formData,
    purchaseDate,
    submitting,
    activeCards,
    selectedCardInfo,
    billingShiftText,
    getDefaultInstallmentStartMonth,
    setField,
    setScheduleKind,
    setPurchaseDate,
    close,
    submit,
  } = form;

  const scheduleKind: ScheduleKind = formData.isInstallment
    ? "installment"
    : formData.recurring
      ? "recurring"
      : "one_time";

  return (
    <FormModal
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      title={editingId ? "Editar despesa" : "Nova despesa"}
      description={
        editingId
          ? "Altere os dados da despesa e salve."
          : "Informe os dados da despesa. Você pode marcá-la como recorrente ou parcelada."
      }
      submitLabel={editingId ? "Salvar alterações" : "Adicionar despesa"}
      submitting={submitting}
      onSubmit={submit}
      size="lg"
      footerStart={
        editingId && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(editingId)}
            disabled={submitting}
          >
            <Trash2 aria-hidden />
            Excluir
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Nome da despesa" required>
          <Input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="ex: Aluguel, Mercado, Gasolina"
          />
        </Field>

        <Field label="Valor (BRL)" required>
          <MoneyInput
            required
            value={formData.amount || ""}
            onChange={(v) => setField("amount", parseFloat(v) || 0)}
            placeholder="0,00"
          />
        </Field>

        <Field label="Categoria">
          {(p) => (
            <Select value={formData.category} onValueChange={(v) => setField("category", v)}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <div className="space-y-1.5 md:col-span-3">
          <span id="expense-payment-method-label" className="text-sm font-medium leading-none">
            Forma de pagamento
          </span>
          <SegmentedControl<PaymentChoice>
            aria-label="Forma de pagamento"
            fullWidth
            value={toPaymentChoice(formData.paymentMethod)}
            onValueChange={(choice) => {
              if (choice === "pix_cash") {
                // Mantém "Dinheiro" ao editar uma despesa que já era em dinheiro.
                if (formData.paymentMethod !== PaymentMethod.PIX && formData.paymentMethod !== PaymentMethod.CASH) {
                  setField("paymentMethod", PaymentMethod.PIX);
                }
                return;
              }
              setField("paymentMethod", choice);
            }}
            options={PAYMENT_CHOICES}
          />
        </div>

        {formData.paymentMethod === PaymentMethod.CREDIT_CARD && (
          <div className="grid grid-cols-1 gap-4 rounded-xl border bg-accent/40 p-3.5 sm:grid-cols-2 md:col-span-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span id="expense-card-label" className="text-sm font-medium leading-none">
                  Conta do cartão
                </span>
                <Link
                  href="/settings"
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Settings className="size-3.5" aria-hidden />
                  Configurar cartões
                </Link>
              </div>

              {activeCards.length === 0 ? (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                  <p>Nenhum cartão cadastrado.</p>
                  <Link href="/settings" className="mt-1 inline-block font-semibold underline">
                    + Cadastrar cartão
                  </Link>
                </div>
              ) : (
                <div role="group" aria-labelledby="expense-card-label" className="flex flex-wrap gap-2">
                  {activeCards.map((card: CreditCardAccountInfo) => {
                    const selected = formData.creditCardAccount === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setField("creditCardAccount", card.id)}
                        className={cn(
                          "flex h-9 min-w-24 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors pointer-coarse:h-11",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-card hover:bg-accent",
                        )}
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: card.color || "#6366f1" }}
                          aria-hidden
                        />
                        <span className="truncate">{card.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedCardInfo && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <span className="rounded border bg-card px-1.5 py-0.5 font-medium">
                    Fechamento: dia {selectedCardInfo.closingDay}
                  </span>
                  <span className="rounded border bg-card px-1.5 py-0.5 font-medium">
                    Vencimento: dia {selectedCardInfo.dueDay}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Field label="Data da compra" hint="Calcula o fechamento e o vencimento da fatura">
                {(p) => <DateField id={p.id} value={purchaseDate} onChange={setPurchaseDate} />}
              </Field>
              <p className="text-xs text-muted-foreground">
                Vencimento da fatura:{" "}
                <strong className="font-semibold text-foreground">{formatLocalizedDate(formData.dueDate)}</strong>
              </p>
              {billingShiftText && (
                <p className="flex items-start gap-1 text-xs font-medium text-primary">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {billingShiftText}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1.5 md:col-span-3">
          <span className="text-sm font-medium leading-none">Tipo de despesa</span>
          <SegmentedControl<ScheduleKind>
            aria-label="Tipo de despesa"
            fullWidth
            value={scheduleKind}
            onValueChange={setScheduleKind}
            options={[
              { value: "one_time", label: "Única" },
              { value: "recurring", label: "Recorrente" },
              { value: "installment", label: "Parcelada" },
            ]}
          />
        </div>

        {formData.isInstallment ? (
          <>
            <Field label="Número de parcelas (meses)">
              <NumberInput
                min="2"
                max="60"
                step="1"
                value={formData.installmentMonths || 2}
                onChange={(v) => setField("installmentMonths", parseInt(v) || 2)}
              />
            </Field>

            <Field label="Mês de início">
              {(p) => (
                <MonthPicker
                  id={p.id}
                  value={formData.installmentStartMonth || getDefaultInstallmentStartMonth()}
                  onChange={(val) => setField("installmentStartMonth", val)}
                  closingDay={selectedCardInfo?.closingDay || 11}
                />
              )}
            </Field>
          </>
        ) : formData.recurring ? (
          <Field label="Frequência">
            {(p) => (
              <Select value={formData.frequency} onValueChange={(v) => setField("frequency", v as Frequency)}>
                <SelectTrigger id={p.id} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Frequency).map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {getFrequencyLabel(freq)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
        ) : (
          <Field label="Data de vencimento">
            {(p) => <DateField id={p.id} value={formData.dueDate} onChange={(v) => setField("dueDate", v)} />}
          </Field>
        )}

        <Field label="Descrição (opcional)" className="md:col-span-3">
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Detalhes adicionais..."
          />
        </Field>
      </div>
    </FormModal>
  );
}
