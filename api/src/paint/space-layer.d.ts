import type { SpaceAccum, SpaceData, SpaceGpu, SpaceImage, SpaceProgram } from "./space-gpu.ts";
import type { TargetGeo } from "./space-target.ts";
import { type InkTip } from "./tip-truth.ts";
import type { Reach } from "./tip-reach.ts";
import { type TexelTable } from "./texel-table.ts";
import type { Pt3 } from "../kernel/geom.ts";
/** 数据图一行几个数（一维的表按这个宽度折成二维）。 */
export declare const DATA_W = 2048;
/**
 * 一颗笔尖下、同一块画布多边形挂的面最多几张；一张面最多几个三角形（着色器里那两圈循环的上界，循环带 break：面小的时候不花钱）。超了 = 抛 PaintLimitError。
 * MAX_TRIS = 1024（统筹 11-11：64 会把默认的 72 段圆面挡在外面；1024 挡住的只剩极端的大面。以后真有人撞上：把一张大面分几批画、每批只让取样点落在自己那批三角形里的格子写——现在不做）。
 */
export declare const MAX_FACES = 8, MAX_TRIS = 1024;
/** 画布多边形最多几块：着色器里拿来比的编号走 32 位浮点的实例表，2^24 以内才精确（每格的表本身能放到 2^32 − 2）。 */
export declare const MAX_POLYS: number;
/** 一张数据图最多几个数：32 位浮点里存的编号（三角形号、面单子里的位置）2^24 以内才精确。 */
export declare const MAX_DATA: number;
/**
 * 画布每边最多几格：取样点 = 格子中心 + 整数 / 1024，在 32 位浮点里精确要 |坐标| < 2^14（14 位整数 + 10 位小数 = 24 位有效数字）；
 * 取样点最多伸出格子 32767 / 1024 格（每格的表的偏移范围），所以 边长 − 1 + 0.5 + 32 < 2^14 → 边长 ≤ 2^14 − 32。有的电脑显卡每边能到 32768，所以单独卡。
 */
export declare const MAX_CANVAS_SIDE: number;
/** 一个三角形的公式（世界里、减去落笔点）+ 反解用的 G⁻¹（G = [du·du du·dv; du·dv dv·dv]）+ smin = √(G 的小特征值) = 贴图上走一格在世界里最少走多远。 */
interface TriInv {
    readonly ox: number;
    readonly oy: number;
    readonly oz: number;
    readonly du: Pt3;
    readonly dv: Pt3;
    readonly i00: number;
    readonly i01: number;
    readonly i11: number;
    readonly smin: number;
}
/**
 * 一颗笔尖（球心 c、半径 r，世界里减去落笔点）在这些三角形上可能碰到的贴图坐标外接框 [x0, y0, x1, y1]；有退化的三角形 = null（只能用整块）。
 * 依据：位置 = o + du·s.x + dv·s.y（仿射，出了三角形照样延伸），|位置 − c| ≥ |J(s − s_c)| ≥ smin·|s − s_c|，s_c = c 投到这个平面上的贴图坐标。
 */
export declare function tipUvBox(tris: readonly TriInv[], cx: number, cy: number, cz: number, r: number): [number, number, number, number] | null;
/** 薄层那个程序（一对）。JavaScript 版 = 1-4a 的标准答案。 */
export declare const SPACE_TIP: SpaceProgram;
export interface SpaceLayerOpts {
    readonly hardness: number;
    /** 这一笔的颜色（0..1；淡彩和叠色都写预乘的 (c·v, v)）。 */
    readonly color: readonly [number, number, number];
    readonly accum: SpaceAccum;
    /** 现成的每格的表（space-prep.ts 缓存的，借来用、dispose 不放）。不给 = 自己建、自己放（测试）。 */
    readonly cells?: SpaceData;
    /** 现成的面表 / 三角形表（space-prep.ts 缓存的，借来用、dispose 不放；1-4d 第 3 条：落笔那一下不再现做）。不给 = 自己建、自己放（测试）。 */
    readonly tables?: FaceTables;
    /** 只在自己建表时用（测试比较用）：表里的位置、笔尖先减去的那一点。不给 = 物件原点 objectOrigin。 */
    readonly origin?: Pt3;
}
/**
 * 面表 + 三角形表（1-4d 第 3 条，统筹定的：落笔那一下的花费不许跟着模型大小走）：只跟物件、摆放、那一套贴图坐标有关，跟这一笔无关——
 * 进画画工作台时随「画画的准备」一起建（space-prep.ts），落笔只借。所有位置先减去物件原点 origin 再上传（笔尖也减它）：以前减的是落笔那一点，
 * 那样表就得每一笔重做。三角形的公式钉在它自己的第一个角上（1-4c），所以这里减掉的只是一个整体平移。
 */
export interface FaceTables {
    /** 物件原点（世界）：表里的位置、笔尖都先减去它。 */
    readonly origin: Pt3;
    /** 面表（每张面两个数：三角形表里从第几个起、几个）、三角形表（每个 TRI_STRIDE 个数）——显卡上的数据图。 */
    readonly faces: SpaceData;
    readonly tris: SpaceData;
    /** 面号 → 面表里的槽号。 */
    readonly faceSlot: ReadonlyMap<number, number>;
    /** 面号 → 它的三角形的反解数据（tipRect 用；位置相对 origin）。 */
    readonly faceInv: ReadonlyMap<number, readonly TriInv[]>;
    /** 画布多边形 → 格子范围 [x, y, w, h]（和 tipCellsInPoly 扫的同一块）。 */
    readonly polyRect: ReadonlyMap<number, readonly [number, number, number, number]>;
}
/** 物件原点：这项目标所有三角形世界位置的外接框中心（离画的地方都不远：减掉它之后上传的 32 位数都在物件大小以内）。没有三角形 = 0。 */
export declare function objectOrigin(g: TargetGeo): Pt3;
/** 建面表 + 三角形表（随这项目标的三角形数涨：只在准备里调）。放得下的上限和 SpaceLayer 一样（超了 = 抛 PaintLimitError）。 */
export declare function buildFaceTables(gpu: SpaceGpu, g: TargetGeo, origin?: Pt3): FaceTables;
/** 放掉面表 / 三角形表（准备放的时候）。 */
export declare function releaseFaceTables(gpu: SpaceGpu, ft: FaceTables): void;
/**
 * 每格的表（1-4c）：每格 4 个 16 位无符号整数 = 8 字节，显卡上是 RGBA16UI。
 *   [0] [1] = 画布多边形编号 + 1 的低、高 16 位（0 = 没人要）；[2] [3] = 取样点离格子中心的偏移 x、y（texel-table.ts sampleOffset，1/1024 格为单位）+ 32768（32768 = 中心）。
 * 容量：编号 + 1 ≤ 2^32 − 1（再受 MAX_POLYS 限）；偏移 −32768 … 32767 份 ≈ ±32 格（取样点离中心不超过间隔的一半，buildTexelTable 把 gap 限在 63 以内）。
 * 大小：1024² = 8 MB，2048² = 32 MB。只跟贴图坐标有关（归属表 + 多边形）。
 */
export declare function cellTable(t: TexelTable): Uint16Array;
/** 往每格的表里写一格（容量在这里查：编号 + 1 在 1 … 2^32 − 1、偏移在 −32768 … 32767；超了 = 抛）。 */
export declare function packCell(out: Uint16Array, c: number, idPlus1: number, ox: number, oy: number): void;
/**
 * 一项目标上跟这一笔无关、只跟物件和画布有关的那几个上限（画画的准备进工作台时就查，落笔之前就知道画不了；SpaceLayer 建的时候再查一遍）：
 * 画布每边 ≤ 显卡上限、多边形块数 ≤ MAX_POLYS、每张面三角形 ≤ MAX_TRIS、面表 / 三角形表放得进数据图。超了 = 抛 PaintLimitError（带人话、点出是哪张面）。
 */
export declare function checkLayerLimits(gpu: SpaceGpu, t: TexelTable): void;
/** 每格的表传到显卡上（画布每边超过显卡上限 = 抛 PaintLimitError）。 */
export declare function uploadCellTable(gpu: SpaceGpu, t: TexelTable): SpaceData;
/** 一笔在一张贴图（名单里的一项）上的薄层：定型层 + 当帧那张。 */
export declare class SpaceLayer {
    readonly frozen: SpaceImage;
    readonly frame: SpaceImage;
    private readonly gpu;
    private readonly g;
    private readonly ti;
    private readonly o;
    private readonly job;
    private readonly jobId;
    private readonly fixed;
    /** 每格的表 / 面表是不是自己建的（自己建的 dispose 时放；借来的不放）。 */
    private readonly ownCells;
    private readonly ownTables;
    /** 面表 + 三角形表 + 反解数据 + 多边形的格子范围（借来的或自己建的）。 */
    private readonly ft;
    private bounds;
    /**
     * 当帧那张上次 takeChanged 之后变过的格子（[x0, y0, x1, y1)，1-4d 第 6 条：显示那一侧只拷这一块）。每帧变的 ⊆ 上一帧的尾巴 ∪ 这一帧新定型的 ∪ 这一帧的尾巴
     * （定型层只往里画、当帧那张 = 定型层拷过来 + 尾巴；这一笔碰过的范围以外从没写过 = 透明）。定型层清掉重画（抬笔）= 整笔的范围。
     */
    private changed;
    /** 上一帧尾巴画过的格子（这一帧要还原成定型层的样子）。 */
    private prevTail;
    /** 这一笔到现在一帧里最大的那张数据表有多少个数、是哪张（量「一帧的数据表放不下」离上限多远；1-7 合之前统筹要的数）。 */
    readonly peak: {
        values: number;
        table: string;
        cap: number;
    };
    constructor(gpu: SpaceGpu, g: TargetGeo, ti: number, o: SpaceLayerOpts);
    /** 报给内核的范围（这一笔到现在碰过的所有实例方块的并）；什么都没碰 = null。 */
    range(): {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
    /**
     * 这一帧：fresh = 还没画进定型层的笔尖（按先后；前面已经定型画过的不再给），其中前 frozenHere 颗这一帧定型。
     * 新定型的画进定型层（只画一次）；定型层拷到当帧那张，再画尾巴。上传的实例 / 笔尖 / 面单子只有这一帧要画的（每帧的活只随新增的笔尖涨）。
     */
    update(fresh: readonly {
        readonly tip: InkTip;
        readonly reach: Reach;
    }[], frozenHere: number): void;
    /** 定型层清掉（抬笔时收笔渐细重画整笔用）：下一次 update 从头画。范围留着（只会更大）。 */
    /** 上次问过之后当帧那张变过的格子（{x, y, w, h}；没变 = null），问完清零。 */
    takeChanged(): {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
    resetFrozen(): void;
    dispose(): void;
    /** 这颗笔尖在这块多边形上的实例方块（格子）：贴图上的外接框往外放块边那一圈（取样点离格子中心最多 gap/2）再多一格，夹进多边形的格子范围；夹完是空的 = null（画不到）。 */
    private tipRect;
    private grow;
    /** 这一帧的实例表、笔尖表、面单子（每帧整份重传；条数 = 实例数，小）。 */
    private perDraw;
    private draw;
}
export {};
