// break-ticks.ts —— A33 断口提示（纯函数；从 editor.ts 切出来，编辑器切分设计 §3 的「按它读什么切」；2026-10-29 Claude Fable 5.1）。
// user 2026-10-24「如果一根直的线中间断了一截，应该有一个垂直的小线段提示一下这里断了，需要weld，不然到游戏引擎了一堆五边面」：
// 活动池里 Kernel.isBreakJunction 的顶点 → 世界坐标的点 + 边向（渲染器画屏幕定长的小垂线）。按池版本缓存。
import type { Kernel, Pt3 } from "../kernel/kernel.ts";
import { sub3 } from "../kernel/geom.ts";
import { type Xform, applyPt } from "../scene/xform.ts";
import type { PoolSlot } from "../scene/world-view.ts";

export interface BreakTicksCache { kernel: Kernel; rev: number; xform: Xform; ticks: { p: Pt3; dir: Pt3 }[] }

/** 活动池的断口刻度；c = 上次的缓存（同内核、同版本、同变换就原样返回）。活动池永远是 brep（enterPool 守门：网格体进不来）；断口刻度是 brep 的概念。 */
export function breakTicksOf(slot: PoolSlot, c: BreakTicksCache | null): BreakTicksCache {
  const k = slot.kernel as Kernel;
  if (c && c.kernel === k && c.rev === k.rev && c.xform === slot.xform) return c;
  const ticks: { p: Pt3; dir: Pt3 }[] = [];
  const g = k.graph;
  for (const v of k.vertices()) {
    if (v.edges.size !== 2 || !k.isBreakJunction(v.id)) continue;
    const [ea] = [...v.edges];
    const other = g.pt(g.otherEnd(g.edge(ea), v.id));
    const p0 = applyPt(slot.xform, { x: v.x, y: v.y, z: v.z }), p1 = applyPt(slot.xform, other);
    const d = sub3(p1, p0), l = Math.hypot(d.x, d.y, d.z);
    if (l === 0) continue;
    ticks.push({ p: p0, dir: { x: d.x / l, y: d.y / l, z: d.z / l } });
  }
  return { kernel: k, rev: k.rev, xform: slot.xform, ticks };
}
