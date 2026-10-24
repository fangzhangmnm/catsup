import { type Pt, type Pt3 } from "./geom.ts";
import { type EdgeId, type FaceId, PlanarGraph } from "./topology.ts";
import { type Ring } from "./facefind.ts";
import { PlaneRegistry } from "./planes.ts";
import { type FaceEvent, FaceStore } from "./face-lifecycle.ts";
import type { EdgeLayers, FaceLayers } from "./layers.ts";
export type Algebra = "or" | "xor";
export interface Seg3 {
    readonly a: Pt3;
    readonly b: Pt3;
}
/** 一张像：动词说「这张膜做完以后在这里、长这样」。 */
export interface Image {
    /** [外环, ...洞环]，世界坐标；允许重复点与零面积尖刺（绕数天然为零）；非平面 → 机器 autofold。 */
    rings: Pt3[][];
    algebra: Algebra;
    /** 继承的身份；缺省 = 新膜（独占胞腔 → BIRTH）。 */
    inherit?: FaceId;
    /** 新膜的面层值（absorb 用：炸开 / 粘贴带着材质回来）。 */
    face?: Readonly<Record<string, number>>;
}
export interface ImageTable {
    /** 被动词替换的膜：出库；身份只经 images[].inherit 延续；旧环边 = 随葬候选。 */
    consumed: ReadonlySet<FaceId>;
    images: readonly Image[];
    /** 带手势身份的线段（画笔）：无主胞腔外环含手势边 → BIRTH。 */
    gesture?: readonly Seg3[];
    /** 普通线段：只插入（随行的裸线、折缝）。 */
    wires?: readonly Seg3[];
    /**
     * 随葬通则（pp 开、move / draw 不开）：结算后无膜引用的边只许是**用户画的线**——本次的手势线 / 裸线段、或操作前就是裸线的边
     * （含它们被切开的后代）；其余孤儿边（XOR 湮灭留下的、零面积像的残边、被消耗膜的旧环边）一律删。
     * 另有第一相（永远开）：被消耗膜的旧环边若不在任何像的环段上、也没有未动膜引用 → 结算**前**就摘（否则旧边会把新膜切成两格）。
     * move 不开通则：膜移扁留一条线（SU 同款，靶4）。
     */
    buryOrphans?: boolean;
    /** 边属性层登记处（内核的；机器只调它的四条规则：切割继承 / 删边清理 / 段上落边入集 / 溶解并层）。 */
    edgeLayers?: EdgeLayers;
    /** 名字 → 线段：这些段上落下的边进该层（圆的近似边 → curve；推拉侧棱 → soft+smooth）。 */
    layerSegs?: Readonly<Record<string, readonly Seg3[]>>;
    /** 面属性层登记处：新像带 face 值时，它独占的胞腔铸出的膜记上。 */
    faceLayers?: FaceLayers;
    /** 本次动过坐标的边（moveVertices：被移 / 被合并顶点的邻边）——局部性：自愈与认领只围绕脏边 + 像 + 被消耗膜的平面（2026-10-21 #14）。 */
    dirtyEdges?: Iterable<EdgeId>;
}
/** 面环 → 世界坐标环（沿环取每条有向边的起点）。 */
export declare function ringsOf(g: PlanarGraph, f: {
    outer: Ring;
    holes: Ring[];
}): Pt3[][];
/** 绕数（|w|≥1 = 覆盖；零面积尖刺贡献 0）。 */
export declare function windingOf(p: Pt, poly: readonly Pt[]): number;
/**
 * 结算机本体。g / store / reg 原地修改；返回事件叙事。
 * opts.global = 全平面全膜结算（差分 oracle：局部结算的结果必须与它逐字相同——立宪页 §3「局部性定理」，test/settle-differential.test.ts）。
 */
export declare function settle(g: PlanarGraph, store: FaceStore, reg: PlaneRegistry, tol: number, table: ImageTable, opts?: {
    global?: boolean;
}): FaceEvent[];
/** 一张像沿 δ 平移（pp 的帽）。 */
export declare const translateImage: (rings: readonly (readonly Pt3[])[], delta: Pt3) => Pt3[][];
