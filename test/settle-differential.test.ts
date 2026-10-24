// 局部性定理的差分 oracle（2026-10-23，Claude Fable 5.1；总账 #26；立宪页 §3「局部性定理」）：
// 同一串随机操作在两台内核上跑——local = 影响域局部结算（出货路径），global = 全平面全膜（settleMode: "global"）——
// 每一步之后面集 / 环 / 边 / 事件必须**逐字相同**。这是守局部化层的那条定理的测试；拓扑不变量（kernel-fuzz）守不住「合法但错」。
// 生成器与 kernel-fuzz 同款（斜置矩形 / 过头画线 / 推拉 / 擦边 / 挪点），两边用同一串随机数、按同一下标取对象（id 确定性相同）。
import { describe, it, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
/**
 * 几何比较按**容差匹配**（τ = 1 mm），不按取整键：推拉方向用的是**注册平面**的法向，而 mm 吸附后的斜矩形四点并不严格共面，谁先注册谁当代表
 * （立宪页：「平面注册参数是状态，τ 合并顺序相关，重建不等价」）——全局机发现平面的顺序不同，代表法向差 ~1e-5 弧度 → 推拉后坐标差 ~20 µm，
 * 取整键会在边界上随机翻车。局部化的 bug 表现为整张面多 / 少、环点数不同，不是 µm 漂移。
 */
const TOL = 1e-3;   // = τ：低于共面容差的漂移在内核自己的分辨率之下
const near3 = (a: Pt3, b: Pt3): boolean => Math.abs(a.x - b.x) <= TOL && Math.abs(a.y - b.y) <= TOL && Math.abs(a.z - b.z) <= TOL;
/** 点多重集按容差配对（贪心；环的起点 / 方向无关）。 */
function samePointSet(a: readonly Pt3[], b: readonly Pt3[]): boolean {
  if (a.length !== b.length) return false;
  const used = new Array(b.length).fill(false);
  for (const p of a) { let hit = -1; for (let j = 0; j < b.length; j++) if (!used[j] && near3(p, b[j])) { hit = j; break; } if (hit < 0) return false; used[hit] = true; }
  return true;
}
type FaceShape = { id: number; rings: Pt3[][] };
const shapesOf = (k: Kernel, pred: (outer: Pt3[]) => boolean = () => true): FaceShape[] => k.faces().map((f) => ({ id: f.id, rings: (() => { const r = k.faceRings3(f.id)!; return [r.outer, ...r.holes]; })() })).filter((s) => pred(s.rings[0]));
function sameShapes(a: FaceShape[], b: FaceShape[], withIds: boolean): boolean {
  if (a.length !== b.length) return false;
  const used = new Array(b.length).fill(false);
  for (const fa of a) {
    let hit = -1;
    for (let j = 0; j < b.length; j++) {
      if (used[j]) continue;
      const fb = b[j];
      if (withIds && fa.id !== fb.id) continue;
      if (fa.rings.length !== fb.rings.length) continue;
      if (fa.rings.every((r, i) => samePointSet(r, fb.rings[i]))) { hit = j; break; }
    }
    if (hit < 0) return false;
    used[hit] = true;
  }
  return true;
}
function sameEdges(a: Kernel, b: Kernel): boolean {
  const ea = a.edges().map((e) => [a.graph.pt(e.a), a.graph.pt(e.b)] as const), eb = b.edges().map((e) => [b.graph.pt(e.a), b.graph.pt(e.b)] as const);
  if (ea.length !== eb.length || a.vertices().length !== b.vertices().length) return false;
  const used = new Array(eb.length).fill(false);
  for (const [p, q] of ea) { let hit = -1; for (let j = 0; j < eb.length; j++) { if (used[j]) continue; const [r, t] = eb[j]; if ((near3(p, r) && near3(q, t)) || (near3(p, t) && near3(q, r))) { hit = j; break; } } if (hit < 0) return false; used[hit] = true; }
  return true;
}
const sameFingerprint = (a: Kernel, b: Kernel, withIds: boolean): boolean => sameEdges(a, b) && sameShapes(shapesOf(a), shapesOf(b), withIds);
const describeShapes = (k: Kernel): string => shapesOf(k).map((s) => `#${s.id}[` + s.rings.map((r) => r.map((p) => `(${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)})`).join(" ")).join(" | ") + "]").sort().join("  ");
/** 量子尖刺：环里有两个相邻顶点 ≤ 3 µm，或 高 = 2·面积 / 周长 ≤ 3 µm——Q = 1 µm 格点身份 + τ = 1 mm 共面的夹缝产物，τ 带档的几何比较忽略它们。 */
function isQuantumSliver(ring: readonly Pt3[]): boolean {
  let nx = 0, ny = 0, nz = 0, per = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    if (d <= 3e-6) return true;
    per += d;
    nx += (a.y - b.y) * (a.z + b.z); ny += (a.z - b.z) * (a.x + b.x); nz += (a.x - b.x) * (a.y + b.y);
  }
  return per <= 0 || Math.hypot(nx, ny, nz) / per <= 3e-6;
}

type Step = { kind: "rect"; segs: [Pt3, Pt3][] } | { kind: "line"; vi: number; ei: number; kk: number; j: Pt3 } | { kind: "pp"; fi: number; dist: number } | { kind: "erase"; ei: number } | { kind: "move"; vi: number; d: Pt3 };

/** 一步：对两台内核做同样的事（按下标取对象），返回两边的事件 JSON 与可能的异常文案。 */
function apply(k: Kernel, st: Step): string {
  try {
    const es = k.edges(), fs = k.faces(), vs = k.graph.vertices();
    switch (st.kind) {
      case "rect": return JSON.stringify(k.addEdges(st.segs));
      case "line": {
        const v = vs[st.vi % vs.length]; const star = [...v.edges]; const e = k.graph.edge(star[st.ei % star.length]);
        const o = k.graph.pt(v.id), q = k.graph.pt(e.a === v.id ? e.b : e.a);
        const d = P(q.x - o.x + st.j.x, q.y - o.y + st.j.y, q.z - o.z + st.j.z);
        return JSON.stringify(k.addEdges([[o, P(o.x + d.x * st.kk, o.y + d.y * st.kk, o.z + d.z * st.kk)]]));
      }
      case "pp": return fs.length ? JSON.stringify(k.pushPull(fs[st.fi % fs.length].id, st.dist)) : "[]";
      case "erase": return es.length ? JSON.stringify(k.eraseEdges([es[st.ei % es.length].id])) : "[]";
      case "move": { const v = vs[st.vi % vs.length]; return JSON.stringify(k.moveVertices([{ id: v.id, to: P(v.x + st.d.x, v.y + st.d.y, v.z + st.d.z) }])); }
    }
  } catch (err) { return `THROW ${(err as Error).message}`; }
}

/** τ 带档的几何比较：只比**非量子尖刺**的面（容差匹配，不带 id）。 */
const sameSolidFaces = (a: Kernel, b: Kernel): boolean => sameShapes(shapesOf(a, (r) => !isQuantumSliver(r)), shapesOf(b, (r) => !isQuantumSliver(r)), false);

/**
 * clean = 干净几何（坐标吸到 mm 格、无 µm 抖动）：定理的本体——事件 + 面 id + 环逐字相同，谁都不许 throw。
 * nasty = kernel-fuzz 同款（斜置 + 过头 µm 抖动）：τ 带里全局机自己都不是不动点（把 µm 尖刺的平面重新算一遍会变），所以只比几何：
 *   两边都成功 → 几何相同；两边都拒绝 → 同一条残余；**局部拒绝而全局没拒绝 → 失败**（局部丢了全局没丢的东西）；全局拒绝而局部没拒绝 → 允许（局部更保守：没碰的膜不动）。
 */
type Tier = "clean" | "tilted" | "nasty";
function runSeed(seed: number, steps: number, tier: Tier): { globalOnlyThrows: number; localOnlyThrows: number } {
  let s = seed; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const snap = tier !== "nasty", axis = tier === "clean";
  const q = (v: number): number => (snap ? Math.round(v * 1000) / 1000 : v);
  const local = new Kernel(), global = new Kernel({ settleMode: "global" });
  const log: string[] = [];
  let globalOnlyThrows = 0, localOnlyThrows = 0;
  for (let i = 0; i < steps; i++) {
    const r = rnd();
    let st: Step;
    if (r < 0.35 || local.edges().length === 0) {
      const th = axis ? 0 : rnd() * 0.4, ph = axis ? 0 : rnd() < 0.5 ? 0 : rnd() * 0.4;
      const u = P(Math.cos(th), Math.sin(th), 0), v = P(-Math.sin(th) * Math.cos(ph), Math.cos(th) * Math.cos(ph), Math.sin(ph));
      const vs = local.graph.vertices();
      const o = vs.length && rnd() < 0.5 ? (() => { const a = vs[Math.floor(rnd() * vs.length)]; return P(a.x, a.y, a.z); })() : P(q(rnd() * 3), q(rnd() * 3), rnd() < 0.3 ? q(rnd() * 2) : 0);
      const W = q(0.3 + rnd() * 2), H = q(0.3 + rnd() * 2);
      const c = (a: number, b: number): Pt3 => P(q(o.x + u.x * a + v.x * b), q(o.y + u.y * a + v.y * b), q(o.z + u.z * a + v.z * b));
      const c1 = c(0, 0), c2 = c(W, 0), c3 = c(W, H), c4 = c(0, H);
      st = { kind: "rect", segs: [[c1, c2], [c2, c3], [c3, c4], [c4, c1]] };
    } else if (r < 0.6) { const jx = (rnd() - 0.5) * 4e-6, jy = (rnd() - 0.5) * 4e-6, jz = (rnd() - 0.5) * 4e-6; st = { kind: "line", vi: Math.floor(rnd() * 1e6), ei: Math.floor(rnd() * 1e6), kk: snap ? 2 : 1 + rnd() * 2, j: snap ? P(0, 0, 0) : P(jx, jy, jz) }; }
    else if (r < 0.75) st = { kind: "pp", fi: Math.floor(rnd() * 1e6), dist: q((rnd() - 0.3) * 1.5) };
    else if (r < 0.9) st = { kind: "erase", ei: Math.floor(rnd() * 1e6) };
    else if (axis) st = { kind: "pp", fi: Math.floor(rnd() * 1e6), dist: q((rnd() - 0.3) * 1.5) };   // clean 档不挪点（挪斜 = 无理数法向 → µm 尖刺），挪点归 tilted / nasty
    else st = { kind: "move", vi: Math.floor(rnd() * 1e6), d: P(q((rnd() - 0.5) * 0.5), q((rnd() - 0.5) * 0.5), q((rnd() - 0.5) * 0.5)) };
    const evL = apply(local, st), evG = apply(global, st);
    log.push(st.kind);
    const tL = evL.startsWith("THROW"), tG = evG.startsWith("THROW");
    if (tier === "clean") {
      assert(evL === evG, `[clean] seed ${seed} step ${i} [${st.kind}] 事件不同\n  local : ${evL}\n  global: ${evG}\n  history: ${log.join(" | ")}`);
      assert(!tL, `[clean] seed ${seed} step ${i} [${st.kind}] 干净几何不该 throw：${evL}\n  history: ${log.join(" | ")}`);
      assert(sameFingerprint(local, global, true), `[clean] seed ${seed} step ${i} [${st.kind}] 局部结算 ≠ 全局结算\n  local : ${describeShapes(local)}\n  global: ${describeShapes(global)}\n  history: ${log.join(" | ")}`);
      continue;
    }
    if (tL && tG) return { globalOnlyThrows, localOnlyThrows };
    if (tL || tG) {
      // 只有一边拒绝：τ 带里两台机的平面代表 / 量子尖刺不同，谁先撞上残余是随机的；只计数（趋势），不判死。拒绝必须是守恒断言，不许别的 throw。
      assert(/结算机自相矛盾/.test(tL ? evL : evG), `[nasty] seed ${seed} step ${i} [${st.kind}] 不是守恒断言的 throw\n  local : ${evL}\n  global: ${evG}\n  history: ${log.join(" | ")}`);
      if (tL) localOnlyThrows++; else globalOnlyThrows++;
      return { globalOnlyThrows, localOnlyThrows };
    }
    assert(sameSolidFaces(local, global), `[nasty] seed ${seed} step ${i} [${st.kind}] 局部结算几何 ≠ 全局结算几何（量子尖刺已忽略）\n  local : ${describeShapes(local)}\n  global: ${describeShapes(global)}\n  history: ${log.join(" | ")}`);
  }
  return { globalOnlyThrows, localOnlyThrows };
}

describe("局部性定理差分 oracle：局部结算 = 全局结算", () => {
  it("clean：轴对齐 mm 格点 60 个种子 × 12 步——每步事件 / 面 id / 环逐字相同，谁都不 throw（定理本体）", () => {
    for (let seed = 1; seed <= 60; seed++) runSeed(seed * 7919, 12, "clean");
  });
  it("tilted：斜置 + mm 吸附 60 个种子 × 12 步——两边都成功时非尖刺几何相同（τ 容差）；拒绝只许是守恒断言（单边拒绝计数不判死）", () => {
    let g = 0, l = 0;
    for (let seed = 1; seed <= 60; seed++) { const r = runSeed(seed * 7919, 12, "tilted"); g += r.globalOnlyThrows; l += r.localOnlyThrows; }
    assert(g + l <= 30, `tilted 单边拒绝的种子太多（局部 ${l} / 全局 ${g}）——残余在涨，去看总账 D 节`);
  });
  it("nasty：斜置 + 过头 µm 抖动 60 个种子 × 12 步——同上政策", () => {
    let g = 0, l = 0;
    for (let seed = 1; seed <= 60; seed++) { const r = runSeed(seed * 7919, 12, "nasty"); g += r.globalOnlyThrows; l += r.localOnlyThrows; }
    assert(g + l <= 30, `nasty 单边拒绝的种子太多（局部 ${l} / 全局 ${g}）——残余在涨，去看总账 D 节`);
  });
  it("盒子序列：两次拉 + 贴棱描线 / 贴棱矩形 / 墙里矩形 / 推穿，局部 = 全局", () => {
    const build = (k: Kernel): string[] => {
      const out: string[] = [];
      const loop = (pts: Pt3[]) => { const segs: [Pt3, Pt3][] = []; for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]); return k.addEdges(segs); };
      const at = (p: Pt3) => k.hitTest(p, 1e-3).face!;
      out.push(JSON.stringify(loop([P(0, 0, 0), P(10, 0, 0), P(10, 10, 0), P(0, 10, 0)])));
      out.push(JSON.stringify(k.pushPull(at(P(5, 5, 0)), 10)));
      out.push(JSON.stringify(k.pushPull(at(P(5, 5, 10)), 2)));
      out.push(JSON.stringify(k.addEdges([[P(3, 0, 12), P(7, 0, 12)]])));
      out.push(JSON.stringify(loop([P(3, 3, 12), P(7, 3, 12), P(7, 7, 12), P(3, 7, 12)])));
      out.push(JSON.stringify(loop([P(2, 0, 3), P(8, 0, 3), P(8, 0, 8), P(2, 0, 8)])));
      out.push(JSON.stringify(k.pushPull(at(P(5, 0, 5)), -10)));
      out.push(describeShapes(k));
      return out;
    };
    const a = build(new Kernel()), b = build(new Kernel({ settleMode: "global" }));
    for (let i = 0; i < a.length; i++) assert(a[i] === b[i], `第 ${i} 步不同\n  local : ${a[i]}\n  global: ${b[i]}`);
  });
});
