import type { Kernel } from "../kernel/kernel.ts";
import type { Edge, EdgeId, FaceId, Pt3, Vertex, VertexId } from "../kernel/kernel.ts";
import type { Face } from "../kernel/face-lifecycle.ts";
import type { PlaneRec } from "../kernel/planes.ts";
import { type EditContext, type InstId, type Material, type PoolRef, Scene } from "./scene.ts";
import { type Xform } from "./xform.ts";
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
    inContext: boolean; /** 正被整体变换预演的池（在手里：不吸、不遮）。 */
    overridden: boolean;
}
export declare class WorldView implements GeomView {
    private verts;
    private edgeMap;
    private faceMap;
    private planeMap;
    private faceSlot;
    private softSet;
    private smoothSet;
    readonly slots: PoolSlot[];
    private byKey;
    readonly graph: GeomView["graph"];
    /**
     * @param scene 场景
     * @param ctx 编辑上下文（活动池 = ctx 的池；链上的池 = inContext）
     * @param live 活动池的影子副本（手势预演）；null = 用 checkpoint
     * @param overrides 叠加变换（整体变换预演，渲染 / 吸附同见）：谓词匹配到的池在世界侧再乘一个变换
     */
    readonly scene: Scene;
    readonly ctx: EditContext;
    constructor(scene: Scene, ctx: EditContext, live?: Kernel | null, overrides?: readonly {
        match(pool: PoolRef, chain: readonly InstId[]): boolean;
        xform: Xform;
    }[]);
    private ingest;
    vertices(): Vertex[];
    edges(): Edge[];
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
    slotOf(gid: number): PoolSlot;
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
