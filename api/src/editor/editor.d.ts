import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport } from "./camera.ts";
import type { PointerFrame } from "./pointer-frame.ts";
import { type DrawPlane, type HitResult3 } from "./pick.ts";
import { type CatsUpToolConfig } from "./tool-config.ts";
import { type LengthUnit, type VcbKind } from "./vcb.ts";
import type { FaceKey } from "./ops.ts";
import { Renderer3, type LineStyle, type ViewState } from "./render3.ts";
import { type Op } from "./ops.ts";
import { type EditContext, type InstId, type PoolRef, Scene } from "../scene/scene.ts";
import { WorldView } from "../scene/world-view.ts";
export type Tool = "select" | "line" | "rect" | "circle" | "move" | "rotate" | "scale" | "pp" | "offset" | "followme" | "paint" | "erase" | "eraseFace";
export declare const TOOLS: readonly Tool[];
/** 油漆桶当前「蘸的」材质：颜色（名字 + sRGB 0..1）/ 贴图（名字 + 原图字节 + 物理尺寸 米）/ null = 默认灰。 */
export type PaintPick = {
    kind: "color";
    name: string;
    color: [number, number, number];
} | {
    kind: "texture";
    name: string;
    mimeType: string;
    bytes: Uint8Array;
    sizeM: [number, number];
} | null;
/** 工具指针事件（canvas 本地坐标 + 定位提示用的 client 坐标）。 */
export interface ToolPointer {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    pointerType: string;
    /** 允许「点两下」模式（第一击是点击不是拖 → 移动预览再点放置）：桌面鼠标 = true；数位笔/手指 = false（误触发意外连线）。由适配器裁决。 */
    armable?: boolean;
    shiftKey: boolean;
    /** 复制修饰（Ctrl / Alt / ⌘）：移动 = 留一份原件再放（SU Move+Ctrl）。 */
    copy?: boolean;
    /** 自落笔以来指针「走了多远」（本帧量纲：桌面 px）。缺省 = 屏距 downScreen。 */
    travel?: number;
}
/** 记账面包屑（调试日志；op 一行一条）。 */
export type EditorTrace = {
    kind: "op";
    op: Op;
    events: number;
    ms: number;
    position: number;
} | {
    kind: "undo" | "redo";
    position: number;
    depth: number;
} | {
    kind: "load";
    label: string;
} | {
    kind: "fail";
    where: string;
    op: Op | null;
    message: string;
};
export interface EditorHost {
    hint(text: string | null): void;
    tip(text: string | null, clientX: number, clientY: number): void;
    trace?(entry: EditorTrace): void;
    marquee(r: {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null): void;
    changed(): void;
    error?(err: unknown, where: string): void;
}
export declare const SNAP_LABELS: Record<string, string>;
export declare function describeEvent(ev: FaceEvent): string;
/** 手势最小位移（世界单位=米，A10 纪律）：短于此的线/移动/推拉视为没动。 */
export declare const MIN_GESTURE_LEN = 0.01;
/** 圆的多边形段数（SU 默认 24）。 */
/** 圆的默认段数（SSoT 在 tool-config 表；这里只是给老调用方 / 测试的镜像）。 */
export declare const CIRCLE_SEGMENTS: 24;
export declare function fmtLen(v: number, digits?: number): string;
/** 子池选区项（相对活动上下文的直接子项）。 */
export type PoolPick = {
    kind: "group";
    group: number;
} | {
    kind: "instance";
    instance: InstId;
};
/** 数值小窗（vcb.ts）作用的「刚做完的那一步」：撤销它（ops 个 op）、按精确值重做。坐标 = 世界系（froms = 活动池本地）。 */
export type LastGesture = {
    kind: "line";
    ops: number;
    at: PoolRef;
    a: Pt3;
    b: Pt3;
} | {
    kind: "rect";
    ops: number;
    at: PoolRef;
    plane: DrawPlane;
    anchor: Pt3;
    corner: Pt3;
} | {
    kind: "circle";
    ops: number;
    at: PoolRef;
    plane: DrawPlane;
    center: Pt3;
    rim: Pt3;
    segments: number;
} | {
    kind: "pp";
    ops: number;
    at: PoolRef;
    face: FaceKey;
    h: number;
    hl: number;
} | {
    kind: "offset";
    ops: number;
    at: PoolRef;
    ring: Pt3[];
    plane: DrawPlane;
    d: number;
} | {
    kind: "move";
    ops: number;
    at: PoolRef;
    froms: Pt3[];
    pools: PoolPick[];
    delta: Pt3;
    copy: boolean;
    entities: {
        faces: FaceId[];
        edges: EdgeId[];
    };
} | {
    kind: "rotate";
    ops: number;
    at: PoolRef;
    froms: Pt3[];
    pools: PoolPick[];
    center: Pt3;
    axis: Pt3;
    angle: number;
} | {
    kind: "scale";
    ops: number;
    at: PoolRef;
    froms: Pt3[];
    pools: PoolPick[];
    anchor: Pt3;
    axis: Pt3 | null;
    f: Pt3;
};
export declare class Editor {
    private canvas;
    private host;
    readonly cam: OrbitCamera;
    private r3;
    private scene;
    private ctx;
    private history;
    private _tool;
    private _revision;
    private anchor3;
    private gesturePlane;
    private rectFixed;
    private cursor3;
    private snapInfo;
    private moveVids;
    private movePools;
    private moveCopy;
    private moveEntities;
    private ppFace;
    private ppNormal;
    private ppH;
    private ppShellVids;
    private ppStops;
    private readonly handlers;
    private readonly toolCtx;
    private rotStage;
    private rotCenter;
    private rotAxis;
    private rotRef;
    private rotAngle;
    private scaleHandles;
    private scaleActive;
    private scaleT0;
    private scaleFactor;
    private samples;
    private scrubAcc;
    private scrubbing;
    private eraseMode;
    private selection;
    private selectedPools;
    private marqueeStart;
    private marqueeCur;
    private hoverEdge;
    private hoverFace;
    private hoverPool;
    private live;
    private liveOverride;
    private liveEvents;
    private armed;
    private canArm;
    private downScreen;
    private justCommitted;
    private charged;
    private dwell;
    private lastSnap;
    private clickTrain;
    private paintPick;
    /** 工具选项（声明式表 `tool-config.ts`，SSoT）；UI 从它生成，工具从它读。 */
    readonly config: CatsUpToolConfig;
    /** 数值小窗：刚做完的那一步（null = 没有可改的）；opCount 给它数这一步占了几个 op。 */
    private last;
    private opCount;
    /** 数值小窗的默认长度单位（文档级单位设置落地前 = 出厂 m；后缀可覆盖）。 */
    vcbUnit: LengthUnit;
    private viewCache;
    private kids;
    private nextKid;
    constructor(canvas: HTMLCanvasElement, host: EditorHost);
    get tool(): Tool;
    /** 活动池的内核（上下文所在的几何池；根上下文 = 根池）。 */
    get kernel(): Kernel;
    get sceneRef(): Scene;
    /** 全场景世界坐标只读几何（OBJ 导出 / 统计）。 */
    worldGeom(): WorldView;
    get context(): EditContext;
    get renderer3(): Renderer3;
    get revision(): number;
    canUndo(): boolean;
    canRedo(): boolean;
    hasSelection(): boolean;
    hasGeometrySelection(): boolean;
    hasPoolSelection(): boolean;
    selectedPoolPicks(): PoolPick[];
    isGestureActive(): boolean;
    /** 上下文深度（0 = 根）。 */
    contextDepth(): number;
    /** 上下文人话：「根」/「组件 名 › 组」。 */
    contextLabel(): string;
    /** 面包屑（#25）：根 › 组件「名」› 组 › …；depth = 点它要退到的层数。 */
    contextCrumbs(): {
        label: string;
        depth: number;
    }[];
    /** 退到第 depth 层（0 = 根）。 */
    exitTo(depth: number): void;
    private groupDepth;
    vp(): Viewport;
    private pointerFrame;
    setPointerFrame(pf: PointerFrame | null, vp?: Viewport): void;
    private frame;
    private fvp;
    private eps;
    private snapPx;
    private hitPx;
    private activePool;
    private ctxXform;
    private toLocal;
    private toWorld;
    /** 世界空间里的变换 → 活动上下文空间（父空间）里的同一变换：M⁻¹ ∘ X ∘ M。 */
    private xformToLocal;
    private kid;
    private ctxKey;
    /** 世界视图（缓存：场景代数 + 影子副本身份 + 上下文 + 整体变换预演）。 */
    private worldView;
    private overrideList;
    /** 命中的全局实体 → 本地实体（活动池）或子池（直接子项）或空。 */
    private classify;
    private pickKey;
    /** 槽 → 它所属的、活动上下文的直接子项（组 / 实例）；不在上下文子树里 → null。 */
    private topChild;
    /** 子项在当前视图里的槽键集合（渲染高亮 / 包围盒）。 */
    private slotsOfPick;
    setTool(t: Tool): void;
    cancel(): void;
    private cancelGesture;
    /** 所有改场景的用户手势走这里：记账（op 日志，按坐标寻址）+ 应用。 */
    private commitOp;
    private bump;
    private pruneSelection;
    private fail;
    undo(): void;
    redo(): void;
    /** 装载一个场景当新的 checkpoint（打开文件 / 新建）：历史从这里重新开始，上下文回根，选区/充能/手势全清。 */
    loadScene(s: Scene, label?: string): void;
    /** 兼容：单内核当根池装载。 */
    loadKernel(k: Kernel, label?: string): void;
    /** 干净视角截图（无选区/悬停/吸附/预演）→ RGBA 自上而下；保存时的缩略图源。 */
    captureRgba(w: number, h: number): Uint8Array;
    private cleanState;
    clearAll(): void;
    applyPreset(name: string): boolean;
    /** 外部喂线段（OBJ 导入等）：一次 addEdges = 一个手势（进活动池，世界坐标 → 本地）。 */
    addSegments(segs: [PtIn, PtIn][], label: string): FaceEvent[];
    pointerHitDistance(sx: number, sy: number): number | null;
    /** 选择工具的拾取（点击族共用）：屏幕坐标 → **全局**实体 id（WorldView）。 */
    pickAt(sx: number, sy: number): HitResult3;
    /**
     * 选择扩张（SU 点击族：单击 / 双击 / 三击）：stage 0 = 命中实体本身；1 = 膜 + 其环边；2 = 连通体。命中子 group / 实例 = 选它整体。
     * 空命中 = 清选区（非加选）。hit 是 WorldView 的全局 id。
     */
    selectExpand(hit: HitResult3, stage: 0 | 1 | 2, additive?: boolean): boolean;
    private afterSelect;
    deleteSelection(): void;
    /** 选区 → group（选中的膜 / 边搬进新 group；子 group / 实例选区一并进组——先建组再把它们挪进去）。 */
    makeGroup(): boolean;
    /** 选区 → component（新 definition + 一个实例；轴 = 包围盒最小角）。 */
    makeComponent(name: string): boolean;
    /** 炸开选中的子 group / 实例。 */
    explodeSelection(): boolean;
    /** 再放一份选中实例的定义（复制 = 同定义新实例，偏移 delta 世界向量）。 */
    copyInstance(delta: Pt3): boolean;
    /** 进入选中（或命中）的子 group / 实例编辑。 */
    enterPool(p: PoolPick): void;
    enterSelected(): boolean;
    /** 退出一层（到父 group / 父实例）；已在根 → false。 */
    exitContext(): boolean;
    get paint(): PaintPick;
    setPaint(p: PaintPick): void;
    /** 文档材质表（只读）。 */
    materials(): readonly import("../scene/scene.ts").Material[];
    /** 蘸的材质在文档材质表里的索引（没有就新建一条 addMaterial op）；null = 默认。 */
    private materialIndexForPick;
    /** 给活动池里的这些面涂当前材质（op）。 */
    paintFaces(faces: readonly FaceId[]): void;
    /** 把选区（面）涂上当前材质。 */
    paintSelection(): boolean;
    /** 给这些边（本地 id）软化（soft + smooth）或硬化。 */
    softenEdges(ids: readonly EdgeId[], on: boolean): void;
    /** 按二面角阈值软化：有选区 → 选区的边（含选中膜的环边）；否则活动池全部。只碰恰好两膜的边。 */
    softenByAngle(maxDeg: number, on?: boolean): number;
    /** 选区的边软化 / 硬化（不看角度）。 */
    softenSelection(on: boolean): number;
    setView(name: Parameters<OrbitCamera["setView"]>[0]): void;
    zoomExtents(): void;
    /** 小窗当前状态：kind = 能改哪类（null = 没有）；prompt = 提示字；echo = 现值回显。 */
    vcbState(): {
        kind: VcbKind | null;
        prompt: string;
        echo: string;
    };
    /** 矩形「宽,高」的两根轴：面基 (u, v) 里更贴近世界 X 的那根算「宽」（平手看 Y）——地面矩形 = (x, y)，立面 = (水平, 竖直)。 */
    private static rectAxes;
    /** 手势进行中不能输（例外：画线的连画态只是下一笔的锚点）。 */
    private vcbBlocked;
    /** 应用一条输入：解析 → 撤销那一步的 op → 按精确值重做 → 更新 last（可以连着改）。 */
    applyVcb(text: string): {
        ok: true;
        message: string;
    } | {
        ok: false;
        error: string;
    };
    /** 撤销 n 个 op（数值小窗重做用；不清 last、不清选区之外的状态）。 */
    private undoN;
    /** 按坐标重做一次整体变换：顶点（froms = 撤销后的本地坐标）走 move op，子池走 transformPool / transformInstance。 */
    private redoXform;
    /** 作废进行中的指针手势（长按弹菜单时），**选区保留**（cancel() 会清选区）。 */
    abortGesture(): void;
    /** 指针下的实体是否已在选区里（右键 = 不在就先选它，SU 同款）。 */
    hitInSelection(hit: HitResult3): boolean;
    /** 把选区扩成连通体（SU「选择 → 所有相连」）。 */
    selectConnected(): boolean;
    /** 线稿风格：pixel（默认，原生 GL 线 1 设备像素）/ thick（屏幕像素宽粗线）。本版只活这一次会话（持久化要 user 同意）。 */
    get lineStyle(): LineStyle;
    setLineStyle(s: LineStyle): void;
    toggleProjection(): void;
    private alignSrcs;
    private chargePt;
    private trackCharge;
    private revalidateCharged;
    private clearCharged;
    private applyHysteresis;
    private gestureActive;
    /** 手势中 = 影子副本（活动池）+ 整体变换预演；平时 = checkpoint。eraseFace 悬停预告不算手势现实。 */
    private liveWorld;
    /** 推拉的推断世界 = 按下那一刻的模型（文件头「例外」条）。 */
    private ppInferenceWorld;
    /** 基线手：活动池里 checkpoint 之外的新生顶点（追光标者）+ 工具自报的移动集（本地 id 谓词）。 */
    private freshHand;
    private computeLive;
    /** 整体变换（世界系 X）的预演：选区顶点走影子副本、子池走叠加变换。 */
    private previewXform;
    /** 世界系推拉高度 → 活动池本地（上下文有缩放时按法向换算）。 */
    private ppLocalH;
    private basePlaneOfAnchor;
    private lineSecondSnap;
    private rectPlaneSnap;
    viewExtras: (() => Partial<ViewState>) | null;
    setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void;
    private drawSuspended;
    batchDraw(fn: () => void): void;
    draw(): void;
    resize(dpr: number): void;
    private updateTip;
    private targetBounds;
    private rebuildScaleHandles;
    private pickScaleHandle;
    pointerDown(ev: ToolPointer): void;
    /**
     * 跟随的路径 = 当前选区：一串边（链，无分叉）；没选边就取选中的一张面（不是轮廓面本身）的外环 = 闭路径。
     * 取向：起点必须落在轮廓面的平面上，且首段不平行于它；闭路径候选起点多时取离轮廓最近的；两个方向都试，取 |n·d₀| 大的。
     * 关节平滑 = 两侧路径边都是曲线成员（圆 / 弧路径 → 旋转体侧面光滑）。
     */
    private followPath;
    pointerMove(ev: ToolPointer): void;
    /** 手势中的取点（line / rect / circle / pp / move / rotate / scale 的拖拽态；pointerMove 与松开帧共用）。 */
    private trackGesture;
    /** 工具模块的上下文（tool-handler.ts ToolCtx）：底座能力的窄出口；工具只认它。 */
    private makeToolCtx;
    private projectToPlaneThrough;
    private currentSample;
    private recordSample;
    /**
     * 抬笔结算（A21）——按物理过程判：样本按「同一处」（HOLD_PX 内）分成一段段停留。松开处停留 ≥ FINAL_HOLD_MS → 有意，用松开帧；
     * 否则回看 RELEASE_WINDOW_MS 内结束的停留，取最长的那段（≥ MIN_DWELL_MS 且比松开处停得久）= 用户对齐时停住的地方；都没有 → 松开帧。
     */
    private settledSample;
    /** pp 双通道吸附：光标通道（世界 = 按下时模型，源面原位不透明；不吸轴）+ 高度通道（h 对静态高度集咬合）。 */
    private ppTrack;
    /** 意图门开关：屏上拖够 eps.drag 才有意图（intent.ts hasIntent）。 */
    private intentOn;
    pointerUp(ev: ToolPointer): void;
    pointerLeave(): void;
    private commitLine;
    private commitRect;
    private commitCircle;
    private commitPP;
    private commitMove;
    /** 复制落地：每份 = absorb 载荷 + 子池 copyGroup / placeInstance（移动复制与阵列共用）。 */
    private commitCopies;
    /** 复制模式的几何载荷：被移实体（选区的膜 / 边）抠成快照 → 经本地变换 → absorb 的坐标载荷。 */
    private copyPayload;
    private commitRotate;
    private commitScale;
    /** 世界系变换 X 作用于：活动池顶点集（move op，本地坐标）+ 子池（transformPool / transformInstance，父空间变换）。 */
    private commitXform;
}
