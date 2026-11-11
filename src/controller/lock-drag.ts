// controller/lock-drag.ts —— 拖动的位移怎么从两条光标射线算出来（白模 W-13，2026-11-11 Claude Opus 5.5；自由建模的移动 / 挤出共用）。
// user 11-11 凌晨报：自由建模、移动、锁 XY、透视、选了几个高度不同的点拖——「有的方向快有的方向慢」。
// 问题陈述（统筹 11-11）：输入 = 按下时光标的射线 r0、抓住的点 P0（按下时光标底下那个要动的元素上的点）、锁、现在光标的射线 r1；输出 = 位移 d，所有要动的点加同一个 d。
//   · 锁面（法向 n）：d =（r1 和「过 P0、法向 n 的平面」的交点）−（r0 和同一个平面的交点）。性质：P0 + d 投回屏幕就是现在光标的位置，朝哪个方向拖都一样，正交透视都成立。
//     以前的算式 = 在「过轴心、垂直视线的平面」上取位移，再去掉法向分量（正投影到锁着的面上）：那个面越斜，沿斜的方向投影越短——透视俯看锁 XY 时上下只走三成、左右走足量。
//   · 视线快贴着锁着的面（射线和面的夹角的余弦 ≤ GRAZE_COS，和硬表面 lockToPlane 同一个数）或者交在眼睛后面：不用交点，退回「投影」（有界，不会飞出去），并且说一句；
//     交点离按下时的交点太远（> maxLen）：夹在 maxLen，也说一句。
//   · 锁轴不在这里改：自由建模的锁轴是 user 定的 FM18（动多少 = 鼠标位移 · 屏幕上那根轴，轴贴近视线时变慢、不暴涨），照旧投影。
//   · 不锁：「过 P0、垂直于按下那条射线的平面」上的位移（以前过轴心；按在一个点上拖时现在是这个点跟手）。
// 纯函数：不认识编辑器、内核、显卡、页面。
import type { Pt3 } from "../kernel/geom.ts";
import { LOCK_DRAG_MAX_SCREENS, LOCK_GRAZE_COS } from "./feel.ts";

export interface DragRay { readonly origin: Pt3; readonly dir: Pt3 }
const GRAZE_COS = LOCK_GRAZE_COS;

const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a: Pt3, s: number): Pt3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const len = (a: Pt3): number => Math.hypot(a.x, a.y, a.z);

/** 射线和「过 through、法向 n 的平面」的交点；贴着面（|cos| ≤ minCos）或交在眼睛后面 = null。 */
export function rayOnPlane(r: DragRay, through: Pt3, n: Pt3, minCos = GRAZE_COS): Pt3 | null {
  const dl = len(r.dir), nl = len(n);
  if (!(dl > 0 && nl > 0)) return null;
  const den = dot(r.dir, n);
  if (Math.abs(den) <= minCos * dl * nl) return null;
  const t = dot(sub(through, r.origin), n) / den;
  return t > 0 ? add(r.origin, mul(r.dir, t)) : null;
}

/** 锁面拖动一下最远走多少（世界长度）：rTop / rBottom = 画面上缘 / 下缘、和抓住的点同一列的两条射线；在「过 P0、垂直于 r0」的平面上量画面高 × LOCK_DRAG_MAX_SCREENS。 */
export function dragMaxLen(r0: DragRay, rTop: DragRay, rBottom: DragRay, p0: Pt3): number {
  const a = rayOnPlane(rTop, p0, r0.dir, 0), b = rayOnPlane(rBottom, p0, r0.dir, 0);
  return a && b ? len(sub(a, b)) * LOCK_DRAG_MAX_SCREENS : Infinity;
}
export interface DragResult {
  readonly d: Pt3;
  /** 锁面时视线贴着面（或交在眼睛后面）：退回了投影。 */
  readonly graze: boolean;
  /** 锁面时交点太远：夹在 maxLen。 */
  readonly clamped: boolean;
}
/**
 * 拖动的位移（见文件头）。r0 = 按下时光标的射线、r1 = 现在的；p0 = 抓住的点（世界）；axis / plane = 锁（单位长；都没有 = 不锁；axis 优先）；
 * maxLen = 锁面时位移最长多少（世界长度；调用方按画面大小给）。
 */
export function dragDelta(r0: DragRay, r1: DragRay, p0: Pt3, lock: { readonly axis: Pt3 | null; readonly plane: Pt3 | null }, maxLen: number): DragResult {
  // 不锁 / 锁轴：过 P0、垂直于按下那条射线的平面（按下时正对着人）上的位移
  const a = rayOnPlane(r0, p0, r0.dir, 0) ?? p0, b = rayOnPlane(r1, p0, r0.dir, 0) ?? a, free = sub(b, a);
  if (lock.axis) return { d: mul(lock.axis, dot(free, lock.axis)), graze: false, clamped: false };   // FM18：投到轴上
  const n = lock.plane;
  if (!n) return { d: free, graze: false, clamped: false };
  const h0 = rayOnPlane(r0, p0, n), h1 = rayOnPlane(r1, p0, n);
  if (!h0 || !h1) return { d: sub(free, mul(n, dot(free, n))), graze: true, clamped: false };   // 贴着面：投影兜底（有界）
  const d = sub(h1, h0), L = len(d);
  return L > maxLen && L > 0 ? { d: mul(d, maxLen / L), graze: false, clamped: true } : { d, graze: false, clamped: false };
}
