// Kernel.toBrep / fromBrep：存储态快照往返 + 装载校验（转正纪元持久化装载；立宪页 §5「持久化装载」）。created 2026-09-20 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { BrepSnapshot, Pt3 } from "../src/kernel/kernel.ts";
import { rectSegments } from "../src/editor/tools.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
function loop(k: Kernel, pts: Pt3[]): void {
  const segs: [Pt3, Pt3][] = [];
  for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
  k.addEdges(segs);
}
function box(S = 10, H = 8): Kernel {
  const k = new Kernel();
  loop(k, [P(0, 0), P(S, 0), P(S, S), P(0, S)]);
  loop(k, [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)]);
  loop(k, [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)]);
  loop(k, [P(S, S), P(0, S), P(0, S, H), P(S, S, H)]);
  loop(k, [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]);
  return k;
}
function fingerprint(k: Kernel): string {
  const key = (p: Pt3): string => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)},${Math.round(p.z * 1e6)}`;
  const edges = k.edges().map((e) => [key(k.graph.pt(e.a)), key(k.graph.pt(e.b))].sort().join("~")).sort();
  const faces = k.faces().map((f) => {
    const r = k.faceRings3(f.id)!;
    return [r.outer, ...r.holes].map((ring) => ring.map(key).sort().join(";")).join("|");
  }).sort();
  return `${k.vertices().length}/${edges.join(" ")}/${faces.join(" ")}`;
}
function invariants(k: Kernel): void {
  const seen = new Set<string>();
  for (const e of k.edges()) { const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`; assert(!seen.has(key), "重复边"); seen.add(key); }
  for (const v of k.graph.vertices()) assert(v.edges.size > 0, "孤立顶点");
  for (const f of k.faces()) for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) {
    assert(k.graph.hasEdge(d.edge), "环边不存在");
    assert(k.graph.edge(d.edge).faceLinks.includes(f.id), "faceLinks 缺面");
  }
}

describe("kernel brep snapshot", () => {
  it("盒子：toBrep → fromBrep 几何/拓扑指纹一致，6 面 12 棱 8 顶点，faceLinks 重建，不变量成立", () => {
    const k = box();
    eq(k.faces().length, 6);
    const snap = k.toBrep();
    eq(snap.planes.length, 6, "六张平面被引用");
    const k2 = Kernel.fromBrep(snap);
    eq(fingerprint(k2), fingerprint(k));
    eq(k2.edges().filter((e) => e.faceLinks.length === 2).length, 12, "12 棱各挂 2 面");
    invariants(k2);
    // 装载后还能继续手势：顶面分一刀 → DIVIDE
    const ev = k2.addEdges([[P(5, 0, 8), P(5, 10, 8)]]);
    assert(ev.some((e) => e.type === "DIVIDE"), `装载后推拉/画线照常：${JSON.stringify(ev)}`);
    eq(k2.faces().length, 7);
  });

  it("「闭环无面」是存储态：擦掉顶面再往返，面数保持 5，不被 face-finding 复活", () => {
    const k = box();
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 8))!;
    k.eraseFaces([top.id]);
    eq(k.faces().length, 5);
    const k2 = Kernel.fromBrep(k.toBrep());
    eq(k2.faces().length, 5, "顶面不复活");
    eq(fingerprint(k2), fingerprint(k));
  });

  it("带洞面往返：外环 CCW、洞 CW 保持；洞数一致", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 100, y: 100 }));
    k.addEdges(rectSegments({ x: 40, y: 40 }, { x: 60, y: 60 }));
    k.eraseFaces(k.faces().filter((f) => f.holes.length === 0).map((f) => f.id));
    const holed = k.faces().find((f) => f.holes.length === 1);
    assert(holed, "应有带洞面");
    const k2 = Kernel.fromBrep(k.toBrep());
    eq(k2.faces().length, 1);
    eq(k2.faces()[0].holes.length, 1);
    eq(fingerprint(k2), fingerprint(k));
  });

  it("平面参数原样带回（不是重拟合）", () => {
    const k = box();
    const snap = k.toBrep();
    const k2 = Kernel.fromBrep(snap);
    const p0 = k2.planeOf(k2.faces()[0].id)!.plane;
    assert(snap.planes.some((pl) => pl.d === p0.d && pl.n.x === p0.n.x && pl.n.y === p0.n.y && pl.n.z === p0.n.z), "平面参数逐字相同");
  });

  it("校验：环缺边 / 绕向反 / 重复面 / 顶点撞格 / 孤立顶点 → 整份拒开", () => {
    const good = box().toBrep();
    const throws = (mut: (s: { -readonly [K in keyof BrepSnapshot]: BrepSnapshot[K] }) => void, what: string): void => {
      const s = structuredClone(good) as { -readonly [K in keyof BrepSnapshot]: BrepSnapshot[K] };
      mut(s);
      let threw = false;
      try { Kernel.fromBrep(s); } catch (e) { threw = (e as Error).message.startsWith("fromBrep:"); }
      assert(threw, `${what} 应拒开`);
    };
    throws((s) => { s.edges = s.edges.slice(1); }, "环缺边");
    throws((s) => { const f = s.faces[0]; s.faces = [{ ...f, outer: [...f.outer].reverse() }, ...s.faces.slice(1)]; }, "外环绕向反");
    throws((s) => { s.faces = [...s.faces, s.faces[0]]; }, "重复面");
    throws((s) => { s.vertices = [...s.vertices, s.vertices[0]]; }, "顶点撞格");
    throws((s) => { s.vertices = [...s.vertices, { x: 99, y: 99, z: 99 }]; }, "孤立顶点");
    throws((s) => { const f = s.faces[0]; s.faces = [{ ...f, outer: f.outer.slice(0, 2) }, ...s.faces.slice(1)]; }, "环长 < 3");
  });
});
