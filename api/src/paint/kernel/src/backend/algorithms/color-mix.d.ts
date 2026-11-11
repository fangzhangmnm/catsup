export type MixSpace = "srgb" | "oklab" | "spectral";
export declare const MIX_SPACES: readonly MixSpace[];
export declare function isMixSpace(v: unknown): v is MixSpace;
export declare function srgbToLinear(c: number): number;
export declare function linearToSrgb(c: number): number;
export declare function srgbToLinearFast(c: number): number;
export declare function linearToSrgbFast(c: number): number;
export declare function linearRgbToOklab(r: number, g: number, b: number, out: Float32Array | number[], oi?: number): void;
export declare function oklabToLinearRgb(L: number, a: number, b: number, out: Float32Array | number[], oi?: number): void;
/** 线性 RGB（0..1）→ 10 段反射谱（含 WGM_EPSILON 地板，保证可取对数）。 */
export declare function linearRgbToSpectral(r: number, g: number, b: number, out: Float32Array | number[], oi?: number): void;
/** 10 段反射谱 → 线性 RGB（夹 0..1）。 */
export declare function spectralToLinearRgb(spec: Float32Array | number[], si: number, out: Float32Array | number[], oi?: number): void;
/**
 * out[oi..oi+3] = mix(a[ai..], b[bi..], t)，全 premult RGBA 0..1。t = b 的权重（0 → a，1 → b）。
 * out 可以与 a 或 b 同一数组同一下标（就地混）。
 */
export declare function mixPremultInto(out: Float32Array, oi: number, a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number, t: number, space: MixSpace): void;
/**
 * 精确传递函数版（pow，不走 4096 段 LUT）：GPU 区域程序的 CPU 孪生用——soft-shaders.ts 逐行镜像 region-programs.ts 的
 * GLSL mixPremult（GLSL 直接 pow）。与 LUT 版差 < 1/255（test/color-mix-lut.test.mjs 锁）。2026-09-18 Claude Fable 5.1。
 */
export declare function mixPremultIntoExact(out: Float32Array, oi: number, a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number, t: number, space: MixSpace): void;
/** 便利：straight sRGB（0..1）两色按 t 混，返回 straight sRGB（测试/UI 预览用；alpha 视为 1）。 */
export declare function mixStraightRgb(a: readonly number[], b: readonly number[], t: number, space: MixSpace): [number, number, number];
