/**
 * Rótulos pt-BR de enums do domínio. Substitui as antigas chaves `t("...")`.
 */

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  cash: "Dinheiro",
};

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

const GOAL_CATEGORY_LABELS: Record<string, string> = {
  emergency_fund: "Fundo de Emergência",
  retirement: "Aposentadoria",
  education: "Educação",
  home_purchase: "Compra da Casa",
  vacation: "Férias",
  debt_payoff: "Pagamento de Dívidas",
  major_purchase: "Compra Importante",
  investment: "Investimento",
  other: "Outro",
};

export function getGoalCategoryLabel(category: string): string {
  return GOAL_CATEGORY_LABELS[category.toLowerCase()] ?? category;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export function getPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority.toLowerCase()] ?? priority;
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  all: "Todos os Tipos",
  one_time: "Única",
  oneTime: "Única",
  recurring: "Recorrente",
  installment: "Parcelada",
};

export function getScheduleTypeLabel(type: string): string {
  return SCHEDULE_TYPE_LABELS[type] ?? type;
}
