import { Kernel } from "../kernel/kernel.ts";
import type { BrepSnapshot, EdgeId, FaceEvent, FaceId, Pt3, PtIn } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport } from "./camera.ts";
import type { PointerFrame } from "./pointer-frame.ts";
import { type DrawPlane, type HitResult3 } from "./pick.ts";
import { type SelMode } from "./tools.ts";
import { type ArcGesture } from "./arc-build.ts";
import { type CatsUpToolConfig } from "./tool-config.ts";
import type { ToolHandler } from "./tool-handler.ts";
import { type GridSettings } from "./grid-settings.ts";
import type { CurveParams } from "../kernel/kernel.ts";
import { type LengthUnit, type VcbKind } from "./vcb.ts";
import { type ParamPanelState, type ParamSession, type ParamValue } from "./param-panel.ts";
import type { FaceKey } from "./ops.ts";
import { type LockAxis, type PlaneLock } from "./locks.ts";
import { type Ladder, type ScaleTipView } from "./scale-ref.ts";
import { Renderer3, type LineStyle, type ViewState } from "./render3.ts";
import { type Op } from "./ops.ts";
import { type ImportScene } from "../format/gltf-import.ts";
import type { TriangleCastReport } from "../kernel/from-triangles.ts";
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
    /** 问一句「做 / 不做」（应用内确认框，不用系统弹窗）。慢的事先问、不替 user 决定不做（user 10-26「不要因为性能静默不做，宁愿弹警告问yes no。诚实性问题」）。不给 = 直接做。 */
    confirm?(title: string, message: string, okLabel: string): Promise<boolean>;
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
    keepRing?: boolean;
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
    copy?: boolean;
    entities?: {
        faces: FaceId[];
        edges: EdgeId[];
    }; /** 变换工具：抓的时候几种变换中心（马后炮换变换中心重做）+ 用的是哪种。 */
    pivots?: Record<string, Pt3>;
    pivotUsed?: string;
} | {
    kind: "scale";
    ops: number;
    at: PoolRef;
    froms: Pt3[];
    pools: PoolPick[];
    anchor: Pt3;
    axis: Pt3 | null;
    f: Pt3;
    copy?: boolean;
    entities?: {
        faces: FaceId[];
        edges: EdgeId[];
    }; /** 沿任意方向缩放（变换工具的缩放块，帧可能是斜的）：1 根 = 单轴块、2 根 = 平面块（2026-10-26）；有就按 scalingAlongAxes、f 用 x 分量。 */
    dirs?: readonly Pt3[];
    pivots?: Record<string, Pt3>;
    pivotUsed?: string;
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
}
/** 圆规 / 球规（DT50）：圆心 / 法向（世界）/ 半径 → 参考圆或参考球；VCB 改半径、x5 / 5 = 同心圆。 */
 | {
    kind: "compass";
    ops: number;
    at: PoolRef;
    center: Pt3;
    n: Pt3;
    r: number;
    sphere: boolean;
    copies?: number;
};
/** 修复指令（DT85 作用范围统一 + 传播到子物体）。 */
/** 修复指令 = repairs/ 里一个模块的 id（清单 = repairs/index.ts）。 */
type RepairKind = string;
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
    /** 格点吸附的有效开关（DT51，user 2026-10-25「shift应该是flip snap rule」「还是其实右上应该只管grid snap」）：右上锁钮，按住 Shift 反过来。
     *  管：格点 + 整格长度 + 15° 整角（「15是grid合理」）——都有捕捉阈；几何推断不归它管。 */
    private get gridEff();
    /** 一步（user 2026-10-25「*6 /6的时候undo不对，变成需要一个一个删了」）：入口包在 step() 里，里面提交的 op 并成撤销的一步。 */
    private stepDepth;
    private stepHasOp;
    /** 这一步已提交了几条 / 有没有失败过（一步 = 原子：中途有一条失败 → 这一步已提交的全部回滚、剩下的不再执行；2026-10-26）。 */
    private stepOps;
    private stepFailed;
    /** 数值小窗的默认长度单位（文档级单位设置落地前 = 出厂 m；后缀可覆盖）。 */
    /** A9 方向锁（user 2026-09-06 / 10-24「键盘小箭头控制axis，然后触屏上应该有对应的虚拟键」）：SU 同款 → X / ← Y / ↑ Z / ↓ 解锁；
     *  轴 = 上下文帧（绘图轴 / 组轴）的轴。生命周期 = 一次手势：手势结束 / 换工具 / Esc 就解。只对调用 ctx.applyLock 的工具生效（画线 / 移动 / 卷尺）。
     *  面锁（user 2026-10-25「Shift + 方向键锁平面、矩形工具的平面锁、触屏常驻三颗轴键。 要！」；键位 = ledger A9 的 Blender Shift+X 语义）：
     *  锁到「排除该轴」的平面 = 法向是该轴的面（Shift+→ YZ / Shift+← XZ / Shift+↑ XY / Shift+↓ 光标下那张膜的面）。
     *  先定平面的工具（矩形 / 圆 / 旋转矩形 / 弧 / 旋转 / 量角器，`lock: "plane"`）不吃方向锁：方向键直接锁平面（SU 旋转矩形「按方向键定平面」同款），
     *  平面过首点（ctx.lockedPlane）；沿轴走的工具（`lock: "axis"`）Shift+方向键 = 点投到过锚点的那张面上（ctx.applyLock）。方向锁与面锁互斥。 */
    private _axisLock;
    private _planeLock;
    private _planeLockN;
    private lastPtr;
    private lastMoveEv;
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
    /** 锁的事后约束（求解器本身不动，排序规则归 Fable）：方向锁 → lockToAxis；面锁 → lockToPlane；没锁 = 原样。 */
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
    /** 只看这个（DT44，user 2026-10-25「然后左上角的hierarchy tree可以切换只看该组件」）：进了组 / 组件时，外面的不画、不吸、点不中。本次打开有效；根上无效果。 */
    private _isolate;
    get isolate(): boolean;
    setIsolate(on: boolean): void;
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
    /** 选了面。 */
    hasFaceSelection(): boolean;
    /** 选了点（2026-10-26）。 */
    hasPointSelection(): boolean;
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
    /**
     * 整体变换预演的命中规则：选中的子组 / 子实例（连同组里的实例子树）在世界侧再乘 o.xform。
     * 2026-10-26（user「如果一个component里面的subcomponent被进行移动 增删复制操作，preview会不会坏」；账本「组件里整体移动一个组时，其他实例也实时跟」）：
     * 同一 definition 的**每一份**都跟（当前这份 + 孪生）——每份把「上下文本地的变换」换回自己的世界系；都当「在手里」（不吸、不挡、点不中）。复制影子同理。
     */
    private overrideList;
    /** 命中的全局实体 → 本地实体（活动池）或子池（直接子项）或空。 */
    private classify;
    /**
     * 选中的组 / 组件的轴（世界帧；DT15，user 2026-10-25「如果component在轴被埋在几何里面，如何拾取。不然装配炮塔的时候即使轴都打好了，还是装不进去」）：
     * 原点进吸附当透视点（被几何挡住也能吸）、渲染画一个透视的小三轴。**在手里的不算**（整体变换预演中的那份 = 视图里 overridden 的槽）——
     * 拖着它走时它自己的原点跟着光标跑，再当目标就是自己吸自己（user「会不会自己卡住自己」）。
     */
    private selectedPoolFrames;
    private poolOrigins;
    /** 组件里坐标架另摆了（和组件原点不在一处 / 朝向不同）→ 原点处画淡小三轴（DT86 披露「现在是两个」）；进组时比的是组的坐标架。 */
    private originMarker;
    /**
     * 空组件的小三轴（T11 / DT2，user 10-25「1 同意，以后我们开始做entity了再换」）：导入的空节点（位置标记 / 转轴 / 挂点）没几何，也要看得见、点得中——
     * 透视画（埋在别的几何里也看得见），每根短轴的屏幕长度同选中组件的轴。pick = 它在当前上下文里对应的直接子项（不在上下文子树里 = 只画不点）；自己就是当前上下文的不画（上下文轴已经画了）。
     */
    private emptyMarkers;
    /** 屏上 (sx, sy) 拾取半径里最近的空组件标记（原点或三根短轴的屏幕线段）。 */
    private emptyAt;
    /** 屏幕框里的空组件标记（原点投影在框里）。 */
    private emptiesIn;
    private pickKey;
    /** 槽 → 它所属的、活动上下文的直接子项（组 / 实例）；不在上下文子树里 → null。 */
    private topChild;
    /** 子项在当前视图里的槽键集合（渲染高亮 / 包围盒）。 */
    private slotsOfPick;
    setTool(t: Tool): void;
    cancel(): void;
    /** 上下文的帧（世界坐标）：根 = 绘图轴，进组 = 组的轴。 */
    contextFrame(): Frame;
    orientFrame(): Frame;
    boxIn(f: Frame): {
        min: Pt3;
        max: Pt3;
    } | null;
    addGuideLine(p: Pt3, dir: Pt3): void;
    addGuidePoint(p: Pt3): void;
    eraseGuides(ids: readonly number[]): void;
    /** 清空活动池的参考几何（SU「删除参考线」同款）。 */
    clearGuides(): void;
    hasGuides(): boolean;
    /**
     * 搬坐标架（世界坐标帧进来；DT86，user「坐标架同意 组件原点同意」）：最外层 = 绘图轴；组里 = 组的坐标架；组件里 = 组件的坐标架——都不碰几何。
     * 「改组件原点」会话里（beginComponentOrigin）= 改那个组件的原点（挪几何、每份实例补，世界不动）。提示行说清这次动的是哪一个（默认 + 披露）。
     */
    setContextAxes(frame: Frame): void;
    /** 坐标架工具点一下只换位置时沿用的朝向：平时 = 当前坐标架；改组件原点时 = 那个组件现在的原点。 */
    axesBase(): Frame;
    /** 重置坐标架（工具条「重置坐标架」）：最外层 → 世界；组里 → 它所在那层的坐标架；组件里 → 跟组件原点。 */
    resetContextFrame(): void;
    /** 现在在组件里（不在组里）——「设为组件原点」按钮出不出。 */
    inComponentRoot(): boolean;
    /** 一个组件在整个场景里放了几份（改原点 = 这么多份一起换，提示行披露）。 */
    private copiesOf;
    /**
     * 「设为组件原点」（DT86；user「比起被记住的开关我建议是一个可以随手按一下的按钮」）：把组件原点对到当前坐标架——
     * 挪几何、每份实例补（世界不动；user「原点挪几何，因为是低频commitment」），坐标架回到「跟原点」。一步撤销。
     */
    setComponentOriginToFrame(): boolean;
    /** 改组件原点会话（右键 / 顶部浮条「改组件原点…」）：坐标架工具的同一套点击，落定改的是这个组件。 */
    private originEdit;
    /** 会话还算数吗：换了一层（进 / 出组件、撤销回到别的上下文、新文档）= 作废。 */
    private liveOriginEdit;
    /** 「改组件原点…」的对象：只选了一个 brep 组件（没有散几何）；没有 = null。 */
    private originEditTarget;
    /** 右键 / 顶部浮条出不出「改组件原点…」。 */
    canEditComponentOrigin(): boolean;
    /** 只选了一个组件（没有散几何）→ 开会话；否则 false。 */
    beginComponentOrigin(): boolean;
    /** 会话落定：世界帧 → 那个组件的定义坐标 → setAxes（挪几何、每份实例补）；马后炮给现成位置（同建组件那套）；回到原来的工具。 */
    private commitComponentOrigin;
    /** 组件原点的现成位置（定义坐标；建组件马后炮和改组件原点共用）：包围盒角 / 中心 / 底面中心 / 顶点平均。没内容 = null。 */
    private originPresetPoint;
    private cancelGesture;
    /** Shift 按下 / 松开（DT51：Shift = 把格点吸附反过来）：指针没动也按新规则重算悬停 / 手势预览。 */
    setShiftHeld(on: boolean): void;
    /**
     * 会话跟着撤销走（user 2026-10-26「变换的时候按ctrl z不应该选区也没了」→ 同日「undo似乎全坏了…涉及组件的修改进出之类的」「不要ad hoc，而是思考系统重新设计」）：
     * 每一步记下它之前的会话 = 在哪个组件里 + 选区（第一条 op 提交时，交给 History 存）；撤销 = 场景和会话一起回到「之前」并顺手记下「之后」，重做 = 一起回到「之后」。
     * 所以撤销组件里的改动时人会回到那个组件里（看得见撤了什么），选区也回来。id 在同一份历史里是确定的（重放同一串 op），还原回去的 id 指的就是同一批东西；
     * 不存在的 id 剪掉；那一层组件已经没了（撤到建组件之前）= 退到还在的最深一层。设计稿 ai-docs/20261026-undo-session-redesign.md。
     */
    private sessionSnap;
    private sessionRestore;
    /** 场景里还在的最深一层上下文（实例链从尾往前剪；组不在了 = 那个实例的根）。 */
    private validCtx;
    private ctxKeyOf;
    private selSnap;
    private selRestore;
    /** 用户的一个动作：fn 里提交的全部 op 并成一步（撤销 / 重做一次走完）。可嵌套（外层说了算）。 */
    private step;
    /** 所有改场景的用户手势走这里：记账（op 日志，按坐标寻址）+ 应用。 */
    private commitOp;
    /** 一步中途失败：把这一步已经提交的 op 撤掉（回到这一步之前，连会话），丢掉重做队列，这一步剩下的提交一律不执行。 */
    private rollbackStep;
    private bump;
    /**
     * 换场景的唯一入口（2026-10-26 撤销重设计）：换场景 → 校正所在的组件（退到还在的最深一层）→ 剪 / 还原选区 → 充能点重核。
     * **这里不通知界面**——调用方在这之后才关参数小窗、刷新 HUD。以前撤销先关小窗（会刷新界面、读「当前在哪个组件」）后校正：
     * 在组件里一路撤、撤过「建出 / 复制出这个组件」那一步就抛错，撤到一半停住（历史已退、场景已换、人卡在不存在的组件里）。
     */
    private installScene;
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
    /**
     * 导入外来 glb（T11 / DT2）：节点树原样变成组件，挂在当前上下文下面（文件坐标 = 世界坐标，同 OBJ）；三角 → 膜在这里跑（锐角阈值 = 油漆桶 / 拍平同一个量），
     * 装好的膜随 op 走（撤销重放只做装载）。成功 → 选中导进来的那一份 + 右下角参数小窗（DT84：上方向 / 文件单位，改了 = 撤掉按新值重做 = 预览）。
     * 失败 → 人话原因（不提交）。
     */
    importForeign(data: ImportScene): {
        ok: true;
        cast: TriangleCastReport;
        empties: number;
        instances: number;
    } | {
        ok: false;
        reason: string;
    };
    pointerHitDistance(sx: number, sy: number): number | null;
    /** 选择工具的拾取（点击族共用）：屏幕坐标 → **全局**实体 id（WorldView）。 */
    pickAt(sx: number, sy: number, opts?: {
        soft?: boolean;
    }): HitResult3;
    private _xray;
    get xray(): boolean;
    setXray(on: boolean): void;
    /**
     * 选择扩张（SU 点击族：单击 / 双击 / 三击）：stage 0 = 命中实体本身；1 = 膜 + 其环边；2 = 连通体。命中子 group / 实例 = 选它整体。
     * 点（2026-10-26）：单击 = 这个点；双击 = 连着它的线；三击 = 连通体。
     * mode = 怎么合进已有选区（替换 / 加选 / 减选 / 切换，对齐 Blender）；空命中 + 替换 = 清选区。hit 是 WorldView 的全局 id。
     */
    selectExpand(hit: HitResult3, stage: 0 | 1 | 2, mode?: SelMode): boolean;
    /** 组 / 组件按 mode 合进选区（切换 = 逐个）。 */
    private mergePools;
    /** 反选（Blender Ctrl+I）：当前上下文里没选的面 / 边 / 子组 / 组件；点和参考几何清掉。隐藏的不选。 */
    invertSelection(): boolean;
    /** 全不选（Blender Alt+A；Esc 也行）。 */
    deselectAll(): void;
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
    private deleteSelectionStep;
    /** 选区 → group（选中的膜 / 边搬进新 group；子 group / 实例选区一并进组——先建组再把它们挪进去）。 */
    makeGroup(): boolean;
    /**
     * 选区 → component（新 definition + 一个实例）。轴默认 = 底面中心（2026-10-26 user「忍不了了哈哈，组件默认是底部中心轴可以吗」；以前 = 包围盒最小角，SketchUp 同款）。
     * 之后右下角马后炮可换原点（user 2026-10-25「建立组件的时候能不能马后炮选择一下轴的居中模式」）：包围盒角 / 包围盒中心 / 底面中心 / 顶点平均——
     * = 撤销建组件、重做建组件 + 给新组件换轴（v0.14.5 组件换轴：世界不动）。
     */
    makeComponent(name: string): boolean;
    /** 选区里一起装进新组 / 新组件的子组和组件（SketchUp 同款嵌套，user 2026-10-26「当然要」）：锁定的不动（提示一句）。 */
    private nestPicks;
    private makeComponentStep;
    /** 炸开选中的子 group / 实例。 */
    explodeSelection(): boolean;
    private explodeSelectionStep;
    /** 再放一份选中实例的定义（复制 = 同定义新实例，偏移 delta 世界向量）。 */
    copyInstance(delta: Pt3): boolean;
    private copyInstanceStep;
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
    private lockSelectionStep;
    /**
     * 范围里的断口（共线、只连两段、两边挂的面一样 = 画面上的小鼓包）：有散几何选区 = 选区里的点；scope = "context" 或没选 = 当前在编辑的物体里全部。
     * 纪元排期 T7 / DT5（user「他们语义上就是一个东西，只是作用域……不同」：和焊边橡皮的共轴那支同一个动词）。
     */
    /** 含子物体（会话记住；参数小窗里改它）。 */
    private repairChildren;
    /**
     * 修复指令修哪些池。有选区 = 活动池里选中的面 / 边 / 点 + 选中的组 / 组件；没选 = 当前在编辑的整个物体（活动池；含子物体时 + 它下面的组、组件，一层层往里）。
     * 组件按定义去重：几条路径到同一个定义只修一次（没有环——放实例时就拒了）。锁着的那份不往里走；别的没锁的路能到照修。
     * 组不是物体，选中的组连同它下面的组一起算；组里放的组件看「含子物体」。
     */
    private repairScope;
    /** 提示行的「作用于」那半句（披露）。 */
    private scopeText;
    /** 修复模块（repairs/）用的窄接口：模块不碰 Editor 本体。 */
    private get repairCtx();
    /** 这个修复模块在不在清单里（☰ 里的老入口按它显隐：模块扔了不报错）。 */
    repairLoaded(kind: RepairKind): boolean;
    private repairModule;
    /** 编辑条上的修复入口（有菜单的模块、按现在的范围数出来 > 0 的）：main.ts 照着画。 */
    repairMenu(): {
        id: string;
        label: string;
        icon: string;
    }[];
    /** 各修复指令在一个池里要做的事（纯规划；不提交）。 */
    private repairPlan;
    /** 「吸到格点」格子边长的选项：第一项 = 画图用的那个格子；后面按文档的格子制式给常用档（公制 / 英尺英寸）。值 = 米数的字符串。 */
    private snapStepChoices;
    /** 画图吸附用的那个格子边长（格距 ÷ 细分；「吸到格点」的默认）。 */
    private gridFineStep;
    /**
     * 「吸到格点」的格子（池本地坐标 → 格子坐标）。own = 这个池自己的坐标架（根 = 绘图轴、组 = 组的坐标架、组件 = 定义的坐标架，没摆过 = 组件原点）；
     * world = 根上的绘图轴（= 在根上看到的格子），经当前上下文 + xf 换到这个池里。
     */
    private snapLattice;
    private repairDefaults;
    private repairCountCache;
    /** 菜单上的数字：按现在的范围（含子物体按会话记住的）这条修复指令会碰几处。按场景版本 + 选区签名缓存（菜单每次重画都问）。 */
    repairCount(kind: RepairKind, scope?: "auto" | "context"): number;
    /** 一条修复指令这一次做了什么（提交 op，不出提示）。failed = 被拒（报错已出）。 */
    private runRepair;
    /** 各修复指令自己的参数（马后炮里改）。 */
    private repairFields;
    /** 跑一条修复指令：一次 = 一步（原子）；之后右下角参数小窗（含子物体 + 这条指令自己的参数），改了 = 撤掉按新值重做。返回碰了几处。 */
    repair(kind: RepairKind, scope?: "auto" | "context"): number;
    /** 大物体上擦线的量级估计。v0.15.4 擦边局部化（Fable 账单 T2）之后坦克（3.2 万面）擦 50 条 45 ms、200 条 76 ms（以前 95 s），按面数线性推算（剩下的是一次扫边）。量纲：秒。 */
    private static readonly ERASE_REF;
    /** 估计超过这么多秒才问（量纲：秒；AI 定的门槛）。 */
    private static readonly ERASE_ASK_SECONDS;
    private eraseEstimate;
    private eraseAskText;
    private repairNow;
    /** 「检查」的门槛：弯折 ≤ 这么多度的软边 = 看起来平、其实被折过（折线层是有意折的，不算）。量纲：度。 */
    private static readonly SUBTLE_FOLD_DEG;
    /** 修复面板里跑的顺序 = 清单顺序（repairs/index.ts 头注释说为什么是这个顺序）。 */
    private static readonly REPAIR_ORDER;
    /** 当前的修复面板会话（马前炮或应用后的马后炮）；它在右下角开着时才画「检查」高亮。 */
    private repairSession;
    private repairInspect;
    repairPanelOpen(): boolean;
    /** 选区 / 场景版本签名（修复计数的缓存键）。 */
    private repairKey;
    private subtleCache;
    /** 「检查」：范围里看起来平、其实折过的软边（弯折 ≤ SUBTLE_FOLD_DEG，两侧都是面；折线不算）。按池给（键 = poolKey）。 */
    private subtleFolds;
    /** 菜单上露不露「修复…」：有任何一步会碰东西，或者有要检查的小伤。 */
    repairWorth(): boolean;
    private quickCache;
    /** 菜单上的数：模块有便宜数法（quickCount）就用它（大模型上每步都要算），没有就用完整规划的 count。 */
    repairMenuCount(kind: RepairKind, scope?: "auto" | "context"): number;
    /** 「检查」高亮：画面上的边 id（每个画到这些池的槽都算）。修复面板没开 / 检查关着 = null。 */
    private inspectHighlights;
    /** 打开修复面板（马前炮）。 */
    beginRepairPanel(): void;
    /** 兼容老入口（☰「焊接全部断口」/ 选区「焊接断口」）。 */
    weldAllBreaks(scope?: "auto" | "context"): number;
    /** 兼容老入口（☰「拍平几乎共面的面」/ 选区「拍平」）。 */
    makePlanar(scope?: "auto" | "context"): number;
    /** 选中的组件里有被缩放过的（应用缩放钮出不出）。 */
    hasScaledInstanceSelection(): boolean;
    private scaledInstancePicks;
    /**
     * 应用缩放（2026-10-26，user「这样的话我们需要一个apply scale」）：选中组件的缩放烘进组件本身的几何，这一份只剩旋转 + 平移；
     * 同一组件的别的份乘反比补偿，看起来不变。组件里有转过的子组件时会斜切 → 护栏拦下并说明。一次 = 一步。
     */
    applyScaleSelection(): boolean;
    hasHideableSelection(): boolean;
    /** 藏起选区（每处一条 op，一步撤完）。返回藏了几样（实例 + 面 + 线）。 */
    hideSelection(): number;
    private hideSelectionStep;
    /** 整个场景里被隐藏的东西：组件份数 + 面 + 线（视图菜单「全部显示（N）」用）。 */
    hiddenCount(): {
        instances: number;
        faces: number;
        edges: number;
    };
    /** 全部显示（一条 op，可撤销）。返回放回了几样。 */
    unhideAll(): number;
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
    paintFaces(faces: readonly FaceId[], sides?: readonly (0 | 1)[]): void;
    /** 吸色：把这张面这一侧的材质设成油漆桶当前「蘸的」（没材质 = 默认灰）。 */
    pickMaterialOf(face: FaceId, side?: 0 | 1): void;
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
    private gizmo;
    /** 指令预演（镜像）：跑在活动内核的克隆上；开着时 liveWorld 画影子内核（没有手势也画）。 */
    private cmdPreview;
    private cmdGhosts;
    mirrorActive(): boolean;
    /** 镜像…：作用在选区（散几何 + 选中的组件实例）上；没有可镜的 → false。 */
    beginMirror(): boolean;
    private endMirror;
    private refreshCmdPreview;
    /** 镜像会话里的指针：按在把手上就拖；别处不动作（视角照转，由手势层管）。返回 true = 吃掉了。 */
    private gizmoPointer;
    private param;
    /** 小窗现在要画的参数会话（null = 没有）；马后炮在这一步之后又提交过别的 / 撤销过就自动作废。 */
    paramPanel(): ParamPanelState | null;
    setParam(key: string, value: ParamValue): void;
    pressParam(key: string): void;
    /** 换一个会话（旧的收尾）；null = 关掉。 */
    openParamSession(s: ParamSession | null): void;
    /**
     * 移动 / 旋转 / 缩放 / 变换落定之后的马后炮（user 2026-10-26「移动旋转也是ctrl复制开关吧。以及马后炮都能override」）：
     * 「复制」开关（事后改成复制 / 不复制）+ 变换工具的「变换中心」；改了 = 撤这一步、按新选项重做（和数值小窗的重做同一套：按坐标、复制走 commitCopies）。
     * 数值小窗改完数之后会再挂一次（读最新的 last），所以两边能接着改。
     */
    private offerXformAfterthought;
    /** 马后炮：刚提交的那一步（nOps 个操作）还能按新参数重做。note = 说明行（按当前值现算）。 */
    private offerAfterthought;
    /** 每一步记下来之后挂哪种马后炮：变换类（复制 / 变换中心）、圆 / 弧（段数）。 */
    private offerLastAfterthought;
    /** 圆：按新的边缘点 / 段数重画（数值小窗和段数马后炮共用；调用方已撤掉上一步）。 */
    private redrawCircle;
    /** 弧：按新的手势量重画（同上）；构不出来 = null，什么都不提交。 */
    private redrawArc;
    /**
     * 圆 / 弧画完的马后炮（纪元账本 DT95，user 2026-10-26「马后炮选择段数的时候给一下公差和试用对象参考。加上次世代和lowpoly的推荐值」）：
     * 档位（数据 = segment-tiers.json）+ 段数；说明行 = 这个段数的弦高公差 + 对上的那一档适用什么。改了 = 撤这一步、按新段数重画，并记进工具选项（同数值小窗 24s）。
     */
    private offerSegmentsAfterthought;
    /** 选区（散几何 + 选中的组 / 组件）的全部顶点（世界坐标）。 */
    private selectionWorldPoints;
    /** 选择中心：bbox = 包围盒中心（Blender 默认）；mean = 顶点平均（Blender 的 median point）。 */
    selectionCenter(algo?: "bbox" | "mean"): Pt3 | null;
    private static centerOf;
    /** 把当前上下文的轴原点挪到选择中心（朝向不变）；之后右下角马后炮可换算法。没选区 → false。 */
    axesToSelectionCenter(algo?: "bbox" | "mean"): boolean;
    private axesToSelectionCenterStep;
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
    private applyVcbStep;
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
    /** 这次预演会把哪个组件斜切（拖的时候就提示「松手会被拦下」；提交时 ops.ts 的护栏真拦）。 */
    private previewShear;
    private computeLive;
    /** 整体变换（世界系 X）的预演：选区顶点走影子副本、子池走叠加变换。 */
    private previewXform;
    /**
     * 选区的变换中心（变换工具的「变换中心」选项 / 马后炮）：最后选的物体原点 = 选区里最后选中的那个组 / 组件的轴原点（Blender 的 Active Element；选区按选的先后存），没选组 / 组件 → 包围盒中心。
     * 自动 = 只选了一个组 / 组件（没有散的面 / 边）→ 它的轴原点；别的 → 包围盒中心。
     */
    private pivotOf;
    /** 选中的点（世界坐标；只画点本身）。 */
    private selVertsView;
    viewExtras: (() => Partial<ViewState>) | null;
    setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void;
    private drawSuspended;
    batchDraw(fn: () => void): void;
    draw(): void;
    /**
     * A33 断口提示（user 2026-10-24「如果一根直的线中间断了一截，应该有一个垂直的小线段提示一下这里断了，需要weld，不然到游戏引擎了一堆五边面」）：
     * 活动池里 Kernel.isBreakJunction 的顶点 → 世界坐标的点 + 边向（渲染器画屏幕定长的小垂线）。按池版本缓存。
     */
    /** X 轴上一格处的「一格多长」（原「1 m / 1 ft」）+ Z 轴刻度间距（user 2026-10-25「能不能在x轴+1的地方背景颜色的小字写上1m或者别的单位定义。以及我还是希望z轴有刻度」）。 */
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
    private pointerDownStep;
    /** 手势中 = 工具的 dims；否则选中面的面积合计 / 选中边的长度合计；都没有 = ""。 */
    readoutText(): string;
    /** 全选（Ctrl+A，A7）：当前上下文的全部几何 + 直接子 group / 实例。 */
    selectAll(): boolean;
    private selectAllInner;
    /** steps 工具做完最后一子步：底座这边的手势残留清干净（锚点 / 光标 / 样本环 / arm / 预演），提示留给工具。 */
    private endStepGesture;
    /** 充能生命周期 = 工具子步（user 2026-10-24「充能只影响下一个按下……充能的生命周期应该是每一下点，是工具的子步的生命周期」）：每次按下 / 松手落定都消费掉，这一子步悬停时再蹭。 */
    private consumeCharges;
    pointerMove(ev: ToolPointer): void;
    private pointerMoveStep;
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
    private pointerUpStep;
    pointerLeave(): void;
    /** 复制落地：每份 = absorb 载荷 + 子池 copyGroup / placeInstance（移动复制与阵列共用）。 */
    private commitCopies;
    /** 复制模式的几何载荷：被移实体（选区的膜 / 边）抠成快照 → 经本地变换 → absorb 的坐标载荷。 */
    private copyPayload;
    /** 世界系变换 X 作用于：活动池顶点集（move op，本地坐标）+ 子池（transformPool / transformInstance，父空间变换）。 */
    private commitXform;
}
