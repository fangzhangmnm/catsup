import { Kernel } from "../kernel/kernel.ts";
import type { FaceEvent, FaceId, Pt3, PtIn } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport } from "./camera.ts";
import type { PointerFrame } from "./pointer-frame.ts";
import { type HitResult3 } from "./pick.ts";
import { Renderer3, type ViewState } from "./render3.ts";
import { type Op } from "./ops.ts";
import { type EditContext, type InstId, Scene } from "../scene/scene.ts";
import { WorldView } from "../scene/world-view.ts";
export type Tool = "select" | "line" | "rect" | "circle" | "move" | "rotate" | "scale" | "pp" | "paint" | "erase" | "eraseFace";
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
/** 圆的多边形段数（SU 默认 24）。 */
export declare const CIRCLE_SEGMENTS = 24;
export declare function fmtLen(v: number, digits?: number): string;
/** 子池选区项（相对活动上下文的直接子项）。 */
export type PoolPick = {
    kind: "group";
    group: number;
} | {
    kind: "instance";
    instance: InstId;
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
    setView(name: Parameters<OrbitCamera["setView"]>[0]): void;
    zoomExtents(): void;
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
    pointerMove(ev: ToolPointer): void;
    /** 手势中的取点（line / rect / circle / pp / move / rotate / scale 的拖拽态；pointerMove 与松开帧共用）。 */
    private trackGesture;
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
    pointerUp(ev: ToolPointer): void;
    pointerLeave(): void;
    private commitLine;
    private commitRect;
    private commitCircle;
    private commitPP;
    private commitMove;
    /** 复制模式的几何载荷：被移实体（选区的膜 / 边）抠成快照 → 经本地变换 → absorb 的坐标载荷。 */
    private copyPayload;
    private commitRotate;
    private commitScale;
    /** 世界系变换 X 作用于：活动池顶点集（move op，本地坐标）+ 子池（transformPool / transformInstance，父空间变换）。 */
    private commitXform;
}
