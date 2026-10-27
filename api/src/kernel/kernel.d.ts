import { type Pt3, type PlaneParams } from "./geom.ts";
import { type Edge, type EdgeId, type FaceId, type Vertex, type VertexId, PlanarGraph } from "./topology.ts";
import { type Face, type FaceEvent } from "./face-lifecycle.ts";
import { type Seg3 } from "./settle.ts";
import { EdgeLayers, FaceLayers } from "./layers.ts";
import { type Curve, type CurveId, type CurveParams, type CurveSpec } from "./curves.ts";
import { ChangeLog } from "./change-log.ts";
export type { Face, FaceEvent } from "./face-lifecycle.ts";
export type { Edge, EdgeId, FaceId, Vertex, VertexId } from "./topology.ts";
export type { Pt, Pt3 } from "./geom.ts";
export type { PlaneId, PlaneRec } from "./planes.ts";
export type { Image, ImageTable, Seg3 } from "./settle.ts";
export { EDGE_LAYERS, FACE_LAYERS, EdgeLayers, FaceLayers } from "./layers.ts";
export type { Curve, CurveId, CurveKind, CurveParams, CurveSpec } from "./curves.ts";
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
export declare const CREASE_COS_MAX = 0.1;
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
    /** 边属性层：名字 → 有标记的边下标（soft / curve / smooth / hidden…；layers.ts）。缺省 = 无。 */
    readonly edgeLayers?: Readonly<Record<string, readonly number[]>>;
    /** 面属性层：名字 → 每面一个整数（与 faces 对齐；−1 = 无）。material = definition 槽号。 */
    readonly faceLayers?: Readonly<Record<string, readonly number[]>>;
    /** 曲线（0.10，契约 §5 brep.curves）：有序边下标 + 种类 + 闭合 + 圆弧参数（本地坐标，米）。缺省 = 无。 */
    readonly curves?: readonly {
        readonly edges: readonly number[];
        readonly kind: "circle" | "arc" | "polyline";
        readonly closed: boolean;
        readonly params?: CurveParams;
    }[];
}
export interface RewindMark {
    readonly seq: number;
    readonly events: number;
}
import { type KernelDelta, type TouchedIds } from "./delta.ts";
import type { PlaneRec as DeltaPlaneRec } from "./planes.ts";
export declare class Kernel {
    private _graph;
    private store;
    private eventLog;
    private planes;
    /** 边属性层登记处（soft / curve / smooth / hidden；规则全在 layers.ts）。 */
    edgeLayers: EdgeLayers;
    /** 面属性层登记处（material = definition 槽号；按事件血缘继承）。 */
    faceLayers: FaceLayers;
    /** 曲线登记处（0.10）：一串有序边 = 一个实体，可带圆弧参数；结算机经像表钩子维护。 */
    private curveReg;
    /**
     * 改动日志（DT96，2026-10-26 Claude Opus 5.5）：只记编号（顶点 / 边 / 膜，含层的变化），消费方按「从第几号起改过哪些」只更新变了的。
     * 副本（clone）的日志 fork 自原件、从拷贝那一刻的号起记 → 副本的日志 = 「这次预演改了什么」；族谱 = changes.lineage()（只引用祖先日志的数据，不引用内核）。
     */
    changes: ChangeLog;
    private attachLog;
    /** 池版本号：每个改写动词 +1（渲染 / 合成视图按池缓存的键；#22 池级局部性）。clone 继承当前值（副本从同一代起算）。 */
    private _rev;
    get rev(): number;
    /** 便利视图：软边集（不画线）/ 曲线成员边集（圆 / 弧近似边，画线；推拉侧棱软）。 */
    get soft(): Set<EdgeId>;
    get curve(): Set<EdgeId>;
    /** coplanarity 容差 τ——头号 UX 旋钮（drill L297）。只管平面分组/归属；几何保持精确共面。 */
    readonly coplanarTol: number;
    /** 结算模式：local = 影响域局部结算（默认）；global = 全平面全膜（差分 oracle 用，结果必须与 local 逐字相同——立宪页 §3「局部性定理」）。 */
    readonly settleMode: "local" | "global";
    constructor(opts?: {
        coplanarTol?: number;
        settleMode?: "local" | "global";
    });
    /**
     * 站点粘连（v0.10.3，D11 的跟随这一面）：站环点彼此、或与既有顶点，距离 ≤ SWEEP_STICKY → 同一坐标。
     * 为什么：斜切投影在双精度下是精确的刚体运动（圆跟随圆两半错位 1e-15），但路径 / 轮廓是内核里 1 µm 格点上的顶点，
     * 24 站逐站投影把格点噪声放大到 ~1.2 µm = 正好卡在身份量子 Q=1 µm 上 → 一半点合并一半不合并 → 两半的四边形差一根头发 → 共面 τ 内互切出满天尖刺。
     * SU 的全局合并容差 ≈ 25 µm 天然吞掉这一层；我们身份是 Q 格点，所以在动词里把「同一张扫掠面上本该是一个点的点」先认成一个。
     */
    private _stickyStations;
    private _settle;
    /** 只读窥视用（渲染/测试断言）；改图必须走下面的批量 mutations。 */
    get graph(): PlanarGraph;
    /**
     * 持久化装载 = **复原存储态**，不是构造（「没有让调用方构造/注入 Face 的入口」仍成立：这里只吃 BrepSnapshot 这一种形状，
     * 且全量校验面环自洽——校验失败整份拒开报出，不修不猜）。不跑 face-finding（A4：闭环可以无面，文件说有几张膜就是几张）。
     * created 2026-09-20 by Claude Fable 5.1
     */
    static fromBrep(snap: BrepSnapshot, opts?: {
        settleMode?: "local" | "global";
    }): Kernel;
    /** 存储态快照（fromBrep 的逆）：索引 = 当前枚举顺序；只含被膜引用的平面。规范排序归 src/format。 */
    toBrep(): BrepSnapshot;
    /**
     * 影子副本（preview 架构）：clone → 在副本上跑**同一套** mutation → 渲染 diff → 松手对真身重放。
     * id 计数器一起拷 → 副本上的事件与真身提交的事件逐字相同。
     */
    /** 预演会话的起点（clone 之后立刻取）：改动日志的号 + 事件日志长度。 */
    rewindMark(): RewindMark;
    /**
     * 倒带（拖动预演「拷一次 + 每帧退回」，Fable 账单 O1；设计稿 ai-docs/20261027-preview-rollback-design.md，(R2) 由数组制度解决）：
     * 把本内核（影子副本）退回到 mark 那一刻 = base（真身，预演期间一个字节没动）的样子。不记旧值：改动日志给出从 mark 起碰过的编号（DT96 fuzz 保证完整），
     * 按邻接扩全（碰过的点的星、碰过的边的端点、碰过的膜的环边），这些记录照 base 深拷回来、base 没有的删掉，派生索引只对它们重算。
     * 返回 null = 日志已丢掉那段（太长），调用方重新 clone。rev 取一个没用过的新值（渲染 / 合成视图的缓存键不许回绕）。
     */
    rewindTo(base: Kernel, mark: RewindMark): {
        verts: number;
        edges: number;
        faces: number;
    } | null;
    /**
     * 触碰集的闭包：改动日志给的编号，按邻接扩全（碰过的点的星、碰过的边的端点与两侧膜、碰过的膜的环边——本内核和 other 两边都看），
     * 再带上牵连的平面（触碰膜的平面 + 一边有另一边没有的新平面）和曲线（触碰边的曲线 + 新曲线）。
     */
    private touchedClosure;
    private restoreFromSource;
    /** 抽差量：这些 id 在本内核现在的样子（null = 不存在）；纯数据，可估字节（kernel/delta.ts）。 */
    extractDelta(ids: TouchedIds): KernelDelta;
    /** 应用差量（撤销 / 重做）：先抽现值作反向差量，再把内核写成 delta 的样子；自反。rev 取新值。 */
    applyDelta(delta: KernelDelta): KernelDelta;
    /**
     * 提交 = 影子换真身（editor/history.ts）：把影子的表搬进来、把我的旧表搬给影子——**对象身份不变**（编辑器 / 渲染缓存 / 测试拿着的还是同一个内核对象），表是影子跑完这一步的表；
     * 影子随后持有「之前」的表 = 抽差量的来源。O(1)。改动日志跟着表走（影子的日志是从我这里分叉的，族谱接得上 = 渲染缓存仍增量）。
     */
    swapTablesWith(o: Kernel): void;
    /** 「之前」的差量：本内核（影子 / 新真身）从 sinceSeq 起碰过的闭包，在 old（旧真身）里的样子。提交 = 影子换真身时抽一次，就是这一步的撤销记录。 */
    deltaAgainst(old: Kernel, sinceSeq: number): KernelDelta | null;
    clone(): Kernel;
    /**
     * 构造手势：一批线段（Rect = 4 段）。opts.layers = 这批线落下的边带哪些边层；
     * opts.curve = 这批线段（按给的顺序）是一条曲线：true = 无参数的闭合折线（旧接口），CurveSpec = 圆 / 弧（0.10）——落下的边带 curve 层并登记成一个实体。
     */
    addEdges(segs: readonly (readonly [PtIn, PtIn])[], opts?: {
        layers?: readonly string[];
        curve?: boolean | CurveSpec;
    }): FaceEvent[];
    /** 擦边：裁决快照以批开始时的环结构为准，再统一删除（删除顺序无关）。擦到曲线的一段 = 整条曲线（SU；0.10）。 */
    eraseEdges(ids: readonly EdgeId[]): FaceEvent[];
    /** 炸开曲线（SU Explode Curve）：实体没了，边留着、不再带 curve 层（之后推拉它们的侧棱是硬的）。 */
    /** 焊接（B19）：选中的边（所属曲线整条连坐）焊成一条曲线——同圆参数的弧 → 弧 / 圆，否则折线曲线。不是一条链 → 抛（人话）。 */
    weldEdges(ids: readonly EdgeId[]): FaceEvent[];
    /**
     * 溶解（焊边橡皮的「共轴 → 真合并」；user 2026-10-24「共轴就变成一个边」「对焊接只认degree2同意」）：
     * 每个顶点须是二度共线、两边面链接相同、两端之间尚无边；不满足的跳过。合并逻辑 = 结算机 ⑩ 同一份（settle.dissolveAt）。返回真的合并了几个。
     */
    dissolveVertices(ids: readonly VertexId[]): number;
    /** A33 断口：二度共线、两边面链接相同、两端之间没边、两边不在同一条曲线里的顶点（= 一根直线中间断了一截，溶解得掉）。 */
    isBreakJunction(vid: VertexId): boolean;
    explodeCurves(ids: readonly CurveId[]): FaceEvent[];
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
    }[], opts?: {
        creaseLayers?: readonly string[];
    }): FaceEvent[];
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
        keepRing?: boolean;
    }): FaceEvent[];
    /**
     * 跟随（SU Follow Me）—— 轮廓面 id 沿折线 path 扫掠（几何 = sweep.ts 斜切投影），像表提交规则（2026-10-21，Claude Fable 5.1）：
     *   · 扫出的全部面（侧面 + 开路径的两端帽）一律 **XOR**：与既有膜重合的部分成对湮灭 = 沿实体的棱倒角时顶条 / 侧条自动消失（SU 同款）；
     *     按体积说 = 模型 △ 扫掠体（∂(B △ S) = ∂B △ ∂S），倒角 = 减、接管 = 加，一句话。
     *   · 轮廓面**依附**于别的膜（任一环边有第二张膜）→ 它是模型表面的一部分，留在表里参加 XOR（开路径的起始帽与它湮灭 = 棱的起点也切掉）；
     *     **孤立**轮廓面（画在空中的圆 / 方）→ 出库，开路径时起始帽继承它的身份（= 推拉的底帽），闭路径不留横截面。
     *   · 闭路径 + 依附轮廓面没被扫到（扫掠体没盖住它）→ 结算后它还在 → 当横截面删掉（SU：闭路径删起始面）。
     *   · 层：路径关节两侧都是曲线成员（圆 / 弧路径）→ 该站环边 soft+smooth（旋转体侧面光滑）；否则站环边继承轮廓边的层（圆轮廓的拐角圈 = curve 画黑边）；
     *     沿扫掠方向的棱按 riserLayers（圆弧内部顶点软、端点硬）；开路径末帽继承轮廓边的层。
     * 预检用 sweepStations（编辑器选取向 / 起点时已跑过）；这里失败就 throw，commitOp 回滚。
     */
    followMe(id: FaceId, pathIn: readonly Pt3[], opts: {
        closed: boolean;
        smoothJoints?: readonly boolean[];
    }): FaceEvent[];
    /**
     * 吸收外来几何（炸开 group / 粘贴 / 导入）：膜当像（OR、新 id）、裸边当线段，走结算机——与既有几何 sticky（切割 / 合并 / 共面 dedup）。
     * added 2026-10-21 by Claude Fable 5.1（group / component 纪元）
     */
    absorb(faces: readonly (readonly (readonly Pt3[])[])[], wires: readonly Seg3[], opts?: {
        edgeSegs?: Readonly<Record<string, readonly Seg3[]>>;
        faceLayers?: readonly (Readonly<Record<string, number>> | undefined)[];
        curves?: readonly {
            segs: readonly Seg3[];
            spec: CurveSpec;
        }[];
    }): FaceEvent[];
    /** 全池变换（group 整体 move / rotate / scale）：全部顶点按 fn 映射，走 moveVertices（仿射保平面，planarize 无事）。曲线参数按 fn 重算：相似变换保圆，非均匀缩放 → polyline。 */
    transformAll(fn: (p: Pt3) => Pt3): FaceEvent[];
    vertices(): Vertex[];
    edges(): Edge[];
    isSoft(id: EdgeId): boolean;
    /** 折线（DT87）：面内部的折痕——不画、点不中、两侧算一个面、明暗连续（layers.ts EDGE_LAYERS 注释）。 */
    isFold(id: EdgeId): boolean;
    /**
     * 擦这些边时，折线亚种（Blender，DT87：user「是否折还是破就是看是哪个版本的工具」「护栏做好」）怎么分：
     * fold = 恰好两张不共面的膜 → 变折线（两块并成一个面）；erase = 只有一张 / 没有膜，或两张共面 → 照常擦（和 SketchUp 亚种一样）；
     * refuse = 三张以上膜（非流形）→ 不擦、不折，调用方说清（不悄悄破面）。曲线成员整条一起（同 eraseEdges）。
     */
    foldPlan(ids: readonly EdgeId[]): {
        fold: EdgeId[];
        erase: EdgeId[];
        refuse: EdgeId[];
    };
    isCurve(id: EdgeId): boolean;
    isSmooth(id: EdgeId): boolean;
    /**
     * 弯折角（度）：0 = 两张面平展连续，180 = 对折回去；不是恰好两膜 → null。「表面在这条边上弯了多少」一律用它（软化、到锐角为止、拍平候选、共面判定）。
     * 算法：两张面各自从这条边往面里面走的方向（面在有向边的左 / 右，由所在环相对平面法向的绕向定）的夹角 θ，弯折 = 180° − θ。
     * 2026-10-26：dihedralDeg 取法向点积的绝对值，分不清平展和刀刃——弯 160° 的尖屋脊被当成 20°（「软化所有 ≤ 20°」会软化它，拍平会把它压平）。
     */
    bendDeg(id: EdgeId): number | null;
    /** 面 fid 在边 eid（方向 d = a→b）处往面里面走的单位方向（在面所在平面里、垂直于边）。 */
    private inwardAcross;
    /** 两膜之间的边的二面角（度，法向夹角取 0–90°，不分平展 / 对折——要「弯了多少」用 bendDeg）；不是恰好两膜 → null。 */
    dihedralDeg(id: EdgeId): number | null;
    /** GeomView 契约：裸内核不知道材质表（槽号在 faceMat），渲染单内核时一律默认。 */
    faceMaterial(_id: FaceId): null;
    faces(): Face[];
    face(id: FaceId): Face | undefined;
    /** 曲线实体（0.10）：全部 / 按 id / 这条边属于哪条。 */
    curves(): Curve[];
    curveById(id: CurveId): Curve | undefined;
    curveOf(edge: EdgeId): CurveId | undefined;
    /** 曲线自洽校验（fuzz / 测试）：边存在、链相邻共顶点、每边至多一条、闭合首尾相接；空 = 好。 */
    curveProblems(): string[];
    log(): readonly FaceEvent[];
    /** 命中测试（3D 距离；面 = 落在平面 τ 邻域内且投影在环内）：顶点 > 边 > 面。 */
    hitTest(pIn: PtIn, tol: number): HitResult;
    /** face 的世界坐标环（渲染层用；沿环取每条有向边的起点顶点，精确无投影往返误差）。 */
    faceRings3(id: FaceId): {
        outer: Pt3[];
        holes: Pt3[][];
    } | undefined;
    planeOf(id: FaceId): DeltaPlaneRec | undefined;
    /** 涂材质（槽号；null = 回默认）。sides = 每张面涂哪一侧（0 = 平面法向 +n 那侧、1 = −n 那侧，与 ids 对齐）；不给 = 两侧都涂（DT8 之前的语义）。 */
    setFaceMaterial(ids: readonly FaceId[], slot: number | null, sides?: readonly (0 | 1)[]): void;
    /** 面某一侧的材质槽（DT8；side 0 = +n 侧（缺省）、1 = −n 侧）。 */
    faceMaterialOf(id: FaceId, side?: 0 | 1): number | undefined;
    /** 隐藏 / 显示一批面（DT49：面层 hidden = 1；子膜按血缘继承）。 */
    setFaceHidden(ids: readonly FaceId[], on: boolean): void;
    isFaceHidden(id: FaceId): boolean;
    isEdgeHidden(id: EdgeId): boolean;
    /** 给一批边打 / 去一个边层（软化 / 硬化工具）。 */
    setEdgeLayer(name: string, ids: readonly EdgeId[], on: boolean): void;
    private emit;
    /**
     * 合并组执行体：from 的边全部搬到 to（坍缩边丢弃、平行边去重——sticky 有损，公理 3）；
     * from 随最后一条边消亡。先加后删，防对端顶点被中途 GC。edited by Claude Fable 5 2026-09-01
     */
    private absorbVertex;
}
