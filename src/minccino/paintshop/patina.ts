// 涂装车间 · 铜绿 / 氧化：积在缝里和凹处（摸不到、擦不掉的地方 = 世界空间遮蔽低处），那里不再是亮金属、变粗（实验室 material.js patina；起伏图的凹缝那项 CatsUp 还没有）。
// created 2026-10-29 by Claude Opus 5.5（从表面着色器里拆出来）
import type { SurfaceRecipe } from "./index.ts";

export const PATINA: SurfaceRecipe = {
  kind: "surface", name: "铜绿", source: "实验室 overrides/material/material.js patina / patinaColor",
  fn: "paintPatina",
  glsl: /* glsl */`
  void paintPatina(inout Surface s, float amt, vec3 color) {
    float pat = amt * clamp((1.0 - s.occl) * 2.0, 0.0, 1.0);
    s.base = mix(s.base, pow(color, vec3(2.2)), pat); s.metal *= 1.0 - 0.85 * pat; s.rough = mix(s.rough, 0.85, pat);
  }`,
};
