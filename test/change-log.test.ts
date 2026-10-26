// 内核改动日志（纪元账本 DT96，2026-10-26 Claude Opus 5.5）的守卫：日志是渲染增量更新的唯一依据——漏记 = 画面不更新（陈旧的面 / 边）。
// 对拍：随机操作前后各拍一份全量快照，凡是变了的顶点 / 边 / 面都必须在日志里；副本（clone）上做的操作，副本日志覆盖它和原件的全部差别。
import { describe, it, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
type Snap = { v: Map<number, string>; e: Map<number, string>; f: Map<number, string>; links: Map<number, number[]> };
function snap(k: Kernel): Snap {
  const r6 = (x: number): string => (Math.round(x * 1e6) / 1e6).toString();
  const v = new Map<number, string>(), e = new Map<number, string>(), f = new Map<number, string>(), links = new Map<number, number[]>();
  for (const x of k.vertices()) v.set(x.id, `${r6(x.x)},${r6(x.y)},${r6(x.z)}`);
  for (const x of k.edges()) { e.set(x.id, `${x.a}-${x.b}|${k.edgeLayers.of(x.id).sort().join(",")}`); links.set(x.id, [...x.faceLinks].sort((a, b) => a - b)); }
  for (const x of k.faces()) {
    const rings = [x.outer, ...x.holes].map((r) => r.vids.map((id) => v.get(id) ?? "?").join(";")).join("|");
    f.set(x.id, `${x.planeId}|${rings}|${JSON.stringify(k.faceLayers.of(x.id))}`);
  }
  return { v, e, f, links };
}
/** 日志契约：变了的顶点 → verts；变了的边（有无 / 端点 / 层）→ edges 或它的端点在 verts；faceLinks 变了 → 新旧链接里有面在 faces；变了的面 → faces。 */
function checkCovered(a: Snap, b: Snap, cs: { verts: Set<number>; edges: Set<number>; faces: Set<number> } | null, ctx: string): void {
  assert(cs !== null, `${ctx}: 日志说「不知道」`);
  const diff = <T>(x: Map<number, T>, y: Map<number, T>, eq: (p: T, q: T) => boolean): number[] => { const out: number[] = []; for (const k of new Set([...x.keys(), ...y.keys()])) { const p = x.get(k), q = y.get(k); if (p === undefined || q === undefined || !eq(p, q)) out.push(k); } return out; };
  for (const id of diff(a.v, b.v, (p, q) => p === q)) assert(cs!.verts.has(id), `${ctx}: 顶点 ${id} 变了没记`);
  for (const id of diff(a.e, b.e, (p, q) => p === q)) {
    const ends = (b.e.get(id) ?? a.e.get(id))!.split("|")[0].split("-").map(Number);
    assert(cs!.edges.has(id) || ends.some((x) => cs!.verts.has(x)), `${ctx}: 边 ${id} 变了没记`);
  }
  for (const id of diff(a.links, b.links, (p, q) => p.join() === q.join())) {
    const all = [...(a.links.get(id) ?? []), ...(b.links.get(id) ?? [])];
    assert(cs!.edges.has(id) || all.some((x) => cs!.faces.has(x)), `${ctx}: 边 ${id} 的面链接变了、两边的面都没记`);
  }
  for (const id of diff(a.f, b.f, (p, q) => p === q)) assert(cs!.faces.has(id), `${ctx}: 面 ${id} 变了没记`);
}
function randomOps(seed: number, steps: number, onStep: (k: Kernel, step: () => void, label: string) => void): void {
  let s = seed; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const q = (x: number): number => Math.round(x * 1000) / 1000;
  const k = new Kernel();
  for (let i = 0; i < steps; i++) {
    const r = rnd(), es = k.edges(), fs = k.faces(), vs = k.vertices();
    let label = "", op: () => void;
    if (r < 0.3 || !es.length) {
      const o = P(q(rnd() * 3), q(rnd() * 3), rnd() < 0.3 ? q(rnd()) : 0), W = q(0.3 + rnd() * 2), H = q(0.3 + rnd() * 2);
      label = "rect"; op = () => k.addEdges([[o, P(o.x + W, o.y, o.z)], [P(o.x + W, o.y, o.z), P(o.x + W, o.y + H, o.z)], [P(o.x + W, o.y + H, o.z), P(o.x, o.y + H, o.z)], [P(o.x, o.y + H, o.z), o]]);
    } else if (r < 0.45 && fs.length) { const f = fs[Math.floor(rnd() * fs.length)]; const d = q((rnd() - 0.3) * 1.5); label = "pp"; op = () => k.pushPull(f.id, d); }
    else if (r < 0.6) { const e = es[Math.floor(rnd() * es.length)]; label = "erase"; op = () => k.eraseEdges([e.id]); }
    else if (r < 0.72 && vs.length) { const v = vs[Math.floor(rnd() * vs.length)]; const d = P(q((rnd() - 0.5) * 0.4), q((rnd() - 0.5) * 0.4), q((rnd() - 0.5) * 0.4)); label = "move"; op = () => k.moveVertices([{ id: v.id, to: P(v.x + d.x, v.y + d.y, v.z + d.z) }]); }
    else if (r < 0.82) { const e = es[Math.floor(rnd() * es.length)]; const on = rnd() < 0.5; label = "soft"; op = () => k.setEdgeLayer("soft", [e.id], on); }
    else if (r < 0.92 && fs.length) { const f = fs[Math.floor(rnd() * fs.length)]; const slot = Math.floor(rnd() * 3); label = "paint"; op = () => k.setFaceMaterial([f.id], slot); }
    else { const v = vs[Math.floor(rnd() * vs.length)]; const e = [...(v?.edges ?? [])][0]; label = "line"; op = () => { if (e === undefined) return; const ed = k.graph.edge(e), o = k.graph.pt(v.id), t = k.graph.pt(ed.a === v.id ? ed.b : ed.a); k.addEdges([[o, P(o.x + (t.x - o.x) * 1.7, o.y + (t.y - o.y) * 1.7, o.z + (t.z - o.z) * 1.7)]]); }; }
    onStep(k, () => { try { op(); } catch { /* 拒绝的操作（守恒断言等）：照样核账 */ } }, `${label} #${i}`);
  }
}

describe("内核改动日志（DT96）", () => {
  it("随机操作 40 个种子 × 14 步：每步变了的顶点 / 边 / 面都在日志里", () => {
    for (let seed = 1; seed <= 40; seed++) randomOps(seed * 7919, 14, (k, step, label) => {
      const a = snap(k), s0 = k.changes.seq;
      step();
      checkCovered(a, snap(k), k.changes.since(s0), `seed ${seed} ${label}`);
    });
  });
  it("副本：拷贝后在副本上做一步，副本日志（从拷贝那一号起）覆盖副本和原件的全部差别；原件日志不动", () => {
    for (let seed = 1; seed <= 25; seed++) randomOps(seed * 104729 + 3, 10, (k, step, label) => {
      const c = k.clone();
      const origin = snap(k), s0 = k.changes.seq;
      assert(c.cloneOf === k && c.clonedAt === s0, "族谱记下了");
      // 在副本上做同一种操作：这里直接拿副本重放 step 不行（step 闭包绑原件），改为在副本上做一次随机推拉 / 擦边
      const fs = c.faces(), es = c.edges();
      try { if (fs.length && seed % 2) c.pushPull(fs[seed % fs.length].id, 0.25); else if (es.length) c.eraseEdges([es[seed % es.length].id]); } catch { /* 拒绝也照核 */ }
      checkCovered(origin, snap(c), c.changes.since(c.clonedAt), `seed ${seed} 副本 after ${label}`);
      assert(k.changes.seq === s0, "原件日志没被副本的操作碰到");
      step();
    });
  });
  it("只记改过的：20 个互不相干的矩形里擦一个的一条边 → 日志里的面 ≤ 2 张（不是全记）", () => {
    const k = new Kernel();
    for (let i = 0; i < 20; i++) { const x = i * 2; k.addEdges([[P(x, 0, 0), P(x + 1, 0, 0)], [P(x + 1, 0, 0), P(x + 1, 1, 0)], [P(x + 1, 1, 0), P(x, 1, 0)], [P(x, 1, 0), P(x, 0, 0)]]); }
    const s0 = k.changes.seq;
    k.eraseEdges([k.edges()[0].id]);
    const cs = k.changes.since(s0)!;
    assert(cs.faces.size <= 2 && cs.edges.size <= 4, `记多了：面 ${cs.faces.size} 边 ${cs.edges.size}`);
  });
  it("读文件（fromBrep）后：拷贝那一号之前的问「不知道」= 全量", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0, 0), P(1, 0, 0)], [P(1, 0, 0), P(1, 1, 0)], [P(1, 1, 0), P(0, 1, 0)], [P(0, 1, 0), P(0, 0, 0)]]);
    const k2 = Kernel.fromBrep(k.toBrep());
    assert(k2.changes.since(0) === null || k2.changes.seq === 0, "装载之前的号不知道");
    const s = k2.changes.seq; k2.pushPull(k2.faces()[0].id, 1);
    assert(k2.changes.since(s) !== null && k2.changes.since(s)!.faces.size > 0, "装载之后的照记");
  });
});
