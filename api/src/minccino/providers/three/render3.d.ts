import type { RenderProvider, XRFacade, XRHand, XRRigPose, XRRay, LineStyle, ProviderCaps, FrameInput } from "../../index.ts";
import { type BudgetReport, type Measurement, type StreamProvider, type View, type ViewportSize } from "../../index.ts";
import { type PerfSink } from "../../perf.ts";
import { type PresetId } from "../../preset/index.ts";
export declare class Renderer3 implements RenderProvider {
    readonly name = "three";
    private renderer;
    private scene;
    private camOrtho;
    private camPersp;
    private dpr;
    private flatRes;
    private resolution;
    private lineMats;
    private lineMatPx;
    private faceMat;
    private pixelMat;
    private edgeDimMat;
    private pixelDimMat;
    private texMats;
    private slotNodes;
    /** 块（流契约 Chunk.id）→ 显卡几何：两代没人用的释放。池网格本体住编辑器那边的流提供者（stream-provider.ts），这里只有显卡副本。 */
    private chunkGpus;
    private provider;
    /** 这一帧的视图对象（画到哪 + 分辨率 + 预算 + 画质档；Minccino 契约 View）和 frame graph 的规划（哪些 pass 跑）。探针 / 血槽位读。 */
    lastView: View | null;
    /** 血槽位（步 7）：上一帧实测（毫秒 / 显存估算 / draw call / 三角）和预算核对（超了哪几项 + 一句披露；披露的 UI 归 Opus / 上线后）。 */
    lastMeasurement: Measurement | null;
    lastBudget: BudgetReport | null;
    lastPlan: {
        order: readonly string[];
        pruned: readonly string[];
    } | null;
    private syncGen;
    private poolKey;
    /** 提供者没给内容键时的帧号（= 每帧都拉）。 */
    private frameNo;
    private emptyGeo;
    private emptyLineGeo;
    private texCache;
    private faceMatOther;
    private faceMatFront;
    private faceMatOtherFront;
    private edgeMat;
    private lineStyle;
    /** X 光（DT17）：开着 = 池的边透过面画淡的、选中的边不被挡。 */
    /** 被挡住的边（edgeHidden 标记，刀 d）：深度模式 hidden（深度大于才画）+ 半透明，画在模型那一层。 */
    private hiddenPixelMat;
    private hiddenThickMat;
    private lineWeight;
    private readonly profileAdd;
    /** 风格（Tron 第 1 步；预设 = 数据，minccino/preset/）。白模 = 原来那一条渲染。 */
    private preset;
    /** 这一帧真正生效的预设（XR / 截图 = 白模）。 */
    private framePreset;
    private readonly unlitU;
    private pixelScreen;
    private aoBaker;
    private paper;
    private tron;
    private lastTarget;
    private bloom;
    private envSky;
    private pbr;
    private aoSeen;
    private aoBaked;
    private aoChangedAt;
    private aoTimer;
    /** 每画完一帧：预算核对 + 实测（app 层的血槽位披露接它）。 */
    onMeasured: ((b: BudgetReport | null, m: Measurement) => void) | null;
    /** 后端自己想再画一帧（遮蔽停手后重烘好了）：app 层接 editor.draw。 */
    onRedrawWanted: (() => void) | null;
    private overlayLines;
    private overlayMarks;
    /** 计时口（消费方递进来的计数器；不给 = 不计）。 */
    private readonly perf;
    private gridMesh;
    private gridMat;
    private axesObj;
    private gridKey;
    private scratchV;
    private scratchV2;
    private scratchM;
    private tmpColor;
    private rig;
    private controllers;
    private grips;
    private hands;
    private pointerVis;
    private wrist;
    readonly xr: XRFacade;
    constructor(canvas: HTMLCanvasElement, perf?: PerfSink);
    caps(): ProviderCaps;
    dispose(): void;
    /** XR 画质（会话开始前设才生效；dev A/B 用）。foveation 0=全分辨率…1=周边最低；framebufferScale 相对设备推荐值。 */
    setXRQuality(q: {
        foveation?: number;
        framebufferScale?: number;
    }): void;
    /** rig 姿态（player 每帧同步；heading 绕 Z、origin 世界坐标）。 */
    setRig(pose: XRRigPose): void;
    private ctrlIndex;
    /** 控制器射线视觉：长度（到命中点）与颜色；null = 隐藏。光标球半径 ≈ 0.23° 角（1 m 处 4 mm）。 */
    setPointerVisual(hand: XRHand, v: {
        length: number;
        color: number;
    } | null): void;
    /**
     * 手腕面板：挂在 hand 手的 grip 上（grip 空间：原点掌心、−Z 沿手柄向前、+Y 手背向上）。面板贴在手背上方偏向手腕，
     * 法向 +Y（手背朝天时正对眼睛）；纹理 = 传入的 canvas（UI 显示用途的 canvas 2D）。
     */
    attachWristPanel(canvas: HTMLCanvasElement, widthM: number, heightM: number, hand: XRHand): void;
    detachWristPanel(): void;
    updateWristTexture(): void;
    /** 世界射线 ∩ 面板平面 → 面板 uv（u 右 0..1、v 下 0..1，与 canvas 像素同向）及距离；不在面板内 → null。 */
    wristHit(ray: XRRay): {
        u: number;
        v: number;
        dist: number;
    } | null;
    private subtitle;
    attachSubtitle(canvas: HTMLCanvasElement, widthM: number, heightM: number): void;
    detachSubtitle(): void;
    /** XR 会话中 HMD 的世界位置（marker 尺寸用；返回共享 scratch，勿保存）。 */
    private xrEye;
    /** 连续渲染循环（步行模式 / XR 会话）；null = 停（回到按需 draw）。three 的 setAnimationLoop 才能收 XR 帧。 */
    setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void;
    resize(vp: ViewportSize, dpr: number): void;
    /** 粗线 resolution / linewidth：桌面 = canvas 设备像素 + DPR；XR = 每眼 viewport（每帧，WebXRManager 在回调前写好）。 */
    private syncLineScale;
    /** 世界单位/CSS 像素（在点 p 的深度处）——指示物按屏幕尺寸定大小用。XR：按到 HMD 的距离与 XR_PX_PER_DEG 折算。 */
    /** 调试 / 探针：现在挂着哪些字（id → 位图键 = 样式|dpr|文字）。 */
    labelKeys(): {
        id: string;
        key: string;
    }[];
    private worldPerPx;
    /**
     * 远处能看到多远（世界长度，从视野中心 target 量）：透视 = 远平面，正交 = 深度窗口半宽。无限长的线（参考线 / 充能延长线）画到这么远；
     * 和远平面一起按**场景包围球**定（2026-10-26，user「不应该写死特征长度。我们的普朗克长度到哈勃半径也跨了蛮多数量级了」：
     * 以前远平面 = 眼距×40 + 100 m、正交窗口下限 500 m、参考线 ±200 m——100 m / 500 m / 200 m 在毫米零件和公里场景两头都不对）。
     */
    private viewReach;
    /** 无限长直线（过 p、方向 dir 单位）的可画两端：从离视野中心最近的那点往两边各 viewReach + 那点到中心的距离。 */
    private infLine;
    /** 画无限长线的缓存键：视野范围按对数分档、中心按范围量化（相机大挪才重建）。 */
    private reachKey;
    private syncCamera;
    render(input: FrameInput): void;
    /** 平涂的材质 / 地面 / 遮蔽烘焙器：第一次有预设要它们时才建（要在拉流之前：槽节点换材质要用）。 */
    private ensurePaper;
    /**
     * 平涂 / 地面 / 遮蔽（剪纸 · 色纸）：预设要地面或遮蔽才建。遮蔽 = 后台作业的小学版：内容键（提供者给）变了先记下，停手 AO_QUIET_MS 才重烘
     * （拖着改的时候影子停在上一份，停手后跟上；第一次立刻烘）；烘的时间记在 perf.last["aoBake"]。场景是空的（没有包围球）= 不烘、不遮。
     */
    private syncPaper;
    /**
     * 风格那条路（Tron 第 1 步：像素描边）：① 模型画进小图（画布设备像素 ÷ k，k = 像素化 × 设备像素比取整，整数倍）——相机用 view offset 让小图恰好盖住
     * 「k × 小图」那么大一块，画布外多出来的那一点裁掉，叠加层和小图逐像素对齐；② 描边（后处理挂点）③ 最近邻放大回画布并写回深度 ④ 叠加层那一层
     * （网格、三轴、选中边、吸附、gizmo、文字、X 光线）按原分辨率画在上面，被写回的深度挡。选中 / 悬停的面是槽里的节点，跟着模型一起像素化。
     */
    private renderStyled;
    /**
     * 离屏截图（缩略图；转正纪元 2026-09-20）：渲到 w×h 的 render target 再 readRenderTargetPixels。
     * 返回 RGBA、行序**自上而下**（three 读回是自下而上，这里翻好）。XR 会话中不截（相机归 XR）。
     */
    captureRgba(input: FrameInput): Uint8Array;
    /**
     * 全部膜 → 几何：无贴图材质的一份（三角汤 + 法向 + sRGB 顶点色 = 材质颜色 × 状态色），每种贴图材质一份（+UV）。
     * 平滑组（0.8，user「平滑组是一个很重要的概念，好好设计一下」）：被 **smooth** 边连起来的膜 = 一个平滑组，组内顶点法向 = 含该顶点的膜法向按内角加权平均；
     * soft（不画线）与 smooth（插值法向）是两个独立的边层（SU 的 Soft / Smooth），推拉侧棱两者都给、软化工具默认两者都给。
     */
    private textureFor;
    /** 贴图的 uniform 对象（风格的材质共用：解码完换贴图时在同一个对象里换值）。 */
    private texU;
    private texUniform;
    /** 贴图异步解好后的回调（app 层接 editor.draw）。 */
    onTextureReady: (() => void) | null;
    /** 线稿风格（视图菜单「粗线稿」）：池的边换粗线 / 像素线 = 重拉一次（块不变，槽节点换几何）。 */
    setLineStyle(style: LineStyle): void;
    /** 这一帧的 pass 声明：白模 = 膜 + 边直接画进 frame；风格 = 场景画进小图 → 后处理 → 放大（minccino/preset presetPasses）。地面网格 / 叠加层 / X 光往 frame 上追加画。开关 = 在不在表里。
     *  XR 会话里先只走白模（风格的小图 / 放大还没接两只眼——视图菜单那行的提示写着）。 */
    private passes;
    /** 这一帧该用的预设：XR 会话里 / 截缩略图时 = 白模。 */
    private currentPreset;
    /** 风格（视图 ☰「风格」）：换了 = 重拉一次（线稿画不画）、面 shader 换明暗档、贴图换过滤。 */
    setPreset(id: PresetId): void;
    getPreset(): PresetId;
    /** 贴图过滤跟预设走（像素风 = 最近邻；不改资产，只改采样）。 */
    private applyTexFilter;
    /** 缩略图截图时只画白模（缩略图 = 模型，不是视图）。 */
    private capturing;
    getLineStyle(): LineStyle;
    /** 实际画的线：像素化的风格（像素描边等）锁成原生 1 像素线——光栅器自己的 Bresenham = 像素准确；粗线是三角形拼的，放大后台阶不匀（user 10-29「调成1px就lineart perfect了……像素的时候锁1px加这么一条风格覆盖」）。Tron 例外：它自己的发光粗线。 */
    lineStyleInUse(): LineStyle;
    /** 线稿粗细（设备像素）：1 = 原生线；> 1 = 粗线 + SU 轮廓线。 */
    setLineWeight(w: number): void;
    getLineWeight(): number;
    /** 探针：叠加层线段族里某个 id（lockLines / soft / guides / …）这一帧画着没有。 */
    overlayVisible(id: string): boolean;
    /** 引擎这边的入口：流提供者（编辑器那边的 EditorStreamProvider；骨架稿 v2 不变量 2：引擎拉、提供者吐）。 */
    setProvider(p: StreamProvider): void;
    /** 拉一帧流 → 块进显卡 → 每个放置一组槽节点（矩阵 + 按活动 / 淡出 / 单面挑材质和几何）。 */
    private syncPools;
    private syncMarks;
    /** 线的材质槽（刀 c：只有 edgeDim）：白模的边 → 淡出那份；别的风格（Tron）的线材质自己不认淡出 = 照旧。 */
    private lineSlotMaterial;
    private static readonly MARK_SLOTS;
    private applyMarks;
    private dropMarked;
    private markMats;
    /** 标记的材质 = 这个槽的面材质 + SEL / DIM 变体（同一套 shader / uniforms / 深度偏移；每个风格的 shader 自己说变体长什么样：白模 = 换成状态色 / 往淡出色拉一半、写实 = 叠色、Tron = Clu 橙 + 辉光）。uMark = 调色板里那个槽位的颜色。 */
    private markMaterial;
    private makeSlotNodes;
    private texMatFor;
    /** 一块面 → 显卡。版本没变 = 不碰；数组换过 / 长大了 = 重建几何（直接包块的大数组，不拷）；否则只传改过的段。 */
    private uploadFaces;
    /** 一块线 → 显卡：粗线 = LineSegments2 的实例缓冲（seg / col / w1 / w2 / flag），像素线 = 普通顶点缓冲。 */
    private uploadLines;
    /** XR：key light 钉在 HMD 相机系（同 keyLight 公式）。 */
    private xrKeyLight;
    /** 共享粗线材质（resolution 共享 Vector2；linewidth 由 syncLineScale 每帧按 lineScale 写）。offset=true：深度前拉，共面线赢面。 */
    /** 一组小三轴（每个帧：原点出三根屏幕定长 POOL_AXES_PX 的短轴，RGB = XYZ）；key 没变就不重建。返回新 key。 */
    /** 锁着时的轴线：每根过 through、两头各伸 LOCK_LINE_SPAN_PX 屏幕像素那么长（按那一点的一像素多长换算）；颜色 = 轴色，斜面 = 中性灰。 */
    private lineMat;
    /**
     * 地面网格 = 一张 shader 平面（GRID_FRAG；0.13.23 起不再一条条线）+ 三色轴一份粗线（SU 约定：X 红 / Y 绿 / Z 蓝向上）。
     * 0.11 ⑤ 起跟帧与格距走：平面贴在帧的 XY 面上、过帧原点；格距 / 细分是 uniform。网格关着时只画 1 m 主线（sub = 1）。
     */
    private rebuildGrid;
}
