// 涂装车间 · 程序海天：向 2014 年那张海天球面图致敬——远山、云、海面反射（实验室 lab/app.js sky() / procedural() 原式）。y 朝上（实验室坐标）。
// created 2026-10-29 by Claude Opus 5.5（从 backend/three/env-sky.ts 拆出来）
import type { EnvRecipe } from "./index.ts";

export const SKY_SEA: EnvRecipe = {
  kind: "env", name: "程序海天", source: "实验室 lab/app.js sky() / procedural()（ai-docs/20261026-procedural-sky-sea.md）",
  fn: "envSkySea",
  glsl: /* glsl */`
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
  vec3 skySea(vec3 d, vec3 uSunDir) {
    float h = max(d.y, 0.0);
    vec3 c = mix(vec3(0.58, 0.68, 0.83), vec3(0.08, 0.22, 0.58), pow(h, 0.35));
    vec2 p = d.xz / (d.y + 0.12);
    float n = fbm(p * 0.9 + vec2(3.1, 1.7));
    float sunF = max(dot(d, uSunDir), 0.0);
    float cl = smoothstep(0.56, 0.84, n) * smoothstep(0.02, 0.14, d.y) * (1.0 - 0.5 * h);
    c = mix(c, mix(vec3(0.58, 0.63, 0.72), vec3(1.0, 0.97, 0.93), 0.45 + 0.55 * sunF), cl * 0.9);
    c += vec3(1.0, 0.95, 0.86) * (pow(sunF, 2400.0) * 60.0 + pow(sunF, 120.0) * 0.45 + pow(sunF, 12.0) * 0.04);
    return c;
  }
  vec3 envSkySea(vec3 d, vec3 uSunDir) {
    float az = atan(d.z, d.x);
    float hill = 0.010 + 0.040 * pow(max(0.0, sin(az * 1.3 + 2.2)), 3.0) + 0.012 * vnoise(vec2(az * 9.0, 0.5));
    if (d.y >= 0.0 && d.y < hill) return mix(vec3(0.10, 0.13, 0.18), skySea(d, uSunDir), 0.25 + 0.35 * d.y / hill);
    if (d.y >= 0.0) return skySea(d, uSunDir);
    vec2 sp = d.xz / max(-d.y, 0.015);
    float w = fbm(sp * 0.35) - 0.5;
    vec3 r = normalize(vec3(d.x + w * 0.05, -d.y, d.z + w * 0.05));
    float f = 0.02 + 0.98 * pow(1.0 + d.y, 5.0);
    vec3 c = mix(vec3(0.012, 0.04, 0.07), skySea(r, uSunDir) * 0.85, clamp(f, 0.0, 1.0));
    c += vec3(1.0, 0.95, 0.86) * pow(max(dot(r, uSunDir), 0.0), 260.0) * 5.0 * (0.6 + w);
    return c;
  }`,
};
