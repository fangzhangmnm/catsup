// guides.ts —— 参考几何层（0.11 尺规纪元，2026-10-24，Claude Fable 5.1；设计稿 ai-docs/20261024-ruler-compass-design.md §3）。
// 参考线（无限直线）/ 参考点：每个池一份、池本地坐标；**内核零感知**；参与推断（solver 1-D / 0-D 目标）、单独渲染、进文件
// （CATSUP_definitions.list[i].guides / groups[j].guides）。精度不是打进去的，是作出来的：尺规作出参考线，交点就是你要的点。
// 参考圆 / 参考球（圆规 / 球规，纪元账本 DT50，2026-10-26 Claude Opus 5.5；definitions 6.3）：圆 = 圆心 + 法向 + 半径；球 = 球心 + 半径。
//   和线 / 点同一个 id 空间（擦除、选中一套）；推断里每帧在光标附近产 0-D 目标（solver.ts），不进 1-D 合成器。
import type { Pt3 } from "../kernel/kernel.ts";
import { normalize3 } from "../kernel/geom.ts";
import { type Xform, applyDir, applyNormal, applyPt, det3 } from "./xform.ts";

export interface GuideLine { readonly id: number; p: Pt3; dir: Pt3 }
export interface GuidePoint { readonly id: number; p: Pt3 }
export interface GuideCircle { readonly id: number; c: Pt3; n: Pt3; r: number }
export interface GuideSphere { readonly id: number; c: Pt3; r: number }
export interface Guides { lines: GuideLine[]; points: GuidePoint[]; circles: GuideCircle[]; spheres: GuideSphere[]; next: number }
/** 世界坐标视图（渲染 / 推断用，WorldView 按活动池的变换算出来）。 */
export interface GuidesWorld { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[]; circles: { id: number; c: Pt3; n: Pt3; r: number }[]; spheres: { id: number; c: Pt3; r: number }[] }

export const emptyGuides = (): Guides => ({ lines: [], points: [], circles: [], spheres: [], next: 1 });
export const cloneGuides = (g: Guides): Guides => ({
  lines: g.lines.map((l) => ({ id: l.id, p: { ...l.p }, dir: { ...l.dir } })), points: g.points.map((q) => ({ id: q.id, p: { ...q.p } })),
  circles: g.circles.map((c) => ({ id: c.id, c: { ...c.c }, n: { ...c.n }, r: c.r })), spheres: g.spheres.map((s) => ({ id: s.id, c: { ...s.c }, r: s.r })), next: g.next,
});
/** 圆的半径经 m：圆面里任一方向的长度比（相似变换下处处一样；非等比缩放 → 圆变椭圆，取圆面里两个正交方向的平均，近似）。 */
function circleScale(m: Xform, n: Pt3): number {
  const a = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const u = normalize3({ x: n.y * a.z - n.z * a.y, y: n.z * a.x - n.x * a.z, z: n.x * a.y - n.y * a.x });
  const v = { x: n.y * u.z - n.z * u.y, y: n.z * u.x - n.x * u.z, z: n.x * u.y - n.y * u.x };
  const len = (d: Pt3): number => { const w = applyDir(m, d); return Math.hypot(w.x, w.y, w.z); };
  return (len(u) + len(v)) / 2;
}
/** 球的半径经 m：体积比的立方根（相似变换下 = 缩放倍数；非等比缩放 → 椭球，取平均，近似）。 */
const sphereScale = (m: Xform): number => Math.cbrt(Math.abs(det3(m)));
export function guidesToWorld(g: Guides, m: Xform): GuidesWorld {
  return {
    lines: g.lines.map((l) => ({ id: l.id, p: applyPt(m, l.p), dir: normalize3(applyDir(m, l.dir)) })),
    points: g.points.map((q) => ({ id: q.id, p: applyPt(m, q.p) })),
    circles: g.circles.map((c) => ({ id: c.id, c: applyPt(m, c.c), n: normalize3(applyNormal(m, c.n)), r: c.r * circleScale(m, c.n) })),
    spheres: g.spheres.map((s) => ({ id: s.id, c: applyPt(m, s.c), r: s.r * sphereScale(m) })),
  };
}
export function addGuideLine(g: Guides, p: Pt3, dir: Pt3): GuideLine { const l: GuideLine = { id: g.next++, p: { ...p }, dir: normalize3(dir) }; g.lines.push(l); return l; }
export function addGuidePoint(g: Guides, p: Pt3): GuidePoint { const q: GuidePoint = { id: g.next++, p: { ...p } }; g.points.push(q); return q; }
export function addGuideCircle(g: Guides, c: Pt3, n: Pt3, r: number): GuideCircle { const x: GuideCircle = { id: g.next++, c: { ...c }, n: normalize3(n), r: Math.abs(r) }; g.circles.push(x); return x; }
export function addGuideSphere(g: Guides, c: Pt3, r: number): GuideSphere { const x: GuideSphere = { id: g.next++, c: { ...c }, r: Math.abs(r) }; g.spheres.push(x); return x; }
/** 删指定 id（线 / 点 / 圆 / 球同一 id 空间）；返回删掉几个。 */
export function eraseGuides(g: Guides, ids: ReadonlySet<number>): number {
  const n0 = g.lines.length + g.points.length + g.circles.length + g.spheres.length;
  g.lines = g.lines.filter((l) => !ids.has(l.id));
  g.points = g.points.filter((q) => !ids.has(q.id));
  g.circles = g.circles.filter((c) => !ids.has(c.id));
  g.spheres = g.spheres.filter((s) => !ids.has(s.id));
  return n0 - g.lines.length - g.points.length - g.circles.length - g.spheres.length;
}
export function transformGuides(g: Guides, m: Xform): void {
  for (const l of g.lines) { l.p = applyPt(m, l.p); l.dir = normalize3(applyDir(m, l.dir)); }
  for (const q of g.points) q.p = applyPt(m, q.p);
  for (const c of g.circles) { c.r *= circleScale(m, c.n); c.c = applyPt(m, c.c); c.n = normalize3(applyNormal(m, c.n)); }
  for (const s of g.spheres) { s.r *= sphereScale(m); s.c = applyPt(m, s.c); }
}
/** 线 / 点 / 圆 / 球一共几个（「清空参考几何」等判空用）。 */
export const guideCount = (g: { lines: readonly unknown[]; points: readonly unknown[]; circles: readonly unknown[]; spheres: readonly unknown[] }): number => g.lines.length + g.points.length + g.circles.length + g.spheres.length;
