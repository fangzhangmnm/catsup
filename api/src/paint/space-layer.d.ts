import type { SpaceAccum, SpaceGpu, SpaceImage, SpaceProgram } from "./space-gpu.ts";
import type { TargetGeo } from "./space-target.ts";
import { type InkTip } from "./tip-truth.ts";
import type { Reach } from "./tip-reach.ts";
import type { Pt3 } from "../kernel/geom.ts";
/** 数据图一行几个数（一维的表按这个宽度折成二维）。 */
export declare const DATA_W = 2048;
/** 一块画布多边形下挂的面最多几张、一张面最多几个三角形（着色器里那两圈的上限；超了 = 抛，施工单「停下来报」那一条）。 */
export declare const MAX_FACES = 8, MAX_TRIS = 64;
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
    /** 落笔的那一点（世界）：所有位置先减去它再上传。 */
    readonly origin: Pt3;
}
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
    /** 每块画布多边形：格子范围 + 它的面在面表里的槽号。 */
    private readonly polyRect;
    private readonly faceSlot;
    /** 每张面（面号）的三角形反解数据（tipRect 用）。 */
    private readonly faceInv;
    private bounds;
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
