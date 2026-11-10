// backend filter kernel 注册清单（C8 filter 档口）——静态封闭集，与 UI 菜单的 region filter
// 一一对应（brush-only filter 走 stroke/filter-brush 流，不在此册：液化 / 锐化模糊）。
// 未注册 id → 响亮 throw（对表纪律同 shader 注册表：新 region filter 不进清单 = 档口测试红）。
// 插件下载纪元的动态注册另议（届时 kernel 面也要过决定论审）。

import type { FilterKernel } from "./kernel.ts";
import { HsbKernel } from "./hsb-kernel.ts";
import { ColorBalanceKernel } from "./color-balance-kernel.ts";
import { CurvesKernel } from "./curves-kernel.ts";
import { MosaicKernel, HalftoneKernel, StainedGlassKernel } from "./stylize-kernels.ts";
import { GradientMapKernel } from "./gradient-map-kernel.ts";   // 2026-09-05 渐变映射（color-ramp 首消费者）

export const FILTER_KERNELS: Readonly<Record<string, FilterKernel>> = Object.freeze({
  [HsbKernel.id]: HsbKernel,
  [ColorBalanceKernel.id]: ColorBalanceKernel,
  [CurvesKernel.id]: CurvesKernel,
  [GradientMapKernel.id]: GradientMapKernel,
  [MosaicKernel.id]: MosaicKernel,
  [HalftoneKernel.id]: HalftoneKernel,
  [StainedGlassKernel.id]: StainedGlassKernel,
});

export function getFilterKernel(id: string): FilterKernel {
  const k = FILTER_KERNELS[id];
  if (!k) throw new Error(`filter kernel not registered: ${id} (region kernel list = backend/filters/index.ts)`);
  return k;
}

export type { FilterKernel, FilterParams } from "./kernel.ts";
export { clamp8 } from "./kernel.ts";
