// migrate/material.ts —— 材质色的读法按拍子分（立宪 §7：迁移住本文件夹）。created 2026-10-30 by Claude Opus 5.5
// CATSUP_material 1.1 起（2026-10-30）baseColorFactor 按 glTF 规定存线性值（color-space.ts；user「文件边界换算 同意」）；
// 1.0 及以前、以及没挂 CATSUP_material 的纯色材质（1.1 之前只有带贴图的材质才挂）存的是 sRGB 的数 → 原样读。
// （user 说过「老文件我们现在真的不用念旧」；留这一步是因为老样本「打开语义不变」的立宪守卫——要拿掉得先改那条守卫。）
import { linearToSrgb } from "../color-space.ts";
import { readStamp } from "./index.ts";

/** 文件里的 baseColorFactor（前三个分量）→ app 里的 sRGB 材质色。ext = 这个材质的 CATSUP_material 原样（没有 = null）。 */
export function materialColorFromFile(bc: readonly (number | undefined)[], ext: Record<string, unknown> | null): [number, number, number] {
  const c: [number, number, number] = [bc[0] ?? 0.8, bc[1] ?? 0.8, bc[2] ?? 0.8];
  const linear = ext !== null && readStamp(ext).minor >= 1;
  return linear ? [linearToSrgb(c[0]), linearToSrgb(c[1]), linearToSrgb(c[2])] : c;
}
