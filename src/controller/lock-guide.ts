// controller/lock-guide.ts —— 锁看得见：锁着轴 = 画一根那根轴的线、锁着面 = 画面里的两根（Blender 式）。created 2026-10-28 by Claude Opus 5.5
// user 10-28 晚「轴锁的时候能不能看到小轴线，blender就是这么做的，视觉告诉你，不然其实用户不知道是不是还是viewport aligned」
// 「然后这个是深模块吧就是所有的轴锁都这样，你好好想一下轴放哪里」。
//
// 所有的锁（方向键 / X Y Z / Shift+… / 芯片 / 先锁好下一下生效）都落在编辑器同一份锁状态上，所以这里一个纯函数 + 渲染一个口子 = 所有工具都这样，工具不用各画各的。
// 轴放哪里（这个文件的全部判断）：
//   · 方向 = 上下文的坐标架（最外层 = 绘图轴、组 / 组件里 = 它自己的轴）——和锁真正约束的方向是同一个（editor.axisLockDir / lockToAxis 都读 contextFrame），
//     所以进了转过的组件里，线跟着组件的轴歪，一眼看得出「锁的是物体自己的 Z，不是屏幕」。颜色 = 红 X / 绿 Y / 蓝 Z（家族坐标约定）。
//   · 过哪一点 = 被约束的那一点：手势进行中 = 工具的锚点（移动的按下点 / 画线的起点 / 挤出的抓点——那一点就沿着这根线走，画线时这根线就是正在画的线）；
//     没在手势里（先锁好、下一下生效）= 下一下要动的东西的变换中心（这把工具对选区做事、而且有选区）；都没有 = 不画（芯片上那枚亮着已经说了锁着）。
//   · 面锁 = 面里的两根轴（锁 XY = 画 X 和 Y 两根）；锁「按下那张面」= 那张面里两根互相垂直的线，中性色。
// 纯数据：零 DOM / three / 内核（controller 文件夹的规矩，守卫 test/stance.test.ts）；渲染器只管把线画长、画在最上面（render3.ts lockLines）。
// 2026-11-13 锁的一轮第二步（Claude Opus 5.5）：画什么改成看「约束」（controller/axis-constraint.ts 的四种：沿线 / 在面里 / 面里一个方向），不再只认 X / Y / Z 和「那张面」。
//   按钮锁读成约束 = lockConstraint；轴键按出来的本来就是约束。颜色：线和坐标架某根轴平行（门槛 = feel.ts AXIS_PARALLEL_DEG，和语法模块同一个）= 那根轴的颜色，
//   不平行的那根被锁住的方向 = "dir"（品红，aux.ts axisDir；统筹 11-13）；面里撑开的另一根不平行 = 中性。

import type { AxisConstraint } from "./axis-constraint.ts";
import { AXIS_PARALLEL_DEG } from "./feel.ts";

export interface V3 { readonly x: number; readonly y: number; readonly z: number }
export type LockAxisId = "x" | "y" | "z";
/** 编辑器现在的锁（同一时刻只有一种：轴锁和面锁互斥）。planeN = 面锁的法向（世界、单位长）。 */
export interface LockNow { readonly axis: LockAxisId | null; readonly plane: LockAxisId | "face" | null; readonly planeN: V3 | null }
/** 上下文坐标架的三根轴（世界；可能带缩放，这里归一）。 */
export interface LockFrame { readonly x: V3; readonly y: V3; readonly z: V3 }
/** 一根线：过 through、沿 dir（单位长，两头都画）；color = 哪根轴的颜色（dir = 锁住的方向不和任何一根轴平行；n = 中性：斜面里撑开的另一根）。 */
export interface LockLine { readonly through: V3; readonly dir: V3; readonly color: LockAxisId | "dir" | "n" }

const norm = (v: V3): V3 => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

/** 线过哪一点：手势进行中 = 锚点（没有锚点的工具退到变换中心）；没在手势里 = 变换中心（调用方只在「这把工具对选区做事且有选区」时给）；都没有 = null（不画）。 */
export function lockThrough(gesture: boolean, anchor: V3 | null, pivot: V3 | null): V3 | null {
  return gesture ? anchor ?? pivot : pivot;
}

const AXES = ["x", "y", "z"] as const;
const COS_PAR = Math.cos((AXIS_PARALLEL_DEG * Math.PI) / 180);
const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
/** 这根方向和坐标架哪根轴平行（同向反向都算）；都不平行 = null。 */
function frameAxisOf(d: V3, frame: LockFrame): LockAxisId | null { const u = norm(d); return AXES.find((a) => Math.abs(dot(u, norm(frame[a]))) >= COS_PAR) ?? null; }

/** 按钮锁（编辑器每把工具记着的那份）读成约束：锁轴 = 沿坐标架那根轴；锁轴面 = 法向是那根轴的面；锁「按下那张面」= 那张面；没锁 = 不限制。 */
export function lockConstraint(lock: LockNow, frame: LockFrame): AxisConstraint {
  if (lock.axis) return { kind: "line", dir: norm(frame[lock.axis]) };
  if (lock.plane && lock.plane !== "face") return { kind: "plane", normal: norm(frame[lock.plane]) };
  if (lock.plane === "face" && lock.planeN) return { kind: "plane", normal: norm(lock.planeN) };
  return { kind: "free" };
}

/** 现在被限制成什么 → 画哪几根线（不限制 / 没有过的点 = []）。沿线 = 一根；在面里 = 面里两根；面里一个方向 = 那个方向一根 + 面里和它垂直的一根。 */
export function constraintLines(c: AxisConstraint, frame: LockFrame, through: V3 | null): LockLine[] {
  if (!through || c.kind === "free") return [];
  const along = (d: V3, other: "dir" | "n"): LockLine => ({ through, dir: norm(d), color: frameAxisOf(d, frame) ?? other });
  if (c.kind === "line") return [along(c.dir, "dir")];
  if (c.kind === "planeDir") return [along(c.dir, "dir"), along(cross(c.normal, c.dir), "n")];
  const na = frameAxisOf(c.normal, frame);
  if (na) return AXES.filter((a) => a !== na).map((a) => ({ through, dir: norm(frame[a]), color: a }));   // 轴面 = 另外两根轴（组件里跟着组件的轴歪）
  const n = norm(c.normal), ref = Math.abs(n.z) < 0.9 ? frame.z : frame.x, u = norm(cross(n, ref)), v = norm(cross(n, u));
  return [along(u, "n"), along(v, "n")];
}
