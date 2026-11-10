// 渐变映射 kernel（per-pixel）：luma → 色带查色；alpha 原样。created 2026-09-05 by Claude Fable 5.1
// 提案 §2.3（user 2026-08-30：「我想旧夏音色稿转二分……皮肤色+红色肉色阴影来做第一遍二分」→ 渐变映射 = color-ramp 头一个消费者）。
// luma 系数与 hsb-kernel 同式（Rec.709：0.2126 / 0.7152 / 0.0722）；色带 alpha v1 不参与（像素 alpha 保留）。

import type { FilterKernel, FilterParams } from "./kernel.ts";
import { type ColorRamp, grayRamp, bakeRampLut, sanitizeRamp } from "../../common/color-ramp.ts";

export interface GradientMapParams extends FilterParams {
  ramp: ColorRamp;
}

export const GradientMapKernel: FilterKernel = {
  id: "gradientMap",

  defaults(): GradientMapParams {
    return { ramp: grayRamp() };   // 黑→白 = 恒等（灰像素回自己；彩色像素变灰——这是渐变映射的本义）
  },

  bleedRadius() { return 0; },

  bake(srcData, dstData, params, mask) {
    const p = params as Partial<GradientMapParams>;
    const lut = bakeRampLut(sanitizeRamp(p.ramp) ?? grayRamp());
    const N = srcData.length / 4;
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      if (mask && mask[o >> 2] < 128) {
        dstData[o] = srcData[o]; dstData[o + 1] = srcData[o + 1];
        dstData[o + 2] = srcData[o + 2]; dstData[o + 3] = srcData[o + 3];
        continue;
      }
      const luma = Math.round(0.2126 * srcData[o] + 0.7152 * srcData[o + 1] + 0.0722 * srcData[o + 2]);
      const l = (luma < 0 ? 0 : luma > 255 ? 255 : luma) * 4;
      dstData[o] = lut[l]; dstData[o + 1] = lut[l + 1]; dstData[o + 2] = lut[l + 2];
      dstData[o + 3] = srcData[o + 3];
    }
  },
};
