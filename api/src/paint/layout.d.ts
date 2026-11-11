import type { Pt3 } from "../kernel/geom.ts";
/** 铺法要的那一点内核（MeshKernel 满足；测试可以给假的）。 */
export interface LayoutMesh {
    facePts(f: number): Pt3[];
    faceNormal(f: number): Pt3;
    cornerValues(f: number, guid: string): Float32Array | null;
    /** 可选（MeshKernel 有）：这一列上有值的每张面的包围盒 [横小, 纵小, 横大, 纵大, …]。有它 = 补面时「哪里被占着」一趟扫完（不按 placed 逐张拷值）。 */
    columnBoxes?(guid: string): ArrayLike<number>;
    /** 连成片要（MeshKernel 有）：环上的点编号（认公共的边）、显示用的那套三角形（角的下标；查压平后叠没叠）。 */
    faceVerts?(f: number): number[];
    faceTriangles?(f: number): readonly (readonly [number, number, number])[];
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
    /** 铺法：faces = 一张面一块（默认，1-3a）；patches = 按朝向连成片（施工单十五）。 */
    readonly style?: "faces" | "patches";
    /** 连成片的门槛（度；默认 PATCH_MAX_DEG；量门槛时用）。 */
    readonly maxDeg?: number;
}
/** 连成片的门槛：和种子的朝向夹角小于它才收进这一片（施工单十五第五节：先定 45°，量过可能调）。 */
export declare const PATCH_MAX_DEG = 45;
/** 铺的时候块之间、块和画布边留几格：画布基准边长 ÷ 256 四舍五入、最少 1、最多 8（user 11-11「所以 4 格能减：留的格数跟着画布走。 同意」）。1024 = 4（和以前一样）。 */
export declare function gapForCanvas(side: number): number;
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
/** 排的单位：一张面一块（frame = null：照 flatten），或者一片（种子的方向，整片一块）。 */
interface Unit {
    readonly seed: number;
    readonly faces: readonly number[];
    readonly frame: {
        e: Pt3;
        t: Pt3;
    } | null;
}
/**
 * 按朝向连成片（施工单十五第五节；同样的输入永远同样的结果、和面的列表先后无关）：面按面积从大到小（一样大看编号），还没归片的面里最大的当种子；
 * 从种子沿公共的边往外走（先进先出、邻面按编号），邻面在这批面里、还没归片、不是退化的、朝向和**种子**的朝向夹角小于 maxDeg、按种子的方向压平之后不和片里
 * 已有的面叠在一起（共边共点不算），就收进来。退化的面各自一片（照 flatten 占一格）。
 */
export declare function patchesOf(m: LayoutMesh, faces: readonly number[], maxDeg?: number): Unit[];
/** 给一批面铺贴图坐标（一张面一块）。不改内核：values = 每张面每个角的 [横, 纵, 横, 纵…]（格）。 */
export declare function layoutFaces(m: LayoutMesh, faces: readonly number[], opts?: LayoutOptions): LayoutResult;
/**
 * 给新面补一块（以后加面用）：已经铺好的面（在 guid 这一列上有值的）一个数都不变；新面各铺一块，放在画布上空着的地方（左上优先），放不下就把画布往下加高
 * （256 的倍数；画布比 256 窄时按画布宽度的倍数）。坐标的单位是格、不是零到一的比例，所以加高不会动到已有的东西。
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
export {};
