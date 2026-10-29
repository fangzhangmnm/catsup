// minccino/contract/render-provider.ts —— **画的供货商**的契约（刀 f，v0.17.23；user 10-29「three配不上叫后端，而只是一个provider。后端反而是我们无头骑士里面的无头骑士」）：
// three 那层只是拿 GL 画画的库，可换（WebGPU / 无头各一个，住 providers/）；「后端」这个词留给无头的小栗鼠本体 / 几何引擎。
// 编辑器只持这张脸（RenderProvider），由 app 层决定 new 哪个供货商。和内容的 StreamProvider 对称：一个供画、一个供内容。
// 原 backend/backend.ts（步 2 立、6c 填 FrameInput）。created 2026-10-29 by Claude Fable 5.1
import type { ProviderCaps, Measurement } from "./cost.ts";
import type { BudgetReport } from "../budget.ts";
import type { Vec3 } from "./geometry.ts";
import type { StreamProvider } from "./stream.ts";
import type { PresetId, ScreenId } from "../preset/index.ts";
import type { CameraSource, ViewportSize } from "./view.ts";
import type { Frame3 } from "./geometry.ts";
import type { OverlayCtx, OverlayItem } from "../overlay/index.ts";

/**
 * 一帧的输入（消费方 → 后端；6c）：相机 + 视口 + XR 近平面 + 地面网格 + 叠加层（含选中高亮）。
 * **内容不在这里**——走流提供者（`setProvider`，引擎拉）。编辑器的 ViewState 是编辑器自己的类型，后端只看到这几样。
 */
/** 面的材质槽（标记用）：风格的材质表给每个槽一种画法（白模 = 换成状态色、写实 = 叠色、Tron = Clu 橙 + 辉光）。 */
export type FaceSlot = "faceSelected" | "faceHover" | "faceDim";
/** 线的材质槽（标记用）：edgeDim = 淡出的边（整块换材质）；edgeHidden = 被挡住的那段再画一遍（深度模式 hidden，叠着画；X 光开 = 编辑器提交、关 = 不提交，刀 d / T73）。 */
export type LineSlot = "edgeDim" | "edgeHidden";
/** 改画的段（契约 v2 第 ② 批，刀 b）：某个槽的某个块的某一段（顶点偏移 / 顶点数）用另一个材质槽画——从普通批里踢掉、用那个槽的材质画，不重叠、不画两遍。 */
export interface Mark { readonly slot: string; readonly chunk: string; readonly start: number; readonly count: number; readonly material: FaceSlot | LineSlot }
export interface FrameInput {
  readonly camera: CameraSource;
  readonly viewport: ViewportSize;
  /** XR 会话里透视近平面（米）；不给 = 0.05。 */
  readonly near?: number;
  /** 地面网格：跟哪个坐标架、格距（米）；不给 = 世界帧、1 m。 */
  readonly grid?: { readonly frame: Frame3; readonly step: number } | null;
  /** 标记（选中 / 悬停的面换材质槽）；拉完流之后才调（块 id 那时才稳定）；不给 = 没有。 */
  readonly marks?: () => readonly Mark[];
  /** 叠加层内容（消费方算，引擎给量尺）；不给 = 没有。 */
  readonly overlay?: (ctx: OverlayCtx) => readonly OverlayItem[];
}

/** XR 会话面（vr.ts 消费；three 对象一律 any，不出本文件）。 */
export type XRHand = "left" | "right";
export interface XRFacade {
  isPresenting(): boolean;
  setSession(session: XRSession | null): Promise<void>;
  session(): XRSession | null;
  frame(): XRFrame | null;
  refSpace(): XRReferenceSpace | null;
  on(type: "sessionstart" | "sessionend", cb: () => void): void;
}
/** XR rig 姿态（player 每帧同步；与 player/player.ts RigPose 同形的那两样）。 */
export interface XRRigPose { readonly origin: Vec3; readonly heading: number }
/** 世界射线（与 player/world-query.ts Ray 同形）。 */
export interface XRRay { readonly origin: Vec3; readonly dir: Vec3 }

// 调色板 PALETTE 住 ../../palette.ts（6c 搬出：编辑器拿颜色不再碰后端）；POOL_AXES_PX / LOCK_LINE_SPAN_PX 住编辑器 overlay-lines.ts。


/** 线稿风格：pixel = 原生 GL 线 1 设备像素（默认）；thick = 屏幕像素宽粗线（LineSegments2）。 */
export type LineStyle = "pixel" | "thick";
/**
 * 画的供货商：编辑器 / app 用到的全部（= 现状 three 那份的公开面；加一个供货商 = 实现这张脸）。
 * 分组：画一帧 / 内容流 / 视图设定（线稿 / 风格）/ XR / 回执。什么都不认识编辑器（守卫 ③）。
 */
export interface RenderProvider {
  readonly name: string;
  caps(): ProviderCaps;
  /** 释放一切 GPU 资源（丢上下文 / 换供货商 / 测试结束）。 */
  dispose(): void;
  // ---- 画一帧 ----
  render(input: FrameInput): void;
  resize(vp: ViewportSize, dpr: number): void;
  /** 离屏截图（缩略图）：RGBA、行序自上而下。 */
  captureRgba(input: FrameInput): Uint8Array;
  setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void;
  // ---- 内容流（引擎拉、提供者吐）----
  setProvider(p: StreamProvider): void;
  // ---- 视图设定 ----
  setLineStyle(style: LineStyle): void;
  getLineStyle(): LineStyle;
  /** 实际画的线（像素化的风格锁 1 px）。 */
  lineStyleInUse(): LineStyle;
  setLineWeight(w: number): void;
  getLineWeight(): number;
  setPreset(id: PresetId): void;
  getPreset(): PresetId;
  /** 屏幕（和画风分开选，T106）：null = 跟画风的默认。 */
  setScreen(id: ScreenId | null): void;
  getScreen(): ScreenId | null;
  // ---- XR（会话钩子 + 手上的东西）----
  readonly xr: XRFacade;
  setXRQuality(q: { foveation?: number; framebufferScale?: number }): void;
  setPointerVisual(hand: XRHand, v: { length: number; color: number } | null): void;
  attachWristPanel(canvas: HTMLCanvasElement, widthM: number, heightM: number, hand: XRHand): void;
  detachWristPanel(): void;
  attachSubtitle(canvas: HTMLCanvasElement, widthM: number, heightM: number): void;
  detachSubtitle(): void;
  /** rig 姿态（玩家每帧同步）/ 手腕面板纹理脏了 / 控制器射线打在手腕面板的哪一格。 */
  setRig(pose: XRRigPose): void;
  updateWristTexture(): void;
  wristHit(ray: XRRay): { u: number; v: number; dist: number } | null;
  // ---- 回执（app 接）----
  onMeasured: ((b: BudgetReport | null, m: Measurement) => void) | null;
  onRedrawWanted: (() => void) | null;
  onTextureReady: (() => void) | null;
  lastBudget: BudgetReport | null;
  lastMeasurement: Measurement | null;
  lastPlan: { order: readonly string[]; pruned: readonly string[] } | null;
  /** 探针：这个 id 的辅助几何这一帧画着没有 / 现在挂着哪些字。 */
  overlayVisible(id: string): boolean;
  labelKeys(): { id: string; key: string }[];
}
