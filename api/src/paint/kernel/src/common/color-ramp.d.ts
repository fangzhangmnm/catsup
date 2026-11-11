export type RampInterp = "linear" | "constant" | "ease";
export type RampSpace = "srgb" | "oklab";
export type Rgba8 = [number, number, number, number];
export interface RampStop {
    t: number;
    rgba: Rgba8;
}
export interface ColorRamp {
    stops: RampStop[];
    interp: RampInterp;
    space: RampSpace;
}
export declare const RAMP_INTERPS: readonly RampInterp[];
export declare const RAMP_SPACES: readonly RampSpace[];
export declare function makeRamp(stops: RampStop[], interp?: RampInterp, space?: RampSpace): ColorRamp;
/** 黑→白 = 渐变映射的恒等默认（luma 查表回自己）。 */
export declare function grayRamp(): ColorRamp;
export declare function cloneRamp(r: ColorRamp): ColorRamp;
export declare function evaluateRamp(r: ColorRamp, t: number): Rgba8;
/** 256×RGBA LUT：t = i/255。 */
export declare function bakeRampLut(r: ColorRamp): Uint8ClampedArray;
/** 插色标；缺省色 = evaluateRamp(t)（落在原色带上）。同 t 覆盖色。返回 index。 */
export declare function insertStop(r: ColorRamp, t: number, rgba?: Rgba8): number;
/** 删色标；至少留 1 个。 */
export declare function removeStop(r: ColorRamp, i: number): boolean;
/** 移色标 t（可越过邻居重排，Blender）；返回新 index。 */
export declare function moveStop(r: ColorRamp, i: number, t: number): number;
export declare function setStopColor(r: ColorRamp, i: number, rgba: Rgba8): void;
/** 翻转：t → 1 − t（重排）。 */
export declare function flipRamp(r: ColorRamp): void;
/** 运行时校验（读持久化 / MCP 参数）：合法 → 归一化副本；否则 null。 */
export declare function sanitizeRamp(raw: unknown): ColorRamp | null;
/** #rrggbb / #rrggbbaa → Rgba8（解析失败 → null）。 */
export declare function hexToRgba8(hex: string): Rgba8 | null;
export declare function rgba8ToCss(c: Rgba8): string;
