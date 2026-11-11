export interface SoftTexRead {
    readonly w: number;
    readonly h: number;
    fetch(x: number, y: number, out: Float32Array): void;
}
export interface SoftArenaRead {
    readonly tileSize: number;
    fetch(layer: number, x: number, y: number, out: Float32Array): void;
}
export interface CpuDrawCtx {
    vw: number;
    vh: number;
    uniforms: Record<string, number | boolean | number[] | Float32Array>;
    tex: (name: string) => SoftTexRead | null;
    arena: (name: string) => SoftArenaRead | null;
    forEachPixel(frag: (px: number, py: number, out: Float32Array) => boolean): void;
    instances: Float32Array | null;
    count: number;
    writePixel(px: number, py: number, rgba: Float32Array): void;
}
export type CpuDraw = (ctx: CpuDrawCtx) => void;
export declare function resolveCpuProgram(name: string): CpuDraw | "gpu-only" | null;
