import type { EdgeId, FaceId, Pt3 } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
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
    readonly grid: 14276303;
    readonly axisX: 13382451;
    readonly axisY: 3050327;
    readonly axisZ: 2845872;
};
/** 线稿风格：pixel = 原生 GL 线 1 设备像素（默认）；thick = 屏幕像素宽粗线（LineSegments2）。 */
export type LineStyle = "pixel" | "thick";
export interface ViewState {
    selectionEdges: ReadonlySet<EdgeId>;
    selectionFaces: ReadonlySet<FaceId>;
    scrubEdges: ReadonlySet<EdgeId>;
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
    private geomCache;
    private geomsAlive;
    private syncGen;
    private poolKey;
    private overlayKey;
    private emptyGeo;
    private emptyLineGeo;
    private texMeshes;
    private texCache;
    private faceMeshOther;
    private faceMatOther;
    private edgeLines;
    private edgeMat;
    private edgePixel;
    private lineStyle;
    private hintLines;
    private snapMarker;
    private arcLines;
    private landingRing;
    private handleMarkers;
    private protractorLines;
    private faceKey;
    private edgeKey;
    private hintKey;
    private protKey;
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
    private worldPerPx;
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
    getLineStyle(): LineStyle;
    private rebuildEdges;
    private syncPools;
    private hidePools;
    private makeSlotNodes;
    private texMatFor;
    private kernelGeom;
    private disposeGeom;
    /** 覆盖层：选中 / 悬停的面（世界坐标，只这几张）+ 选中 / 刮擦 / 悬停的边（粗线）。 */
    private rebuildOverlay;
    /** 换粗线几何（dispose 旧的）。col = 每段 6 个分量（起/止顶点色，线性空间）或 null。 */
    private setLineGeometry;
    /** XR：key light 钉在 HMD 相机系（同 keyLight 公式）。 */
    private xrKeyLight;
    /** 共享粗线材质（resolution 共享 Vector2；linewidth 由 syncLineScale 每帧按 lineScale 写）。offset=true：深度前拉，共面线赢面。 */
    private lineMat;
    /** 地面网格 + 三色轴（SU 约定：X 红 / Y 绿 / Z 蓝向上）= 一份粗线、一个 draw call。 */
    private buildStatic;
}
/**
 * 面的三角剖分（世界坐标；含洞）——膜批几何与 OBJ 导出等「字节出口」共用，three 的 earcut 不出本文件。
 */
export declare function faceTriangles(k: GeomView, id: FaceId): [Pt3, Pt3, Pt3][];
