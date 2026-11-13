// controller/axis-apply.ts —— 轴键的约束落到工具上：一族工具一个函数，工具只调自己那一个、不自己读 kind 分叉（锁的一轮第二步）。created 2026-11-13 by Claude Opus 5.5
// 设计稿 = ai-docs/20261113-axis-constraint-module-design.md 2.3 那张表（规矩 user 11-13 夜批的；表是统筹的设计）：
//   一维（移动、挤出、偏移、画线）  line = 只沿这条线；plane = 只在这个面里；planeDir = 只沿面里那个方向
//   旋转                            line = 绕这条线；plane / planeDir = 绕面的法线
//   缩放                            line = 只沿这条线缩；plane / planeDir = 只在面里缩
// 出来的是工具原来就认的那一对 { axis, plane }（世界、单位长；都没有 = 不限制），所以工具里的投影 / 拖动算法一行不用改。
// 纯函数：零 DOM / 编辑器 / 内核（controller 文件夹的规矩）。改表 = 改这个文件 + test/axis-apply.test.ts。
import type { AxisConstraint, Vec3 } from "./axis-constraint.ts";

/** 工具认的那一对：axis = 只沿这根线；plane = 只在法向是它的面里。两个最多有一个。 */
export interface AxisPlaneLock { readonly axis: Vec3 | null; readonly plane: Vec3 | null }
const FREE: AxisPlaneLock = { axis: null, plane: null };

/** 一维的工具（移动、挤出、偏移、画线）。 */
export function moveLock(c: AxisConstraint): AxisPlaneLock {
  return c.kind === "line" || c.kind === "planeDir" ? { axis: c.dir, plane: null } : c.kind === "plane" ? { axis: null, plane: c.normal } : FREE;
}
/** 旋转：转轴。 */
export function rotateLock(c: AxisConstraint): AxisPlaneLock {
  return c.kind === "line" ? { axis: c.dir, plane: null } : c.kind === "plane" || c.kind === "planeDir" ? { axis: c.normal, plane: null } : FREE;
}
/** 缩放。 */
export function scaleLock(c: AxisConstraint): AxisPlaneLock {
  return c.kind === "line" ? { axis: c.dir, plane: null } : c.kind === "plane" || c.kind === "planeDir" ? { axis: null, plane: c.normal } : FREE;
}
