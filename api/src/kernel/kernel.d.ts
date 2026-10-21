import { type Pt3, type PlaneParams } from "./geom.ts";
import { type Edge, type EdgeId, type FaceId, type Vertex, type VertexId, PlanarGraph } from "./topology.ts";
import { type Face, type FaceEvent } from "./face-lifecycle.ts";
import { type Seg3 } from "./settle.ts";
export type { Face, FaceEvent } from "./face-lifecycle.ts";
export type { Edge, EdgeId, FaceId, Vertex, VertexId } from "./topology.ts";
export type { Pt, Pt3 } from "./geom.ts";
export type { PlaneId, PlaneRec } from "./planes.ts";
export type { Image, ImageTable, Seg3 } from "./settle.ts";
/** API 取点：z 缺省 = 0（2D 场景/测试直接传 {x,y}）。 */
export interface PtIn {
    x: number;
    y: number;
    z?: number;
}
export interface HitResult {
    vertex?: VertexId;
    edge?: EdgeId;
    face?: FaceId;
}
/** 褶边判据（pp 哪条环边让邻膜跟着伸缩）：邻膜平面含推向 ⟺ n_邻·n̂ = 0。数值门限：法向夹角余弦。 */
export declare const CREASE_COS = 0.001;
/**
 * 内核 B-rep 的**存储态快照**（持久化契约 ai-docs/20260919-persistence-data-contract.md §5.2 的内存形状；
 * src/format 负责它与字节的互换，内核只认这个）。全部用**索引**不用 id（不铸 id）；坐标 = 米（装载时量化）。
 * 只装状态：顶点、边、平面（τ 合并后的注册参数——重建不等价，必须存）、膜（顶点环，外环 CCW / 洞 CW，
 * 相对该平面的 canonical 基）。不装派生：faceLinks / 环 2D pts / 基 / id / 事件。created 2026-09-20 by Claude Fable 5.1
 */
export interface BrepSnapshot {
    readonly coplanarTol: number;
    readonly vertices: readonly Pt3[];
    readonly edges: readonly (readonly [number, number])[];
    readonly planes: readonly PlaneParams[];
    readonly faces: readonly {
        readonly plane: number;
        readonly outer: readonly number[];
        readonly holes: readonly (readonly number[])[];
    }[];
    /** 软边索引（边表下标；缺省 = 无）。属性层，2026-10-21。 */
    readonly softEdges?: readonly number[];
    /** 曲线成员边索引（圆 / 弧近似边；画线、推拉侧棱自动软）。属性层，2026-10-21。 */
    readonly curveEdges?: readonly number[];
    /** 每面材质槽（与 faces 对齐；−1 = 默认；缺省 = 全默认）。属性层，2026-10-21。 */
    readonly faceMaterial?: readonly number[];
}
export declare class Kernel {
    private _graph;
    private store;
    private eventLog;
    private planes;
    /** 软边（圆 / 弧的多边形近似边、它们推拉出的侧棱）：渲染不画线、推断照常吸。属性层，切割继承（结算机维护）。added 2026-10-21 */
    readonly soft: Set<number>;
    /** 曲线成员边（圆 / 弧的多边形近似边）：**画出来**（SU 的圆有黑边），但从它们推拉出的侧棱是软边 + 平滑组；切割继承。2026-10-21（user「你画出来的圆为什么没有黑边」）。 */
    readonly curve: Set<number>;
    /** 面材质槽（definition.materialSlots 的槽号；缺省 = 默认材质）。属性层，按事件血缘继承：DIVIDE 子膜继承、MERGE 取首个有的、
     *  一对一承继保 id 所以天然保留（pp 的帽跟着原膜走，侧壁新膜 = 默认——SU 同款）。贴图纪元 2026-10-21。 */
    readonly faceMat: Map<number, number>;
    /** coplanarity 容差 τ——头号 UX 旋钮（drill L297）。只管平面分组/归属；几何保持精确共面。 */
    readonly coplanarTol: number;
    constructor(opts?: {
        coplanarTol?: number;
    });
    /** 只读窥视用（渲染/测试断言）；改图必须走下面的批量 mutations。 */
    get graph(): PlanarGraph;
    /**
     * 持久化装载 = **复原存储态**，不是构造（「没有让调用方构造/注入 Face 的入口」仍成立：这里只吃 BrepSnapshot 这一种形状，
     * 且全量校验面环自洽——校验失败整份拒开报出，不修不猜）。不跑 face-finding（A4：闭环可以无面，文件说有几张膜就是几张）。
     * created 2026-09-20 by Claude Fable 5.1
     */
    static fromBrep(snap: BrepSnapshot): Kernel;
    /** 存储态快照（fromBrep 的逆）：索引 = 当前枚举顺序；只含被膜引用的平面。规范排序归 src/format。 */
    toBrep(): BrepSnapshot;
    /**
     * 影子副本（preview 架构）：clone → 在副本上跑**同一套** mutation → 渲染 diff → 松手对真身重放。
     * id 计数器一起拷 → 副本上的事件与真身提交的事件逐字相同。
     */
    clone(): Kernel;
    /** 构造手势：一批线段（Rect = 4 段）。opts.curve = 这批线是曲线的多边形近似（圆 / 弧）→ 曲线成员边（画黑边；推拉侧棱软）。 */
    addEdges(segs: readonly (readonly [PtIn, PtIn])[], opts?: {
        curve?: boolean;
        soft?: boolean;
    }): FaceEvent[];
    /** 擦边：裁决快照以批开始时的环结构为准，再统一删除（删除顺序无关）。 */
    eraseEdges(ids: readonly EdgeId[]): FaceEvent[];
    /** 只删膜不动拓扑（「闭环无面」态；之后 retrace 可复生）。 */
    eraseFaces(ids: readonly FaceId[]): FaceEvent[];
    /**
     * 移动顶点 —— sticky geometry 协议（spec = ai-docs/20260901-move-spec.md）：
     * ① 合并组预判（按**终态**位置分组，撞格 = 合并——绝无幽灵中间态裁决）② 批量刚移（纯坐标）
     * ③ 像表 = 每张被牵连膜的环按新坐标读出（OR、继承自身）→ 结算机（planarize 自愈 / autofold 折 / 认领设面）。
     * 不注入手势 → 永不生膜（守恒律 by construction）。rotate / scale 同走此路（顶点映射不同）。
     */
    moveVertices(moves: readonly {
        id: VertexId;
        to: PtIn;
    }[]): FaceEvent[];
    /**
     * push/pull —— 像表（2026-10-21；取代 v3 的边分类 / frontier / riser / 蒸发 + rename / toggle）：
     *   · 帽 = 膜整体平移 δ = h·n̂，**XOR**（落地与既有膜成对湮灭 = SU 推穿；预演 settleLanding:false 用 OR 不湮灭）、继承原 id（身份跟随）
     *   · 每条环边 e=(a,b)：**褶边**（全部邻膜 ∥ n̂，CREASE_COS）→ 改写邻膜 G 的像：环里的 e 段换成 a→a+δ→b+δ→b（拉 = 伸、推 = 缩，同一句话）；
     *     否则（裸边 / 任一邻膜不平行）→ 侧壁像 band(e) = (a, b, b+δ, a+δ)，OR、新膜
     *   · 有裸边 → 原位留一张源像 F₀（拉孤面成闭盒）
     * 顶点守卫 / 频谱整段退役：第三张只共享顶点的膜的像没动 → 它不动（邻居形状不可侵犯 by construction）。
     */
    pushPull(id: FaceId, dist: number, opts?: {
        settleLanding?: boolean;
    }): FaceEvent[];
    /**
     * 吸收外来几何（炸开 group / 粘贴 / 导入）：膜当像（OR、新 id）、裸边当线段，走结算机——与既有几何 sticky（切割 / 合并 / 共面 dedup）。
     * added 2026-10-21 by Claude Fable 5.1（group / component 纪元）
     */
    absorb(faces: readonly (readonly (readonly Pt3[])[])[], wires: readonly Seg3[], softSegs?: readonly Seg3[], materials?: readonly number[], curveSegs?: readonly Seg3[]): FaceEvent[];
    /** 全池变换（group 整体 move / rotate / scale）：全部顶点按 fn 映射，走 moveVertices（仿射保平面，planarize 无事）。 */
    transformAll(fn: (p: Pt3) => Pt3): FaceEvent[];
    vertices(): Vertex[];
    edges(): Edge[];
    isSoft(id: EdgeId): boolean;
    isCurve(id: EdgeId): boolean;
    /** GeomView 契约：裸内核不知道材质表（槽号在 faceMat），渲染单内核时一律默认。 */
    faceMaterial(_id: FaceId): null;
    faces(): Face[];
    face(id: FaceId): Face | undefined;
    log(): readonly FaceEvent[];
    /** 命中测试（3D 距离；面 = 落在平面 τ 邻域内且投影在环内）：顶点 > 边 > 面。 */
    hitTest(pIn: PtIn, tol: number): HitResult;
    /** face 的世界坐标环（渲染层用；沿环取每条有向边的起点顶点，精确无投影往返误差）。 */
    faceRings3(id: FaceId): {
        outer: Pt3[];
        holes: Pt3[][];
    } | undefined;
    planeOf(id: FaceId): import("./planes.ts").PlaneRec | undefined;
    /** 涂材质（槽号；null = 回默认）。 */
    setFaceMaterial(ids: readonly FaceId[], slot: number | null): void;
    faceMaterialOf(id: FaceId): number | undefined;
    private emit;
    /**
     * 合并组执行体：from 的边全部搬到 to（坍缩边丢弃、平行边去重——sticky 有损，公理 3）；
     * from 随最后一条边消亡。先加后删，防对端顶点被中途 GC。edited by Claude Fable 5 2026-09-01
     */
    private absorbVertex;
}
