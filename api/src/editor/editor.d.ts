import { Kernel } from "../kernel/kernel.ts";
import type { BrepSnapshot, EdgeId, FaceEvent, FaceId, Pt3, PtIn } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport } from "./camera.ts";
import type { PointerFrame } from "./pointer-frame.ts";
import { type DrawPlane, type HitResult3 } from "./pick.ts";
import { type ArcGesture } from "./arc-build.ts";
import { type CatsUpToolConfig } from "./tool-config.ts";
import type { ToolHandler } from "./tool-handler.ts";
import { type GridSettings } from "./grid-settings.ts";
import type { CurveParams } from "../kernel/kernel.ts";
import { type LengthUnit, type VcbKind } from "./vcb.ts";
import type { FaceKey } from "./ops.ts";
import { type LockAxis, type PlaneLock } from "./locks.ts";
import { type Ladder, type ScaleTipView } from "./scale-ref.ts";
import { Renderer3, type LineStyle, type ViewState } from "./render3.ts";
import { type Op } from "./ops.ts";
import { type EditContext, type InstId, type PoolRef, Scene } from "../scene/scene.ts";
import { WorldView } from "../scene/world-view.ts";
import { type Frame } from "../scene/xform.ts";
export { TOOLS, type Tool } from "./tool-ids.ts";
import type { Tool } from "./tool-ids.ts";
import type { ModeId } from "./mode.ts";
import type { OptionKv } from "./tool-config.ts";
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
    /** 自落笔以来指针「走了多远」（本帧量纲：桌面 px / VR 度）。缺省 = 本帧 distTo（editor.movedSinceDown）。 */
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
}
/** 失败行另带复现材料（黑匣子，2026-10-24）：那一步之前的活动池 B-rep + 池地址；预演失败带工具描述。宿主只在内存里留。 */
 | {
    kind: "fail";
    where: string;
    op: Op | null;
    message: string;
    brep?: BrepSnapshot;
    pool?: PoolRef;
    preview?: Record<string, unknown>;
};
export interface EditorHost {
    hint(text: string | null): void;
    /** 跟指针的提示框；measure = 手势中的读数（user 2026-10-25「优先显示长度，参考只是参考」：第一行、最显眼）；scale = B43 尺度参考（拖动时才有；样式归宿主画）。 */
    tip(text: string | null, clientX: number, clientY: number, scale?: ScaleTipView | null, measure?: string): void;
    trace?(entry: EditorTrace): void;
    marquee(r: {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null): void;
    changed(): void;
    error?(err: unknown, where: string): void;
    /** 右下角血槽位的尺寸读数（手势中的 dims / 选中面的面积 / 选中边的长度；"" = 空）。A28。 */
    readout?(text: string): void;
    /** 工具选项的 device 持久化接缝（app 的 device-kv）；不给 = 只活这一次。 */
    optionKv?: OptionKv;
}
export declare const SNAP_LABELS: Record<string, string>;
export { type GridSettings, type GridPlane, type GridPreset, GRID_STEPS, GRID_PLANES, GRID_PRESETS, gridPreset, gridStepsFor, nearestGridStep } from "./grid-settings.ts";
export declare function describeEvent(ev: FaceEvent): string;
/** 手势最小位移（世界单位=米，A10 纪律）：短于此的线/移动/推拉视为没动。 */
export declare const MIN_GESTURE_LEN = 0.01;
/** 圆的多边形段数（SU 默认 24）。 */
/** 圆的默认段数（SSoT 在 tool-config 表；这里只是给老调用方 / 测试的镜像）。 */
export declare const CIRCLE_SEGMENTS: 24;
export { fmtLen, fmtDeg } from "./units.ts";
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
    from?: "corner" | "center";
}
/** 旋转矩形：A 第一角 / B 第一边终点 / C 第二边终点；VCB「角度,宽」或「宽」。 */
 | {
    kind: "rrect";
    ops: number;
    at: PoolRef;
    plane: DrawPlane;
    a: Pt3;
    b: Pt3;
    c: Pt3;
}
/** 弧（四种画法，arc-build.ts）：VCB 半径 / 角度（圆心弧 · 扇形）/ 段数。 */
 | ({
    kind: "arc";
    ops: number;
    at: PoolRef;
} & ArcGesture) | {
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
    circle?: CurveParams;
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
}
/** 卷尺（0.11）：起点 a、产物方向 dir（线 = 垂直偏移方向；点 = 起点→终点）、距离 d；line 另带参考线方向。 */
 | {
    kind: "tape";
    ops: number;
    at: PoolRef;
    a: Pt3;
    dir: Pt3;
    d: number;
    make: "line" | "point";
    lineDir?: Pt3;
}
/** 量角器（0.11）：圆心 / 转轴 / 参考点 / 角度 → 角度参考线；VCB 改度数。 */
 | {
    kind: "protractor";
    ops: number;
    at: PoolRef;
    center: Pt3;
    axis: Pt3;
    ref: Pt3;
    angle: number;
};
export declare class Editor {
    private canvas;
    private host;
    readonly cam: OrbitCamera;
    private r3;
    private scene;
    private ctx;
    private _grid;
    /** 定稿锁（护栏 ②，ai-docs/20261024-finalize.md）：true = 改内容的入口全拒（commit / undo / redo / VCB）。由 session 按文件记录设。 */
    private _locked;
    get locked(): boolean;
    setLocked(on: boolean): void;
    private lockedSay;
    get grid(): Readonly<GridSettings>;
    setGrid(patch: Partial<GridSettings>): void;
    private history;
    private _tool;
    private _revision;
    private anchor3;
    private cursor3;
    private snapInfo;
    /** 编辑模式（0.13 刀 ① / 刀 ③）：几何 / 表面；工具集 + 手势模块表住模式里；左上下拉框切（user「切换编辑模式还是左上下拉框」）。 */
    private readonly modeList;
    private mode;
    get modeId(): ModeId;
    modes(): readonly {
        id: ModeId;
        label: string;
    }[];
    /** 当前模式有哪些工具（左柱按它排）。 */
    modeTools(): readonly Tool[];
    /** 某工具的手势模块（上下文条要碰工具自己的状态，如吸色锁定）。 */
    toolHandler(t: Tool): ToolHandler | undefined;
    /** 切模式：清手势；当前工具不在新模式里 → 换成它的默认工具；选区留着（面选区两边都认）。 */
    setMode(id: ModeId): void;
    private get handlers();
    private readonly toolCtx;
    private samples;
    private selection;
    private selectedPools;
    private hoverEdge;
    private hoverFace;
    private live;
    private liveOverride;
    private liveEvents;
    private armed;
    private canArm;
    /** 按下那条射线上 1 m 处的世界点：「自按下走了多远」= 本帧 distTo(光标, 它)——桌面 = 离按下点的像素，VR = 角度（(x, y) 在 VR 只是名义坐标）。
     *  规矩：能用帧度量就不用屏幕 px（user 2026-10-24「能用ray别用screen px」）。2026-10-24 Claude Opus 5.5 替掉原来按屏幕坐标记的按下点。 */
    private downPoint;
    /** 点按族（点 / 拖、单 / 双 / 三击）：全编辑器一份，工具经 ctx.clicks() / ctx.tapSlop() 问（tap-train.ts；user 2026-10-25 笔双击三击偏向点）。 */
    private readonly taps;
    private movedSinceDown;
    private justCommitted;
    private charged;
    /** 充能边（0.11.6，user「载线交点 充能」）：悬停在边上 ≥ 300 ms 的边，最近 2 条；出延长线与延长线交点。 */
    private chargedEdges;
    private dwell;
    private lastSnap;
    private paintPick;
    /** 工具选项（声明式表 `tool-config.ts`，SSoT）；UI 从它生成，工具从它读。 */
    readonly config: CatsUpToolConfig;
    /** 数值小窗：刚做完的那一步（null = 没有可改的）；opCount 给它数这一步占了几个 op。 */
    private last;
    private mods;
    private dims;
    private toolTip;
    private opCount;
    /** 数值小窗的默认长度单位（文档级单位设置落地前 = 出厂 m；后缀可覆盖）。 */
    /** A9 轴锁（user 2026-09-06 / 10-24「键盘小箭头控制axis，然后触屏上应该有对应的虚拟键」）：SU 同款 → X / ← Y / ↑ Z / ↓ 解锁；
     *  轴 = 上下文帧（绘图轴 / 组轴）的轴。生命周期 = 一次手势：手势结束 / 换工具 / Esc 就解。只对调用 ctx.applyLock 的工具生效（画线 / 移动 / 卷尺）。
     *  面锁（user 2026-10-25「Shift + 方向键锁平面、矩形工具的平面锁、触屏常驻三颗轴键。 要！」；键位 = ledger A9 的 Blender Shift+X 语义）：
     *  锁到「排除该轴」的平面 = 法向是该轴的面（Shift+→ YZ / Shift+← XZ / Shift+↑ XY / Shift+↓ 光标下那张膜的面）。
     *  先定平面的工具（矩形 / 圆 / 旋转矩形 / 弧 / 旋转 / 量角器，`lock: "plane"`）不吃轴锁：方向键直接锁平面（SU 旋转矩形「按方向键定平面」同款），
     *  平面过首点（ctx.lockedPlane）；沿轴走的工具（`lock: "axis"`）Shift+方向键 = 点投到过锚点的那张面上（ctx.applyLock）。轴锁与面锁互斥。 */
    private _axisLock;
    private _planeLock;
    private _planeLockN;
    private lastPtr;
    get axisLock(): LockAxis | null;
    get planeLock(): PlaneLock | null;
    /** 当前工具吃哪种锁（null = 不吃锁：方向键 / 虚拟轴键无效）。 */
    lockStyle(): "axis" | "plane" | null;
    setAxisLock(a: LockAxis | null): void;
    toggleAxisLock(a: LockAxis): void;
    /** 面锁："x" / "y" / "z" = 法向是那根上下文轴的面；"face" = 光标下那张膜的面（光标下没膜 → 不锁，给提示）。 */
    setPlaneLock(p: PlaneLock | null): void;
    togglePlaneLock(p: PlaneLock): void;
    /** 方向键 / 触屏虚拟轴键的唯一入口：axis = 键对应的轴（→ X / ← Y / ↑ Z），null = ↓；plane = Shift。按当前工具的锁种分派。 */
    lockKey(axis: LockAxis | null, plane: boolean): void;
    /** 面锁下过 through 的平面（先定平面的工具在首点之后用；没锁 = null）。轴面的基 = 另外两根上下文轴。 */
    private lockedPlaneThrough;
    /** 锁的事后约束（求解器本身不动，排序规则归 Fable）：轴锁 → lockToAxis；面锁 → lockToPlane；没锁 = 原样。 */
    private applyLock;
    private static strongSnap;
    /** 投到锁住的面（过锚点）上：吸到实几何 → 正投影（「从点」；已在面上就原样）；没吸到 → 光标射线交面（掠射 = 投影兜底）；
     *  栅格开着且是轴面 → 面内两根轴各自落绝对格。 */
    private lockToPlane;
    /** 把求解器结果投到锁住的轴线（过锚点）上：吸到实几何 → 投影（SU「从点」）；没吸到 → 光标射线离轴线最近的点；栅格开着 → 沿轴落绝对格。 */
    private lockToAxis;
    /** B43 尺度参考：勾了哪几项（多选取并集；[] = 不显示；跟着文件存 settings.scaleRefs）+ 懒加载来的梯子数据（宿主递进来）。 */
    private _scaleRefs;
    private scaleLadder;
    get scaleRefs(): readonly string[];
    /** 勾 / 取消一项；算文档改动（同栅格设置）。 */
    toggleScaleRef(id: string): void;
    /** 全部取消（= 不显示）。 */
    clearScaleRefs(): void;
    /** 读文件 / 新建时设（不算改动）。 */
    loadScaleRefs(refs: readonly string[]): void;
    setScaleLadder(L: Ladder): void;
    get scaleLadderLoaded(): boolean;
    /** 手势中正在拖的那段配什么参考（没手势 / 工具不报 / 没选 / 数据没到 = null）。 */
    private scaleTip;
    private _vcbUnit;
    /** 显示 / 输入单位：数值小窗按它读，所有读数（fmtLen / fmtArea）按它念——换单位只走这里（units.ts 窄接口）。 */
    get vcbUnit(): LengthUnit;
    set vcbUnit(u: LengthUnit);
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
    /** 上下文的帧（世界坐标）：根 = 绘图轴，进组 = 组的轴。 */
    contextFrame(): Frame;
    addGuideLine(p: Pt3, dir: Pt3): void;
    addGuidePoint(p: Pt3): void;
    eraseGuides(ids: readonly number[]): void;
    /** 清空活动池的参考几何（SU「删除参考线」同款）。 */
    clearGuides(): void;
    hasGuides(): boolean;
    /** 改轴（世界坐标帧进来）：根 = 绘图轴；进组 = 组的轴（几何不动）。 */
    setContextAxes(frame: Frame): void;
    private cancelGesture;
    /** 所有改场景的用户手势走这里：记账（op 日志，按坐标寻址）+ 应用。 */
    private commitOp;
    private bump;
    private pruneSelection;
    private fail;
    /** 刚提交的那一步：op + 它之前的活动池 B-rep（复现包「上一步」；成功但错的也能寄）。没有 / 池不是 brep → null。 */
    lastStep(): {
        op: Op;
        brep: BrepSnapshot;
        pool: PoolRef;
    } | null;
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
    /** 实体信息（0.10）：选区恰是一条曲线 → 「圆 r=… · N 段」/「弧 …」/「曲线 · N 段」；恰是一张曲面 → 「曲面 · N 面」；别的 → null（不抢提示行）。 */
    private selectionInfo;
    /** 选区里有没有曲线的边（炸开曲线钮）。 */
    hasCurveSelection(): boolean;
    /** 炸开选区里的曲线（SU Explode Curve）：每条曲线给一条代表边，op 按坐标寻址。 */
    /** 选区能焊吗（粗筛，菜单显示用；真判在 planWeld）：≥ 2 条边、没选面。 */
    canWeldSelection(): boolean;
    /** 焊接选区（B19，SU Weld Edges）：成一条曲线，之后选中整条。 */
    weldSelection(): boolean;
    explodeCurveSelection(): void;
    deleteSelection(): void;
    /** 选区 → group（选中的膜 / 边搬进新 group；子 group / 实例选区一并进组——先建组再把它们挪进去）。 */
    makeGroup(): boolean;
    /** 选区 → component（新 definition + 一个实例；轴 = 包围盒最小角）。 */
    makeComponent(name: string): boolean;
    /** 炸开选中的子 group / 实例。 */
    explodeSelection(): boolean;
    /** 再放一份选中实例的定义（复制 = 同定义新实例，偏移 delta 世界向量）。 */
    copyInstance(delta: Pt3): boolean;
    /** 这条 op 会改到锁住的东西吗：目标池在锁住的 group 里 / 整体动・删・炸一个锁住的子项 / 当前上下文在锁住的实例里面。setLocked 本身豁免（解锁要能做）。 */
    private opTouchesLocked;
    /** 当前上下文链上有锁住的实例（进不去的地方本来也到不了；双保险）。 */
    private contextLocked;
    private pickIsLocked;
    hasLockedSelection(): boolean;
    hasUnlockedPoolSelection(): boolean;
    /** 选中的子 group / 实例里能整体动的那些（锁住的不动；提示一次）。 */
    private movablePoolPicks;
    /** 锁定 / 解锁选中的子 group / 实例（每个一条 op，可撤销）。 */
    lockSelection(on: boolean): boolean;
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
    /** 吸色：把这张面的材质设成油漆桶当前「蘸的」（没材质 = 默认灰）。 */
    pickMaterialOf(face: FaceId): void;
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
    /** 放大镜点一下（user 2026-10-25「放大镜按一下是Zoom to fit, 取决于是否有选区。然后按多下是选区 当前物体 全局 切换。……只有合法的切换才入档」）：
     *  档 = 选区（有选区才有）→ 当前物体（进组编辑时 = 那一组）→ 全部；和前一档一样大的不入档。
     *  相机没被动过就接着往下一档（按多下轮换），动过相机再按 = 从第一档起。 */
    private zoomCycle;
    zoomTo(): void;
    /** 放大镜的档（只有合法的才入档）。 */
    zoomStages(): {
        key: string;
        label: string;
        b: {
            min: Pt3;
            max: Pt3;
        };
    }[];
    private camKey;
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
    /** 手势进行中（含点两下的 armed 态）：相机动了要按笔的屏幕位置重算预览（B23，2026-10-24）。 */
    gestureInProgress(): boolean;
    /** 指针下的实体是否已在选区里（右键 = 不在就先选它，SU 同款）。 */
    hitInSelection(hit: HitResult3): boolean;
    /** 把选区扩成连通体（SU「选择 → 所有相连」）。 */
    selectConnected(): boolean;
    /** 线稿风格：pixel（默认，原生 GL 线 1 设备像素）/ thick（屏幕像素宽粗线）。本版只活这一次会话（持久化要 user 同意）。 */
    get lineStyle(): LineStyle;
    setLineStyle(s: LineStyle): void;
    /** 线稿粗细（设备像素；1 = 原生线，> 1 = 粗线 + SU 轮廓线）。 */
    get lineWeight(): number;
    setLineWeight(w: number): void;
    toggleProjection(): void;
    private alignSrcs;
    private alignEdges;
    private chargeEdge;
    /** 悬停在「边上」时那条边的两端（世界坐标；给充能用）。 */
    private hoveredEdge;
    private chargePt;
    private trackCharge;
    private revalidateCharged;
    private clearCharged;
    private applyHysteresis;
    private gestureActive;
    /** 手势中 = 影子副本（活动池）+ 整体变换预演；平时 = checkpoint。eraseFace 悬停预告不算手势现实。 */
    private liveWorld;
    /** 基线手：活动池里 checkpoint 之外的新生顶点（追光标者）+ 工具自报的移动集（本地 id 谓词）。 */
    private freshHand;
    /** 预演失败时的复现描述（黑匣子）：工具 + 能重建那一步的参数（活动池本地坐标）。 */
    private previewDescriptor;
    private computeLive;
    /** 整体变换（世界系 X）的预演：选区顶点走影子副本、子池走叠加变换。 */
    private previewXform;
    viewExtras: (() => Partial<ViewState>) | null;
    setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void;
    private drawSuspended;
    batchDraw(fn: () => void): void;
    draw(): void;
    /**
     * A33 断口提示（user 2026-10-24「如果一根直的线中间断了一截，应该有一个垂直的小线段提示一下这里断了，需要weld，不然到游戏引擎了一堆五边面」）：
     * 活动池里 Kernel.isBreakJunction 的顶点 → 世界坐标的点 + 边向（渲染器画屏幕定长的小垂线）。按池版本缓存。
     */
    /** X 轴 +1 个单位处的「1 m / 1 ft」+ Z 轴刻度间距（user 2026-10-25「能不能在x轴+1的地方背景颜色的小字写上1m或者别的单位定义。以及我还是希望z轴有刻度」）。 */
    private unitMarks;
    /** 场景里一个顶点都没有（按场景版本号缓存，不每帧数）。 */
    private emptyCache;
    private sceneEmpty;
    private ticksCache;
    breakTicks(view?: WorldView): readonly {
        p: Pt3;
        dir: Pt3;
    }[];
    resize(dpr: number): void;
    private updateTip;
    private targetBounds;
    pointerDown(ev: ToolPointer): void;
    /** 手势中 = 工具的 dims；否则选中面的面积合计 / 选中边的长度合计；都没有 = ""。 */
    readoutText(): string;
    /** 全选（Ctrl+A，A7）：当前上下文的全部几何 + 直接子 group / 实例。 */
    selectAll(): boolean;
    /** steps 工具做完最后一子步：底座这边的手势残留清干净（锚点 / 光标 / 样本环 / arm / 预演），提示留给工具。 */
    private endStepGesture;
    /** 充能生命周期 = 工具子步（user 2026-10-24「充能只影响下一个按下……充能的生命周期应该是每一下点，是工具的子步的生命周期」）：每次按下 / 松手落定都消费掉，这一子步悬停时再蹭。 */
    private consumeCharges;
    pointerMove(ev: ToolPointer): void;
    /** 手势中的取点（pointerMove 与松开帧共用）：交给当前工具模块。 */
    private trackGesture;
    /** 工具模块的上下文（tool-handler.ts ToolCtx）：底座能力的窄出口；工具只认它。 */
    private makeToolCtx;
    /** 取点悬停（无手势）：画面平面 + 吸附（迟滞）+ 充能。内建的画线 / 矩形 / 圆 / 移动与模块工具共用。 */
    private hoverSnap;
    private projectToPlaneThrough;
    private currentSample;
    private recordSample;
    /**
     * 抬笔结算（A21）——按物理过程判：样本按「同一处」（HOLD_PX 内）分成一段段停留。松开处停留 ≥ FINAL_HOLD_MS → 有意，用松开帧；
     * 否则回看 RELEASE_WINDOW_MS 内结束的停留，取最长的那段（≥ MIN_DWELL_MS 且比松开处停得久）= 用户对齐时停住的地方；都没有 → 松开帧。
     */
    private settledSample;
    /** 意图门开关：屏上拖够 eps.drag 才有意图（intent.ts hasIntent）。 */
    private intentOn;
    pointerUp(ev: ToolPointer): void;
    pointerLeave(): void;
    /** 复制落地：每份 = absorb 载荷 + 子池 copyGroup / placeInstance（移动复制与阵列共用）。 */
    private commitCopies;
    /** 复制模式的几何载荷：被移实体（选区的膜 / 边）抠成快照 → 经本地变换 → absorb 的坐标载荷。 */
    private copyPayload;
    /** 世界系变换 X 作用于：活动池顶点集（move op，本地坐标）+ 子池（transformPool / transformInstance，父空间变换）。 */
    private commitXform;
}
