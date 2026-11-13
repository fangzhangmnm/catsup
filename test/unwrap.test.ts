// 展开（施工单二十二第 2 刀；src/mesh/unwrap.ts）。created 2026-11-12 by Claude Opus 5.5
// 钉：① 能摊平的曲面（带接缝的圆柱侧面、圆锥侧面、折过的纸、平的带洞圆环）展开后几乎不拉伸；② 不变量——没有翻过来的三角形、平面上三角形两两不交叉
//    （这两条用和展开无关的写法查：按三维法向摆正的三角形在平面上的有向面积同号、不同三角形的边两两不真相交）、每一轮能量不升；
//    ③ 同样的输入同样的结果；④ 退化的三角形照样跑完、报个数；⑤ 摊不平的片如实拒绝（有把手 / 封闭）；⑥ 两条边的切口（两头还连着）不补洞；⑦ 取消：交出来的照样合法。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { UV_SEAM, edgeMark, setEdgeMark } from "../src/mesh/reserved-columns.ts";
import { addPrimitive } from "../src/mesh/ops/index.ts";
import { GROWN } from "../src/mesh/columns.ts";
import { unwrap, svd2, type ChartUnwrap } from "../src/mesh/unwrap.ts";
import { autoSeams } from "../src/mesh/auto-seams.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const F = { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) };
type Ok = Extract<ChartUnwrap, { ok: true }>;
const oks = (rs: ChartUnwrap[]): Ok[] => { for (const r of rs) assert(r.ok, `展开失败：${!r.ok ? r.reason : ""}`); return rs as Ok[]; };
const seamCut = (m: MeshKernel) => (e: number): boolean => edgeMark(m, e, UV_SEAM);
/** 一条竖着的边（圆柱 / 圆锥侧面上的那种）标成接缝。 */
function markVertical(m: MeshKernel): void {
  const e = m.edges().find((x) => { const a = m.pt(m.edgeA[x]), b = m.pt(m.edgeB[x]); return Math.abs(a.z - b.z) > 0.5 && m.eFaces(x).length === 2 && Math.hypot(a.x, a.y) > 1e-6; })!;
  setEdgeMark(m, e, UV_SEAM, true);
}
/** 和展开无关的检查：每片里按三维法向摆正的三角形在平面上同号（不翻；副本里翻过的面倒过来算）、不同三角形的边两两不真相交（不叠）。 */
function checkInjective(m: MeshKernel, r: Ok): void {
  let pos = 0, neg = 0;
  const segs: [number, number, number, number, number][] = [];
  r.faces.forEach((f, fi) => {
    const uv = r.corners.get(f)!, ring = m.faceVerts(f), n = m.faceNormal(f);
    for (const [i, j, k] of m.faceTriangles(f)) {
      const a = m.pt(ring[i]), b = m.pt(ring[j]), c = m.pt(ring[k]);
      const cr = [(b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y), (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)];
      const sgn = (cr[0] * n.x + cr[1] * n.y + cr[2] * n.z >= 0 ? 1 : -1) * (r.flipped.has(f) ? -1 : 1);   // 绕向和邻居不一致、副本里翻过的面：在平面上和自己的三维法向相反才对
      const d = ((uv[2 * j] - uv[2 * i]) * (uv[2 * k + 1] - uv[2 * i + 1]) - (uv[2 * k] - uv[2 * i]) * (uv[2 * j + 1] - uv[2 * i + 1])) * sgn;
      if (d > 0) pos++; else neg++;
      for (const [p, q] of [[i, j], [j, k], [k, i]]) segs.push([uv[2 * p], uv[2 * p + 1], uv[2 * q], uv[2 * q + 1], fi]);
    }
  });
  eq(Math.min(pos, neg), 0, `翻过来的三角形（同号的 ${Math.max(pos, neg)}、反号的 ${Math.min(pos, neg)}）`);
  const o = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const scale = Math.max(...segs.map((s) => Math.max(Math.abs(s[0]), Math.abs(s[1]), Math.abs(s[2]), Math.abs(s[3]))), 1), eps = 1e-12 * scale * scale;
  let crosses = 0;
  for (let x = 0; x < segs.length; x++) for (let y = x + 1; y < segs.length; y++) {
    const [a, b, c, d] = segs[x], [e, g, h, k] = segs[y];
    const d1 = o(a, b, c, d, e, g), d2 = o(a, b, c, d, h, k), d3 = o(e, g, h, k, a, b), d4 = o(e, g, h, k, c, d);
    if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) crosses++;
  }
  eq(crosses, 0, "平面上三角形的边真相交");
  assert(r.energies.every((e, i) => i === 0 || e <= r.energies[i - 1]), `能量每一轮不升：${r.energies.join(" ")}`);
}
/**
 * 「能摊平的面拉伸接近没有」的门槛（统筹 11-12 要写明）：面积比按三维面积加权的 5% 分位 ≥ 0.98、95% 分位 ≤ 1.02，角度比加权 95% 分位 ≤ 1.03，而且停在「收敛了」。
 * 依据：默认停止阈值（能量相对下降 < 1e-4）下实测圆柱侧面 0.993–1.008 / 1.011、圆锥 0.995–1.009 / 1.015、折纸 1.000–1.000 / 1.007，留一倍余量。
 */
const DEVELOPABLE = { areaLo: 0.98, areaHi: 1.02, angleHi: 1.03 } as const;
const nearIsometric = (r: Ok, what: string): void => {
  const s = r.stretch;
  assert(s.area.p05 >= DEVELOPABLE.areaLo && s.area.p95 <= DEVELOPABLE.areaHi, `${what}：面积比分位 ${s.area.p05}–${s.area.p95}`);
  assert(s.angle.p95 <= DEVELOPABLE.angleHi, `${what}：角度比 95% 分位 ${s.angle.p95}`);
  eq(r.stoppedBy, "converged", `${what}：停在哪`);
};

describe("展开（unwrap.ts）", () => {
  it("2×2 奇异值分解：随机矩阵还原回去", () => {
    let seed = 7; const r = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 4 - 2; };
    for (let n = 0; n < 200; n++) {
      const [a, b, c, d] = [r(), r(), r(), r()], s = svd2(a, b, c, d), cp = Math.cos(s.phi), sp = Math.sin(s.phi), ct = Math.cos(s.theta), st = Math.sin(s.theta);
      const J = [cp * s.s1 * ct - sp * s.s2 * st, -cp * s.s1 * st - sp * s.s2 * ct, sp * s.s1 * ct + cp * s.s2 * st, -sp * s.s1 * st + cp * s.s2 * ct];
      for (const [x, y] of [[J[0], a], [J[1], b], [J[2], c], [J[3], d]]) assert(Math.abs(x - y) < 1e-9, `还原 ${J} vs ${[a, b, c, d]}`);
      assert(s.s1 >= Math.abs(s.s2) - 1e-12, "s1 ≥ |s2|"); eq(Math.sign(s.s2) === Math.sign(a * d - b * c) || Math.abs(s.s2) < 1e-12, true, "s2 的符号 = 行列式的符号");
    }
  });
  it("能摊平的曲面几乎不拉伸：圆柱侧面（一条竖接缝）、圆锥侧面（一条竖接缝）", () => {
    for (const kind of ["cylinder", "cone"] as const) {
      const m = new MeshKernel(); addPrimitive(m, kind, F, [0.5, 0.5, 1], 24);
      const a = autoSeams(m, null, { angleDeg: 60 }); for (const e of a.add) setEdgeMark(m, e, UV_SEAM, true);
      markVertical(m);
      const rs = oks(unwrap(m, m.faces(), seamCut(m))), side = rs.find((r) => r.faces.length === 24)!;
      assert(!!side, `${kind}：侧面那一片`); eq(side.holesFilled, 0);
      nearIsometric(side, kind); checkInjective(m, side);
    }
  });
  it("折过的纸（两张四边形、折 30°，不切）= 能摊平 → 和原来一样大", () => {
    const m = new MeshKernel(), c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    const v = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), P(-c, 1, s), P(-c, 0, s)].map((p) => m.addVertex(p));
    m.addFace([v[0], v[1], v[2], v[3]], GROWN); m.addFace([v[5], v[0], v[3], v[4]], GROWN);
    const [r] = oks(unwrap(m, m.faces(), () => false));
    nearIsometric(r, "折纸"); checkInjective(m, r);
  });
  it("平的带洞圆环（一圈四边形围着一个洞）：补洞以后照样和原来一样大；洞的那一圈不翻", () => {
    const m = new MeshKernel(), N = 16, inner: number[] = [], outer: number[] = [];
    for (let i = 0; i < N; i++) { const a = (2 * Math.PI * i) / N; inner.push(m.addVertex(P(0.5 * Math.cos(a), 0.5 * Math.sin(a), 0))); outer.push(m.addVertex(P(Math.cos(a), Math.sin(a), 0))); }
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; m.addFace([inner[i], outer[i], outer[j], inner[j]], GROWN); }
    const [r] = oks(unwrap(m, m.faces(), () => false));
    eq(r.holesFilled, 1); nearIsometric(r, "圆环"); checkInjective(m, r);
  });
  it("不变量：球（自动标接缝）、环面（自动标接缝）展开后不翻、不叠、能量不升", () => {
    const sphere = new MeshKernel(); addPrimitive(sphere, "sphere", F, [0.5, 0.5, 0.5], 12);
    const torus = new MeshKernel(), n = 12, k = 8, id: number[][] = [];
    for (let i = 0; i < n; i++) { id.push([]); for (let j = 0; j < k; j++) { const a = (2 * Math.PI * i) / n, b = (2 * Math.PI * j) / k, rr = 2 + 0.6 * Math.cos(b); id[i].push(torus.addVertex(P(rr * Math.cos(a), rr * Math.sin(a), 0.6 * Math.sin(b)))); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) torus.addFace([id[i][j], id[(i + 1) % n][j], id[(i + 1) % n][(j + 1) % k], id[i][(j + 1) % k]], GROWN);
    for (const m of [sphere, torus]) {
      for (const e of autoSeams(m, null, { angleDeg: 89 }).add) setEdgeMark(m, e, UV_SEAM, true);
      for (const r of oks(unwrap(m, m.faces(), seamCut(m)))) checkInjective(m, r);
    }
  });
  it("同样的输入同样的结果", () => {
    const m = new MeshKernel(); addPrimitive(m, "sphere", F, [0.5, 0.5, 0.5], 10);
    for (const e of autoSeams(m, null, { angleDeg: 60 }).add) setEdgeMark(m, e, UV_SEAM, true);
    const dump = (rs: ChartUnwrap[]): string => rs.map((r) => (r.ok ? [...r.corners].map(([f, c]) => `${f}:${Array.from(c).join(",")}`).join(";") : r.reason)).join("|");
    eq(dump(unwrap(m, m.faces(), seamCut(m))), dump(unwrap(m, m.faces(), seamCut(m))));
  });
  it("退化的三角形（三点共线的面）：照样跑完、报个数、能量是有限的数、不翻", () => {
    const m = new MeshKernel(), g: number[][] = [];
    for (let i = 0; i <= 3; i++) { g.push([]); for (let j = 0; j <= 3; j++) g[i].push(m.addVertex(P(i, j, 0.1 * Math.sin(i + j)))); }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!(i === 1 && j === 1)) m.addFace([g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]], GROWN);
    // 中间那格换成两个三角形，其中一个三点共线（中点插在边上）
    const mid = m.addVertex(P(1.5, 1, 0.05 * (Math.sin(2) + Math.sin(3))));   // 正好在 g[1][1]–g[2][1] 的中点
    m.addFace([g[1][1], mid, g[2][1]], GROWN);
    m.addFace([g[1][1], g[2][1], g[2][2], g[1][2]], GROWN);
    const rs = unwrap(m, m.faces(), () => false);
    for (const r of rs) if (r.ok) { assert(r.energies.every((e) => Number.isFinite(e)), `能量 ${r.energies}`); checkInjective(m, r); }
    assert(rs.some((r) => r.ok && r.stretch.degenerate >= 1), `报了退化的个数：${rs.map((r) => (r.ok ? r.stretch.degenerate : r.reason)).join(",")}`);
  });
  it("摊不平的片如实拒绝：环面不切 = 有把手；球不切 = 封闭", () => {
    const sphere = new MeshKernel(); addPrimitive(sphere, "sphere", F, [0.5, 0.5, 0.5], 8);
    const [s] = unwrap(sphere, sphere.faces(), () => false); eq(s.ok ? "ok" : s.reason, "closed");
    const torus = new MeshKernel(), id: number[][] = [];
    for (let i = 0; i < 8; i++) { id.push([]); for (let j = 0; j < 6; j++) { const a = (2 * Math.PI * i) / 8, b = (2 * Math.PI * j) / 6, rr = 2 + 0.6 * Math.cos(b); id[i].push(torus.addVertex(P(rr * Math.cos(a), rr * Math.sin(a), 0.6 * Math.sin(b)))); } }
    for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) torus.addFace([id[i][j], id[(i + 1) % 8][j], id[(i + 1) % 8][(j + 1) % 6], id[i][(j + 1) % 6]], GROWN);
    const [t] = unwrap(torus, torus.faces(), () => false); eq(t.ok ? "ok" : t.reason, "genus");
  });
  it("两条边的切口（片中间一条接缝、两头还连着）：不补洞、当它没切，照样和原来一样大", () => {
    const m = new MeshKernel(), g: number[][] = [];
    for (let i = 0; i <= 3; i++) { g.push([]); for (let j = 0; j <= 3; j++) g[i].push(m.addVertex(P(i, j, 0))); }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m.addFace([g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]], GROWN);
    setEdgeMark(m, m.edgeOf(g[1][1], g[2][1]), UV_SEAM, true);   // 片中间一条边，两头都连着别的面
    const [r] = oks(unwrap(m, m.faces(), seamCut(m)));
    eq(r.slits, 1); eq(r.holesFilled, 0); nearIsometric(r, "切口"); checkInjective(m, r);   // 默认 tol 1e-4 = 5 轮、最多歪 1.2%（1e-5 = 7 轮 0.37%、1e-8 = 13 轮 0.01%）
  });
  it("外圈上有零长度的边（两个点重合、中间夹一张退化的三角形面）：起步不翻（以前两个点摆在圆上同一处 = 起步就翻、不展开），整片照样和原来一样大", () => {
    const m = new MeshKernel(), a0 = m.addVertex(P(0, 0, 0)), a1 = m.addVertex(P(1, 0, 0)), b1 = m.addVertex(P(1, 1, 0)), b0 = m.addVertex(P(0, 1, 0)), b1d = m.addVertex(P(1, 1, 0));
    m.addFace([a0, a1, b1, b0], GROWN); m.addFace([b0, b1, b1d], GROWN);   // 退化的三角形面：b1d 和 b1 重合，b1 → b1d 是外圈上一条零长度的边
    const [r] = oks(unwrap(m, m.faces(), () => false));
    eq(r.stretch.degenerate, 1); nearIsometric(r, "零长度的边"); checkInjective(m, r);
  });
  it("停在哪：轮数给 1 → 到轮数上限（球上那几片一轮收敛不了）", () => {
    const m = new MeshKernel(); addPrimitive(m, "sphere", F, [0.5, 0.5, 0.5], 10);
    for (const e of autoSeams(m, null, { angleDeg: 60 }).add) setEdgeMark(m, e, UV_SEAM, true);
    const rs = oks(unwrap(m, m.faces(), seamCut(m), { maxIters: 1 }));
    assert(rs.some((r) => r.stoppedBy === "max-iters"), rs.map((r) => r.stoppedBy).join(","));
    for (const r of rs) checkInjective(m, r);
  });
  it("取消：第一轮就说停 → 交起步那一轮，照样不翻、不叠", () => {
    const m = new MeshKernel(); addPrimitive(m, "sphere", F, [0.5, 0.5, 0.5], 10);
    for (const e of autoSeams(m, null, { angleDeg: 60 }).add) setEdgeMark(m, e, UV_SEAM, true);
    for (const r of oks(unwrap(m, m.faces(), seamCut(m), { shouldStop: () => true }))) { eq(r.stoppedBy, "cancelled"); eq(r.iterations, 0); checkInjective(m, r); }
  });
});
