// increments.ts —— 「整格 / 整角」吸附的纯数学（零依赖编辑器状态）：格点吸附开着时（右上锁钮；按住 Shift 临时反过来），
// 长度咬到格距的整数倍、方向咬到 15° 的整数倍——都**有捕捉阈**（离得近才咬，不是硬取整），几何推断照样优先。
// user 2026-10-25「shift应该是flip snap rule」「还是其实右上应该只管grid snap」「15是grid合理」「snap to incremental应该还要有一个捕捉阈」
// 「同时snap absolute和incremental没关系吧」「以及沿着一根线走一个grid，这个怎么得到？」。求解器（solver.ts snapPoint）和各工具共用这一份。
// created 2026-10-25 by Claude Opus 5.5
import type { Pt3 } from "../kernel/geom.ts";

/** 整角的档（度）。量纲：度。 */
export const INCREMENT_DEG = 15;

/** 格点吸附的有效开关：右上锁钮的状态，按住 Shift 反过来。 */
export const gridEffective = (on: boolean, shift: boolean): boolean => on !== shift;

/** t0 最近的整格（step 的整数倍）。 */
export const nearestStep = (t0: number, step: number): number => Math.round(t0 / step) * step;

/** 平面内（u / v 正交单位基）从 anchor 指向 p 的方向咬到 stepDeg 的整数倍（参考方向 = u）：返回同半径的点 + 角度（度）。 */
export function snapDirectionInPlane(anchor: Pt3, p: Pt3, basis: { u: Pt3; v: Pt3 }, stepDeg = INCREMENT_DEG): { p: Pt3; deg: number } {
  const d = { x: p.x - anchor.x, y: p.y - anchor.y, z: p.z - anchor.z };
  const du = d.x * basis.u.x + d.y * basis.u.y + d.z * basis.u.z, dv = d.x * basis.v.x + d.y * basis.v.y + d.z * basis.v.z;
  const r = Math.hypot(du, dv);
  if (r < 1e-12) return { p, deg: 0 };
  const step = (stepDeg * Math.PI) / 180;
  const ang = Math.round(Math.atan2(dv, du) / step) * step;
  const c = Math.cos(ang) * r, s = Math.sin(ang) * r;
  return { p: { x: anchor.x + basis.u.x * c + basis.v.x * s, y: anchor.y + basis.u.y * c + basis.v.y * s, z: anchor.z + basis.u.z * c + basis.v.z * s }, deg: Math.round((ang * 180) / Math.PI) };
}

/**
 * 一个标量（推拉高度 / 偏移距离 / 旋转角 / 倍率…）咬到 step 的整数倍——**有捕捉阈**：咬过去的点离光标在 near 判定里才咬，否则原样。
 * at(v) = 这个值对应的世界点（用来量屏距）；near(p) = 屏距在吸附半径内。
 */
export function snapScalar(v: number, step: number, at: (v: number) => Pt3, near: (p: Pt3) => boolean): number | null {
  if (!(step > 0)) return null;
  const k = nearestStep(v, step);
  return near(at(k)) ? k : null;
}
