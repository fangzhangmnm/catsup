// 从装载态起步的差分（Fable 账单 K4，2026-10-27 Claude Fable 5.1；user「差分测试永远从空内核起步」→ 补这一档）：
// 三角汤 → kernelFromTriangles（一次装进去再修）→ 同一份快照装成 local / global 两台 → 同一串操作 → 每步事件 + 快照逐字相同。
// 几何在仓里现造（家规：测试不引仓外的东西）：UV 球（斜面、τ 带）+ 带起伏的格网 + 平的格网。
// 步只用**精确**的操作（擦边 / 在平面内按 mm 挪点 / 画线到既有顶点），不引入无理数坐标——局部化定理本体的口径（clean 档）；τ 带的随机档在 settle-differential。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { kernelFromTriangles } from "../src/kernel/from-triangles.ts";
import { selfCheck, describeViolations } from "../src/kernel/self-check.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });

function sphere(seg: number, rings: number, r = 1): { positions: Pt3[]; tris: number[] } {
  const positions: Pt3[] = [], tris: number[] = [];
  for (let i = 0; i <= rings; i++) { const th = (i / rings) * Math.PI; for (let j = 0; j < seg; j++) { const ph = (j / seg) * 2 * Math.PI; positions.push(P(r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th))); } }
  const at = (i: number, j: number): number => i * seg + (j % seg);
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j), d = at(i + 1, j + 1);
    if (i > 0) tris.push(a, c, b);
    if (i < rings - 1) tris.push(b, c, d);
  }
  return { positions, tris };
}
function grid(n: number, bump: (x: number, y: number) => number): { positions: Pt3[]; tris: number[] } {
  const positions: Pt3[] = [], tris: number[] = [];
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) positions.push(P(i, j, bump(i, j)));
  const at = (i: number, j: number): number => i * (n + 1) + j;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { tris.push(at(i, j), at(i + 1, j), at(i, j + 1)); tris.push(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)); }
  return { positions, tris };
}

/** 快照的几何规范形（不看面的枚举顺序 / id：局部与全局铸新面的顺序可以不同——立宪页 §3 已知残余；几何集合必须相同）。 */
function canon(k: Kernel): string {
  const key = (p: Pt3): string => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;
  const edges = k.edges().map((e) => [key(k.graph.pt(e.a)), key(k.graph.pt(e.b))].sort().join("|")).sort();
  const ring = (r: Pt3[]): string => { const ks = r.map(key); let best = ""; for (let i = 0; i < ks.length; i++) for (const dir of [1, -1]) { const s = Array.from({ length: ks.length }, (_, t) => ks[(i + dir * t + ks.length * ks.length) % ks.length]).join(">"); if (!best || s < best) best = s; } return best; };
  const faces = k.faces().map((f) => { const r = k.faceRings3(f.id)!; return [ring(r.outer), ...r.holes.map(ring).sort()].join("#"); }).sort();
  const soft = k.edges().filter((e) => k.isSoft(e.id)).map((e) => [key(k.graph.pt(e.a)), key(k.graph.pt(e.b))].sort().join("|")).sort();
  return JSON.stringify({ edges, faces, soft });
}
const types = (ev: string): string => (ev.startsWith("THROW") ? ev : JSON.stringify((JSON.parse(ev) as { type: string }[]).map((e) => e.type).sort()));

/** 装一次 → 快照 → 两台机。 */
function pair(src: { positions: Pt3[]; tris: number[] }): { local: Kernel; global: Kernel; repaired: number } {
  const { kernel, report } = kernelFromTriangles(src.positions, src.tris, { softDeg: 30 });
  const snap = kernel.toBrep();
  return { local: Kernel.fromBrep(snap), global: Kernel.fromBrep(snap, { settleMode: "global" }), repaired: report.repaired };
}

type Step = { kind: "erase"; i: number } | { kind: "move"; i: number; d: Pt3 } | { kind: "line"; i: number; j: number };
function apply(k: Kernel, st: Step): string {
  try {
    const es = k.edges(), vs = k.vertices();
    if (st.kind === "erase") return es.length ? JSON.stringify(k.eraseEdges([es[st.i % es.length].id])) : "[]";
    if (st.kind === "move") { const v = vs[st.i % vs.length]; return JSON.stringify(k.moveVertices([{ id: v.id, to: P(v.x + st.d.x, v.y + st.d.y, v.z + st.d.z) }])); }
    const a = vs[st.i % vs.length], b = vs[st.j % vs.length];
    if (a.id === b.id) return "[]";
    return JSON.stringify(k.addEdges([[P(a.x, a.y, a.z), P(b.x, b.y, b.z)]]));
  } catch (err) { return `THROW ${(err as Error).message}`; }
}

function runPair(name: string, src: { positions: Pt3[]; tris: number[] }, seed: number, steps: number, moves: boolean): void {
  const { local, global } = pair(src);
  eq(canon(local), canon(global), `${name}：起手快照相同`);
  eq(selfCheck(local).length, 0, `${name}：装载态自检 ${describeViolations(selfCheck(local))}`);
  let s = seed; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const log: string[] = [];
  for (let i = 0; i < steps; i++) {
    const r = rnd();
    const st: Step = r < 0.5 || !moves ? { kind: "erase", i: Math.floor(rnd() * 1e6) } : r < 0.8 ? { kind: "move", i: Math.floor(rnd() * 1e6), d: P(Math.round((rnd() - 0.5) * 400) / 1000, Math.round((rnd() - 0.5) * 400) / 1000, 0) } : { kind: "line", i: Math.floor(rnd() * 1e6), j: Math.floor(rnd() * 1e6) };
    const a = apply(local, st), b = apply(global, st);
    log.push(st.kind);
    eq(types(a), types(b), `${name} seed ${seed} step ${i} [${st.kind}]：事件种类不同\n  local : ${a.slice(0, 300)}\n  global: ${b.slice(0, 300)}\n  history: ${log.join(" | ")}`);
    eq(canon(local), canon(global), `${name} seed ${seed} step ${i} [${st.kind}]：几何不同\n  history: ${log.join(" | ")}`);
    if (a.startsWith("THROW")) assert(/结算机自相矛盾/.test(a), `${name} seed ${seed} step ${i}：不是守恒断言的 throw：${a}`);
  }
  const vs = selfCheck(local);
  eq(vs.length, 0, `${name} seed ${seed}：操作串之后自检 ${describeViolations(vs)}：${vs.slice(0, 3).map((v) => v.text).join("；")}`);
}

describe("从装载态起步：局部结算 = 全局结算（K4）", () => {
  it("UV 球（8 × 6，斜面）：装载即修 + 擦边串", () => {
    const src = sphere(8, 6);
    const { repaired } = pair(src);
    assert(repaired >= 0, "修的数");
    for (let seed = 1; seed <= 4; seed++) runPair("球", src, seed * 7919, 10, false);
  });
  it("起伏格网（5 × 5）：擦边串", () => {
    const src = grid(5, (x, y) => 0.3 * Math.sin(x) * Math.cos(y));
    for (let seed = 1; seed <= 4; seed++) runPair("起伏格", src, seed * 104729, 10, false);
  });
  it("平格网（5 × 5，z = 0）：擦边 + 平面内按 mm 挪点 + 画线串", () => {
    const src = grid(5, () => 0);
    for (let seed = 1; seed <= 6; seed++) runPair("平格", src, seed * 31337, 12, true);
  });
});
