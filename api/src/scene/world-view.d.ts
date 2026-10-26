import type { Kernel } from "../kernel/kernel.ts";
import type { Edge, EdgeId, FaceId, Pt3, Vertex, VertexId } from "../kernel/kernel.ts";
import type { Face } from "../kernel/face-lifecycle.ts";
import type { PlaneRec } from "../kernel/planes.ts";
import { type EditContext, type InstId, type Material, type PoolRef, Scene } from "./scene.ts";
import { type Frame, type Xform } from "./xform.ts";
import { type GuidesWorld } from "./guides.ts";
/** 绝对网格（0.11 ⑤）：帧 = 上下文的帧（绘图轴），step = 显示格距（米），sub = 吸附细分（吸附步 = step / sub）。 */
export interface GridSpec {
    frame: Frame;
    step: number;
    sub: number;
}
/** 求解器 / 拾取 / 渲染认识的几何读接口（Kernel 结构上满足）。 */
export interface GeomView {
    vertices(): Vertex[];
    edges(): Edge[];
    faces(): Face[];
    face(id: FaceId): Face | undefined;
    planeOf(id: FaceId): PlaneRec | undefined;
    faceRings3(id: FaceId): {
        outer: Pt3[];
        holes: Pt3[][];
    } | undefined;
    /** 软边：渲染不画线。 */
    isSoft(id: EdgeId): boolean;
    /** 平滑边：两侧膜的法向跨边插值（平滑组）。 */
    isSmooth(id: EdgeId): boolean;
    /** 面的材质（null = 默认灰）。 */
    faceMaterial(id: FaceId): Material | null;
    /** 共面容差 τ（米）：编辑器判「点在哪张面的平面上」与内核同一把尺子（2026-10-24 起不再各写 1e-3）。 */
    readonly coplanarTol: number;
    /** 上下文的帧（世界坐标；0.11 尺规纪元）：推断的原点与三轴。不给 = 世界帧。 */
    frame?(): Frame;
    /** 活动池的参考几何（世界坐标；0.11）。不给 = 没有。 */
    guides?(): GuidesWorld;
    /** 绝对网格（0.11 ⑤）：开着才有；格点是最低秩的 0-D 目标，整数长度沿锚点方向取整。 */
    grid?(): GridSpec | null;
    /** 候选所在池离活动上下文的层级距离（#30，user 2026-10-24「4听你的」）：0 = 自己；1 = 父母 / 孩子 / 父母的孩子；2 = 其他。不给 = 全 0。 */
    tierOf?(id: number): 0 | 1 | 2;
    /** 圆 / 弧曲线实体的圆心（世界坐标；DT15 吸附「圆心」）。不给 = 没有。 */
    centers?(): readonly Pt3[];
    graph: {
        pt(id: VertexId): Pt3;
        edge(id: EdgeId): Edge;
        vertex(id: VertexId): Vertex;
        hasEdge(id: EdgeId): boolean;
        hasVertex(id: VertexId): boolean;
    };
}
export declare const ID_STRIDE: number;
export interface PoolSlot {
    index: number;
    pool: PoolRef;
    chain: readonly InstId[];
    xform: Xform;
    kernel: Kernel;
    active: boolean;
    inContext: boolean; /** 层级距离（#30）：0 自己 / 1 近亲 / 2 其他。 */
    tier: 0 | 1 | 2; /** 正被整体变换预演的池（在手里：不吸、不遮）。 */
    overridden: boolean;
}
/** 一个槽变换到世界坐标后的几何（只读缓存单元）。 */
export interface SlotPart {
    rev: number;
    xform: Xform;
    verts: Map<VertexId, Vertex>;
    edges: Map<EdgeId, Edge>;
    faces: Map<FaceId, Face>;
    planes: Map<FaceId, PlaneRec>;
    soft: Set<EdgeId>;
    smooth: Set<EdgeId>;
    /** 圆 / 弧的圆心（世界坐标，DT15）。 */
    centers: Pt3[];
}
/** 本进程累计的 part 重算统计（编辑器把它抄进 perf；scene 层不 import editor）。 */
export declare const PART_STATS: {
    ms: number;
    n: number;
};
export declare class WorldView implements GeomView {
    readonly slots: PoolSlot[];
    /** 每槽一份世界坐标几何（缓存单元；屏幕索引也按它缓存）。在手里的槽 = 空 part（见 OVERRIDDEN_PARTS_EMPTY）。 */
    readonly parts: SlotPart[];
    private byKey;
    readonly graph: GeomView["graph"];
    /** 各池 τ 取最大（同一文档里本来一样；混了老文档的池就按最宽的）。 */
    readonly coplanarTol: number;
    /**
     * @param scene 场景
     * @param ctx 编辑上下文（活动池 = ctx 的池；链上的池 = inContext）
     * @param live 活动池的影子副本（手势预演）；null = 用 checkpoint
     * @param overrides 叠加变换（整体变换预演，渲染 / 吸附同见）：谓词匹配到的池在世界侧再乘一个变换
     */
    readonly scene: Scene;
    readonly ctx: EditContext;
    private readonly ctxFrame;
    private readonly ctxGuides;
    private readonly ctxGrid;
    frame(): Frame;
    guides(): GuidesWorld;
    grid(): GridSpec | null;
    constructor(scene: Scene, ctx: EditContext, live?: Kernel | null, overrides?: readonly {
        match(pool: PoolRef, chain: readonly InstId[]): boolean;
        xform: Xform;
    }[], extras?: {
        grid?: {
            step: number;
            sub: number;
            frame?: Frame;
        } | null;
    });
    private partOf;
    vertices(): Vertex[];
    edges(): Edge[];
    centers(): Pt3[];
    isSoft(id: EdgeId): boolean;
    isSmooth(id: EdgeId): boolean;
    faceMaterial(id: FaceId): Material | null;
    faces(): Face[];
    face(id: FaceId): Face | undefined;
    planeOf(id: FaceId): PlaneRec | undefined;
    faceRings3(id: FaceId): {
        outer: Pt3[];
        holes: Pt3[][];
    } | undefined;
    /** 某个槽的几何（按池遍历：渲染 / 拾取先按槽筛）。 */
    slotFaces(index: number): Iterable<Face>;
    slotEdges(index: number): Iterable<Edge>;
    slotOf(gid: number): PoolSlot;
    tierOf(gid: number): 0 | 1 | 2;
    local(gid: number): {
        slot: PoolSlot;
        id: number;
    };
    /** 活动池的本地 id → 全局 id。 */
    global(localId: number): number;
    activeSlot(): PoolSlot;
    isActive(gid: number): boolean;
    slotByKey(key: string): PoolSlot | undefined;
    /** 面所在的池槽。 */
    faceSlotOf(gid: FaceId): PoolSlot | undefined;
}
export declare const slotKey: (s: {
    chain: readonly InstId[];
    pool: PoolRef;
}) => string;
