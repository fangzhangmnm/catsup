// 涂装车间 · 砂铸：砂型的颗粒印 + 气孔，坑里粗、暗；细到看不清时抹平，不闪（实验室 material.js pattern 9；user 10-26「铸造的时候就锐不起来，还有坑洼」）。
// created 2026-10-29 by Claude Opus 5.5（从表面着色器里拆出来）
import type { SurfaceRecipe } from "./index.ts";

export const SAND_CAST: SurfaceRecipe = {
  kind: "surface", name: "砂铸", source: "实验室 overrides/material/material.js pattern 9",
  fn: "paintSandCast",
  glsl: /* glsl */`
  void paintSandCast(inout Surface s, float amt, vec3 color) {
    float fade = 1.0 - smoothstep(0.3, 0.7, length(fwidth(s.P * 160.0)));
    float g = vnoise3(s.P * 160.0), pit = smoothstep(0.62, 0.85, vnoise3(s.P * 70.0 + 3.0));
    s.N = normalize(s.N + (vec3(vnoise3(s.P * 160.0 + 7.0), vnoise3(s.P * 160.0 + 13.0), g) - 0.5) * 0.35 * amt * fade);
    s.base *= 1.0 - 0.25 * amt * pit;
    s.rough = clamp(s.rough + 0.25 * amt * (pit + 0.5 * g), 0.04, 1.0);
  }`,
};
