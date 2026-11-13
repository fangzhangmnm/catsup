import type { Guid } from "../format/guid.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import type { DefId, Scene } from "../scene/scene.ts";
/** [x0, y0, x1, y1)，单位格。 */
export type Rect = readonly [number, number, number, number];
/** 一份网格体：内核 + 速查表（代号 → 排法 GUID）。 */
export interface MeshSide {
    readonly k: MeshKernel;
    readonly slots: readonly Guid[];
}
/** 会多占地方的并从多少个框以上才做（统筹 11-13 深夜：256）。 */
export declare const FREED_MAX = 256;
/** 框比这个多 = 先按粗格子归拢，再挑最省的并（挑最省的并每一下要看所有的框：框数要先压下来）。 */
export declare const COARSE_AT: number;
/**
 * 这一步要拿哪些面来比：现在的改动日志给的这一步动过的面；日志说不知道 / 贴图坐标那两列这一步加了或删了（removeColumn 不逐张面进日志）/ 定义没了 = null = 之前那份的全部面。
 */
export declare function candidatesFor(before: MeshSide, now: MeshSide | null, seq: number | null): Iterable<number> | null;
/**
 * 一份网格体这一步的前后：每一套排法上，可能空出来的旧位置（还没按「盖住」筛）和这一步动过的面现在占着的格。
 * candidates = null = 之前那份的全部面加上现在的全部面。
 */
export declare function lostPlaces(before: MeshSide, now: MeshSide | null, candidates: Iterable<number> | null): Map<Guid, {
    lost: Rect[];
    held: Rect[];
}>;
/** 一份网格体所有有位置的面现在占着的格（按排法分）：这一步新出现的定义整个算「现在占着的」（统筹预审第 3 条：面带着位置搬进新定义，旧定义那边的框要剪得掉）。 */
export declare function heldAll(m: MeshSide): Map<Guid, Rect[]>;
/** 一堆框的格子索引（只取和目标相交的那几个；精确判「盖住」用）。 */
export declare class RectIndex {
    private readonly cell;
    private readonly bins;
    readonly rects: readonly Rect[];
    constructor(rects: readonly Rect[]);
    private keys;
    /** 和 r 相交的框（不重复）。 */
    hits(r: Rect): Rect[];
    /** r 整个被这些框合起来盖住吗（精确：按 x 切条，每条看 y 方向的并）。 */
    covers(r: Rect): boolean;
}
/**
 * 一行的清单加上这一步记的框：先剪（整个被 held 盖住的拿掉）；新框已经被清单合起来盖住就不加（多跑一次结果一样）；
 * 框少：被包住的不加、包住别的就换掉，再不丢地方地并；框多（> COARSE_AT）：先按粗格子归拢；最后超过 FREED_MAX 个才挑最省的并。
 * 返回新的清单（按 y、x 排，四个一组）；和原来一样 = null（不用改那一行）。
 */
export declare function mergeFreed(old: readonly number[] | undefined, add: readonly Rect[], held: readonly Rect[]): number[] | null;
/**
 * 补面时这套排法上当占着的格（读法一：freed 加上占着的）：空出来的地方 + 别的定义在这一套上有位置的面（这个定义自己的面 layoutAppend 自己看）。
 * 四个一组，给 layoutAppend 的 blocked。真补面（editor/paint-ops.ts）和「加进已有的画」的试铺（app/canvas-size-picker.ts）都用这一个。
 */
export declare function placementBlocked(s: Scene, def: DefId, g: Guid): number[];
/**
 * 读法二：真正空着的地方 = freed 减去现在有面占着的格（所有定义在这一套上的面）。小窗标空地、提示里说「空出来的地方」、以后的重排和清空都用这一个。
 * 返回的是切开的长方形（切法不唯一：要数「几块」用 openPieces）。
 */
export declare function freedOpenAreas(s: Scene, g: Guid): Rect[];
/** 一堆长方形连成几块（边挨着或者叠着算连着；只碰到角不算）。和怎么切的无关。 */
export declare function openPieces(rs: readonly Rect[]): number;
