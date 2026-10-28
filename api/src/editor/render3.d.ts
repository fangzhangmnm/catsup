import { type WorldLabel } from "./world-labels.ts";
import type { EdgeId, FaceId, Pt3 } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import { type Frame } from "../scene/xform.ts";
import type { GuidesWorld } from "../scene/guides.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
import type { Snap3 } from "./pick.ts";
import type { RigPose } from "../player/player.ts";
import type { Ray } from "../player/world-query.ts";
/** XR 会话面（vr.ts 消费；three 对象一律 any，不出本文件）。 */
export interface XRFacade {
    isPresenting(): boolean;
    setSession(session: XRSession | null): Promise<void>;
    session(): XRSession | null;
    frame(): XRFrame | null;
    refSpace(): XRReferenceSpace | null;
    on(type: "sessionstart" | "sessionend", cb: () => void): void;
}
export type XRHand = "left" | "right";
export declare const PALETTE: {
    readonly background: 15921386;
    readonly face: 14079702;
    readonly faceSelected: 9417960;
    readonly faceHover: 11980784;
    readonly faceDim: 15329769;
    readonly edgeDim: 12105912;
    readonly edge: 2763306;
    readonly edgeWire: 1118481;
    readonly edgeSelected: 2845872;
    readonly edgeHot: 13382451;
    readonly edgeWarn: 14251782;
    readonly grid: 14276303;
    /** 网格正片叠底的系数色（× 背景 ≈ 原 grid 灰）：主线 / 细线；压在深色材质上只暗 ~10% / ~5%。 */
    readonly gridMajor: 14934492;
    readonly gridMinor: 15789802;
    readonly axisX: 13382451;
    readonly axisY: 3050327;
    readonly axisZ: 2845872;
};
/** DT15 选中的组 / 组件的轴：每根短轴的屏幕长度（CSS px）。 */
export declare const POOL_AXES_PX = 22;
/** 线稿风格：pixel = 原生 GL 线 1 设备像素（默认）；thick = 屏幕像素宽粗线（LineSegments2）。 */
export type LineStyle = "pixel" | "thick";
/**
 * 线稿粗细（0.12.3；user 2026-10-24「ipad上面细线稿是不舒服。但是粗线稿又太粗了，有1.5这种选项吗」「sketchup里面粗细线是有区分的啊, dangling edge和轮廓是粗线」）：
 * 单位 = **设备像素**。1 = 原生 GL 线（最细、最快，没有轮廓区分）；> 1 = 屏幕空间粗线（LineSegments2，不是 3D 实体），
 * 并按 SU 轮廓线规则加粗：零面边（悬空）/ 单面边（边界）/ 两张面朝向相反的边（剪影）= 轮廓，比内边粗 profileAdd；判定在顶点着色器里按实例做，相机转动不重建几何。
 */
export declare const LINE_WEIGHTS: readonly number[];
export interface ViewState {
    selectionEdges: ReadonlySet<EdgeId>;
    selectionFaces: ReadonlySet<FaceId>;
    scrubEdges: ReadonlySet<EdgeId>;
    /** 修复面板「检查」要标出来的边（橙色；软边也画——标的就是看起来平、其实折过的软边，DT9）。null / 缺 = 没有。 */
    warnEdges?: ReadonlySet<EdgeId> | null;
    hoverEdge: EdgeId | null;
    hoverFace: FaceId | null;
    preview: GeomView | null;
    snap: Snap3 | null;
    snapAnchor: Pt3 | null;
    /** checkpoint 代数（editor.revision）：几何缓存键的一部分。 */
    revision?: number;
    /** 透视近平面下限（第一人称 0.05；轨道默认 0.5）。 */
    near?: number;
    /** teleport 弧线（充能中）：折线 + 合法性 + 落点。 */
    teleport?: {
        points: readonly Pt3[];
        valid: boolean;
        landing: Pt3 | null;
    } | null;
    /** 变暗的池槽序号（进了 group / 组件后，上下文之外的几何；SU 同款淡出）。null = 不变暗。2026-10-21 */
    dimSlots?: ReadonlySet<number> | null;
    /** 缩放柄（世界点；active = 正在拖的那个）。 */
    handles?: readonly {
        p: Pt3;
        active: boolean;
    }[] | null;
    /** 量角器：圆心 + 转轴 + 参考点 + 当前角（弧度）。 */
    protractor?: {
        center: Pt3;
        axis: Pt3;
        ref: Pt3 | null;
        angle: number;
    } | null;
    /** 参考几何（活动池，世界坐标；0.11 尺规纪元）。 */
    guides?: GuidesWorld | null;
    /** 选中的参考线 / 参考点 id（A31）：画成选中色。 */
    guideSel?: ReadonlySet<number>;
    /** A33 断口提示：一根直线中间断了一截的接点（世界坐标 + 边向）→ 屏幕定长的小垂线（焊边橡皮刮一下就没）。 */
    ticks?: readonly {
        p: Pt3;
        dir: Pt3;
    }[] | null;
    /** 世界里的文字（world-labels.ts 深模块；第一个用户 = X 轴 +1 个单位处的「1 m」）。 */
    labels?: readonly WorldLabel[] | null;
    /** Z 轴刻度间距（米；1 m 或 1 ft；user「我还是希望z轴有刻度。可以用那种我们之前用过的小短线」）；null = 不画。 */
    axisTickM?: number | null;
    /** X 轴 +1 个单位处那根小短线（跟「1 m」字一起，只在空场景）。 */
    axisUnitX?: number | null;
    /** 上下文的帧（世界坐标）：不是世界帧时画三色上下文轴。 */
    frame?: Frame | null;
    /** 地面网格（0.11 ⑤）：跟上下文的帧走（user「网格帧 = 绘图轴」），格距 = 网格开着时的 step、否则 1 m；三色轴 = 帧的三轴。不给 = 世界帧 1 m。 */
    grid?: {
        frame: Frame;
        step: number;
        sub?: number;
        on?: boolean;
    } | null;
    /** 选中的点（2026-10-26，user「以及我们还是希望我们能选点」「为什么不是简简单单高亮点？」）：只画实心圆点。世界坐标。 */
    selVerts?: readonly Pt3[] | null;
    /** 全部顶点的小点（自由建模；key 变了才重建）。 */
    vertDots?: {
        key: string;
        pts: readonly Pt3[];
    } | null;
    /** 充能点 / 充能边（0.11.6，user「让充能点有个小标记」）：点画小菱形，边画淡淡的延长线。 */
    charged?: {
        points: readonly Pt3[];
        edges: readonly {
            a: Pt3;
            b: Pt3;
        }[];
    } | null;
    /** 平面 gizmo（镜像面，DT23 / DT26；plane-gizmo.ts gizmoGeom 的输出 + 悬停的把手）：半透明方块 + 描边 + 法线箭头 + 两个转动把手 + 中心，透视画。 */
    planeGizmo?: {
        origin: Pt3;
        normal: Pt3;
        u: Pt3;
        v: Pt3;
        size: number;
        hot: string | null;
    } | null;
    /** 选中的组 / 组件的轴（世界帧，DT15）：透视画小三轴（被几何挡住也看得见），原点可吸。 */
    poolAxes?: readonly Frame[] | null;
    /** 空组件（导入的空节点，T11）的小三轴：常驻、透视画，长度同 poolAxes；点它的标记 = 点它（编辑器 emptyAt）。 */
    emptyAxes?: readonly Frame[] | null;
    /** 组件原点（DT86）：组件里另摆了坐标架、和原点不在一处时，原点处画一个淡小三轴（披露「现在是两个」）；同上画法、半透明。 */
    originAxes?: readonly Frame[] | null;
    /** 变换工具的移动箭头 + 旋转环（transform-gizmo.ts xformGizmoGeom 的输出 + 悬停 / 拖着的把手）：RGB = XYZ，透视画（2026-10-26）。 */
    xformGizmo?: {
        origin: Pt3;
        axes: {
            x: Pt3;
            y: Pt3;
            z: Pt3;
        };
        arrow: number;
        ring: number;
        start: number;
        cube?: number;
        cubeHalf?: number;
        plane?: number;
        planeHalf?: number;
        uniform?: Pt3 | null;
        hot: string | null;
    } | null;
    /** 卷尺预演：量线 a→b + 候选参考线 / 参考点（0.11）。 */
    tape?: {
        a: Pt3;
        b: Pt3;
        guide?: {
            p: Pt3;
            dir: Pt3;
        } | null;
        point?: Pt3 | null;
    } | null;
    /** 切割的刀线（上一个落点 → 光标）：永远画在最上面、不被几何挡（user 10-27「线还是需要画的，以及线不要被别的遮挡了。这样用户知道自己没退出刀」）；valid = 这一刀切得出来。 */
    knifeLine?: {
        a: Pt3;
        b: Pt3;
        valid: boolean;
    } | null;
}
export declare class Renderer3 {
    private renderer;
    private scene;
    private camOrtho;
    private camPersp;
    private dpr;
    private flatRes;
    private resolution;
    private lineMats;
    private lineMatPx;
    private faceMesh;
    private faceMat;
    private faceMatTop;
    private pixelMat;
    private texMats;
    private slotNodes;
    /** 池（poolKey）→ 池网格：通常一个；同一帧一个池要画两个不同的内核（少见）就多开一个。两代没人用的释放。 */
    private poolGpus;
    /** 材质对象 → 小整数（材质槽签名用：槽表只追加 = 池网格增量；别的变化 = 全量）。 */
    private matUids;
    private nextMatUid;
    private syncGen;
    private poolKey;
    private overlayKey;
    private emptyGeo;
    private emptyLineGeo;
    private texMeshes;
    private texCache;
    private faceMeshOther;
    private faceMatOther;
    private faceMatFront;
    private faceMatOtherFront;
    private edgeLines;
    private edgeMat;
    private edgePixel;
    private lineStyle;
    /** X 光（DT17）：开着 = 池的边透过面画淡的、选中的边不被挡。 */
    private xray;
    private xrayPixelMat;
    private xrayThickMat;
    private xrayOverlayMat;
    private lineWeight;
    private readonly profileAdd;
    private hintLines;
    private snapMarker;
    private arcLines;
    private landingRing;
    private handleMarkers;
    private xgLines;
    private xgKey;
    private xgSolids;
    private protractorLines;
    /** 世界里的文字：按 id 管面片（world-labels.ts 出位图；字 / 样式没变不重画）。 */
    private labelSprites;
    private guideLines;
    private tapeLines;
    private knifeLines;
    private knifeKey;
    private gridMesh;
    private gridMat;
    private axesObj;
    private chargedLines;
    private selVertDots;
    private selVertKey;
    private vertDots;
    private vertDotKey;
    private tickLines;
    private poolAxesLines;
    private poolAxesKey;
    private emptyAxesLines;
    private emptyAxesKey;
    private originAxesLines;
    private originAxesKey;
    private gizmoLines;
    private gizmoQuad;
    private gizmoKey;
    private faceKey;
    private edgeKey;
    private hintKey;
    private protKey;
    private guideKey;
    private tapeKey;
    private gridKey;
    private chargedKey;
    private tickKey;
    private kernelIds;
    private nextKernelId;
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
    constructor(canvas: HTMLCanvasElement);
    /** XR 画质（会话开始前设才生效；dev A/B 用）。foveation 0=全分辨率…1=周边最低；framebufferScale 相对设备推荐值。 */
    setXRQuality(q: {
        foveation?: number;
        framebufferScale?: number;
    }): void;
    /** rig 姿态（player 每帧同步；heading 绕 Z、origin 世界坐标）。 */
    setRig(pose: RigPose): void;
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
    wristHit(ray: Ray): {
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
    resize(vp: Viewport, dpr: number): void;
    /** 粗线 resolution / linewidth：桌面 = canvas 设备像素 + DPR；XR = 每眼 viewport（每帧，WebXRManager 在回调前写好）。 */
    private syncLineScale;
    /** 世界单位/CSS 像素（在点 p 的深度处）——指示物按屏幕尺寸定大小用。XR：按到 HMD 的距离与 XR_PX_PER_DEG 折算。 */
    /** 世界里的文字：按 id 增删改面片；位图归 world-labels.ts（字 / 样式 / dpr 没变就沿用）；每帧按 worldPerPx 换算成固定屏幕大小。 */
    private syncLabels;
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
    private boundsKey;
    private sceneSphere;
    private sceneBounds;
    private syncCamera;
    private kernelId;
    render(k: GeomView, cam: OrbitCamera, vp: Viewport, view: ViewState): void;
    /**
     * 离屏截图（缩略图；转正纪元 2026-09-20）：渲到 w×h 的 render target 再 readRenderTargetPixels。
     * 返回 RGBA、行序**自上而下**（three 读回是自下而上，这里翻好）。XR 会话中不截（相机归 XR）。
     */
    captureRgba(k: GeomView, cam: OrbitCamera, vp: Viewport, view: ViewState): Uint8Array;
    /**
     * 全部膜 → 几何：无贴图材质的一份（三角汤 + 法向 + sRGB 顶点色 = 材质颜色 × 状态色），每种贴图材质一份（+UV）。
     * 平滑组（0.8，user「平滑组是一个很重要的概念，好好设计一下」）：被 **smooth** 边连起来的膜 = 一个平滑组，组内顶点法向 = 含该顶点的膜法向按内角加权平均；
     * soft（不画线）与 smooth（插值法向）是两个独立的边层（SU 的 Soft / Smooth），推拉侧棱两者都给、软化工具默认两者都给。
     */
    private rebuildFaces;
    /** 材质对象 → three 纹理（原图字节解码一次缓存；解码是异步的，先给 1×1 灰占位，解好后 needsUpdate 并请求重画）。 */
    private textureFor;
    /** 贴图异步解好后的回调（app 层接 editor.draw）。 */
    onTextureReady: (() => void) | null;
    /** 全部边 → 一份粗线（顶点色按类别）。 */
    /** 线稿风格（视图菜单「粗线稿」）。 */
    setLineStyle(style: LineStyle): void;
    setXray(on: boolean): void;
    getLineStyle(): LineStyle;
    /** 线稿粗细（设备像素）：1 = 原生线；> 1 = 粗线 + SU 轮廓线。 */
    setLineWeight(w: number): void;
    getLineWeight(): number;
    private rebuildEdges;
    private syncPools;
    private hidePools;
    private makeSlotNodes;
    private texMatFor;
    /** 槽 s 用哪份池网格（同步到 s 的内核、传上显卡）。同一帧同一个内核只同步一次。 */
    private poolGpu;
    private poolEnv;
    /** 池网格改过的段 → 显卡。数组换过（长大了 / 全量重建换了线仓库）= 那份几何重建。 */
    private uploadPool;
    private disposePoolGpu;
    /**
     * 覆盖层：选中 / 悬停的面 + 选中 / 刮擦 / 悬停的边（粗线）。
     * 不带贴图的面（绝大多数）：**不再叠一张世界坐标的面**——在它自己那个槽的节点下、用和面本身同一组三角（pool-mesh buildFaceRec，同样的 Float32 坐标、同一个材质 / 深度偏移），
     * 画在后面：GPU 算出来的深度和面本身逐位相同，后画的赢 = 换颜色，没有 z-fighting（user 10-27「高亮感觉还有时候有z fighting，就简单的高亮和不高亮的primitive分开画或者画的时候不同颜色就那么难嘛」）。
     * 带贴图的面照旧走世界坐标那张（少见；以后一并换）。
     */
    private rebuildOverlay;
    /** 换粗线几何（dispose 旧的）。col = 每段 6 个分量（起/止顶点色，线性空间）或 null。 */
    private setLineGeometry;
    /** XR：key light 钉在 HMD 相机系（同 keyLight 公式）。 */
    private xrKeyLight;
    /** 共享粗线材质（resolution 共享 Vector2；linewidth 由 syncLineScale 每帧按 lineScale 写）。offset=true：深度前拉，共面线赢面。 */
    /** 一组小三轴（每个帧：原点出三根屏幕定长 POOL_AXES_PX 的短轴，RGB = XYZ）；key 没变就不重建。返回新 key。 */
    private drawTriads;
    private lineMat;
    /**
     * 地面网格 = 一张 shader 平面（GRID_FRAG；0.13.23 起不再一条条线）+ 三色轴一份粗线（SU 约定：X 红 / Y 绿 / Z 蓝向上）。
     * 0.11 ⑤ 起跟帧与格距走：平面贴在帧的 XY 面上、过帧原点；格距 / 细分是 uniform。网格关着时只画 1 m 主线（sub = 1）。
     */
    private rebuildGrid;
}
/**
 * 面的三角剖分（世界坐标；含洞）——膜批几何与 OBJ 导出等「字节出口」共用，three 的 earcut 不出本文件。
 */
export declare function faceTriangles(k: GeomView, id: FaceId): [Pt3, Pt3, Pt3][];
