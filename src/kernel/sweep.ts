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

/**
 * 闭路径起点对齐（规则 ① 的闭路径版，2026-10-23 Claude Fable 5.1）：第 0 站是「轮廓沿第 0 段方向投到 p₀ 的切面」，所以第 0 段必须**横穿**轮廓平面
 * （方向与轮廓法向不平行 ⇒ 投影良态）且轮廓就在它的一端。调用方给的环起点任意（面环的起点只是追踪顺序的产物），这里旋转路径
 * 让第 0 段 = 与轮廓法向最不平行、且离轮廓质心最近的那一段；smoothJoints 同步旋转。开路径不动。
 * 不对齐的后果：第 0 段落在轮廓平面内 → 第 0 站投影塌成线段 → 全部侧面退化被丢 → 扫掠静默变成「只切了几刀」（test/followme 倒角案）。
 */
export function alignClosedPath(rings: readonly (readonly Pt3[])[], path: readonly Pt3[], smoothJoints?: readonly boolean[], tol = 1e-6): { path: Pt3[]; smoothJoints: boolean[] | undefined } {
  const n = path.length;
  const pts = path.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  const sm = smoothJoints ? [...smoothJoints] : undefined;
  const outer = rings[0];
  if (n < 3 || !outer || outer.length < 3) return { path: pts, smoothJoints: sm };
  const rotate = (best: number): { path: Pt3[]; smoothJoints: boolean[] | undefined } =>
    best <= 0 ? { path: pts, smoothJoints: sm } : { path: [...pts.slice(best), ...pts.slice(0, best)], smoothJoints: sm ? [...sm.slice(best), ...sm.slice(0, best)] : undefined };
  let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < outer.length; i++) { const a = outer[i], b = outer[(i + 1) % outer.length]; nx += (a.y - b.y) * (a.z + b.z); ny += (a.z - b.z) * (a.x + b.x); nz += (a.x - b.x) * (a.y + b.y); cx += a.x; cy += a.y; cz += a.z; }
  const nl = Math.hypot(nx, ny, nz);
  if (nl < EPS) return { path: pts, smoothJoints: sm };
  const nrm = { x: nx / nl, y: ny / nl, z: nz / nl }, c = { x: cx / outer.length, y: cy / outer.length, z: cz / outer.length };
  // 规则 ⓪（v0.10.3，SU 的前提「轮廓垂直于路径」）：轮廓平面**过某个路径顶点**且与它的出段垂直 → 从那个顶点起（第 0 站的切面就是轮廓平面，投影 = 恒等）。
  // 圆跟随圆画球就是这种：轮廓圆心 = 路径圆心，下面「离质心最近的段」24 路平手、由浮点噪声裁决 → 起点错一站 = 轮廓沿弦向斜投到别的切面、整颗球塌成 r≈0.13。
  // 次选：过顶点但不垂直 → 取最垂直的（倒角案：轮廓画在端面、过拐角顶点）。都没有 → 老规则。
  const d0 = dot3(nrm, c);
  let onBest = -1, onCos = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    if (Math.abs(dot3(nrm, a) - d0) > tol) continue;
    const d = sub3(b, a), l = Math.hypot(d.x, d.y, d.z);
    if (l < EPS) continue;
    const cs = Math.abs(dot3(nrm, d)) / l;
    if (cs < 1e-3) continue;
    if (cs > onCos + 1e-9) { onCos = cs; onBest = i; }
  }
  if (onBest >= 0) return rotate(onBest);
  let best = -1, bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const d = sub3(b, a), l = Math.hypot(d.x, d.y, d.z);
    if (l < EPS) continue;
    if (Math.abs(dot3(nrm, d)) / l < 1e-3) continue;          // 段落在轮廓平面内 → 投影塌缩，不候选
    const t = Math.max(0, Math.min(1, dot3(sub3(c, a), d) / (l * l)));
    const q = add3(a, scale3(d, t));
    const dist = Math.hypot(q.x - c.x, q.y - c.y, q.z - c.z);
    if (dist < bestD) { bestD = dist; best = i; }
  }
  return rotate(best);
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
