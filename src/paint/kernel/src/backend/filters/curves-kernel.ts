// 曲线 kernel（RGBA + 复合）——数学自 plugins/curves.ts 析出（C8）。
// 5 通道：复合 / R / G / B / A；应用顺序：复合（同时作用于 R/G/B）→ R/G/B 各自 → A
//
// v132 (user：「曲线不是折线！」)：分段插值 = Monotonic Cubic Hermite 系
// v135 (user：「曲线还是有点怪，不是 PS / Unity 手感」)：换 Catmull-Rom
// 2026-09-05（user 0820「曲线完全不能用……重做，对标Unity的animation curve」；0830 拍板对齐 Unity 带把手）：
//   参数从 [x,y][] 换成 common/anim-curve.ts 的 AnimCurve（key + 切线模式 + 把手；默认 clampedAuto 不过冲），
//   LUT = bakeLut8(curve)。旧 CurvePoint 数组（MCP 回放 / 旧脚本）经 curveOf 兼容转成 AnimCurve。
//   edited by Claude Fable 5.1

import { type FilterKernel, type FilterParams } from "./kernel.ts";
import { type AnimCurve, identityCurve, makeCurve, bakeLut8, sanitizeCurve } from "../../common/anim-curve.ts";

export type CurveChannel = "comp" | "r" | "g" | "b" | "a";
export const CURVE_CHANNELS: readonly CurveChannel[] = ["comp", "r", "g", "b", "a"];

export interface CurvesParams extends FilterParams {
  active: CurveChannel;
  comp: AnimCurve;
  r: AnimCurve;
  g: AnimCurve;
  b: AnimCurve;
  a: AnimCurve;
}

/** 参数 → AnimCurve：AnimCurve 原样（校验后）；旧 [x0..255, y0..255][] 点表 → 转 0..1 曲线；其他 → 恒等。 */
export function curveOf(p: unknown): AnimCurve {
  if (Array.isArray(p)) {
    const pts = (p as unknown[]).filter((q): q is [number, number] => Array.isArray(q) && q.length >= 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]))
      .map(([x, y]) => ({ t: x / 255, v: y / 255 }));
    return pts.length >= 2 ? makeCurve(pts) : identityCurve();
  }
  return sanitizeCurve(p) ?? identityCurve();
}

export const CurvesKernel: FilterKernel = {
  id: "curves",

  defaults(): CurvesParams {
    return { active: "comp", comp: identityCurve(), r: identityCurve(), g: identityCurve(), b: identityCurve(), a: identityCurve() };
  },

  bleedRadius() { return 0; },

  bake(srcData, dstData, params, mask) {
    const p = params as Partial<CurvesParams>;
    const lutComp = bakeLut8(curveOf(p.comp));
    const lutR    = bakeLut8(curveOf(p.r));
    const lutG    = bakeLut8(curveOf(p.g));
    const lutB    = bakeLut8(curveOf(p.b));
    const lutA    = bakeLut8(curveOf(p.a));
    const N = srcData.length / 4;
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      if (mask && mask[o >> 2] < 128) {
        dstData[o] = srcData[o]; dstData[o+1] = srcData[o+1];
        dstData[o+2] = srcData[o+2]; dstData[o+3] = srcData[o+3];
        continue;
      }
      dstData[o]   = lutR[lutComp[srcData[o]]];
      dstData[o+1] = lutG[lutComp[srcData[o+1]]];
      dstData[o+2] = lutB[lutComp[srcData[o+2]]];
      dstData[o+3] = lutA[srcData[o+3]];
    }
  },
};
