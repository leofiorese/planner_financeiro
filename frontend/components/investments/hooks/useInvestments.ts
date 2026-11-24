"use client";

import { useCallback, useEffect, useState } from "react";
import type { InvestmentSettings, InvestmentSnapshot, InvestmentsData } from "@/types";
import { normalizeInvestmentSettings } from "@/utils/investments/normalize";

export interface ClassPayload {
  id?: string;
  parentId: string | null;
  name: string;
  sortOrder?: number;
  archived?: boolean;
}

export type SnapshotPayload = Pick<InvestmentSnapshot, "month" | "date" | "entries"> & { id?: string };

const ENDPOINT = "/api/investments";

/** Chama a API e transforma `{ error }` das respostas não-ok numa `Error` com a mensagem do servidor. */
async function request<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || fallback);
  }
  return (await res.json()) as T;
}

const postJson = (type: string, data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type, data }),
});

/**
 * Dados do módulo Investimentos (`/api/investments`): carregamento e mutações.
 * As mutações lançam `Error` (mensagem em pt-BR vinda da API) e recarregam tudo ao terminar;
 * quem chama exibe o toast (`withToast`).
 */
export function useInvestments() {
  const [data, setData] = useState<InvestmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const raw = await request<InvestmentsData>(ENDPOINT, undefined, "Falha ao carregar os investimentos");
      setData({
        classes: raw.classes ?? [],
        snapshots: raw.snapshots ?? [],
        settings: normalizeInvestmentSettings(raw.settings),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar os investimentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const saveClass = useCallback(
    async (payload: ClassPayload) => {
      await request(ENDPOINT, postJson("class", payload), "Não foi possível salvar a classe");
      await load();
    },
    [load],
  );

  /** Grava várias classes em sequência e recarrega uma vez só (reordenação). */
  const saveClasses = useCallback(
    async (payloads: ClassPayload[]) => {
      try {
        for (const payload of payloads) {
          await request(ENDPOINT, postJson("class", payload), "Não foi possível salvar a classe");
        }
      } finally {
        await load();
      }
    },
    [load],
  );

  /** Exclui; se a classe tem histórico a API a arquiva em vez de apagar (`archived: true`). */
  const deleteClass = useCallback(
    async (id: string) => {
      const result = await request<{ archived: boolean }>(
        `${ENDPOINT}?type=class&id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
        "Não foi possível excluir a classe",
      );
      await load();
      return result;
    },
    [load],
  );

  const saveSnapshot = useCallback(
    async (payload: SnapshotPayload) => {
      await request(ENDPOINT, postJson("snapshot", payload), "Não foi possível salvar o lançamento");
      await load();
    },
    [load],
  );

  const deleteSnapshot = useCallback(
    async (id: string) => {
      await request(
        `${ENDPOINT}?type=snapshot&id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
        "Não foi possível excluir o lançamento",
      );
      await load();
    },
    [load],
  );

  const saveSettings = useCallback(
    async (settings: InvestmentSettings) => {
      await request(ENDPOINT, postJson("settings", settings), "Não foi possível salvar as configurações");
      await load();
    },
    [load],
  );

  return { data, loading, error, retry, saveClass, saveClasses, deleteClass, saveSnapshot, deleteSnapshot, saveSettings };
}

export type InvestmentsApi = ReturnType<typeof useInvestments>;
