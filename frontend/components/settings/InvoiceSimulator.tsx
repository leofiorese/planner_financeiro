"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { DateField, Field } from "@/components/common/Field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreditCardAccountInfo } from "@/types";
import {
  calculateCreditCardBillingMonth,
  calculateCreditCardDueDate,
} from "@/utils/creditCardRules";
import { formatLocalizedDate, formatLocalizedMonth } from "@/utils/dateFormatting";
import { todayLocalISO } from "@/utils/dates";

const todayIso = todayLocalISO;

/** Simulador de virada de fatura: reaproveita as regras de `utils/creditCardRules.ts`. */
export function InvoiceSimulator({ cards }: { cards: CreditCardAccountInfo[] }) {
  const [cardId, setCardId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIso);

  const activeCard = useMemo(
    () => cards.find((c) => c.id === cardId) ?? cards[0] ?? null,
    [cards, cardId],
  );

  const result = useMemo(() => {
    if (!activeCard || !purchaseDate) return null;
    const parts = purchaseDate.split("-").map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const purchase = new Date(year, month - 1, day);

    const dueDateIso = calculateCreditCardDueDate(activeCard.id, purchase, cards);
    const billingMonth = calculateCreditCardBillingMonth(activeCard.id, purchase, cards);
    const [dy, dm, dd] = dueDateIso.split("-").map(Number);
    const dueDate = new Date(dy, dm - 1, dd);
    const daysToPay = Math.round((dueDate.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
    const sameMonth = billingMonth === `${year}-${String(month).padStart(2, "0")}`;

    return {
      afterClosing: !sameMonth,
      dueDateFormatted: formatLocalizedDate(dueDateIso),
      invoiceMonthLabel: formatLocalizedMonth(billingMonth),
      daysToPay,
    };
  }, [activeCard, purchaseDate, cards]);

  if (cards.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="size-4" aria-hidden />
        Simulador rápido de virada de fatura
      </h3>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
        <Field label="Cartão">
          {(p) => (
            <Select value={activeCard?.id ?? ""} onValueChange={setCardId}>
              <SelectTrigger id={p.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} (fecha dia {c.closingDay} / vence dia {c.dueDay})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Data da compra">
          {(p) => <DateField id={p.id} value={purchaseDate} onChange={setPurchaseDate} />}
        </Field>
        {result && (
          <div className="rounded-lg border bg-card p-2.5 text-sm" aria-live="polite">
            <div className="font-semibold text-primary">
              Vencimento: {result.dueDateFormatted} ({result.daysToPay} dias)
            </div>
            <div className="text-xs text-muted-foreground">
              Fatura de {result.invoiceMonthLabel}.{" "}
              {result.afterClosing
                ? "Compra após o fechamento: cai na próxima fatura."
                : "Compra antes do fechamento: fatura atual."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
