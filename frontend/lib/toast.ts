import { toast } from "sonner";

interface WithToastMessages<T> {
  loading?: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
}

/**
 * Padrão de feedback para mutações assíncronas: exibe um toast de loading/sucesso/erro
 * sobre o `toast.promise` do sonner e devolve o resultado da promise original
 * (rejeita se ela rejeitar, para o chamador poder reagir).
 *
 * @example
 * await withToast(addExpense(data), {
 *   loading: "Salvando despesa...",
 *   success: "Despesa salva",
 *   error: "Não foi possível salvar a despesa",
 * });
 */
export function withToast<T>(promise: Promise<T>, messages: WithToastMessages<T>): Promise<T> {
  toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
  return promise;
}

export { toast };
