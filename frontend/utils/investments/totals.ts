/**
 * Totais, hierarquia de classes e alocação dos lançamentos de investimentos (puro).
 * Regras: docs/sprints/SPRINT_03_INVESTMENTS.md (e docs/INVESTMENTS_LOGIC.md, fase 3.5).
 */
import type { InvestmentClass, InvestmentSnapshot } from "@/types";

export interface ClassNode {
  cls: InvestmentClass;
  /** Subclasses ordenadas (vazio para categorias sem filhos). */
  children: InvestmentClass[];
}

export interface AllocationItem {
  classId: string;
  name: string;
  balance: number;
  /** Fração do total (0–1). */
  share: number;
}

const bySortOrder = (a: InvestmentClass, b: InvestmentClass) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR");

/** Categorias raiz com seus filhos, na ordem de exibição. `includeArchived: false` esconde arquivadas. */
export function buildClassTree(classes: InvestmentClass[], includeArchived = true): ClassNode[] {
  const visible = includeArchived ? classes : classes.filter((c) => !c.archived);
  return visible
    .filter((c) => c.parentId === null)
    .sort(bySortOrder)
    .map((cls) => ({ cls, children: visible.filter((c) => c.parentId === cls.id).sort(bySortOrder) }));
}

/** Folha = classe sem filhos. Só folhas recebem valores nos lançamentos. */
export function isLeaf(classId: string, classes: InvestmentClass[]): boolean {
  return !classes.some((c) => c.parentId === classId);
}

/** Folhas na ordem da árvore; por padrão só as ativas (as que aceitam um lançamento novo). */
export function getLeafClasses(classes: InvestmentClass[], includeArchived = false): InvestmentClass[] {
  return buildClassTree(classes, includeArchived).flatMap((n) => (n.children.length > 0 ? n.children : [n.cls]));
}

/** Ids das folhas sob uma classe (ela mesma, se for folha). */
export function leafIdsUnder(classId: string, classes: InvestmentClass[]): string[] {
  const children = classes.filter((c) => c.parentId === classId);
  return children.length > 0 ? children.map((c) => c.id) : [classId];
}

/** Rótulo "Pai › Filho" (ou só o nome, para raízes). */
export function classLabel(classId: string, classes: InvestmentClass[]): string {
  const cls = classes.find((c) => c.id === classId);
  if (!cls) return "Classe removida";
  const parent = cls.parentId ? classes.find((c) => c.id === cls.parentId) : undefined;
  return parent ? `${parent.name} › ${cls.name}` : cls.name;
}

export function sortSnapshotsAsc(snapshots: InvestmentSnapshot[]): InvestmentSnapshot[] {
  return [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
}

/** Lançamento do mês mais recente (ou `undefined`). */
export function latestSnapshot(snapshots: InvestmentSnapshot[]): InvestmentSnapshot | undefined {
  return snapshots.reduce<InvestmentSnapshot | undefined>(
    (best, s) => (!best || s.month > best.month ? s : best),
    undefined,
  );
}

export function snapshotTotal(snapshot: InvestmentSnapshot): number {
  return snapshot.entries.reduce((sum, e) => sum + e.balance, 0);
}

export interface Flows {
  contributions: number;
  withdrawals: number;
  /** aportes − resgates */
  net: number;
}

export function snapshotFlows(snapshot: InvestmentSnapshot): Flows {
  const contributions = snapshot.entries.reduce((s, e) => s + e.contributions, 0);
  const withdrawals = snapshot.entries.reduce((s, e) => s + e.withdrawals, 0);
  return { contributions, withdrawals, net: contributions - withdrawals };
}

/** Saldo de uma classe (categoria = soma das folhas sob ela) em um lançamento. */
export function classBalance(snapshot: InvestmentSnapshot, classId: string, classes: InvestmentClass[]): number {
  const ids = new Set(leafIdsUnder(classId, classes));
  return snapshot.entries.filter((e) => ids.has(e.classId)).reduce((s, e) => s + e.balance, 0);
}

/**
 * Alocação de um lançamento. `level: "root"` agrega por categoria; `"leaf"` lista as folhas.
 * Só entram classes com saldo > 0, na ordem da árvore.
 */
export function allocation(
  snapshot: InvestmentSnapshot,
  classes: InvestmentClass[],
  level: "root" | "leaf" = "root",
): AllocationItem[] {
  const total = snapshotTotal(snapshot);
  const items: Omit<AllocationItem, "share">[] = [];

  for (const node of buildClassTree(classes, true)) {
    if (level === "root") {
      items.push({ classId: node.cls.id, name: node.cls.name, balance: classBalance(snapshot, node.cls.id, classes) });
    } else {
      const leaves = node.children.length > 0 ? node.children : [node.cls];
      for (const leaf of leaves) {
        items.push({ classId: leaf.id, name: classLabel(leaf.id, classes), balance: classBalance(snapshot, leaf.id, classes) });
      }
    }
  }
  return items.filter((i) => i.balance > 0).map((i) => ({ ...i, share: total > 0 ? i.balance / total : 0 }));
}
