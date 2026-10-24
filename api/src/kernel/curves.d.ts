import type { EdgeId, VertexId, PlanarGraph } from "./topology.ts";
import type { Pt3 } from "./geom.ts";
export type CurveId = number;
export type CurveKind = "circle" | "arc" | "polyline";
/** 圆 / 弧参数（世界 = 本池本地坐标）：segments = 整圆的段数（弧按它的比例取段）。 */
export interface CurveParams {
    center: Pt3;
    radius: number;
    normal: Pt3;
    xaxis: Pt3;
    segments: number;
}
export interface Curve {
    readonly id: CurveId;
    kind: CurveKind;
    closed: boolean;
    edges: EdgeId[];
    params?: CurveParams;
}
/** 登记一条曲线要说的话（Op 可序列化：纯数字）。 */
export interface CurveSpec {
    kind: CurveKind;
    closed: boolean;
    params?: CurveParams;
}
type G = Pick<PlanarGraph, "hasEdge" | "edge">;
export declare class CurveRegistry {
    private byId;
    private ofEdge;
    private nextId;
    curves(): Curve[];
    curve(id: CurveId): Curve | undefined;
    curveOf(e: EdgeId): CurveId | undefined;
    count(): number;
    /**
     * 登记：edges 须是有序链（调用方按线段顺序给；结算机可能把一段切成几条，调用方用 edgesAlongSegs 排好）。
     * 已属别的曲线的边不收；收下来的链不连通 → 不登记（返回 undefined）；少于 1 条也不登记。
     */
    create(g: G, edgesIn: readonly EdgeId[], spec: CurveSpec): Curve | undefined;
    /** 炸开：实体没了，边留着（SU Explode Curve）。 */
    explode(id: CurveId): boolean;
    /** 参数作废（顶点被挪 / 非相似变换）：身份留着，kind → polyline。 */
    invalidate(id: CurveId): void;
    /** 刚体 / 相似变换后的参数重算（transformAll 用）。 */
    setParams(id: CurveId, kind: CurveKind, params: CurveParams | undefined): void;
    /** ① 切割：父边被切成有序子边（沿父边 a→b）→ 按链的行进方向顶替。 */
    onSplit(g: G, parent: EdgeId, children: readonly EdgeId[]): void;
    /** ② 删边：出链；链断成两截 → 拆成两条曲线；闭环少一段 → 开弧。 */
    onRemove(e: EdgeId): void;
    private afterRemoval;
    /** ③ 溶解：ea、eb 并成 ne。同链相邻 → 一条顶两条；只有一条在链上 → 顶替它；两条在不同链 → 归 ea 的链，eb 出链。 */
    onMerge(ne: EdgeId, ea: EdgeId, eb: EdgeId): void;
    /**
     * 在顶点 v 处切断经过它的链（设计稿 §6-④「一条线切过曲线 = 两条曲线」）：用户画的线落在曲线的顶点上就从那里断开——
     * 闭环 → 从 v 起的开弧；开链中间 → 两条。推拉的侧棱不走这里（不是用户画的线），所以圆柱顶圈不断。
     */
    cutAtVertex(g: G, v: VertexId): void;
    /** absorbVertex 搬边：from → to。 */
    copy(from: EdgeId, to: EdgeId): void;
    /** 结算后清理：死边出链；链不连通 → 拆成连通段；空的删。 */
    prune(g: G): void;
    /** 校验（fuzz / 装载）：边存在、相邻共顶点、每边至多一条曲线、闭合首尾相接。返回问题列表（空 = 好）。 */
    validate(g: G): string[];
    clone(): CurveRegistry;
    /** 快照（契约 §5 brep.curves 的内存形）：边按给定边序取下标；按曲线 id 升序。 */
    toIndex(edgeIds: readonly EdgeId[]): {
        edges: number[];
        kind: CurveKind;
        closed: boolean;
        params?: CurveParams;
    }[] | undefined;
    /** 装载：校验失败 fail（整份拒开，与膜同款）。 */
    static fromIndex(g: G, list: readonly {
        edges: readonly number[];
        kind: CurveKind;
        closed: boolean;
        params?: CurveParams;
    }[] | undefined, edgeIds: readonly EdgeId[], fail: (msg: string) => never): CurveRegistry;
}
/** 沿一串线段（按顺序）找落在上面的边，按各段的参数序排好 —— 画圆 / 弧 / 推拉帽登记曲线用。 */
export declare function edgesAlongSegs(g: PlanarGraph, segs: readonly {
    a: Pt3;
    b: Pt3;
}[], onSeg: (pa: Pt3, pb: Pt3, a: Pt3, b: Pt3) => boolean): EdgeId[];
export {};
