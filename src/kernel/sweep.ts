// sweep.ts —— 轮廓沿折线扫掠的纯几何（SU Follow Me 的本体；DOM-free，node 直测）。
// created 2026-10-21 by Claude Fable 5.1（0.8 纪元；user 2026-10-21「follow me can be in the next sprint」「平滑 offset follow me是0.8」）
//
// 规则（SU 同款）：
//   ① 路径 = 折线 p₀…pₙ₋₁（开 / 闭）；轮廓 = 若干环（外环 + 洞环），在 p₀ 所在的平面上。
//   ② 每个关节 pᵢ 有一张**斜切面**（miter）：过 pᵢ、法向 = 进出两段方向的角平分线；路径端点的切面 ⟂ 末段。
//   ③ 第 i 站的轮廓 = 第 i−1 站的轮廓沿第 i−1 段方向投影到第 i 站的切面上（斜切投影 = 两段轮廓在切面上完全重合，拐角自然对接）。
//      闭路径：第 0 站 = 轮廓沿第 0 段方向投到 p₀ 的切面；末段接回第 0 站（环上不留缝）。
//   ④ 侧面 = 相邻两站对应环边张成的四边形（由构造必在「环边 × 段方向」张成的平面上 = 平面四边形）；退化（轮廓顶点在旋转轴上）→ 三角。
// 不在这里管：像的 XOR 结算（内核 followMe 提交结算机）、路径取向 / 起点选择（编辑器）。
import type { Pt3 } from "./geom.ts";
import { add3, dot3, normalize3, scale3, sub3 } from "./geom.ts";

const EPS = 1e-9;

/** 各站的轮廓环：stations[i][ring][j]。开路径 = path.length 站；闭路径 = path.length 站（末段接回第 0 站）。失败 → 原因字符串。 */
export function sweepStations(rings: readonly (readonly Pt3[])[], path: readonly Pt3[], closed: boolean): Pt3[][][] | string {
  const n = path.length;
  if (n < 2) return "path needs at least two points";
  const segs = closed ? n : n - 1;
  const dir: Pt3[] = [];
  for (let i = 0; i < segs; i++) {
    const d = sub3(path[(i + 1) % n], path[i]);
    const l = Math.hypot(d.x, d.y, d.z);
    if (l < EPS) return `zero-length path segment ${i}`;
    dir.push(scale3(d, 1 / l));
  }
  // 关节切面法向：开路径两端 ⟂ 相邻段；中间 = 角平分线（反向折回 → 平分线为零 → 失败）
  const cutN = (i: number): Pt3 | string => {
    if (!closed && i === 0) return dir[0];
    if (!closed && i === n - 1) return dir[n - 2];
    const a = dir[(i - 1 + segs) % segs], b = dir[i % segs];
    const s = add3(a, b);
    const l = Math.hypot(s.x, s.y, s.z);
    if (l < 1e-6) return `path folds back on itself at joint ${i}`;
    return scale3(s, 1 / l);
  };
  const project = (pts: readonly Pt3[], along: Pt3, c: Pt3, nc: Pt3): Pt3[] | string => {
    const den = dot3(nc, along);
    if (Math.abs(den) < 1e-9) return "path segment is parallel to the profile plane";
    const k = dot3(nc, c);
    return pts.map((p) => add3(p, scale3(along, (k - dot3(nc, p)) / den)));
  };
  const out: Pt3[][][] = [];
  let cur: Pt3[][] = rings.map((r) => r.map((p) => ({ x: p.x, y: p.y, z: p.z })));
  if (closed) {
    const nc0 = cutN(0); if (typeof nc0 === "string") return nc0;
    const next: Pt3[][] = [];
    for (const r of cur) { const q = project(r, dir[0], path[0], nc0); if (typeof q === "string") return q; next.push(q); }
    cur = next;
  }
  out.push(cur);
  for (let i = 1; i < n; i++) {
    const nc = cutN(i); if (typeof nc === "string") return nc;
    const next: Pt3[][] = [];
    for (const r of cur) { const q = project(r, dir[i - 1], path[i], nc); if (typeof q === "string") return q; next.push(q); }
    cur = next;
    out.push(cur);
  }
  return out;
}

/**
 * 并掉共线关节（两段同向 = 不是拐角）：那里的站圈只会把共面的侧面切成两张（弦端点落在路径上时常见）。
 * 零长段也并掉。smoothJoints 同步删。闭路径全部顶点都可能被并；开路径两端保留。
 */
export function simplifyPath(path: readonly Pt3[], closed: boolean, smoothJoints?: readonly boolean[]): { path: Pt3[]; smoothJoints: boolean[] | undefined } {
  const pts = path.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  const sm = smoothJoints ? [...smoothJoints] : undefined;
  const n0 = pts.length;
  const straight = (a: Pt3, b: Pt3, c: Pt3): boolean => {
    const u = sub3(b, a), v = sub3(c, b);
    const lu = Math.hypot(u.x, u.y, u.z), lv = Math.hypot(v.x, v.y, v.z);
    if (lu < EPS || lv < EPS) return true;
    const cr = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
    return Math.hypot(cr.x, cr.y, cr.z) / (lu * lv) < 1e-9 && dot3(u, v) > 0;
  };
  for (let guard = 0; guard < n0; guard++) {
    const n = pts.length;
    if (n < 3) break;
    let removed = false;
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) continue;
      if (straight(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n])) { pts.splice(i, 1); sm?.splice(i, 1); removed = true; break; }
    }
    if (!removed) break;
  }
  return { path: pts, smoothJoints: sm };
}

/** 去掉连续重复点（退化四边形 → 三角）；不足 3 点 → []。 */
export function dedupeRing(pts: readonly Pt3[]): Pt3[] {
  const out: Pt3[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (q && Math.abs(q.x - p.x) < EPS && Math.abs(q.y - p.y) < EPS && Math.abs(q.z - p.z) < EPS) continue;
    out.push(p);
  }
  while (out.length > 1) {
    const a = out[0], b = out[out.length - 1];
    if (Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS && Math.abs(a.z - b.z) < EPS) out.pop(); else break;
  }
  return out.length >= 3 ? out : [];
}

/** 段方向（单位），给编辑器选取向用。 */
export function segDir(a: Pt3, b: Pt3): Pt3 { return normalize3(sub3(b, a)); }
