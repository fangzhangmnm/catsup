import type { Pt3 } from "../kernel/geom.ts";
/** 铺法要的那一点内核（MeshKernel 满足；测试可以给假的）。 */
export interface LayoutMesh {
    facePts(f: number): Pt3[];
    faceNormal(f: number): Pt3;
    cornerValues(f: number, guid: string): Float32Array | null;
    /** 可选（MeshKernel 有）：这一列上有值的每张面的包围盒 [横小, 纵小, 横大, 纵大, …]。有它 = 补面时「哪里被占着」一趟扫完（不按 placed 逐张拷值）。 */
    columnBoxes?(guid: string): ArrayLike<number>;
}
export interface LayoutOptions {
    /** 每米多少格。不给 = 画布定成 base 见方，二分找出能放下的最大密度（精确到每米一格）。 */
    readonly density?: number;
    /** 块和块之间、块和画布边之间留几格（整数，默认 4）。 */
    readonly gap?: number;
    /** 画布的宽 / 高上限（默认 4096）；超过 = 不铺，说原因。 */
    readonly maxSize?: number;
    /** 画布的基准宽（默认 1024）。 */
    readonly base?: number;
}
export interface Block {
    readonly face: number;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}
export type LayoutResult = {
    readonly ok: true;
    readonly width: number;
    readonly height: number;
    readonly density: number;
    readonly blocks: readonly Block[];
    readonly values: ReadonlyMap<number, Float64Array>; /** layoutAppend 的 partial：加到上限还放不下、没铺的面（升序）。 */
    readonly unplaced?: readonly number[];
} | {
    readonly ok: false;
    readonly reason: string;
    readonly face?: number;
    readonly need?: number;
};
/** 给一批面铺贴图坐标（一张面一块）。不改内核：values = 每张面每个角的 [横, 纵, 横, 纵…]（格）。 */
export declare function layoutFaces(m: LayoutMesh, faces: readonly number[], opts?: LayoutOptions): LayoutResult;
/**
 * 给新面补一块（以后加面用）：已经铺好的面（在 guid 这一列上有值的）一个数都不变；新面各铺一块，放在画布上空着的地方（左上优先），放不下就把画布往下加高
 * （256 的倍数）。坐标的单位是格、不是零到一的比例，所以加高不会动到已有的东西。
 * 怎么找空（1-3b 改，Claude Opus 5.5，2026-11-10：原来每补一张面都把「每块的右边 / 下边」当候选全排一遍、逐块比，四万面的网格体补十张面要 0.2 秒、随面数涨）：
 *   画布按 C × C 格划成粗格子（C = 宽 / 256 向上取整，至少 1）；已有的块各向外扩 gap 格，碰到的粗格子都算占了（保守）。新块只放在粗格子的角上，
 *   从上到下、从左到右找第一个放得下的地方。每行记着「从这格往右连着几格空」，找的时候只看这个数。代价随画布大小涨、不随面数涨（只有收集已有块那一步随面数涨）。
 * partial（meshLayoutPaint 用）：加到上限还放不下的面不铺、记进 unplaced，其余照铺；不给 = 放不下就整个不铺、说原因（1-3a 的行为）。
 */
export declare function layoutAppend(m: LayoutMesh, guid: string, placed: readonly number[], add: readonly number[], canvas: {
    width: number;
    height: number;
}, density: number, opts?: Omit<LayoutOptions, "density" | "base"> & {
    readonly partial?: boolean;
}): LayoutResult;
