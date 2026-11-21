import {
  CreditCardAccount,
  PaymentMethod,
  type CreditCardAccountInfo,
} from "@/types";
import { formatLocalizedMonth } from "@/utils/dateFormatting";

export function formatMonthTitle(month: string): string {
  const label = formatLocalizedMonth(month, { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface BadgeSpec {
  label: string;
  className: string;
  style?: React.CSSProperties;
}

export function getPaymentMethodBadge(method?: PaymentMethod): BadgeSpec {
  switch (method) {
    case PaymentMethod.CREDIT_CARD:
      return {
        label: "Cartão de Crédito",
        className:
          "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60",
      };
    case PaymentMethod.DEBIT_CARD:
      return {
        label: "Cartão de Débito",
        className:
          "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60",
      };
    case PaymentMethod.CASH:
      return {
        label: "Dinheiro",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60",
      };
    case PaymentMethod.PIX:
    default:
      return {
        label: "PIX",
        className:
          "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60",
      };
  }
}

export function getCreditCardAccountBadge(
  account?: CreditCardAccount | string,
  userCards?: CreditCardAccountInfo[],
): BadgeSpec | null {
  if (!account) return null;

  const matched = userCards?.find(
    (c) => c.id === account || c.name.toLowerCase() === account.toLowerCase(),
  );
  if (matched) {
    const color = matched.color || "#6366f1";
    return {
      label: matched.name,
      // Mistura com a cor do texto do tema para garantir contraste AA com cores escolhidas pelo usuário.
      style: {
        backgroundColor: `${color}15`,
        color: `color-mix(in oklab, ${color} 55%, var(--foreground))`,
        borderColor: `${color}40`,
      },
      className: "border font-semibold",
    };
  }

  switch (account) {
    case CreditCardAccount.INTER:
    case "inter":
      return {
        label: "Inter",
        className:
          "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/70 dark:border-orange-800/60 font-semibold",
      };
    case CreditCardAccount.XP:
    case "xp":
      return {
        label: "XP",
        className:
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold",
      };
    default:
      if (typeof account === "string" && account.trim()) {
        return {
          label: account.toUpperCase(),
          className:
            "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 font-semibold",
        };
      }
      return null;
  }
}
