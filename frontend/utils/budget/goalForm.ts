import type { Goal } from "@/types";
import { GoalType } from "@/types";

/**
 * Valida os campos de budget do formulário de meta.
 * Meta open-ended com a reserva ligada exige o valor manual (≥ 0).
 */
export function getGoalBudgetFormError(
  draft: Pick<Goal, "goalType" | "reserveFromBudget" | "budgetReserveOverride">
): string | null {
  if (
    draft.reserveFromBudget &&
    draft.goalType === GoalType.OPEN_ENDED &&
    (draft.budgetReserveOverride === null ||
      draft.budgetReserveOverride === undefined ||
      !Number.isFinite(draft.budgetReserveOverride) ||
      draft.budgetReserveOverride < 0)
  ) {
    return "Metas sem valor final precisam de um valor manual de reserva por período.";
  }
  return null;
}
