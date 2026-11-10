// pressure-curve —— 笔刷压感整形：pressureCurve（anim-curve）优先，缺省回落 p^pressureGamma。
// created 2026-09-05 by Claude Fable 5.1。提案 §3 批 4（user 2026-08-30「压感同意用anim-curve」）。
//
// · 笔刷 JSON 新增**顶层可选键** `pressureCurve: AnimCurve`（与旧 size/flow.pressureCurve 数字字段不同层级，迁移代码不碰它）。
//   缺省无字段 = 走原 gamma 路径（零迁移、零手感变化）；有字段 = 曲线替代 gamma（一件事一个旋钮，不叠两层）。
// · 热路径零 evaluate：描边 begin 时烤 256 项 Float32 LUT，每颗 dab 线性插值查表（恒等曲线 → 输出 ≡ 输入，浮点误差级）。
// · 消费者：backend/brush.ts（画笔）、plugins/smudge-engine.ts（手指）。全局压感四档（pressure-level）在输入层，与本模块正交。

import { type AnimCurve, bakeLut, sanitizeCurve, makeCurve } from "./anim-curve.ts";

export type PressureShaper = (p: number) => number;

export interface PressureShapeSource {
  pressureGamma?: number;
  pressureCurve?: AnimCurve | null | unknown;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** 烤 LUT（256 项，t = i/255，值钳 0..1）。 */
export function bakePressureLut(curve: AnimCurve): Float32Array {
  const lut = bakeLut(curve, 256);
  for (let i = 0; i < lut.length; i++) lut[i] = clamp01(Number.isFinite(lut[i]) ? lut[i] : 0);
  return lut;
}

/** LUT 线性插值查表（p 先钳 0..1）。 */
export function lookupPressureLut(lut: Float32Array, p: number): number {
  const x = clamp01(Number.isFinite(p) ? p : 0) * 255;
  const i0 = x | 0;
  if (i0 >= 255) return lut[255];
  const f = x - i0;
  return lut[i0] + (lut[i0 + 1] - lut[i0]) * f;
}

/** 按笔设置造整形函数：合法 pressureCurve → LUT 查表；否则 p^gamma（gamma 地板 0.01，同旧引擎）。 */
export function makePressureShaper(s: PressureShapeSource): PressureShaper {
  const curve = s.pressureCurve == null ? null : sanitizeCurve(s.pressureCurve);
  if (curve) {
    const lut = bakePressureLut(curve);
    return (p) => lookupPressureLut(lut, p);
  }
  const g = Math.max(0.01, (typeof s.pressureGamma === "number" && Number.isFinite(s.pressureGamma) && s.pressureGamma) || 1.0);
  if (g === 1) return (p) => clamp01(p);
  return (p) => Math.pow(clamp01(p), g);
}

/** gamma → 曲线（5 key 采样 v = t^g，clampedAuto）；g = 1 → 共线 = 精确恒等。「改用曲线」按钮的起点。 */
export function curveFromGamma(gamma: number): AnimCurve {
  const g = Math.max(0.01, Number.isFinite(gamma) && gamma > 0 ? gamma : 1);
  const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ t, v: Math.pow(t, g) }));
  return makeCurve(pts);
}
