// protractor-geom.ts —— 量角器的纯几何（0.11 尺规纪元 ⑥，2026-10-24，Claude Fable 5.1）：绕轴的有向角、15° 咬合、转出方向。不 import editor.ts。
import type { Pt3 } from "../kernel/kernel.ts";
import { add3, cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";
import type { Frame } from "../scene/xform.ts";

/** 与旋转工具同一套手感：15° 一档，离档 ≤ 1.5° 吸上去；参考点离圆心至少 1 cm。 */
export const PROT_STEP_DEG = 15, PROT_SNAP_DEG = 1.5, PROT_MIN = 0.01;

/** 点 q 相对参考方向（center→ref）绕 axis 的有向角（弧度，右手）。 */
export function angleAbout(center: Pt3, axis: Pt3, ref: Pt3, q: Pt3): number {
  const a = sub3(ref, center), b = sub3(q, center);
  return Math.atan2(dot3(cross3(a, b), axis), dot3(a, b));
}
/** 咬合到 step 的整数倍（只在 |差| ≤ snap 时）。 */
export function detent(ang: number, stepDeg = PROT_STEP_DEG, snapDeg = PROT_SNAP_DEG): { ang: number; snapped: boolean } {
  const step = (stepDeg * Math.PI) / 180, near = Math.round(ang / step) * step;
  return Math.abs(ang - near) <= (snapDeg * Math.PI) / 180 ? { ang: near, snapped: true } : { ang, snapped: false };
}
/** 参考方向绕 axis 转 ang 后的单位方向（Rodrigues；ref 先投到轴的垂面）。 */
export function rotateDir(center: Pt3, axis: Pt3, ref: Pt3, ang: number): Pt3 {
  const n = normalize3(axis);
  const a0 = sub3(ref, center);
  const a = normalize3(sub3(a0, scale3(n, dot3(a0, n))));
  const c = Math.cos(ang), s = Math.sin(ang);
  return normalize3(add3(add3(scale3(a, c), scale3(cross3(n, a), s)), scale3(n, dot3(n, a) * (1 - c))));
}
/**
 * 轴向咬合（user 2026-10-24「旋转的时候坐标轴方向也有snap」）：参考方向转到与上下文某轴（±x / ±y / ±z 投到转动平面）平行时吸住。
 * 返回吸住后的角与那根轴；离最近轴向 > snapDeg → null。
 */
export function axisAlignAngle(center: Pt3, axis: Pt3, ref: Pt3, frame: Frame, ang: number, snapDeg = PROT_SNAP_DEG): { ang: number; axis: "x" | "y" | "z" } | null {
  const n = normalize3(axis);
  let best: { ang: number; axis: "x" | "y" | "z" } | null = null, bestDiff = (snapDeg * Math.PI) / 180;
  for (const [name, d0] of [["x", frame.x], ["y", frame.y], ["z", frame.z]] as const) {
    for (const sgn of [1, -1]) {
      const d = scale3(d0, sgn);
      const proj = sub3(d, scale3(n, dot3(d, n)));
      if (Math.hypot(proj.x, proj.y, proj.z) < 1e-6) continue;   // 轴与转轴平行：转动平面里没有它
      const target = angleAbout(center, n, ref, add3(center, proj));
      let diff = target - ang;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));   // 归到 (−π, π]
      if (Math.abs(diff) < bestDiff) { bestDiff = Math.abs(diff); best = { ang: ang + diff, axis: name }; }
    }
  }
  return best;
}
/** 把点投到过 center、法向 axis 的平面上。 */
export function projectToAxisPlane(p: Pt3, center: Pt3, axis: Pt3): Pt3 { const d = dot3(sub3(p, center), axis); return sub3(p, scale3(axis, d)); }
