// tool-handler.ts —— 「工具 = 一个模块」的接缝（架构重构 2026-10-21，user「架构重构同意」「优先做架构重构」；架构自审 0.8 首选）。
// created 2026-10-21 by Claude Fable 5.1。提案 .h = ai-docs/20261021-tool-module-seam.md（实现中形状变了要回写）。
//
// 分工：**底座**（editor.ts）管所有工具共用的东西——指针帧、抬笔结算（样本环）、两击 / 三击 arm、意图门的开关、撤销 / 提交、
// 选区、上下文、HUD 刷新；**工具模块**（src/editor/tools/<tool>.ts）管自己那套手势：按下 / 跟随 / 松手 / 预演 / 取消 + 自己的状态。
// 工具只认这里递给它的 ToolCtx，**不 import 别的工具、不碰 editor.ts 的私有字段**——这就是以后 VR 换一套手势实现的接缝。
// 搬迁纪律：行为零变更（搬的是代码位置不是语义），每搬一个过同一套探针。
import type { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import type { PointerFrame, Viewport, EpsSet } from "./pointer-frame.ts";
import type { AlignHand, AlignQuery, DrawPlane, HitResult3, Snap3 } from "./pick.ts";
import type { WorldView } from "../scene/world-view.ts";
import type { PoolRef } from "../scene/scene.ts";
import type { Frame, Xform } from "../scene/xform.ts";
import type { Op } from "./ops.ts";
import type { CatsUpToolConfig } from "./tool-config.ts";
import type { Selection } from "./tools.ts";
import type { LastGesture, PoolPick, ToolPointer } from "./editor.ts";
import type { Tool } from "./tool-ids.ts";
import type { Scene, EditContext } from "../scene/scene.ts";
import type { GridSettings } from "./grid-settings.ts";
import type { ModeId } from "./mode.ts";
import type { ViewState } from "./render3.ts";

/** 指针下的东西属于谁：活动池里的实体 / 子池（group 或实例）整体 / 什么都没有。 */
export type Classified = { kind: "entity"; local: HitResult3 } | { kind: "pool"; pick: PoolPick; key: string } | { kind: "none" };

/** 抬笔结算回放给工具的那一帧（底座公共字段 + 工具自己报的数）。 */
export interface ToolSample { cursor3: Pt3 | null; snap: Snap3 | null; extra: Readonly<Record<string, number>>; }

/** 底座递给工具的全部能力（窄接口 = 测试面：给假 ctx 喂事件序列，断言 commitOp 收到的 op）。 */
export interface ToolCtx {
  readonly config: CatsUpToolConfig;
  /** 活动池的 checkpoint 内核（本地坐标）。 */
  kernel(): Kernel;
  /** 当前选区（活动池本地 id；只读）。 */
  selection(): Readonly<Selection>;
  /** 静态推断世界（全池合成，世界坐标）。 */
  world(): WorldView;
  /** 手势中的实时世界（没手势 = world）。 */
  live(): WorldView;
  frame(): PointerFrame;
  vp(): Viewport;
  eps(): EpsSet;
  snapPx(): number;
  /** 屏幕点下的面（全局 id）。 */
  pickFace(sx: number, sy: number): FaceId | undefined;
  /** 屏幕点下的实体（顶点 > 边 > 面，全局 id；0.11 卷尺要知道起点落在哪条边上）。 */
  pick(sx: number, sy: number): HitResult3;
  classify(view: WorldView, hit: HitResult3): Classified;
  /** 吸附求解（世界视图 + 帧 + ε 由底座配好）。 */
  snap(view: WorldView, sx: number, sy: number, q: AlignQuery): Snap3;
  alignSources(): Pt3[];
  /** 「手里」谓词（在手的几何不参与吸附）；extra = 工具自报的移动集（本地 id），opaque = 手中膜是否遮挡。 */
  hand(view: WorldView, extra?: (vid: VertexId) => boolean, opaque?: boolean): AlignHand;
  toLocal(p: Pt3): Pt3;
  ctxXform(): Xform;
  activePool(): PoolRef;
  /** 意图门开关：屏上拖够了才有意图。 */
  intentOn(s: { x: number; y: number }, travel?: number): boolean;
  commitOp(op: Op): FaceEvent[];
  opCount(): number;
  hint(text: string | null): void;
  /** 跟指针走的小提示（优先于吸附标签；null = 回到吸附标签）。吸色「吸：赭石」、整数增量的数值都走它。 */
  tip(text: string | null): void;
  // ---- 底座拥有的手势公共状态，工具只经这几个口写 ----
  anchor(): Pt3 | null;
  setAnchor(p: Pt3 | null): void;
  setCursor(p: Pt3 | null): void;
  setSnap(sn: Snap3 | null): void;
  /** 数值小窗：记下「刚做完的那一步」。 */
  recordLast(L: LastGesture): void;
  /** 吸附迟滞（同线候选不许来回翻；底座的 lastSnap 状态）。 */
  hysteresis(sn: Snap3, sx: number, sy: number): Snap3;
  /** 被意图门否掉的吸附不许黏住：清迟滞记忆。 */
  dropHysteresis(): void;
  /** 充能（拖拽中：停留 dwellMs 的吸附点进充能集）。 */
  charge(sn: Snap3 | null, dwellMs?: number): void;
  /** 自落笔以来走了多远（本帧度量；ev.travel 优先，否则按 downScreen 算）。 */
  moved(s: { x: number; y: number }, travel?: number): number;
  cursor(): Pt3 | null;
  /** 当前按着的修饰键（最近一次指针事件带来的）：Shift = 角度对齐 / 追加选区，copy = Ctrl / Alt / ⌘。 */
  mods(): { shift: boolean; copy: boolean };
  /** 上一帧的吸附（轻擦平面时保持用）。 */
  currentSnap(): Snap3 | null;
  grid(): Readonly<GridSettings>;
  scene(): Scene;
  context(): EditContext;
  /** 悬停高亮光标下的面（渲染 hoverFace；null = 清）。 */
  setHoverFace(f: FaceId | null): void;
  /** 蘸的材质在文档材质表里的索引（没有就新建一条 addMaterial op）；null = 默认。 */
  paintMaterialIndex(): number | null;
  /** 给活动池里的这些面涂当前材质（op）。 */
  paintFaces(faces: readonly FaceId[]): void;
  /** 吸色：把这张面的材质设成油漆桶当前「蘸的」。 */
  pickMaterialOf(face: FaceId): void;
  /** 子 group / 实例锁着吗（A27）。 */
  pickLocked(p: PoolPick): boolean;
  /** 整体变换预演的叠加层（子池跟着指针走；null = 清）。 */
  setLiveOverride(o: { picks: PoolPick[]; xform: Xform; copy?: boolean } | null): void;
  xformToLocal(X: Xform): Xform;
  /** 复制模式的几何载荷（被移实体抠成快照 → 经本地变换 → absorb 的坐标载荷）。 */
  copyPayload(XL: Xform, entities: { faces: readonly FaceId[]; edges: readonly EdgeId[] }): CopyPayload | null;
  /** 复制落地：每份 = absorb 载荷 + 子池 copyGroup / placeInstance。 */
  commitCopies(copies: { payload: CopyPayload | null; XL: Xform }[], pools: readonly PoolPick[], at: PoolRef): void;
  /** 整体变换提交：世界系 X 作用于活动池顶点集（move op）+ 子池（transformPool / transformInstance）。 */
  commitXform(X: Xform, vids: readonly VertexId[], pools: readonly PoolPick[]): void;
  /** 整体变换预演：选区顶点走影子副本、子池走叠加变换。 */
  previewXform(X: Xform, run: (fn: (c: Kernel) => FaceEvent[]) => void): void;
  /** 选中的子 group / 实例里能整体动的（锁住的不动；say = 提示一次）。 */
  movablePoolPicks(say?: boolean): PoolPick[];
  /** 选区的世界包围盒（缩放柄）。 */
  targetBounds(): { min: Pt3; max: Pt3 } | null;
  /** 悬停高亮光标下的边（渲染 hoverEdge；null = 清）。 */
  setHoverEdge(e: EdgeId | null): void;
  /** 软化 / 硬化一批边（layers soft + smooth 一条 op；橡皮的 Ctrl / Shift 修饰用）。 */
  softenEdges(ids: readonly EdgeId[], on: boolean): void;
  // ---- 选择工具的底座服务（选区是会话态，住底座；工具只经这几个口写）----
  /** 屏幕框选矩形（HUD 画；null = 收）。 */
  marquee(r: { x: number; y: number; w: number; h: number } | null): void;
  /** 屏幕矩形里的边 / 面（全局 id）。 */
  marqueePick(box: { minX: number; minY: number; maxX: number; maxY: number }): { edges: Iterable<number>; faces: Iterable<number> };
  /** 换掉 / 追加选区（本地 id + 子池项）。 */
  replaceSelection(sel: { edges: readonly number[]; faces: readonly number[]; pools: readonly PoolPick[] }, additive: boolean): void;
  /** 选区变了之后的收尾（提示 / 缩放柄 / HUD）。 */
  afterSelect(): void;
  /** 点击族：0 = 命中实体 / 1 = 膜 + 环边 / 2 = 连通体。 */
  selectExpand(hit: HitResult3, stage: 0 | 1 | 2, additive: boolean): boolean;
  enterPool(p: PoolPick): void;
  exitContext(): boolean;
  contextDepth(): number;
  hasSelection(): boolean;
  /** 取点悬停（无手势）：画面平面 + 吸附 + 充能 + 光标提示——line / rect / 卷尺 / 轴 / 量角器都用这一套。 */
  hoverSnap(s: { x: number; y: number }): void;
  // ---- 0.11 尺规纪元：轴 ----
  /** 上下文的帧（世界坐标）。 */
  contextFrame(): Frame;
  /** 改轴（世界坐标帧进来）：根 = 绘图轴；进组 = 组的轴。 */
  setAxes(frame: Frame): void;
}

/**
 * 编辑器核（0.13 刀 ①）= ToolCtx 往上长一层：模式（mode.ts）与 HUD 级消费方看到的全部能力。只读口；写都走 commitOp。
 * 三层 state 的读法（提案 §2）：doc = scene / revision；session = context / grid / selection；mode = modeId。
 */
export interface EditorCore extends ToolCtx {
  revision(): number;
  modeId(): ModeId;
}

export type CopyPayload = { faces: Pt3[][][]; wires: [Pt3, Pt3][]; edgeSegs: Record<string, [Pt3, Pt3][]>; faceLayers: (Record<string, number> | undefined)[] };

/**
 * 手势语法（提案 §7「工具 = 子步序列」，user 2026-10-24 同意；A29 全工具统一「点几下」）：
 * - `steps`（取量型）：每次 **按下 = 取一个量、进下一子步**（`down`）；底座统一管：点一下抬起 = arm（移动预览、再点 = 下一次按下）；
 *   按住拖再松手 = 松手处（抬笔结算帧）的一次按下；工具还 active 就继续 arm；充能按子步消费；Esc 清。工具不实现 `up`。
 * - `direct`（直接操作型：橡皮刮、框选、拖柄、点涂）：底座原样递 down / track / up，不 arm。
 */
export type ToolGrammar = "steps" | "direct";

export interface ToolHandler {
  readonly tool: Tool;
  readonly grammar: ToolGrammar;
  /** draw 类工具（画线 / 矩形 / 圆…）：手里的膜只算 BIRTH 出来的（底座 freshHand 据此豁免遮挡）。 */
  readonly draws?: boolean;
  /** 悬停也要预演（擦面：悬停就看到擦掉的样子）。 */
  readonly previewOnHover?: boolean;
  /** 手势进行中？（底座 gestureActive 的一票；为真时 pointerMove 走 track、computeLive 走 live）。 */
  active(): boolean;
  /** 清掉自己的手势状态（底座 cancelGesture 时对所有工具调）。 */
  cancel(): void;
  down(ctx: ToolCtx, ev: ToolPointer): void;
  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void;
  /** direct 工具的松手；settle() = 抬笔结算后的那一帧（null = 没样本）。steps 工具不用（底座把松手变成一次 down）。 */
  up?(ctx: ToolCtx, ev: ToolPointer, settle: () => ToolSample | null): void;
  /** 没手势时的悬停（吸附预告 / 高亮）；没有就什么都不画。常见的「取点悬停」= `ctx.hoverSnap(s)`。 */
  hover?(ctx: ToolCtx, s: { x: number; y: number }): void;
  /** 预演：把本工具当前状态跑到克隆内核上（run 一次 = 一份影子）；返回尺寸文案（"" = 无）。 */
  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
  /** 本工具要进样本环的数（抬笔结算回放时按 extra 读回）。 */
  sample(): Record<string, number>;
  /** 复现包用的手势描述（预演失败时随黑匣子走）。 */
  describe?(ctx: ToolCtx): Record<string, unknown>;
  /** 数值小窗按精确值重做了这一步之后，工具从新的终点继续（画线连画）。 */
  vcbContinue?(ctx: ToolCtx, p: Pt3): void;
  /** 本工具的叠加层（量线 / 候选参考线…）：底座每帧并进 ViewState（0.11）。 */
  viewExtras?(ctx: ToolCtx): Partial<ViewState>;
}
