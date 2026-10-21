// intent.ts —— 意图门：按运动方向判用户意图，反方向的吸附候选一律不合法（纯函数，零 DOM，node 直测）。
// created 2026-10-21 by Claude Fable 5.1。
// user 2026-10-21 夜原话：「很重要的aha: push pull防抖动的终极方法：根据鼠标移动的方向判断用户意图，如果是push的话所有snap 到pull的
// 应该都不合法，同意。然后generalize到其他的交互上面」。
//
// 规则：
//   ① 一维手势（推拉高度 / 偏移距离 / 缩放倍率相对 1 / 旋转角）：**自由值**（不吸附时指针给出的值）的符号 = 意图；
//      候选与之反号 → 不合法；零点（原位）保留；没走出死区（屏上没拖够）= 还没有意图 → 全合法。
//   ② 三维手势（移动 / 画线）：候选位移与自由位移点积 < 0（在锚点另一侧）→ 不合法；没走出死区同上。
// 抬笔结算（A21）管的是「最后一下抖动不算」；意图门管的是「就算算，也不许跳到反方向」——两层各自承重。
import type { Pt3 } from "../kernel/geom.ts";
import { dot3 } from "../kernel/geom.ts";

/** 一维：自由值 free 的符号 = 意图；候选 candidate 反号 → false；零保留；|free| < dead → 全合法。 */
export function intentAllows1D(free: number, candidate: number, dead: number): boolean {
  if (!(Math.abs(free) >= dead)) return true;
  if (candidate === 0) return true;
  return Math.sign(candidate) === Math.sign(free);
}

/** 三维：自由位移 free 决定意图；候选位移 candidate 与之点积 < 0 → false；|free| < dead → 全合法。 */
export function intentAllows3D(free: Pt3, candidate: Pt3, dead: number): boolean {
  const l = Math.hypot(free.x, free.y, free.z);
  if (!(l >= dead)) return true;
  return dot3(free, candidate) >= 0;
}

/** 意图门的死区：屏上拖动不足 dragPx（= eps.drag，手势「算开始」的同一门槛）就还没有意图。 */
export function hasIntent(movedPx: number, dragPx: number): boolean { return movedPx > dragPx; }
