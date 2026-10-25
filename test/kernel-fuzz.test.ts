// test/kernel-fuzz.test.ts —— 内核随机操作 fuzz + 拓扑不变量（2026-09-07 VR 真机「edge 19 不存在」案：
// 任何合法操作序列之后，环边必须存在、faceLinks 的面必须存在、无重复边、无孤立顶点，且合法 id 的操作永不 throw）。
// created 2026-09-07 by Claude Fable 5.1。场景偏向真机画法：斜置矩形、从既有顶点沿近轴方向画过头、随机推拉/擦边/挪点。
import { describe, it, assert, todo } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });

/** 重复面残余已清零（2026-10-24 D12：reconcileErase 不再铸别的活膜占着的胞腔 + 外环代表点第二次机会）。种子 31 = 两张近共线（µm 噪声）矩形
 *  共享一角，τ 带里的脏嵌入给膜配了碰着外环的假「洞」，代表点落进邻膜 → 旧代码把邻膜的胞腔再铸一张。根（假洞）仍在 τ 带，见总账 D 节。 */
const KNOWN_DUP_SEEDS = new Set<number>();
/**
 * 两档生成器（2026-10-23，总账 #26，Claude Fable 5.1）：
 *   clean = **轴对齐** + 坐标吸 mm 格、画线不加 µm 抖动 —— 真实建模的主体形态（吸附 / 格点，坐标永远落在格点上）：**合法操作永不 throw**，一条都不许。
 *           （斜置 + mm 吸附不算 clean：斜面的法向是无理数，推拉位移 h·n̂ 会让同一个点经两条路算出相邻的 1 µm 格点 → µm 尖刺 → 与 nasty 同病；
 *           fuzz clean 旧种子 5760095 = 斜矩形推拉两次后 move，旧内核静默 BURST 一张面。这是格点身份 vs 计算坐标的老问题，总账 D 节。）
 *   nasty = 老生成器（斜置 + 「过头 + ±2 µm 抖动」）—— 故意造 1 µm 高的尖刺：Q = 1 µm 的格点身份让两点 1 µm 之隔仍是两个顶点，
 *           τ = 1 mm 又说它们共面，投影后环撞环（嵌入不一致）→ 尖刺的胞腔算不出来。**旧内核在这种步里静默 BURST 膜**（80 个种子里 32 处，
 *           其中多处连带吃掉正经的大面）；现在结算机的守恒断言拒绝这一步（throw，commitOp 整批回滚）。本档只允许这一种 throw，计数见 todo。
 *           根治在格点身份 / τ 带（总账 D 节），不在局部化层。
 */
const CONSERVATION_RE = /结算机自相矛盾/;

function checkInvariants(k: Kernel, ctx: string, allowDup = false): void {
  const vids = new Set(k.graph.vertices().map((v) => v.id));
  const seen = new Set<string>();
  const fids = new Set(k.faces().map((f) => f.id));
  for (const e of k.edges()) {
    assert(vids.has(e.a) && vids.has(e.b), `${ctx}: edge ${e.id} 端点不存在`);
    const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
    assert(!seen.has(key), `${ctx}: 重复边 ${key}`);
    seen.add(key);
    for (const f of e.faceLinks) assert(fids.has(f), `${ctx}: edge ${e.id} faceLinks 指向不存在的面 ${f}`);
  }
  for (const v of k.graph.vertices()) assert(v.edges.size > 0, `${ctx}: 孤立顶点 ${v.id}`);
  // 曲线（0.10）：链连通有序、每边至多一条、闭合首尾相接、边都存在
  const cp = k.curveProblems();
  assert(!cp.length, `${ctx}: 曲线不自洽——${cp.join("; ")}`);
  // 无重复面：同一组环边（外环+洞）只准有一张面记录（2026-09-07 fuzz 抓到 54/90 同环 → 擦边裁决漏掉第三张）
  if (allowDup) return;
  const ringKeys = new Map<string, number>();
  for (const f of k.faces()) {
    const face = k.face(f.id)!;
    const key = [face.outer, ...face.holes].map((r) => [...r.edges.map((d) => d.edge)].sort((a, b) => a - b).join(",")).join("|");
    const prev = ringKeys.get(key);
    assert(prev === undefined, `${ctx}: 重复面 ${prev} / ${f.id}（同一组环边）`);
    ringKeys.set(key, f.id);
  }
  for (const f of k.faces()) {
    const face = k.face(f.id)!;
    for (const ring of [face.outer, ...face.holes]) for (const d of ring.edges) {
      assert(k.graph.hasEdge(d.edge), `${ctx}: 面 ${f.id} 环边 ${d.edge} 不存在`);
      assert(k.graph.edge(d.edge).faceLinks.includes(f.id), `${ctx}: 面 ${f.id} 环边 ${d.edge} 的 faceLinks 不含它`);
    }
    // 环连通（2026-10-21 新增）：每条有向边的终点 = 下一条的起点——findRegions 曾把 τ 带内投影相交的开环当面
    for (const ring of [face.outer, ...face.holes]) {
      const n = ring.edges.length;
      for (let i = 0; i < n; i++) {
        const d1 = ring.edges[i], d2 = ring.edges[(i + 1) % n];
        const e1 = k.graph.edge(d1.edge), e2 = k.graph.edge(d2.edge);
        assert((d1.forward ? e1.b : e1.a) === (d2.forward ? e2.a : e2.b), `${ctx}: 面 ${f.id} 环在第 ${i} 条边后不连通`);
      }
    }
  }
}

/** 拒绝前的三个分类量（D11 研究稿 §2）：最近两顶点距离 / 顶点到非邻接边最近距离 / 近平行且 0 < Δd < τ 的平面对。 */
export function classify(k: Kernel): { minVert: number; minVertSeg: number; nearParallel: number; nearParallelMin: number; faces: number } {
  const vs = k.vertices(); let minVert = Infinity;
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const d = Math.hypot(vs[i].x - vs[j].x, vs[i].y - vs[j].y, vs[i].z - vs[j].z); if (d < minVert) minVert = d; }
  let minVertSeg = Infinity;
  const es = k.edges();
  for (const v of vs) for (const e of es) { if (e.a === v.id || e.b === v.id) continue; const a = k.graph.pt(e.a), b = k.graph.pt(e.b); const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }; const L2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z; if (L2 === 0) continue; let t = ((v.x - a.x) * ab.x + (v.y - a.y) * ab.y + (v.z - a.z) * ab.z) / L2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(v.x - a.x - ab.x * t, v.y - a.y - ab.y * t, v.z - a.z - ab.z * t); if (d < minVertSeg) minVertSeg = d; }
  const planes = k.faces().map((f) => k.planeOf(f.id)!.plane);
  let nearParallel = 0, nearParallelMin = Infinity;
  for (let i = 0; i < planes.length; i++) for (let j = i + 1; j < planes.length; j++) {
    const a = planes[i], b = planes[j]; const c = a.n.x * b.n.x + a.n.y * b.n.y + a.n.z * b.n.z;
    if (Math.abs(c) < 0.999) continue;
    const dd = Math.abs(a.d - (c > 0 ? b.d : -b.d));
    if (dd > 1e-9 && dd < 1e-3) { nearParallel++; if (dd < nearParallelMin) nearParallelMin = dd; }
  }
  return { minVert, minVertSeg, nearParallel, nearParallelMin, faces: k.faces().length };
}
/** 拒绝记录钩子（sweep 脚本装；测试本身不装）。 */
export const onReject: { fn: ((r: { seed: number; step: number; op: string; k: Kernel }) => void) | null } = { fn: null };

export function run(seed: number, steps: number, allowDup = false, tier: "clean" | "nasty" = "nasty"): number {
  let s = seed; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const q = (v: number): number => (tier === "clean" ? Math.round(v * 1000) / 1000 : v);
  const k = new Kernel();
  const log: string[] = [];
  const tiltedRect = (): [Pt3, Pt3][] => {
    const th = tier === "clean" ? 0 : rnd() * 0.4, ph = tier === "clean" ? 0 : rnd() < 0.5 ? 0 : rnd() * 0.4;
    const u = P(Math.cos(th), Math.sin(th), 0), v = P(-Math.sin(th) * Math.cos(ph), Math.cos(th) * Math.cos(ph), Math.sin(ph));
    const vs = k.graph.vertices();
    const o = vs.length && rnd() < 0.5 ? (() => { const a = pick(vs); return P(a.x, a.y, a.z); })() : P(q(rnd() * 3), q(rnd() * 3), rnd() < 0.3 ? q(rnd() * 2) : 0);
    const W = q(0.3 + rnd() * 2), H = q(0.3 + rnd() * 2);
    const c = (a: number, b: number): Pt3 => P(q(o.x + u.x * a + v.x * b), q(o.y + u.y * a + v.y * b), q(o.z + u.z * a + v.z * b));
    const c1 = c(0, 0), c2 = c(W, 0), c3 = c(W, H), c4 = c(0, H);
    return [[c1, c2], [c2, c3], [c3, c4], [c4, c1]];
  };
  for (let i = 0; i < steps; i++) {
    const es = k.edges(), fs = k.faces(), vs = k.graph.vertices();
    const r = rnd();
    let op = "";
    try {
      if (r < 0.12 && es.length > 0) {
        // 圆（0.10）：随机圆心半径，水平面上（clean）或斜置（nasty），12 段，带曲线规格
        const o = P(q(rnd() * 3), q(rnd() * 3), tier === "clean" ? q(rnd() < 0.5 ? 0 : 2) : q(rnd() * 2)), rad = q(0.3 + rnd() * 1.2);
        const th = tier === "clean" ? 0 : rnd() * 0.4;
        const n = { x: Math.sin(th), y: 0, z: Math.cos(th) }, u = { x: Math.cos(th), y: 0, z: -Math.sin(th) }, v = { x: 0, y: 1, z: 0 };
        const segs: [Pt3, Pt3][] = [];
        for (let i = 0; i < 12; i++) { const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2; const pt = (a: number): Pt3 => P(q(o.x + rad * (Math.cos(a) * u.x + Math.sin(a) * v.x)), q(o.y + rad * (Math.cos(a) * u.y + Math.sin(a) * v.y)), q(o.z + rad * (Math.cos(a) * u.z + Math.sin(a) * v.z))); segs.push([pt(a0), pt(a1)]); }
        op = "circle"; k.addEdges(segs, { curve: { kind: "circle", closed: true, params: { center: o, radius: rad, normal: n, xaxis: u, segments: 12 } } });
      } else if (r < 0.35 || es.length === 0) {
        op = "rect"; k.addEdges(tiltedRect());
      } else if (r < 0.6) {
        // 从既有顶点沿某条邻边的理想方向画过头（带 µm 级偏差）
        const v = pick(vs); const eid = pick([...v.edges]); const e = k.graph.edge(eid);
        const o = k.graph.pt(v.id), q = k.graph.pt(e.a === v.id ? e.b : e.a);
        const kk = tier === "clean" ? 2 : 1 + rnd() * 2;
        const jx = (rnd() - 0.5) * 4e-6, jy = (rnd() - 0.5) * 4e-6, jz = (rnd() - 0.5) * 4e-6;
        const d = tier === "clean" ? P(q.x - o.x, q.y - o.y, q.z - o.z) : P(q.x - o.x + jx, q.y - o.y + jy, q.z - o.z + jz);
        op = `line ${v.id}→过头`; k.addEdges([[o, P(o.x + d.x * kk, o.y + d.y * kk, o.z + d.z * kk)]]);
      } else if (r < 0.75 && fs.length) {
        const f = pick(fs); const dist = q((rnd() - 0.3) * 1.5);
        op = `pp ${f.id} ${dist.toFixed(3)}`; k.pushPull(f.id, dist);
      } else if (r < 0.9) {
        const e = pick(es); op = `erase ${e.id}`; k.eraseEdges([e.id]);
      } else if (tier === "clean" && fs.length) {
        // clean 档不挪点：任意方向挪一个顶点就把面挪斜（无理数法向 → 推拉后 µm 尖刺，与 nasty 同病）；挪点归 nasty 档。这里改成一次推拉
        const f = pick(fs); const dist = q((rnd() - 0.3) * 1.5);
        op = `pp ${f.id} ${dist.toFixed(3)}`; k.pushPull(f.id, dist);
      } else {
        const v = pick(vs); const to = P(q(v.x + (rnd() - 0.5) * 0.5), q(v.y + (rnd() - 0.5) * 0.5), q(v.z + (rnd() - 0.5) * 0.5));
        op = `move ${v.id}`; k.moveVertices([{ id: v.id, to }]);
      }
    } catch (err) {
      if (tier === "nasty" && CONSERVATION_RE.test((err as Error).message)) { onReject.fn?.({ seed, step: i, op, k }); return 1; }   // τ 带残余：守恒断言拒绝这一步（见上），这个种子到此为止
      assert(false, `[${tier}] seed ${seed} step ${i} [${op}] throw: ${(err as Error).message}\n  history: ${log.join(" | ")}`);
    }
    log.push(op);
    checkInvariants(k, `[${tier}] seed ${seed} step ${i} [${op}]`, allowDup);
  }
  return 0;
}

describe("kernel fuzz: 随机操作序列的拓扑不变量", () => {
  it("clean 80 个种子 × 12 步（轴对齐、mm 格点、无 µm 抖动）：合法操作永不 throw；环边存在 / faceLinks 面存在 / 无重复边 / 无孤立顶点 / 环连通 / 无重复面", () => {
    for (let seed = 1; seed <= 80; seed++) run(seed * 104729, 12, KNOWN_DUP_SEEDS.has(seed), "clean");
  });
  let rejected = 0;
  it("nasty 80 个种子 × 12 步（斜置 + 过头 µm 抖动）：不变量照查；只允许守恒断言拒绝（τ 带残余），不许别的 throw；无重复面（1 个已知种子除外）", () => {
    for (let seed = 1; seed <= 80; seed++) rejected += run(seed * 104729, 12, KNOWN_DUP_SEEDS.has(seed), "nasty");
    assert(rejected === 0, `nasty 档守恒断言拒绝的种子数 ${rejected}——EGC 期 2（2026-10-24）起应为 0：精确谓词 + 身份分辨率 3 µm；涨了去看 ai-docs/20261024-exact-geometry-design.md`);
  });
});
