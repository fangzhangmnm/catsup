// increments.ts —— 「整格 / 整角」吸附的纯数学（零依赖编辑器状态）：格点吸附开着时（右上锁钮；按住 Shift 临时反过来），
// 长度取吸附长度的整数倍、角度取 15° 的整数倍。**唯一入口 = gridSnap**（工具一律问它）。
// 2026-11-12 起一律取整、没有捕捉阈（统筹 11-12 定原则；user 11-13「我当时说的十五应该是十五度就是旋转的话十五度……然后一律取整同意」）：
//   整格铺满整条线，正确的运算是取整，对任何值都做、结果不随缩放变；10-25 那版「离得近才咬」（屏幕像素吸附圈 / 1.5° 角度窗）作废。
//   吸到具体的东西（点、边、停靠点、和坐标轴平行）照旧按屏幕像素 / 角度窗判，且优先于取整——那一半归各工具，不归这里。
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
 * 整格吸附的唯一入口（2026-11-12，Claude Opus 5.5；统筹 11-12 / user 11-13）。工具里的长度、角度要整格时只问它，不许自己 round、不许加「够不够近」。
 * g = ctx.grid()（已是有效开关：右上锁钮 XOR Shift）。关着 / 步长不对 = 原样返回。键入的数不走这里（键入的就是人要的数）。
 * 取整得 0（不到半格 / 半档）由调用方处理：不动、提示「再拖远一点」（gridSnap.zeroHint 给字）。
 */
export const gridSnap = {
  /** 长度：吸附长度 snap 的整数倍（h := s · round(h / s)）。 */
  length(v: number, g: { on: boolean; snap: number }): number {
    return g.on && g.snap > 0 ? nearestStep(v, g.snap) || 0 : v;   // || 0：-0 当 0
  },
  /** 角度（弧度）：15° 的整数倍。 */
  angle(rad: number, g: { on: boolean }): number {
    if (!g.on) return rad;
    const step = (INCREMENT_DEG * Math.PI) / 180;
    return Math.round(rad / step) * step || 0;
  },
  /** 取整得 0 时提示行那半句（长度给吸附长度的一半；角度给 7.5°）。fmt = 长度的显示写法（各工具用自己的 fmtLen）。 */
  zeroHint(g: { snap: number }, fmt: (m: number) => string): string { return `不到半格（${fmt(g.snap / 2)}），再拖远一点`; },
  zeroAngleHint: `不到半档（${INCREMENT_DEG / 2}°），再转远一点`,
} as const;

/**
 * 这个吸附结果算不算「具体的东西」：没吸到 / 吸到格点 / 吸到整数长度（求解器从锚点量的整格，离得近才咬——自由落点那一半，待定）/ 只是落在面上
 * = 都不算，工具拿光标**真实的**位置去问 gridSnap 取整；吸到点、边、停靠点、轴线这些才算、优先于取整。
 * （2026-11-12：求解器的「整数长度」以前被旋转、量角器当成具体的东西，开着吸附时 15° 档根本轮不到——probe-grid-snap 抓到的。）
 */
export const snapIsGridOnly = (kind: string | null | undefined): boolean => kind == null || kind === "grid-point" || kind === "increment" || kind === "on-face";
