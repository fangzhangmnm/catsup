// 内核差量（撤销设计稿 §2.2；2026-10-27 Claude Fable 5.1）：提交 = 影子换真身，旧真身里触碰集的记录 = 这一步的撤销记录（deltaAgainst）；
// applyDelta 自反：撤 = 写回「之前」并返回「之后」、重做 = 写回「之后」；随机动词串 5 种子 × 20 步，每步撤 → 逐字回到之前、重做 → 逐字回到之后；字节估计 ≪ 整份内核。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { deltaBytes } from "../src/kernel/delta.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const q = (x: number): number => Math.round(x * 1000) / 1000;
function scene(): Kernel {
  const k = new Kernel();
  const box = (x0: number, y0: number, z0: number, s: number): void => {
    const c = [P(x0, y0, z0), P(x0 + s, y0, z0), P(x0 + s, y0 + s, z0), P(x0, y0 + s, z0), P(x0, y0, z0 + s), P(x0 + s, y0, z0 + s), P(x0 + s, y0 + s, z0 + s), P(x0, y0 + s, z0 + s)];
    const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    k.addEdges(E.map(([a, b]) => [c[a], c[b]] as const));
  };
  box(0, 0, 0, 1); box(3, 0, 0, 1.5);
  k.addEdges([[P(-2, -2, 0), P(-2, 2, 0)], [P(-2, 2, 0), P(6, 2, 0)], [P(6, 2, 0), P(6, -2, 0)], [P(6, -2, 0), P(-2, -2, 0)]]);
  k.addEdges([[P(-1, -1, 0), P(-1, 1, 0)]], { layers: ["soft"] });
  k.addEdges([[P(4, -1, 0), P(5, -1, 0)], [P(5, -1, 0), P(5, 1, 0)]], { curve: true });
  return k;
}
const canon = (k: Kernel): string => JSON.stringify({
  brep: k.toBrep(), faces: k.faces().map((f) => [f.id, f.planeId, f.outer.vids, f.holes.map((h) => h.vids)]),
  verts: k.vertices().map((v) => [v.id, v.x, v.y, v.z, [...v.edges]]), edges: k.edges().map((e) => [e.id, e.a, e.b, [...e.faceLinks]]),
  layers: k.edgeLayers.names().sort().map((n) => [n, [...k.edgeLayers.layer(n)]]), curves: k.curves().map((c) => [c.id, c.kind, c.closed, c.edges, c.params ?? null]),
  events: k.log().length, next: [k.graph.nextVertexId, k.graph.nextEdgeId],
});
function randomVerb(r: () => number, k: Kernel): (x: Kernel) => void {
  const vs = k.vertices(), es = k.edges(), fs = k.faces(), pick = <T>(a: readonly T[]): T => a[Math.floor(r() * a.length)], x = r();
  if (x < 0.3 && vs.length) { const v = pick(vs), d = P(q((r() - 0.5) * 0.6), q((r() - 0.5) * 0.6), q((r() - 0.5) * 0.6)); return (t) => { if (t.graph.hasVertex(v.id)) t.moveVertices([{ id: v.id, to: P(q(v.x + d.x), q(v.y + d.y), q(v.z + d.z)) }]); }; }
  if (x < 0.55 && fs.length) { const f = pick(fs), dist = q((r() - 0.5) * 0.8) || 0.2; return (t) => { if (t.face(f.id)) t.pushPull(f.id, dist); }; }
  if (x < 0.75 && vs.length > 1) { const a = pick(vs), b = pick(vs); return (t) => { if (a.id !== b.id) t.addEdges([[P(a.x, a.y, a.z), P(b.x, b.y, b.z)]]); }; }
  if (x < 0.9 && es.length) { const e = pick(es); return (t) => { if (t.graph.hasEdge(e.id)) t.eraseEdges([e.id]); }; }
  const e = pick(es); return (t) => { if (t.graph.hasEdge(e.id)) t.setEdgeLayer("soft", [e.id], true); };
}

describe("内核差量（A3）：提交 = 影子换真身，差量自反", () => {
  it("5 种子 × 20 步：每步 真身 → 拷一份跑动词 → deltaAgainst 抽「之前」→ 换真身；撤 = applyDelta 逐字回到之前、再 applyDelta(逆) 逐字回到之后", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const r = rng(seed * 104729);
      let truth = scene();
      let maxBytes = 0;
      for (let step = 0; step < 20; step++) {
        const verb = randomVerb(r, truth), before = canon(truth.clone());
        const shadow = truth.clone(), seq = shadow.changes.seq;   // 提交时新拷一份（预演影子永远可丢，不升真身）
        try { verb(shadow); } catch { continue; }
        const delta = shadow.deltaAgainst(truth, seq);
        assert(delta, "日志没丢段");
        const after = canon(shadow.clone());
        truth = shadow;   // 影子换真身
        maxBytes = Math.max(maxBytes, deltaBytes(delta!));
        const inverse = truth.applyDelta(delta!);
        eq(canon(truth.clone()), before, `seed ${seed} step ${step}：撤销后 ≠ 之前`);
        const again = truth.applyDelta(inverse);
        eq(canon(truth.clone()), after, `seed ${seed} step ${step}：重做后 ≠ 之后`);
        eq(JSON.stringify([...again.ids.V].sort()), JSON.stringify([...delta!.ids.V].sort()), "来回是同一组 id");
      }
      assert(maxBytes < 200_000, `单步差量字节 ${maxBytes} 该远小于整份内核`);
    }
  });
  it("没碰东西的差量：空 id 集；应用 = 只换 rev", () => {
    const k = scene(), shadow = k.clone(), seq = shadow.changes.seq;
    const d = shadow.deltaAgainst(k, seq)!;
    eq(d.ids.V.size + d.ids.E.size + d.ids.F.size, 0);
    const c = canon(k.clone()); k.applyDelta(d); eq(canon(k.clone()), c);
  });
});
