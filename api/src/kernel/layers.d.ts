import type { Edge, EdgeId, FaceId } from "./topology.ts";
import type { FaceEvent } from "./face-lifecycle.ts";
import { type Pt3 } from "./geom.ts";
export interface Seg3 {
    readonly a: Pt3;
    readonly b: Pt3;
}
/** 知名边层（开放集：插件 / 用户前缀名也行，codec 原样编码）。 */
export declare const EDGE_LAYERS: readonly ["soft", "curve", "smooth", "hidden"];
/** 知名面层。 */
export declare const FACE_LAYERS: readonly ["material"];
/** 推拉 / 跟随：原边带哪层 → 它扫出的侧棱带哪些层（帽边 = 原边的全部层）。 */
export declare const EDGE_LAYER_POLICY: Readonly<Record<string, readonly string[]>>;
/**
 * 环上一个顶点的侧棱（riser：顶点沿扫掠方向拉出的那条棱）该带的层：**两侧的环边都带策略层才软**
 * （圆弧内部顶点的侧棱软 + 平滑；圆弧端点 / 直边角点的侧棱硬）。推拉与跟随共用这一条（2026-10-21）。
 */
export declare function riserLayers(prev: readonly string[], next: readonly string[]): string[];
export declare class EdgeLayers {
    private sets;
    names(): string[];
    /** 取（无则建）。 */
    layer(name: string): Set<EdgeId>;
    has(name: string, id: EdgeId): boolean;
    add(name: string, id: EdgeId): void;
    delete(name: string, id: EdgeId): void;
    /** 边 id 带的全部层名。 */
    of(id: EdgeId): string[];
    /** ① 切割按父传子。 */
    onSplit(parent: EdgeId, children: readonly EdgeId[]): void;
    /** ② 删边出集（也用于合并后清旧边）。 */
    onRemove(id: EdgeId): void;
    /** ④ 溶解：ea、eb 都有的层，并出的 ne 也有。 */
    onMerge(ne: EdgeId, ea: EdgeId, eb: EdgeId): void;
    /** 复制一条边的层到另一条（absorbVertex 搬边用）。 */
    copy(from: EdgeId, to: EdgeId): void;
    /** ③ 新段上落下的边入集。 */
    mark(name: string, edges: readonly Edge[], pt: (id: number) => Pt3, segs: readonly Seg3[]): void;
    /** 清掉不在图里的 id。 */
    prune(hasEdge: (id: EdgeId) => boolean): void;
    clone(): EdgeLayers;
    /** 快照：名字 → 有标记的边下标（按给定边序）。 */
    toIndex(edgeIds: readonly EdgeId[]): Record<string, number[]> | undefined;
    /** 装载：下标表 → 集（下标越界 = 文件坏）。 */
    static fromIndex(rec: Readonly<Record<string, readonly number[]>> | undefined, edgeIds: readonly EdgeId[], fail: (msg: string) => never): EdgeLayers;
}
export declare class FaceLayers {
    private maps;
    names(): string[];
    layer(name: string): Map<FaceId, number>;
    get(name: string, id: FaceId): number | undefined;
    set(name: string, id: FaceId, v: number): void;
    delete(name: string, id: FaceId): void;
    /** 一张面的全部层值。 */
    of(id: FaceId): Record<string, number>;
    setAll(id: FaceId, vals: Readonly<Record<string, number>> | undefined): void;
    /** 按事件血缘：DIVIDE 子膜继承、MERGE / ABSORB 取首个有值的、死膜清。 */
    applyEvents(events: readonly FaceEvent[]): void;
    prune(hasFace: (id: FaceId) => boolean): void;
    clone(): FaceLayers;
    /** 快照：名字 → 每面一个值（−1 = 无），按给定面序。 */
    toIndex(faceIds: readonly FaceId[]): Record<string, number[]> | undefined;
    static fromIndex(rec: Readonly<Record<string, readonly number[]>> | undefined, faceIds: readonly FaceId[]): FaceLayers;
}
