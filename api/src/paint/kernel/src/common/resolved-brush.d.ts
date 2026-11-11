import { type AnimCurve } from "./anim-curve.ts";
export interface BrushPreset {
    shape?: {
        kind?: string;
        aspect?: number;
        rotation?: number;
        hardness?: number;
    };
    taper?: {
        in?: number;
        out?: number;
    };
    taperFloor?: number;
    sizeCoeff?: number;
    opaCoeff?: number;
    flowCoeff?: number;
    pressureGamma?: number;
    pressureCurve?: unknown;
    pressureLPF?: number;
    compositeMode?: string;
    blendMode?: string;
    spacing?: number | {
        value?: number;
    };
    pixelMode?: boolean;
    smooth?: {
        streamline?: number;
        stabilization?: number;
    };
}
export interface ResolvedBrush {
    size: number;
    opacity: number;
    flow: number;
    color: string;
    shapeKind: string;
    shapeAspect: number;
    shapeRotation: number;
    hardness: number;
    taperIn: number;
    taperOut: number;
    taperFloor: number;
    sizeCoeff: number;
    opaCoeff: number;
    flowCoeff: number;
    pressureGamma: number;
    pressureCurve: AnimCurve | null;
    pressureLPF: number;
    compositeMode: string;
    blendMode: string;
    spacing: number;
    pixelMode: boolean;
    streamline: number;
    stabilization: number;
    [k: string]: unknown;
}
export interface ResolveBrushArgs {
    preset?: BrushPreset | null;
    size?: number;
    opacity?: number;
    color?: string;
}
export declare function resolveBrush({ preset, size, opacity, color, }?: ResolveBrushArgs): ResolvedBrush;
