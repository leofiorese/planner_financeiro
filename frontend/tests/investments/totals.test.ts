import test from "node:test";
import assert from "node:assert/strict";
import {
  allocation,
  buildClassTree,
  classBalance,
  classLabel,
  getLeafClasses,
  isLeaf,
  latestSnapshot,
  leafIdsUnder,
  snapshotFlows,
  snapshotTotal,
} from "../../utils/investments/totals";
import { CLASSES, approx, entry, snap } from "./helpers";

test("buildClassTree: raízes e filhos na ordem; arquivadas só se pedido", () => {
  const all = buildClassTree(CLASSES);
  assert.deepEqual(all.map((n) => n.cls.id), ["r", "c", "x"]);
  assert.deepEqual(all[0].children.map((c) => c.id), ["a", "b"]);
  assert.deepEqual(all[2].children.map((c) => c.id), ["y", "d"]);
  const active = buildClassTree(CLASSES, false);
  assert.deepEqual(active[2].children.map((c) => c.id), ["y"]);
});

test("isLeaf / leafIdsUnder / getLeafClasses", () => {
  assert.equal(isLeaf("r", CLASSES), false);
  assert.equal(isLeaf("a", CLASSES), true);
  assert.equal(isLeaf("c", CLASSES), true);
  assert.deepEqual(leafIdsUnder("r", CLASSES), ["a", "b"]);
  assert.deepEqual(leafIdsUnder("c", CLASSES), ["c"]);
  assert.deepEqual(getLeafClasses(CLASSES).map((c) => c.id), ["a", "b", "c", "y"]);
  assert.deepEqual(getLeafClasses(CLASSES, true).map((c) => c.id), ["a", "b", "c", "y", "d"]);
});

test("classLabel: 'Pai › Filho', raiz e classe removida", () => {
  assert.equal(classLabel("a", CLASSES), "Renda Fixa › Nacional");
  assert.equal(classLabel("c", CLASSES), "FIIs");
  assert.equal(classLabel("zzz", CLASSES), "Classe removida");
});

test("totais, fluxos e saldo por categoria", () => {
  const s = snap("2026-11", [entry("a", 1000, 100, 0), entry("b", 500, 0, 50), entry("c", 200)]);
  assert.equal(snapshotTotal(s), 1700);
  assert.deepEqual(snapshotFlows(s), { contributions: 100, withdrawals: 50, net: 50 });
  assert.equal(classBalance(s, "r", CLASSES), 1500);
  assert.equal(classBalance(s, "a", CLASSES), 1000);
  assert.equal(classBalance(s, "x", CLASSES), 0);
});

test("allocation: por categoria e por folha, só saldo > 0, soma das frações = 1", () => {
  const s = snap("2026-11", [entry("a", 600), entry("b", 200), entry("c", 200), entry("y", 0)]);
  const root = allocation(s, CLASSES, "root");
  assert.deepEqual(root.map((i) => i.classId), ["r", "c"]);
  approx(root[0].share, 0.8);
  approx(root[1].share, 0.2);
  const leaf = allocation(s, CLASSES, "leaf");
  assert.deepEqual(leaf.map((i) => i.name), ["Renda Fixa › Nacional", "Renda Fixa › Internacional", "FIIs"]);
  approx(leaf.reduce((sum, i) => sum + i.share, 0), 1);
});

test("allocation com total zero não divide por zero", () => {
  assert.deepEqual(allocation(snap("2026-11", [entry("a", 0)]), CLASSES), []);
});

test("latestSnapshot escolhe o mês mais recente, independente da ordem", () => {
  const list = [snap("2026-03", []), snap("2026-11", []), snap("2026-05", [])];
  assert.equal(latestSnapshot(list)?.month, "2026-11");
  assert.equal(latestSnapshot([]), undefined);
});
