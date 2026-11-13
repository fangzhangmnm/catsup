// controller/axis-apply.ts —— 轴键的约束落到工具上：一族工具一个函数，工具只调自己那一个、不自己读 kind 分叉（锁的一轮第二步）。created 2026-11-13 by Claude Opus 5.5
// 设计稿 = ai-docs/20261113-axis-constraint-module-design.md 2.3 那张表（规矩 user 11-13 夜批的；表是统筹的设计）：
//   一维（移动、挤出、偏移、画线）  line = 只沿这条线；plane = 只在这个面里；planeDir = 只沿面里那个方向
//   旋转                            line = 绕这条线；plane / planeDir = 绕面的法线
//   缩放                            line = 只沿这条线缩；plane / planeDir = 只在面里缩
// 出来的是工具原来就认的那一对 { axis, plane }（世界、单位长；都没有 = 不限制），所以工具里的投影 / 拖动算法一行不用改。
// 纯函数：零 DOM / 编辑器 / 内核（controller 文件夹的规矩）。改表 = 改这个文件 + test/axis-apply.test.ts。
import type { AxisConstraint, Vec3 } from "./axis-constraint.ts";
import { AXIS_PARALLEL_DEG } from "./feel.ts";

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

// ---------------------------------------------------------------- 先定平面的工具（锁的一轮第三步：硬表面接上）
export interface AxisTriad { readonly x: Vec3; readonly y: Vec3; readonly z: Vec3 }
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };
const COS_PAR = Math.cos((AXIS_PARALLEL_DEG * Math.PI) / 180);
/** 这根方向和坐标架哪根轴平行（同向反向都算；门槛 = feel.ts AXIS_PARALLEL_DEG，和语法模块同一个）；都不平行 = null。锁线的颜色、吸附种类叫 axis-x 还是 axis-dir 都问它。 */
export function frameAxisOf(d: Vec3, frame: AxisTriad): "x" | "y" | "z" | null {
  const u = unit(d);
  return (["x", "y", "z"] as const).find((a) => Math.abs(dot(u, unit(frame[a]))) >= COS_PAR) ?? null;
}
/** 二维工具（矩形、圆、弧……）拿到约束 → 图形躺的那个面：法向 + 面里第一条边的方向（u = null = 边照默认）；null = 不限制（照默认的面）。
 *  plane = 那个面、边照默认；planeDir = 那个面、一条边顺着那个方向；line = 含这条线、最正对视线的面、一条边顺着这条线（这条线几乎正对视线 = 照默认）。
 *  toViewer = 从这里朝着看的人的方向（单位长）。设计稿 2.3 二维那一行 + 第一个边角。 */
export function shapePlane(c: AxisConstraint, toViewer: Vec3): { readonly normal: Vec3; readonly u: Vec3 | null } | null {
  if (c.kind === "plane") return { normal: c.normal, u: null };
  if (c.kind === "planeDir") return { normal: c.normal, u: c.dir };
  if (c.kind !== "line") return null;
  const d = unit(c.dir), along = dot(toViewer, d), n = { x: toViewer.x - d.x * along, y: toViewer.y - d.y * along, z: toViewer.z - d.z * along };
  if (Math.hypot(n.x, n.y, n.z) < 0.05) return null;   // 这条线几乎正对着视线：照默认的面
  return { normal: unit(n), u: d };
}
/** 旋转那一族（旋转、量角器）：转的那个面的法向 = rotateLock 给的转轴；null = 不限制。 */
export function rotatePlane(c: AxisConstraint): { readonly normal: Vec3; readonly u: null } | null { const a = rotateLock(c).axis; return a ? { normal: a, u: null } : null; }
