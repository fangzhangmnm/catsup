import type { AnimCurve } from "./anim-curve.ts";
export declare const DEFAULT_CONFIG: {
    size: number;
    color: string;
    opacity: number;
    flow: number;
    sizeCoeff: number;
    opaCoeff: number;
    flowCoeff: number;
    pressureGamma: number;
    pressureCurve: AnimCurve | null;
    pressureLPF: number;
    hardness: number;
    shapeKind: string;
    shapeAspect: number;
    shapeRotation: number;
    spacing: number;
    compositeMode: string;
    blendMode: string;
    pixelMode: boolean;
    streamline: number;
    stabilization: number;
    taperIn: number;
    taperOut: number;
    taperFloor: number;
};
export interface BrushDraft {
    name?: string;
    tool?: string;
    folder?: string;
    blendMode?: string;
    shape?: {
        kind?: string;
        aspect?: number;
        rotation?: number;
        hardness?: number;
    };
    size?: {
        base?: number;
        max?: number;
    };
    sizeCoeff?: number;
    opaCoeff?: number;
    flowCoeff?: number;
    pressureGamma?: number;
    pressureLPF?: number;
    compositeMode?: string;
    pressureCurve?: AnimCurve | null;
    defaultOpa?: number;
    pixelMode?: boolean;
    spacing?: number | {
        value?: number;
    };
    taper?: {
        in?: number;
        out?: number;
    };
    taperFloor?: number;
    smooth?: {
        streamline?: number;
        stabilization?: number;
    };
    [k: string]: unknown;
}
export type CurrentBrushConfig = BrushDraft;
export declare function ensureBrushConfigDefaults(b: BrushDraft): BrushDraft;
