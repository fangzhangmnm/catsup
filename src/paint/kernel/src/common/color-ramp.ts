// color-ramp —— 色带（Blender ColorRamp 形制：色标 + 插值模式 + 色彩空间），anim-curve 同骨架换值域。
// created 2026-09-05 by Claude Fable 5.1。提案 = ai-docs/20260830-curve-and-ramp-deep-module-proposal.md §2.2。
//
// 零 DOM、零像素知识（bake 是 256×RGBA 的 LUT，消费方自己决定怎么查）。
// 语义：
//   · constant = 左色标持有到下一色标（Blender）。二分实战：[0: 红肉影][θ: 皮肤色]，拖第二个色标 = 拖阈值；色空间不参与。
//   · linear   = 相邻色标间直插；ease = smoothstep 过渡。
//   · space    = "srgb" 直插（行业默认：Blender/Unity/PS；user 0830 拍板默认）/ "oklab"（感知均匀，走 color-dist 的正反变换）。
//     alpha 恒线性插（不进色空间）。
//   · 首色标前 / 末色标后 = 端色。stops 恒按 t 升序。

import { srgbToOklab, oklabToSrgb } from "./color-dist.ts";

export type RampInterp = "linear" | "constant" | "ease";
export type RampSpace = "srgb" | "oklab";
export type Rgba8 = [number, number, number, number];   // 0..255 ×4，与像素字节同域

export interface RampStop { t: number; rgba: Rgba8 }
export interface ColorRamp { stops: RampStop[]; interp: RampInterp; space: RampSpace }

export const RAMP_INTERPS: readonly RampInterp[] = ["linear", "constant", "ease"];
export const RAMP_SPACES: readonly RampSpace[] = ["srgb", "oklab"];

const EPS_T = 1e-9;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const clamp8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

function sortStops(stops: RampStop[]): void { stops.sort((a, b) => a.t - b.t); }
function cloneRgba(c: Rgba8): Rgba8 { return [c[0], c[1], c[2], c[3]]; }

export function makeRamp(stops: RampStop[], interp: RampInterp = "linear", space: RampSpace = "srgb"): ColorRamp {
  const s = stops.map((x) => ({ t: x.t, rgba: cloneRgba(x.rgba) }));
  sortStops(s);
  return { stops: s, interp, space };
}

/** 黑→白 = 渐变映射的恒等默认（luma 查表回自己）。 */
export function grayRamp(): ColorRamp {
  return makeRamp([{ t: 0, rgba: [0, 0, 0, 255] }, { t: 1, rgba: [255, 255, 255, 255] }]);
}

export function cloneRamp(r: ColorRamp): ColorRamp {
  return { stops: r.stops.map((s) => ({ t: s.t, rgba: cloneRgba(s.rgba) })), interp: r.interp, space: r.space };
}

function mixRgb(a: Rgba8, b: Rgba8, u: number, space: RampSpace): [number, number, number] {
  if (space === "oklab") {
    const la = srgbToOklab(a[0], a[1], a[2]), lb = srgbToOklab(b[0], b[1], b[2]);
    return oklabToSrgb(la[0] + (lb[0] - la[0]) * u, la[1] + (lb[1] - la[1]) * u, la[2] + (lb[2] - la[2]) * u);
  }
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

export function evaluateRamp(r: ColorRamp, t: number): Rgba8 {
  const st = r.stops;
  const n = st.length;
  if (n === 0) return [0, 0, 0, 0];
  if (n === 1 || t <= st[0].t) return cloneRgba(st[0].rgba);
  if (t >= st[n - 1].t) return cloneRgba(st[n - 1].rgba);
  // 段：st[i].t ≤ t < st[i+1].t
  let lo = 0, hi = n - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (st[mid].t <= t) lo = mid; else hi = mid - 1;
  }
  const a = st[lo], b = st[lo + 1];
  if (r.interp === "constant") return cloneRgba(a.rgba);
  const dt = b.t - a.t;
  let u = dt <= EPS_T ? 0 : (t - a.t) / dt;
  if (r.interp === "ease") u = u * u * (3 - 2 * u);
  const [R, G, B] = mixRgb(a.rgba, b.rgba, u, r.space);
  const A = a.rgba[3] + (b.rgba[3] - a.rgba[3]) * u;
  return [clamp8(R), clamp8(G), clamp8(B), clamp8(A)];
}

/** 256×RGBA LUT：t = i/255。 */
export function bakeRampLut(r: ColorRamp): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const c = evaluateRamp(r, i / 255);
    lut[i * 4] = c[0]; lut[i * 4 + 1] = c[1]; lut[i * 4 + 2] = c[2]; lut[i * 4 + 3] = c[3];
  }
  return lut;
}

// ---- 编辑 verb ----

/** 插色标；缺省色 = evaluateRamp(t)（落在原色带上）。同 t 覆盖色。返回 index。 */
export function insertStop(r: ColorRamp, t: number, rgba?: Rgba8): number {
  const c = rgba ? cloneRgba(rgba) : evaluateRamp(r, t);
  for (let i = 0; i < r.stops.length; i++) {
    if (Math.abs(r.stops[i].t - t) < EPS_T) { r.stops[i].rgba = c; return i; }
  }
  const s: RampStop = { t: clamp01(t), rgba: c };
  r.stops.push(s);
  sortStops(r.stops);
  return r.stops.indexOf(s);
}

/** 删色标；至少留 1 个。 */
export function removeStop(r: ColorRamp, i: number): boolean {
  if (i < 0 || i >= r.stops.length || r.stops.length <= 1) return false;
  r.stops.splice(i, 1);
  return true;
}

/** 移色标 t（可越过邻居重排，Blender）；返回新 index。 */
export function moveStop(r: ColorRamp, i: number, t: number): number {
  const s = r.stops[i];
  if (!s) return -1;
  s.t = clamp01(t);
  sortStops(r.stops);
  return r.stops.indexOf(s);
}

export function setStopColor(r: ColorRamp, i: number, rgba: Rgba8): void {
  const s = r.stops[i];
  if (!s) return;
  s.rgba = [clamp8(rgba[0]), clamp8(rgba[1]), clamp8(rgba[2]), clamp8(rgba[3])];
}

/** 翻转：t → 1 − t（重排）。 */
export function flipRamp(r: ColorRamp): void {
  for (const s of r.stops) s.t = 1 - s.t;
  sortStops(r.stops);
}

/** 运行时校验（读持久化 / MCP 参数）：合法 → 归一化副本；否则 null。 */
export function sanitizeRamp(raw: unknown): ColorRamp | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { stops?: unknown; interp?: unknown; space?: unknown };
  if (!Array.isArray(r.stops) || r.stops.length === 0) return null;
  const stops: RampStop[] = [];
  for (const s of r.stops as Array<Record<string, unknown>>) {
    if (!s || typeof s !== "object" || typeof s.t !== "number" || !Number.isFinite(s.t)) return null;
    const c = s.rgba;
    if (!Array.isArray(c) || c.length < 4 || !c.slice(0, 4).every((x) => typeof x === "number" && Number.isFinite(x))) return null;
    stops.push({ t: clamp01(s.t), rgba: [clamp8(c[0] as number), clamp8(c[1] as number), clamp8(c[2] as number), clamp8(c[3] as number)] });
  }
  const interp: RampInterp = (RAMP_INTERPS as readonly unknown[]).includes(r.interp) ? r.interp as RampInterp : "linear";
  const space: RampSpace = (RAMP_SPACES as readonly unknown[]).includes(r.space) ? r.space as RampSpace : "srgb";
  return makeRamp(stops, interp, space);
}

/** #rrggbb / #rrggbbaa → Rgba8（解析失败 → null）。 */
export function hexToRgba8(hex: string): Rgba8 | null {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, m[2] ? parseInt(m[2], 16) : 255];
}
export function rgba8ToCss(c: Rgba8): string {
  return c[3] >= 255 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${(c[3] / 255).toFixed(3)})`;
}
