// guides.ts —— 参考几何层（0.11 尺规纪元，2026-10-24，Claude Fable 5.1；设计稿 ai-docs/20261024-ruler-compass-design.md §3）。
// 参考线（无限直线）/ 参考点：每个池一份、池本地坐标；**内核零感知**；参与推断（solver 1-D / 0-D 目标）、单独渲染、进文件
// （CATSUP_definitions.list[i].guides / groups[j].guides）。精度不是打进去的，是作出来的：尺规作出参考线，交点就是你要的点。
import type { Pt3 } from "../kernel/kernel.ts";
import { normalize3 } from "../kernel/geom.ts";
import { type Xform, applyDir, applyPt } from "./xform.ts";

export interface GuideLine { readonly id: number; p: Pt3; dir: Pt3 }
export interface GuidePoint { readonly id: number; p: Pt3 }
export interface Guides { lines: GuideLine[]; points: GuidePoint[]; next: number }
/** 世界坐标视图（渲染 / 推断用，WorldView 按活动池的变换算出来）。 */
export interface GuidesWorld { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[] }

export const emptyGuides = (): Guides => ({ lines: [], points: [], next: 1 });
export const cloneGuides = (g: Guides): Guides => ({ lines: g.lines.map((l) => ({ id: l.id, p: { ...l.p }, dir: { ...l.dir } })), points: g.points.map((q) => ({ id: q.id, p: { ...q.p } })), next: g.next });
export function guidesToWorld(g: Guides, m: Xform): GuidesWorld {
  return { lines: g.lines.map((l) => ({ id: l.id, p: applyPt(m, l.p), dir: normalize3(applyDir(m, l.dir)) })), points: g.points.map((q) => ({ id: q.id, p: applyPt(m, q.p) })) };
}
export function addGuideLine(g: Guides, p: Pt3, dir: Pt3): GuideLine { const l: GuideLine = { id: g.next++, p: { ...p }, dir: normalize3(dir) }; g.lines.push(l); return l; }
export function addGuidePoint(g: Guides, p: Pt3): GuidePoint { const q: GuidePoint = { id: g.next++, p: { ...p } }; g.points.push(q); return q; }
/** 删指定 id（线 / 点同一 id 空间）；返回删掉几个。 */
export function eraseGuides(g: Guides, ids: ReadonlySet<number>): number {
  const n0 = g.lines.length + g.points.length;
  g.lines = g.lines.filter((l) => !ids.has(l.id));
  g.points = g.points.filter((q) => !ids.has(q.id));
  return n0 - g.lines.length - g.points.length;
}
export function transformGuides(g: Guides, m: Xform): void {
  for (const l of g.lines) { l.p = applyPt(m, l.p); l.dir = normalize3(applyDir(m, l.dir)); }
  for (const q of g.points) q.p = applyPt(m, q.p);
}
