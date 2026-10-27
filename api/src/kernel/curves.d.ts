import type { EdgeId, VertexId, PlanarGraph } from "./topology.ts";
import { type Pt3 } from "./geom.ts";
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
type G = Pick<PlanarGraph, "hasEdge" | "edge" | "hasVertex" | "vertex" | "pt">;
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
     * 断点规则（0.10.2，**只在这里判**，结算机尾声对本次星形变过的顶点调一次；user 2026-10-24「这种时候我希望留下 1/4，我 su 里面都是这么画圆弧的」）：
     * 顶点上有「不属于本曲线、且另一端在本曲线平面 τ 内」的边 → 曲线在此断开（线穿圆 = 两弧；盒底边穿过地上的圆 = 1/4 + 3/4；弧碰到圆周 = 圆变 360° 弧）。
     * 出平面的边（推拉 / 跟随的侧棱、手画的竖线）= 挂上去，不断（圆柱 / 锥顶圈整）——这是与 SU 的有意分歧：SU 任何线碰顶点都断，但侧棱与手画竖线拓扑上无法区分。
     * 断是永久的（SU 要 Weld 才合）：擦掉弦，两弧不自愈——身份是历史，不是几何的派生量（否则推拉过的弧会被重新粘回圈里、下次擦一段连柱体底圈一起没）。
     * 0.10.1 之前这条规则散在动词里（addEdges 先切再登记 → 新圆切不到自己；pushPull / followMe / absorb 根本不切），截图里擦地上一段连推拉体底圈一起没 = 那个病。
     */
    rechain(g: G, verts: Iterable<VertexId>, tol: number): void;
    /** 曲线所在平面：有参数用圆心 + 法向；折线用链上顶点的 Newell 平面；退化 → null。 */
    private planeOf;
    /** 把曲线 c 在顶点 v 处断开：闭环 → 从 v 起的一条开链；开链 → v 之后的尾巴成新曲线。v 不在链内部（端点 / 不在链上）= 不动。 */
    private cutAt;
    /** absorbVertex 搬边：from → to。 */
    copy(from: EdgeId, to: EdgeId): void;
    /** 结算后清理：死边出链；链不连通 → 拆成连通段；空的删。 */
    prune(g: G): void;
    /**
     * 增量版（2026-10-26 Claude Opus 5.5，纪元账本 DT93）：只看含被删边的曲线（清理前 ofEdge 还指着它们），按 id 序 = 全量版的访问序，
     * 拆出来的新曲线编号与全量版相同。没被删边的曲线全量版也不会改它（全边活、相邻共顶点）。
     */
    pruneEdges(g: G, removed: readonly EdgeId[]): void;
    private pruneCurve;
    /** 校验（fuzz / 装载）：边存在、相邻共顶点、每边至多一条曲线、闭合首尾相接。返回问题列表（空 = 好）。 */
    validate(g: G): string[];
    /** 倒带（O1）：这几条边牵到的曲线（影子里的 / base 里的）+ 影子里新铸的曲线，恢复成 base 的样子；边 → 曲线表对这几条边照 base。 */
    restoreFrom(base: CurveRegistry, eids: ReadonlySet<EdgeId>): void;
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
