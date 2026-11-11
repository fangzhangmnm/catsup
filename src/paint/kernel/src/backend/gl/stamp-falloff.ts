// 笔尖从硬芯到边缘怎么淡下去：全仓唯一的一份（贴图主线 0-5，2026-11-10 Claude Opus 5.5；守卫 test/host-overlay-guard.test.mjs）。
// 显卡（GLSL 片段）和软件显卡 / CPU（同一算式的 JS 函数）各一份写法、算式一字不差：到芯（innerR）为止 = 1；之后 smoothstep 淡到 radius；没有过渡带（radius ≤ innerR）= 1。
// 用的地方：二维笔尖（gl-stamp.ts）、区域笔的笔尖和遮罩（region-programs.ts）、软件显卡里它们的镜像（soft-shaders.ts）、笔刷预览（brush-rack-view.ts）；
// 三维的空间层（1-4）拿 GLSL 片段写「把笔尖画到贴图格子上」的着色器（距离在空间里量），拿 JS 函数在 CPU 上算标准答案。
// 半径以外（dist ≥ radius）的处理归调用的地方（discard / 跳过），这里不管。

/** GLSL：float stampFalloff(float dist, float radius, float innerR)。放在 main 之前。 */
export const STAMP_FALLOFF_GLSL = `
float stampFalloff(float dist, float radius, float innerR) {
  float decayLen = radius - innerR;
  if (decayLen <= 0.0 || dist <= innerR) return 1.0;
  float u = (dist - innerR) / decayLen;
  return 1.0 - u*u*(3.0 - 2.0*u);
}`;

/** 同一算式的 JS（软件显卡 / CPU 标准答案）。 */
export function stampFalloff(dist: number, radius: number, innerR: number): number {
  const decayLen = radius - innerR;
  if (decayLen <= 0 || dist <= innerR) return 1;
  const u = (dist - innerR) / decayLen;
  return 1 - u * u * (3 - 2 * u);
}
