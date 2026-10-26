// editor.ts —— 工具手势状态机（无 DOM 依赖：只认 canvas 尺寸与屏幕坐标，UI 经 EditorHost 回调）。
// created 2026-09-06 by Claude Fable 5.1 —— 从 src/lab/main.ts（Claude Fable 5，2026-09-01～09-03）原样搬入。
// 相机手势（环绕/平移/缩放）不在这里：那是 app 层手势路由（src/app/gestures.ts）的事，本类只吃「工具指针」。
//
// **2026-10-21 group / component 纪元重写（Claude Fable 5.1；user「supersprint where at least i have groups and components…rotate, scale, move…circle」）**：
//   · 状态 = Scene（definition / group / instance，src/scene/scene.ts）+ 编辑上下文 ctx（进了哪些实例、在哪个 group 里）；
//     `kernel` = 活动池（上下文的几何池）；op 带池地址；history 存 Scene。
//   · 渲染 / 拾取 / 吸附吃 **WorldView**（全部池变换到世界坐标的只读合成视图，id 全局化）：吸附看得见所有几何（SU 同款），
//     但只能编辑活动池；命中别的子 group / 实例 = 选中它整体（move / rotate / scale 整体变换）；双击进、点空处出（SU 同款）。
//   · 新工具：circle（24 段软边）、rotate（量角器：先点圆心定平面，再按参考点拖角度）、scale（包围盒柄：角 = 等比、面心 = 单轴）。
//
// 对齐引擎唯一世界源（user 2026-09-03 立法：**旧 snapshot 禁入对齐引擎**——push 到一半的才是真相，WYSIWYG；
// checkpoint 只是 commit 基底/cancel 归宿）。手势中=live（中间态真相）；平时=checkpoint。build lint 把门（scripts/build.sh）。
// **例外：推拉的推断世界 = 按下那一刻的模型 + 源面原位不透明（2026-10-21；09-23 算法 QA bug 2 根因）**——推拉只有一个自由度 h，
// 拖拽中新长的帽/侧壁高度恒等于 h（对 h 零信息），中间态唯一贡献是遮挡，而遮挡正是「吸端面 / 不吸」逐帧交替的反馈回路。
// **抬笔结算（A21，2026-10-21）**：抬笔前停留过的地方才是意图，末尾的短抖动不算（user「抬笔的时候总是会抖一下然后歪掉」）。

import { Kernel } from "../kernel/kernel.ts";
import { type WorldLabel, gridStepLabel, unitMark } from "./world-labels.ts";
import type { BrepSnapshot, EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport, rayPlane } from "./camera.ts";
import type { PointerFrame } from "./pointer-frame.ts";
import { type AlignHand, type DrawPlane, type HitResult3, type Snap3, type SnapKind, GROUND, cameraPlane, drawPlaneAt, grazing, pickEntity, pickFace, rectFirstPlane, resolveRectPlane, snapPoint } from "./pick.ts";
import { NO_HAND, SNAP_PX, frameEps } from "./solver.ts";
import { marqueeScreen } from "./marquee.ts";
import type { EpsSet } from "./pointer-frame.ts";
import { type Selection, type SelMode, circleSegmentsOnPlane, emptySelection, mergeSel, moveTargetsSelection, rectSegmentsOnPlane, curveSpecToLocal, offsetCircleSpec, circleCurveSpec, rrectSegments, rrectDirAt, rrectThetaOf, bulgePointForRadius, rectOpposite, rectAxesOf } from "./tools.ts";
import { type ArcGesture, arcOp, buildArc } from "./arc-build.ts";
import { offsetRing } from "./offset.ts";
import { type CatsUpToolConfig, TOOL_OPTIONS, ToolConfig } from "./tool-config.ts";
import type { EditorCore, ToolCtx, ToolHandler } from "./tool-handler.ts";
import { rotateDir } from "./protractor-geom.ts";
import { type GridSettings, NEW_DOC_GRID, gridFrame } from "./grid-settings.ts";
import type { CurveParams, CurveSpec } from "../kernel/kernel.ts";
import { connectedFrom, surfaceFaces } from "../kernel/flood.ts";
import { hasIntent, intentAllows1D, intentAllows3D } from "./intent.ts";
import { TapTrain, TAP_RULES, frameTapRule } from "./tap-train.ts";
import { perf } from "./perf-stats.ts";
import { type LengthUnit, type VcbKind, arrayScalings, arrayTranslations, fmtVcbLength, parseVcb, vcbPrompt } from "./vcb.ts";
import { type ParamButton, type ParamField, type ParamPanelState, type ParamSession, type ParamValue, afterthought } from "./param-panel.ts";
import { type GizmoGrab, type GizmoHandle, type PlaneGizmo, dragGizmo, gizmoGeom, grabGizmo, hitGizmo, worldPerPx } from "./plane-gizmo.ts";
import { CUT_SNAP, type MirrorOptions, type MirrorPlane, mirrorGeometry, reflectionXform } from "./mirror.ts";
import type { FaceKey } from "./ops.ts";
import { canonicalPlane, distToSegment, liftFromPlane, planeBasis, projectToPlane } from "../kernel/geom.ts";
import { type LockAxis, type PlaneLock, planeLockLabel } from "./locks.ts";
import { DEFAULT_SCALE_REFS, type Ladder, type ScaleTipView, readingOf, scaleTipView } from "./scale-ref.ts";
import { POOL_AXES_PX, Renderer3, type LineStyle, type ViewState } from "./render3.ts";
import { PRESETS } from "./presets.ts";
import { type Op, ShearRejected, edgeKey, faceKey, resolveEdge, resolveFace } from "./ops.ts";
import type { ImportScene } from "../format/gltf-import.ts";
import type { TriangleCastReport } from "../kernel/from-triangles.ts";
import { castImport } from "../scene/import-build.ts";
import { PLANAR_DEFAULTS, type PlanarOptions, type PlanarTarget, planPlanar } from "./planar.ts";
import { planWeld } from "../kernel/weld.ts";
import { History, OpApplyError } from "./history.ts";
import { add3, cross3, dot3, len3, normalize3, polygonArea3, scale3, sub3 } from "../kernel/geom.ts";
import { type EditContext, type GroupId, type InstId, type PoolRef, ROOT_CONTEXT, Scene, extractSnapshot, poolBounds, samePool, snapshotLayerPayload, transformSnapshot } from "../scene/scene.ts";
import { type PoolSlot, WorldView, slotKey, PART_STATS } from "../scene/world-view.ts";
import { chainVisible } from "../scene/layers.ts";
import { gridEffective } from "./increments.ts";
import { type Frame, type Xform, IDENTITY, applyDir, applyPt, compose, det3, hasShear, invert, rotationAbout, scalingAbout, scalingAlongAxes, translation } from "../scene/xform.ts";

export { TOOLS, type Tool } from "./tool-ids.ts";
import type { Tool } from "./tool-ids.ts";
import type { Mode, ModeId } from "./mode.ts";
import { GeometryMode } from "./modes/geometry.ts";
import { SurfaceMode } from "./modes/surface.ts";
import type { OptionKv } from "./tool-config.ts";

/** 油漆桶当前「蘸的」材质：颜色（名字 + sRGB 0..1）/ 贴图（名字 + 原图字节 + 物理尺寸 米）/ null = 默认灰。 */
export type PaintPick = { kind: "color"; name: string; color: [number, number, number] } | { kind: "texture"; name: string; mimeType: string; bytes: Uint8Array; sizeM: [number, number] } | null;

/** 工具指针事件（canvas 本地坐标 + 定位提示用的 client 坐标）。 */
export interface ToolPointer {
  x: number; y: number;
  clientX: number; clientY: number;
  pointerType: string;
  /** 允许「点两下」模式（第一击是点击不是拖 → 移动预览再点放置）：桌面鼠标 = true；数位笔/手指 = false（误触发意外连线）。由适配器裁决。 */
  armable?: boolean;
  shiftKey: boolean;
  /** 复制修饰（Ctrl / Alt / ⌘）：移动 = 留一份原件再放（SU Move+Ctrl）。 */
  copy?: boolean;
  /** 自落笔以来指针「走了多远」（本帧量纲：桌面 px / VR 度）。缺省 = 本帧 distTo（editor.movedSinceDown）。 */
  travel?: number;
}

/** 选区快照（撤销 / 重做还原用；ctx = 当时的上下文键）。 */
interface SelSnap { ctx: string; faces: FaceId[]; edges: EdgeId[]; verts: VertexId[]; guides: number[]; pools: [string, PoolPick][]; }
/** 会话状态（撤销 / 重做跟着场景一起还原；History 每步存 before / after）：在哪个组件里编辑 + 选区。 */
interface Session { ctx: EditContext; sel: SelSnap }

/** 记账面包屑（调试日志；op 一行一条）。 */
export type EditorTrace =
  | { kind: "op"; op: Op; events: number; ms: number; position: number }
  | { kind: "undo" | "redo"; position: number; depth: number }
  | { kind: "load"; label: string }
  /** 失败行另带复现材料（黑匣子，2026-10-24）：那一步之前的活动池 B-rep + 池地址；预演失败带工具描述。宿主只在内存里留。 */
  | { kind: "fail"; where: string; op: Op | null; message: string; brep?: BrepSnapshot; pool?: PoolRef; preview?: Record<string, unknown> };

export interface EditorHost {
  hint(text: string | null): void;
  /** 跟指针的提示框；measure = 手势中的读数（user 2026-10-25「优先显示长度，参考只是参考」：第一行、最显眼）；scale = B43 尺度参考（拖动时才有；样式归宿主画）。 */
  tip(text: string | null, clientX: number, clientY: number, scale?: ScaleTipView | null, measure?: string): void;
  trace?(entry: EditorTrace): void;
  marquee(r: { x: number; y: number; w: number; h: number } | null): void;
  changed(): void;
  error?(err: unknown, where: string): void;
  /** 右下角血槽位的尺寸读数（手势中的 dims / 选中面的面积 / 选中边的长度；"" = 空）。A28。 */
  readout?(text: string): void;
  /** 工具选项的 device 持久化接缝（app 的 device-kv）；不给 = 只活这一次。 */
  optionKv?: OptionKv;
}

function epsOfKindVR(e: EpsSet, kind: string): number {
  if (kind === "on-edge") return e.edge;
  if (kind === "edge-align" || kind === "align-combo") return e.combo;
  if (kind === "align" || kind.startsWith("axis-")) return e.line;
  return e.point;
}
const EPS_OF: Record<string, number> = {
  endpoint: 10, origin: 10, midpoint: 10, "on-edge": 7,
  "edge-align": 12, "align-combo": 12, align: 5, "axis-x": 5, "axis-y": 5, "axis-z": 5, "on-extension": 5, tool: 5,
};
export const SNAP_LABELS: Record<string, string> = {
  endpoint: "端点", midpoint: "中点", "on-edge": "边上", origin: "原点",
  "axis-x": "X 轴", "axis-y": "Y 轴", "axis-z": "Z 轴",
  align: "共轴", "align-combo": "共轴角点", "edge-align": "边上·共轴", intersection: "交点", "cross-line": "交线",
  "h-stop": "高度咬合", "on-face": "面上",
  "on-guide": "参考线上", "guide-point": "参考点", "guide-cross": "参考线交点",
  "grid-point": "格点", increment: "整数长度", "on-extension": "延长线上",
  center: "圆心", "pool-origin": "轴原点",
};
export { type GridSettings, type GridPlane, type GridPreset, GRID_STEPS, GRID_PLANES, GRID_PRESETS, gridPreset, gridStepsFor, nearestGridStep } from "./grid-settings.ts";

export function describeEvent(ev: FaceEvent): string {
  switch (ev.type) {
    case "BIRTH": return `诞生 面#${ev.face}`;
    case "DIVIDE": return `分割 面#${ev.from} → ${ev.into.map((i) => `#${i}`).join(" + ")}`;
    case "MERGE": return `合并 ${ev.from.map((i) => `#${i}`).join("+")} → 面#${ev.into}`;
    case "ABSORB": return `吞洞 面#${ev.from} → 面#${ev.into}`;
    case "BURST": return `破膜 面#${ev.face}`;
    case "STRETCH": return `拉伸 ${ev.faces.map((i) => `面#${i}`).join(" ")}`;
    case "FACE_ERASED": return `删膜 面#${ev.face}`;
  }
}

const dist = (a: Pt3, b: Pt3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** 抬笔结算（A21）三个物理量，各自量纲独立（调参纪律）。 */
const RELEASE_WINDOW_MS = 150, FINAL_HOLD_MS = 100, MIN_DWELL_MS = 40, HOLD_PX = 4;
/** 抬笔小滑上限（CSS px @800 高）：停留帧与最后一帧相距超过它 = 不是抖动是挪动，按最后一帧。 */
const DWELL_SLIP_PX = 24;
/** 手势最小位移（世界单位=米，A10 纪律）：短于此的线/移动/推拉视为没动。 */
export const MIN_GESTURE_LEN = 0.01;
/** 圆的多边形段数（SU 默认 24）。 */
/** 圆的默认段数（SSoT 在 tool-config 表；这里只是给老调用方 / 测试的镜像）。 */
export const CIRCLE_SEGMENTS = TOOL_OPTIONS.circle.segments.def;

import { fmtArea, fmtDeg, fmtLen, setDisplayUnit } from "./units.ts";
export { fmtLen, fmtDeg } from "./units.ts";   // 读数走单位深模块（2026-10-24）；工具仍从 editor.ts 拿，调用处不动

/** 子池选区项（相对活动上下文的直接子项）。 */
export type PoolPick = { kind: "group"; group: number } | { kind: "instance"; instance: InstId };

/** 数值小窗（vcb.ts）作用的「刚做完的那一步」：撤销它（ops 个 op）、按精确值重做。坐标 = 世界系（froms = 活动池本地）。 */
export type LastGesture =
  | { kind: "line"; ops: number; at: PoolRef; a: Pt3; b: Pt3 }
  | { kind: "rect"; ops: number; at: PoolRef; plane: DrawPlane; anchor: Pt3; corner: Pt3; from?: "corner" | "center" }
  /** 旋转矩形：A 第一角 / B 第一边终点 / C 第二边终点；VCB「角度,宽」或「宽」。 */
  | { kind: "rrect"; ops: number; at: PoolRef; plane: DrawPlane; a: Pt3; b: Pt3; c: Pt3 }
  /** 弧（四种画法，arc-build.ts）：VCB 半径 / 角度（圆心弧 · 扇形）/ 段数。 */
  | ({ kind: "arc"; ops: number; at: PoolRef } & ArcGesture)
  | { kind: "circle"; ops: number; at: PoolRef; plane: DrawPlane; center: Pt3; rim: Pt3; segments: number }
  | { kind: "pp"; ops: number; at: PoolRef; face: FaceKey; h: number; hl: number; keepRing?: boolean }
  | { kind: "offset"; ops: number; at: PoolRef; ring: Pt3[]; plane: DrawPlane; d: number; circle?: CurveParams }
  | { kind: "move"; ops: number; at: PoolRef; froms: Pt3[]; pools: PoolPick[]; delta: Pt3; copy: boolean; entities: { faces: FaceId[]; edges: EdgeId[] } }
  | { kind: "rotate"; ops: number; at: PoolRef; froms: Pt3[]; pools: PoolPick[]; center: Pt3; axis: Pt3; angle: number; copy?: boolean; entities?: { faces: FaceId[]; edges: EdgeId[] }; /** 变换工具：抓的时候几种轴心（马后炮换轴心重做）+ 用的是哪种。 */ pivots?: Record<string, Pt3>; pivotUsed?: string }
  | { kind: "scale"; ops: number; at: PoolRef; froms: Pt3[]; pools: PoolPick[]; anchor: Pt3; axis: Pt3 | null; f: Pt3; copy?: boolean; entities?: { faces: FaceId[]; edges: EdgeId[] }; /** 沿任意方向缩放（变换工具的缩放块，帧可能是斜的）：1 根 = 单轴块、2 根 = 平面块（2026-10-26）；有就按 scalingAlongAxes、f 用 x 分量。 */ dirs?: readonly Pt3[]; pivots?: Record<string, Pt3>; pivotUsed?: string }
  /** 卷尺（0.11）：起点 a、产物方向 dir（线 = 垂直偏移方向；点 = 起点→终点）、距离 d；line 另带参考线方向。 */
  | { kind: "tape"; ops: number; at: PoolRef; a: Pt3; dir: Pt3; d: number; make: "line" | "point"; lineDir?: Pt3 }
  /** 量角器（0.11）：圆心 / 转轴 / 参考点 / 角度 → 角度参考线；VCB 改度数。 */
  | { kind: "protractor"; ops: number; at: PoolRef; center: Pt3; axis: Pt3; ref: Pt3; angle: number };

/** 样本环的一帧（抬笔结算 A21）：屏幕位置 + 当时的手势量。 */
interface GestureSample { t: number; sx: number; sy: number; cursor3: Pt3 | null; snap: Snap3 | null; extra: Record<string, number> }

export class Editor {
  readonly cam = new OrbitCamera();
  private r3: Renderer3;
  private scene = new Scene();
  private ctx: EditContext = ROOT_CONTEXT;
  private _grid: GridSettings = { ...NEW_DOC_GRID };
  /** 定稿锁（护栏 ②，ai-docs/20261024-finalize.md）：true = 改内容的入口全拒（commit / undo / redo / VCB）。由 session 按文件记录设。 */
  private _locked = false;
  get locked(): boolean { return this._locked; }
  setLocked(on: boolean): void { if (this._locked === on) return; this._locked = on; this.cancelGesture(); this.host.changed(); this.draw(); }
  private lockedSay(): void { this.host.hint("定稿了：锁着。☰「改稿」才能改"); }
  get grid(): Readonly<GridSettings> { return this._grid; }
  setGrid(patch: Partial<GridSettings>): void {
    this._grid = { ...this._grid, ...patch };
    this.viewCache = null;
    this.host.changed();
    this.draw();
  }
  private history = new History<Session>();
  private _tool: Tool = "line";
  private _revision = 0;                  // 场景每次变（commit/undo/redo/load/进出上下文）+1；碰撞世界等消费方据此重建

  // ---- 瞬态 ----
  private anchor3: Pt3 | null = null;
  private cursor3: Pt3 | null = null;
  private snapInfo: Snap3 | null = null;
  // 工具模块（tool-handler.ts 接缝；架构重构 2026-10-21）：有模块的工具走这里，其余仍在本文件的 case 里（Opus 票 3 逐个搬）
  /** 编辑模式（0.13 刀 ① / 刀 ③）：几何 / 表面；工具集 + 手势模块表住模式里；左上下拉框切（user「切换编辑模式还是左上下拉框」）。 */
  private readonly modeList: readonly Mode[] = [new GeometryMode(), new SurfaceMode()];
  private mode: Mode = this.modeList[0];
  get modeId(): ModeId { return this.mode.id; }
  modes(): readonly { id: ModeId; label: string }[] { return this.modeList.map((m) => ({ id: m.id, label: m.label })); }
  /** 当前模式有哪些工具（左柱按它排）。 */
  modeTools(): readonly Tool[] { return this.mode.tools; }
  /** 某工具的手势模块（上下文条要碰工具自己的状态，如吸色锁定）。 */
  toolHandler(t: Tool): ToolHandler | undefined { return this.mode.handlers[t]; }
  /** 切模式：清手势；当前工具不在新模式里 → 换成它的默认工具；选区留着（面选区两边都认）。 */
  setMode(id: ModeId): void {
    const next = this.modeList.find((m) => m.id === id);
    if (!next || next === this.mode) return;
    this.cancelGesture();
    this.mode.leave?.(this.toolCtx);
    this.mode = next;
    this.mode.enter?.(this.toolCtx);
    if (!next.tools.includes(this._tool)) this._tool = next.defaultTool;
    this.last = null;
    this.clearCharged();
    this.host.changed();
    this.draw();
  }
  private get handlers(): Partial<Record<Tool, ToolHandler>> { return this.mode.handlers; }
  private readonly toolCtx: EditorCore = this.makeToolCtx();
  // 量角器：阶段 0 = 等圆心；1 = 圆心已定、等参考点；2 = 拖角度中
  // 缩放柄
  private samples: GestureSample[] = [];
  private selection: Selection = emptySelection();
  private selectedPools = new Map<string, PoolPick>();
  private hoverEdge: EdgeId | null = null;
  private hoverFace: FaceId | null = null;
  private live: Kernel | null = null;
  private liveOverride: { picks: PoolPick[]; xform: Xform; copy?: boolean } | null = null;
  private liveEvents: FaceEvent[] = [];
  private armed = false;
  private canArm = false;
  /** 按下那条射线上 1 m 处的世界点：「自按下走了多远」= 本帧 distTo(光标, 它)——桌面 = 离按下点的像素，VR = 角度（(x, y) 在 VR 只是名义坐标）。
   *  规矩：能用帧度量就不用屏幕 px（user 2026-10-24「能用ray别用screen px」）。2026-10-24 Claude Opus 5.5 替掉原来按屏幕坐标记的按下点。 */
  private downPoint: Pt3 | null = null;
  /** 点按族（点 / 拖、单 / 双 / 三击）：全编辑器一份，工具经 ctx.clicks() / ctx.tapSlop() 问（tap-train.ts；user 2026-10-25 笔双击三击偏向点）。 */
  private readonly taps = new TapTrain<Pt3>();
  private movedSinceDown(s: { x: number; y: number }, travel?: number): number { return travel ?? (this.downPoint ? this.frame().distTo(s.x, s.y, this.downPoint, this.fvp()) : 0); }
  private justCommitted = false;
  private charged = new Map<string, Pt3>();
  /** 充能边（0.11.6，user「载线交点 充能」）：悬停在边上 ≥ 300 ms 的边，最近 2 条；出延长线与延长线交点。 */
  private chargedEdges = new Map<string, { a: Pt3; b: Pt3 }>();
  private dwell: { key: string; since: number } | null = null;
  private lastSnap: Snap3 | null = null;
  private paintPick: PaintPick = null;
  /** 工具选项（声明式表 `tool-config.ts`，SSoT）；UI 从它生成，工具从它读。 */
  readonly config: CatsUpToolConfig;
  /** 数值小窗：刚做完的那一步（null = 没有可改的）；opCount 给它数这一步占了几个 op。 */
  private last: LastGesture | null = null;
  private mods: { shift: boolean; copy: boolean } = { shift: false, copy: false };
  private dims = "";   // 手势中的尺寸读数（血槽位）
  private toolTip: string | null = null;   // 工具自己要的跟指针提示（优先于吸附标签）
  private opCount = 0;
  /** 格点吸附的有效开关（DT51，user 2026-10-25「shift应该是flip snap rule」「还是其实右上应该只管grid snap」）：右上锁钮，按住 Shift 反过来。
   *  管：格点 + 整格长度 + 15° 整角（「15是grid合理」）——都有捕捉阈；几何推断不归它管。 */
  private get gridEff(): boolean { return gridEffective(this._grid.on, this.mods.shift); }
  /** 一步（user 2026-10-25「*6 /6的时候undo不对，变成需要一个一个删了」）：入口包在 step() 里，里面提交的 op 并成撤销的一步。 */
  private stepDepth = 0;
  private stepHasOp = false;
  /** 这一步已提交了几条 / 有没有失败过（一步 = 原子：中途有一条失败 → 这一步已提交的全部回滚、剩下的不再执行；2026-10-26）。 */
  private stepOps = 0;
  private stepFailed = false;
  /** 数值小窗的默认长度单位（文档级单位设置落地前 = 出厂 m；后缀可覆盖）。 */
  /** A9 轴锁（user 2026-09-06 / 10-24「键盘小箭头控制axis，然后触屏上应该有对应的虚拟键」）：SU 同款 → X / ← Y / ↑ Z / ↓ 解锁；
   *  轴 = 上下文帧（绘图轴 / 组轴）的轴。生命周期 = 一次手势：手势结束 / 换工具 / Esc 就解。只对调用 ctx.applyLock 的工具生效（画线 / 移动 / 卷尺）。
   *  面锁（user 2026-10-25「Shift + 方向键锁平面、矩形工具的平面锁、触屏常驻三颗轴键。 要！」；键位 = ledger A9 的 Blender Shift+X 语义）：
   *  锁到「排除该轴」的平面 = 法向是该轴的面（Shift+→ YZ / Shift+← XZ / Shift+↑ XY / Shift+↓ 光标下那张膜的面）。
   *  先定平面的工具（矩形 / 圆 / 旋转矩形 / 弧 / 旋转 / 量角器，`lock: "plane"`）不吃轴锁：方向键直接锁平面（SU 旋转矩形「按方向键定平面」同款），
   *  平面过首点（ctx.lockedPlane）；沿轴走的工具（`lock: "axis"`）Shift+方向键 = 点投到过锚点的那张面上（ctx.applyLock）。轴锁与面锁互斥。 */
  private _axisLock: LockAxis | null = null;
  private _planeLock: PlaneLock | null = null;
  private _planeLockN: Pt3 | null = null;   // 面锁法向（世界、单位长）；"face" 锁时 = 按下那一刻光标下那张膜的法向
  private lastPtr: { x: number; y: number } | null = null;
  private lastMoveEv: ToolPointer | null = null;   // Shift 按下 / 松开时按它重算（setShiftHeld）   // 最后一次指针位置（Shift+↓ 取光标下的膜用）
  get axisLock(): LockAxis | null { return this._axisLock; }
  get planeLock(): PlaneLock | null { return this._planeLock; }
  /** 当前工具吃哪种锁（null = 不吃锁：方向键 / 虚拟轴键无效）。 */
  lockStyle(): "axis" | "plane" | null { return this.handlers[this._tool]?.lock ?? null; }
  setAxisLock(a: LockAxis | null): void {
    if (this._axisLock === a && this._planeLock === null) return;
    this._axisLock = a; this._planeLock = null; this._planeLockN = null;
    this.host.hint(a ? `轴锁 ${a.toUpperCase()}（再按同一个方向键或 ↓ 解锁）` : null);
    this.host.changed(); this.draw();
  }
  toggleAxisLock(a: LockAxis): void { this.setAxisLock(this._axisLock === a ? null : a); }
  /** 面锁："x" / "y" / "z" = 法向是那根上下文轴的面；"face" = 光标下那张膜的面（光标下没膜 → 不锁，给提示）。 */
  setPlaneLock(p: PlaneLock | null): void {
    let n: Pt3 | null = null;
    if (p === "face") {
      const w = this.liveWorld(), at = this.lastPtr, f = at ? pickFace(w, this.frame(), this.fvp(), at.x, at.y) : undefined, rec = f !== undefined ? w.planeOf(f) : undefined;
      if (!rec) { this.host.hint("面锁：光标下没有面（把光标放到一张面上再按 Shift+↓）"); return; }
      n = normalize3(rec.plane.n);
    } else if (p) { const raw = this.contextFrame()[p]; n = normalize3(raw); }
    this._planeLock = p; this._planeLockN = n; this._axisLock = null;
    this.host.hint(p ? `面锁 ${planeLockLabel(p)}（再按同一个键或 ↓ 解锁）` : null);
    this.host.changed(); this.draw();
  }
  togglePlaneLock(p: PlaneLock): void { this.setPlaneLock(this._planeLock === p ? null : p); }
  /** 方向键 / 触屏虚拟轴键的唯一入口：axis = 键对应的轴（→ X / ← Y / ↑ Z），null = ↓；plane = Shift。按当前工具的锁种分派。 */
  lockKey(axis: LockAxis | null, plane: boolean): void {
    const style = this.lockStyle();
    if (!style) { this.host.hint("这把工具没有轴锁 / 面锁"); return; }
    if (axis === null) { if (plane) this.togglePlaneLock("face"); else this.setAxisLock(null); return; }
    if (style === "plane" || plane) this.togglePlaneLock(axis); else this.toggleAxisLock(axis);
  }
  /** 面锁下过 through 的平面（先定平面的工具在首点之后用；没锁 = null）。轴面的基 = 另外两根上下文轴。 */
  private lockedPlaneThrough(through: Pt3): DrawPlane | null {
    const n = this._planeLockN;
    if (!this._planeLock || !n) return null;
    const pl = canonicalPlane(n, dot3(n, through));
    return { plane: pl, basis: planeBasis(pl) };
  }
  /** 锁的事后约束（求解器本身不动，排序规则归 Fable）：轴锁 → lockToAxis；面锁 → lockToPlane；没锁 = 原样。 */
  private applyLock(sn: Snap3, anchor: Pt3 | null | undefined, sx: number, sy: number): Snap3 {
    if (this._axisLock) return this.lockToAxis(sn, anchor, sx, sy);
    if (this._planeLock) return this.lockToPlane(sn, anchor, sx, sy);
    return sn;
  }
  private static strongSnap(sn: Snap3): boolean { return sn.kind !== null && sn.kind !== "on-face" && sn.kind !== "grid-point" && sn.kind !== "increment" && sn.kind !== "tool" && !sn.kind.startsWith("axis-"); }
  /** 投到锁住的面（过锚点）上：吸到实几何 → 正投影（「从点」；已在面上就原样）；没吸到 → 光标射线交面（掠射 = 投影兜底）；
   *  栅格开着且是轴面 → 面内两根轴各自落绝对格。 */
  private lockToPlane(sn: Snap3, anchor: Pt3 | null | undefined, sx: number, sy: number): Snap3 {
    const n = this._planeLockN, lock = this._planeLock;
    if (!lock || !n || !anchor) return sn;
    const strong = Editor.strongSnap(sn), off = dot3(sub3(sn.p, anchor), n);
    if (strong && Math.abs(off) < 1e-9) return sn;
    let p = sub3(sn.p, scale3(n, off));
    if (!strong) {
      const ray = this.frame().ray(sx, sy, this.fvp()), den = dot3(ray.dir, n);
      if (Math.abs(den) > 0.05) { const t = dot3(sub3(anchor, ray.origin), n) / den; if (t > 0) p = { x: ray.origin.x + ray.dir.x * t, y: ray.origin.y + ray.dir.y * t, z: ray.origin.z + ray.dir.z * t }; }
    }
    if (this.gridEff && lock !== "face") {
      const F = this.contextFrame(), s0 = this._grid.step / this._grid.subdiv;
      if (s0 > 0) for (const ax of (["x", "y", "z"] as const).filter((a) => a !== lock)) {
        const raw = F[ax], d = normalize3(raw), c = dot3(sub3(p, F.origin), d), q = Math.round(c / s0) * s0 - c;
        p = { x: p.x + d.x * q, y: p.y + d.y * q, z: p.z + d.z * q };
      }
    }
    const label = `面锁 ${planeLockLabel(lock)}${strong ? " · 从点" : ""}`;
    return { p, kind: "tool", label, hints: strong ? [{ a: sn.p, b: p, axis: "i" }] : [] };
  }
  /** 把求解器结果投到锁住的轴线（过锚点）上：吸到实几何 → 投影（SU「从点」）；没吸到 → 光标射线离轴线最近的点；栅格开着 → 沿轴落绝对格。 */
  private lockToAxis(sn: Snap3, anchor: Pt3 | null | undefined, sx: number, sy: number): Snap3 {
    if (!this._axisLock || !anchor) return sn;
    const F = this.contextFrame(), ax = this._axisLock, raw = F[ax], dl = Math.hypot(raw.x, raw.y, raw.z) || 1, dir = { x: raw.x / dl, y: raw.y / dl, z: raw.z / dl };
    const strong = Editor.strongSnap(sn);
    let t = dot3(sub3(sn.p, anchor), dir);
    if (!strong) {   // 射线 vs 轴线的最近点（俯视锁 Z 也能拉高）
      const ray = this.frame().ray(sx, sy, this.fvp()), r = ray.dir, w0 = sub3(anchor, ray.origin);
      const b = dot3(dir, r), c = dot3(r, r), d = dot3(dir, w0), e = dot3(r, w0), den = c - b * b;
      if (den > 1e-9) t = (b * e - c * d) / den;
    }
    if (this.gridEff) { const s0 = this._grid.step / this._grid.subdiv, c0 = dot3(sub3(anchor, F.origin), dir); if (s0 > 0) t = Math.round((c0 + t) / s0) * s0 - c0; }
    const p = { x: anchor.x + dir.x * t, y: anchor.y + dir.y * t, z: anchor.z + dir.z * t };
    return { p, kind: `axis-${ax}` as SnapKind, label: `轴锁 ${ax.toUpperCase()}${strong ? " · 从点" : ""}`, hints: [{ a: anchor, b: p, axis: ax }, ...(strong ? [{ a: sn.p, b: p, axis: "i" as const }] : [])] };
  }
  /** B43 尺度参考：勾了哪几项（多选取并集；[] = 不显示；跟着文件存 settings.scaleRefs）+ 懒加载来的梯子数据（宿主递进来）。 */
  private _scaleRefs: string[] = [...DEFAULT_SCALE_REFS];
  private scaleLadder: Ladder | null = null;
  get scaleRefs(): readonly string[] { return this._scaleRefs; }
  /** 勾 / 取消一项；算文档改动（同栅格设置）。 */
  toggleScaleRef(id: string): void { this._scaleRefs = this._scaleRefs.includes(id) ? this._scaleRefs.filter((x) => x !== id) : [...this._scaleRefs, id]; this.host.changed(); }
  /** 全部取消（= 不显示）。 */
  clearScaleRefs(): void { if (!this._scaleRefs.length) return; this._scaleRefs = []; this.host.changed(); }
  /** 读文件 / 新建时设（不算改动）。 */
  loadScaleRefs(refs: readonly string[]): void { this._scaleRefs = [...refs]; }
  setScaleLadder(L: Ladder): void { this.scaleLadder = L; }
  get scaleLadderLoaded(): boolean { return this.scaleLadder !== null; }
  /** 手势中正在拖的那段配什么参考（没手势 / 工具不报 / 没选 / 数据没到 = null）。 */
  private scaleTip(): ScaleTipView | null {
    const L = this.scaleLadder, H = this.handlers[this._tool];
    if (!L || !this._scaleRefs.length || !this.gestureActive() || !H?.scaleGeom) return null;
    const g = H.scaleGeom(this.toolCtx);
    const q = g && readingOf(g, this.contextFrame().z, L.orientation);
    return q ? scaleTipView(L, this._scaleRefs, q) : null;
  }
  private _vcbUnit: LengthUnit = "m";
  /** 显示 / 输入单位：数值小窗按它读，所有读数（fmtLen / fmtArea）按它念——换单位只走这里（units.ts 窄接口）。 */
  get vcbUnit(): LengthUnit { return this._vcbUnit; }
  set vcbUnit(u: LengthUnit) { this._vcbUnit = u; setDisplayUnit(u); this.host.changed(); }
  private viewCache: { key: string; view: WorldView } | null = null;
  /** 只看这个（DT44，user 2026-10-25「然后左上角的hierarchy tree可以切换只看该组件」）：进了组 / 组件时，外面的不画、不吸、点不中。本次打开有效；根上无效果。 */
  private _isolate = false;
  get isolate(): boolean { return this._isolate; }
  setIsolate(on: boolean): void {
    if (this._isolate === on) return;
    this._isolate = on;
    this.hoverEdge = null; this.hoverFace = null; this.snapInfo = null;
    this.host.changed(); this.draw();
  }
  private kids = new WeakMap<object, number>();
  private nextKid = 1;

  constructor(private canvas: HTMLCanvasElement, private host: EditorHost) {
    this.config = new ToolConfig(TOOL_OPTIONS, host.optionKv);   // 字段初始化先于构造体（es2022）：config 在这里建，toolCtx 用 getter 取
    this.r3 = new Renderer3(canvas);
    this.cam.pitch = 0.61;
    this.cam.projection = "persp";
  }

  // ---------- 只读 ----------
  get tool(): Tool { return this._tool; }
  /** 活动池的内核（上下文所在的几何池；根上下文 = 根池）。 */
  get kernel(): Kernel { return this.scene.kernelOf(this.activePool()); }
  get sceneRef(): Scene { return this.scene; }
  /** 全场景世界坐标只读几何（OBJ 导出 / 统计）。 */
  worldGeom(): WorldView { return this.worldView(); }
  get context(): EditContext { return this.ctx; }
  get renderer3(): Renderer3 { return this.r3; }
  get revision(): number { return this._revision; }
  canUndo(): boolean { return this.history.canUndo(); }
  canRedo(): boolean { return this.history.canRedo(); }
  hasSelection(): boolean { return this.selection.edges.size > 0 || this.selection.faces.size > 0 || this.selection.verts.size > 0 || this.selection.guides.size > 0 || this.selectedPools.size > 0; }
  hasGeometrySelection(): boolean { return this.selection.edges.size > 0 || this.selection.faces.size > 0; }
  /** 选了面。 */
  hasFaceSelection(): boolean { return this.selection.faces.size > 0; }
  /** 选了点（2026-10-26）。 */
  hasPointSelection(): boolean { return this.selection.verts.size > 0; }
  hasPoolSelection(): boolean { return this.selectedPools.size > 0; }
  selectedPoolPicks(): PoolPick[] { return [...this.selectedPools.values()]; }
  isGestureActive(): boolean { return this.gestureActive(); }
  /** 上下文深度（0 = 根）。 */
  contextDepth(): number { return this.ctx.chain.length + (this.ctx.group !== null ? this.groupDepth(this.ctx.group) : 0); }
  /** 上下文人话：「根」/「组件 名 › 组」。 */
  contextLabel(): string {
    const parts: string[] = [];
    let def = this.scene.root;
    for (const iid of this.ctx.chain) { const inst = this.scene.instance(def, iid); def = inst.def; parts.push(`组件「${this.scene.def(def).name}」`); }
    if (this.ctx.group !== null) parts.push("组");
    return parts.length ? parts.join(" › ") : "根";
  }
  /** 面包屑（#25）：根 › 组件「名」› 组 › …；depth = 点它要退到的层数。 */
  contextCrumbs(): { label: string; depth: number }[] {
    const out: { label: string; depth: number }[] = [{ label: "根", depth: 0 }];
    let def = this.scene.root, depth = 0;
    for (const iid of this.ctx.chain) { const inst = this.scene.instance(def, iid); def = inst.def; depth++; out.push({ label: `组件「${this.scene.def(def).name}」`, depth }); }
    if (this.ctx.group !== null) {
      const chain: number[] = []; let g: number | null = this.ctx.group; const d = this.scene.defOfContext(this.ctx);
      while (g !== null) { chain.unshift(g); g = this.scene.group({ def: d, group: g }).parent; }
      for (const gid of chain) { depth++; out.push({ label: this.scene.group({ def: d, group: gid }).name ?? "组", depth }); }
    }
    return out;
  }
  /** 退到第 depth 层（0 = 根）。 */
  exitTo(depth: number): void { let guard = 64; while (this.contextDepth() > depth && guard-- > 0) { if (!this.exitContext()) break; } }
  private groupDepth(gid: number): number { let n = 0, g: number | null = gid; const def = this.scene.defOfContext(this.ctx); while (g !== null) { n++; g = this.scene.group({ def, group: g }).parent; } return n; }
  vp(): Viewport { return { w: this.canvas.clientWidth, h: this.canvas.clientHeight }; }

  // ---------- 指针帧（A2）----------
  private pointerFrame: { pf: PointerFrame; vp: Viewport } | null = null;
  setPointerFrame(pf: PointerFrame | null, vp?: Viewport): void { this.pointerFrame = pf ? { pf, vp: vp ?? { w: 800, h: 800 } } : null; }
  private frame(): PointerFrame { return this.pointerFrame?.pf ?? this.cam; }
  private fvp(): Viewport { return this.pointerFrame?.vp ?? this.vp(); }
  private eps(): EpsSet { return frameEps(this.frame(), this.fvp(), (SNAP_PX * this.fvp().h) / 800); }
  private snapPx(): number { return this.eps().snap; }
  private hitPx(): number { return this.eps().hit; }

  // ---------- 上下文 / 世界 ----------
  private activePool(): PoolRef { return this.scene.poolOfContext(this.ctx); }
  private ctxXform(): Xform { return this.scene.xformOfContext(this.ctx); }
  private toLocal(p: Pt3): Pt3 { const m = this.ctxXform(); return m === IDENTITY ? p : applyPt(invert(m), p); }
  private toWorld(p: Pt3): Pt3 { const m = this.ctxXform(); return m === IDENTITY ? p : applyPt(m, p); }
  /** 世界空间里的变换 → 活动上下文空间（父空间）里的同一变换：M⁻¹ ∘ X ∘ M。 */
  private xformToLocal(x: Xform): Xform { const m = this.ctxXform(); return m === IDENTITY ? x : compose(invert(m), compose(x, m)); }
  private kid(o: object): number { let id = this.kids.get(o); if (id === undefined) { id = this.nextKid++; this.kids.set(o, id); } return id; }
  private ctxKey(): string { return `${this.ctx.chain.join("/")}#${this.ctx.group ?? "root"}`; }
  /** 世界视图（缓存：场景代数 + 影子副本身份 + 上下文 + 整体变换预演）。 */
  private worldView(live: Kernel | null = null, override: { picks: PoolPick[]; xform: Xform; copy?: boolean } | null = null): WorldView {
    // 复制模式：原件不动；副本当「副本槽」画出来（DT14，此前副本要到 commit 才出现 = 没预演）
    const copy = override?.copy ? override : null;
    if (copy) override = null;
    const keyOf = (o: { picks: PoolPick[]; xform: Xform }): string => `${o.picks.map((p) => (p.kind === "group" ? `g${p.group}` : `i${p.instance}`)).join(",")}:${o.xform.map((v) => v.toFixed(9)).join(",")}`;
    const ovKey = override ? keyOf(override) : copy ? `copy:${keyOf(copy)}` : "";
    const grid = this.gridEff ? { step: this._grid.step, sub: this._grid.subdiv, frame: gridFrame(this.scene.frameOfContext(this.ctx), this._grid.plane) } : null;
    const key = `${this._revision}|${live ? this.kid(live) : 0}|${this.ctxKey()}|${ovKey}|${grid ? `${grid.step}/${grid.sub}` : ""}|${this._isolate ? "iso" : ""}`;
    if (this.viewCache?.key === key) return this.viewCache.view;
    const overrides = override ? this.overrideList(override) : undefined;
    const copies = copy ? this.overrideList(copy) : undefined;
    PART_STATS.ms = 0; PART_STATS.n = 0;
    const view = perf.time("worldView", () => new WorldView(this.scene, this.ctx, live, overrides, { grid, copies, isolate: this._isolate }));
    perf.last["worldView.parts"] = PART_STATS.ms; perf.last["worldView.partsN"] = PART_STATS.n;
    this.viewCache = { key, view };
    return view;
  }
  /**
   * 整体变换预演的命中规则：选中的子组 / 子实例（连同组里的实例子树）在世界侧再乘 o.xform。
   * 2026-10-26（user「如果一个component里面的subcomponent被进行移动 增删复制操作，preview会不会坏」；账本「组件里整体移动一个组时，其他实例也实时跟」）：
   * 同一 definition 的**每一份**都跟（当前这份 + 孪生）——每份把「上下文本地的变换」换回自己的世界系；都当「在手里」（不吸、不挡、点不中）。复制影子同理。
   */
  private overrideList(o: { picks: PoolPick[]; xform: Xform }): { match(pool: PoolRef, chain: readonly InstId[]): boolean; xform: Xform }[] {
    const def = this.scene.defOfContext(this.ctx), here = this.ctx.chain, hereKey = here.join("/");
    const groupDesc = (gid: number): Set<number> => {
      const out = new Set<number>([gid]);
      let grew = true;
      while (grew) { grew = false; for (const g of this.scene.brep(def).groups.values()) if (g.parent !== null && out.has(g.parent) && !out.has(g.id)) { out.add(g.id); grew = true; } }
      return out;
    };
    // 这个 definition 的每一份：链前缀 + 那份的世界变换（当前这份 = o.xform 原样；孪生 = 本地变换换到它的世界系）
    const XL = this.xformToLocal(o.xform);
    const copies: { chain: readonly InstId[]; key: string; X: Xform }[] = [{ chain: here, key: hereKey, X: o.xform }];
    for (const { pool, xform, chain } of this.scene.pools()) {
      if (pool.def !== def || pool.group !== null) continue;
      const key = chain.join("/");
      if (key !== hereKey) copies.push({ chain, key, X: compose(xform, compose(XL, invert(xform))) });
    }
    const out: { match(pool: PoolRef, chain: readonly InstId[]): boolean; xform: Xform }[] = [];
    for (const cp of copies) {
      const n = cp.chain.length;
      const under = (chain: readonly InstId[]): boolean => chain.length > n && chain.slice(0, n).join("/") === cp.key;
      for (const p of o.picks) {
        if (p.kind === "group") {
          const desc = groupDesc(p.group);
          out.push({ match: (pool: PoolRef, chain: readonly InstId[]) => {
            if (pool.def === def && chain.join("/") === cp.key && pool.group !== null && desc.has(pool.group)) return true;
            if (under(chain)) { const inst = this.scene.def(def).instances.get(chain[n]); return !!inst && inst.parent !== null && desc.has(inst.parent); }   // 组里的实例（及其子树）也跟着走
            return false;
          }, xform: cp.X });
        } else {
          out.push({ match: (_pool: PoolRef, chain: readonly InstId[]) => under(chain) && chain[n] === p.instance, xform: cp.X });
        }
      }
    }
    return out;
  }
  /** 命中的全局实体 → 本地实体（活动池）或子池（直接子项）或空。 */
  private classify(view: WorldView, hit: HitResult3): { kind: "entity"; local: HitResult3 } | { kind: "pool"; pick: PoolPick; key: string } | { kind: "none" } {
    const gid = hit.vertex ?? hit.edge ?? hit.face;
    if (gid === undefined) return { kind: "none" };
    const { slot, id } = view.local(gid);
    if (slot.active) {
      const local: HitResult3 = hit.vertex !== undefined ? { vertex: id } : hit.edge !== undefined ? { edge: id } : { face: id };
      return { kind: "entity", local };
    }
    const pick = this.topChild(slot);
    return pick ? { kind: "pool", pick, key: this.pickKey(pick) } : { kind: "none" };
  }
  /**
   * 选中的组 / 组件的轴（世界帧；DT15，user 2026-10-25「如果component在轴被埋在几何里面，如何拾取。不然装配炮塔的时候即使轴都打好了，还是装不进去」）：
   * 原点进吸附当透视点（被几何挡住也能吸）、渲染画一个透视的小三轴。**在手里的不算**（整体变换预演中的那份 = 视图里 overridden 的槽）——
   * 拖着它走时它自己的原点跟着光标跑，再当目标就是自己吸自己（user「会不会自己卡住自己」）。
   */
  private selectedPoolFrames(view: WorldView): Frame[] {
    if (!this.selectedPools.size) return [];
    const inHand = new Set<string>();
    for (const sl of view.slots) if (sl.overridden) { const p = this.topChild(sl); if (p) inHand.add(this.pickKey(p)); }
    const out: Frame[] = [];
    for (const [key, p] of this.selectedPools) {
      if (inHand.has(key)) continue;
      out.push(p.kind === "group" ? this.scene.frameOfContext({ chain: this.ctx.chain, group: p.group }) : this.scene.frameOfContext({ chain: [...this.ctx.chain, p.instance], group: null }));
    }
    return out;
  }
  private poolOrigins(view: WorldView): Pt3[] { return this.selectedPoolFrames(view).map((f) => f.origin); }
  /**
   * 空组件的小三轴（T11 / DT2，user 10-25「1 同意，以后我们开始做entity了再换」）：导入的空节点（位置标记 / 转轴 / 挂点）没几何，也要看得见、点得中——
   * 透视画（埋在别的几何里也看得见），每根短轴的屏幕长度同选中组件的轴。pick = 它在当前上下文里对应的直接子项（不在上下文子树里 = 只画不点）；自己就是当前上下文的不画（上下文轴已经画了）。
   */
  private emptyMarkers(view: WorldView): { frame: Frame; pick: PoolPick | null }[] {
    const out: { frame: Frame; pick: PoolPick | null }[] = [], here = this.ctx.chain.join("/");
    for (const sl of view.slots) {
      if (sl.pool.group !== null || sl.ghost || !sl.chain.length || sl.chain.join("/") === here || !this.scene.isBare(sl.pool.def)) continue;
      const m = sl.xform, ax = (x: number, y: number, z: number): Pt3 => normalize3(applyDir(m, { x, y, z }));
      out.push({ frame: { origin: applyPt(m, { x: 0, y: 0, z: 0 }), x: ax(1, 0, 0), y: ax(0, 1, 0), z: ax(0, 0, 1) }, pick: this.topChild(sl) });
    }
    return out;
  }
  /** 屏上 (sx, sy) 拾取半径里最近的空组件标记（原点或三根短轴的屏幕线段）。 */
  private emptyAt(sx: number, sy: number): { pick: PoolPick; key: string } | null {
    const pf = this.frame(), vp = this.fvp(), r = this.hitPx(), q = { x: sx, y: sy };
    let best: PoolPick | null = null, bd = Infinity;
    for (const em of this.emptyMarkers(this.liveWorld())) {
      if (!em.pick) continue;
      const o = em.frame.origin, s0 = pf.project?.(o, vp);
      if (!s0) continue;
      let d = Math.hypot(s0.x - sx, s0.y - sy);
      for (const u of [em.frame.x, em.frame.y, em.frame.z]) {
        const wpp = worldPerPx(pf, vp, o, u);
        const s1 = wpp ? pf.project?.(add3(o, scale3(u, POOL_AXES_PX * wpp)), vp) : null;
        if (s1) d = Math.min(d, distToSegment(q, s0, s1));
      }
      if (d <= r && d < bd) { bd = d; best = em.pick; }
    }
    return best ? { pick: best, key: this.pickKey(best) } : null;
  }
  /** 屏幕框里的空组件标记（原点投影在框里）。 */
  private emptiesIn(box: { minX: number; minY: number; maxX: number; maxY: number }): { pick: PoolPick; key: string }[] {
    const pf = this.frame(), vp = this.fvp(), out: { pick: PoolPick; key: string }[] = [];
    for (const em of this.emptyMarkers(this.liveWorld())) {
      if (!em.pick) continue;
      const s0 = pf.project?.(em.frame.origin, vp);
      if (s0 && s0.x >= box.minX && s0.x <= box.maxX && s0.y >= box.minY && s0.y <= box.maxY) out.push({ pick: em.pick, key: this.pickKey(em.pick) });
    }
    return out;
  }
  private pickKey(p: PoolPick): string { return p.kind === "group" ? `g${p.group}` : `i${p.instance}`; }
  /** 槽 → 它所属的、活动上下文的直接子项（组 / 实例）；不在上下文子树里 → null。 */
  private topChild(slot: PoolSlot): PoolPick | null {
    const n = this.ctx.chain.length, chainKey = this.ctx.chain.join("/");
    if (slot.chain.length < n || slot.chain.slice(0, n).join("/") !== chainKey) return null;
    const def = this.scene.defOfContext(this.ctx);
    if (slot.chain.length === n) {
      if (slot.pool.group === null) return null;   // 同池的根几何（活动池是某个 group 时，根几何不是子项）
      let g: number | null = slot.pool.group;
      while (g !== null) { const grp = this.scene.group({ def, group: g }); if (grp.parent === this.ctx.group) return { kind: "group", group: g }; g = grp.parent; }
      return null;
    }
    const inst = this.scene.def(def).instances.get(slot.chain[n]);
    if (!inst) return null;
    if (inst.parent === this.ctx.group) return { kind: "instance", instance: inst.id };
    let g: number | null = inst.parent;
    while (g !== null) { const grp = this.scene.group({ def, group: g }); if (grp.parent === this.ctx.group) return { kind: "group", group: g }; g = grp.parent; }
    return null;
  }
  /** 子项在当前视图里的槽键集合（渲染高亮 / 包围盒）。 */
  private slotsOfPick(view: WorldView, p: PoolPick): PoolSlot[] {
    const [ov] = this.overrideList({ picks: [p], xform: IDENTITY });
    return view.slots.filter((s) => ov.match(s.pool, s.chain));
  }

  // ---------- 工具 ----------
  setTool(t: Tool): void {
    if (!this.mode.tools.includes(t)) {   // 工具属于别的模式（快捷键 B 在几何模式按了油漆桶）→ 先切过去
      const owner = this.modeList.find((m) => m.tools.includes(t));
      if (!owner) return;
      this.setMode(owner.id);
    }
    this.last = null;
    this._tool = t;
    this.cancelGesture();
    this.clearCharged();   // 充能生命周期 = 工具子步（user 2026-10-24）：换工具就清
    this.host.changed();
    this.draw();
  }

  cancel(): void {
    if (this.gizmo) { this.openParamSession(null); this.host.hint("镜像已取消"); return; }   // 镜像会话里 Esc = 取消镜像（选区留着）
    this.taps.cancel();
    this.last = null;
    this.selection = emptySelection();
    this.selectedPools.clear();
    this.cancelGesture();
    this.host.changed();
    this.draw();
  }

  // ---------- 参考几何 / 轴（0.11 尺规纪元；世界坐标进、池本地坐标存）----------
  /** 上下文的帧（世界坐标）：根 = 绘图轴，进组 = 组的轴。 */
  contextFrame(): Frame { return this.scene.frameOfContext(this.ctx); }
  orientFrame(): Frame {
    const unit = (F: Frame): Frame => ({ origin: F.origin, x: normalize3(F.x), y: normalize3(F.y), z: normalize3(F.z) });
    if (this.selectedPools.size === 1 && !this.selection.faces.size && !this.selection.edges.size && !this.selection.verts.size) { const fr = this.selectedPoolFrames(this.worldView()); if (fr.length) return unit(fr[0]); }
    return unit(this.contextFrame());
  }
  boxIn(f: Frame): { min: Pt3; max: Pt3 } | null {
    const pts = this.selectionWorldPoints();
    if (!pts.length) return null;
    let min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const p of pts) { const c = { x: dot3(p, f.x), y: dot3(p, f.y), z: dot3(p, f.z) }; min = { x: Math.min(min.x, c.x), y: Math.min(min.y, c.y), z: Math.min(min.z, c.z) }; max = { x: Math.max(max.x, c.x), y: Math.max(max.y, c.y), z: Math.max(max.z, c.z) }; }
    return { min, max };
  }
  addGuideLine(p: Pt3, dir: Pt3): void {
    const m = invert(this.ctxXform());
    this.commitOp({ op: "addGuide", at: this.activePool(), line: { p: this.toLocal(p), dir: normalize3(applyDir(m, dir)) } });
  }
  addGuidePoint(p: Pt3): void { this.commitOp({ op: "addGuide", at: this.activePool(), point: this.toLocal(p) }); }
  eraseGuides(ids: readonly number[]): void { if (ids.length) this.commitOp({ op: "eraseGuides", at: this.activePool(), ids: [...ids] }); }
  /** 清空活动池的参考几何（SU「删除参考线」同款）。 */
  clearGuides(): void { this.commitOp({ op: "clearGuides", at: this.activePool() }); }
  hasGuides(): boolean { const g = this.scene.guidesOf(this.activePool()); return g.lines.length + g.points.length > 0; }
  /** 改轴（世界坐标帧进来）：根 = 绘图轴；进组 = 组的轴（几何不动）。 */
  setContextAxes(frame: Frame): void {
    const m = invert(this.ctxXform());
    const local: Frame = { origin: this.toLocal(frame.origin), x: normalize3(applyDir(m, frame.x)), y: normalize3(applyDir(m, frame.y)), z: normalize3(applyDir(m, frame.z)) };
    this.commitOp({ op: "setAxes", at: this.activePool(), frame: local });
  }
  private cancelGesture(): void {
    this.anchor3 = null;
    this._axisLock = null; this._planeLock = null; this._planeLockN = null;   // 轴锁 / 面锁随手势解（换工具 / Esc / 取消）
    for (const h of Object.values(this.handlers)) h.cancel();
    this.samples = [];
    this.lastSnap = null;
    this.armed = false;
    this.canArm = false;
    this.downPoint = null;
    this.justCommitted = false;
    this.cursor3 = null;
    this.snapInfo = null;
    this.hoverEdge = null;
    this.hoverFace = null;
    this.live = null;
    this.liveOverride = null;
    this.liveEvents = [];
    this.host.marquee(null);
    this.toolTip = null;
    this.host.tip(null, 0, 0);
    this.host.hint(null);
    if (this.dims) { this.dims = ""; this.host.readout?.(this.readoutText()); }
  }

  /** Shift 按下 / 松开（DT51：Shift = 把格点吸附反过来）：指针没动也按新规则重算悬停 / 手势预览。 */
  setShiftHeld(on: boolean): void {
    if (this.mods.shift === on) return;
    this.lastSnap = null;   // 规则换了：上一个吸附目标的「粘性」作废，按新规则重新选
    if (this.lastMoveEv) this.pointerMove({ ...this.lastMoveEv, shiftKey: on });
    else this.mods = { ...this.mods, shift: on };
  }
  // ---------- 记账 ----------
  /**
   * 会话跟着撤销走（user 2026-10-26「变换的时候按ctrl z不应该选区也没了」→ 同日「undo似乎全坏了…涉及组件的修改进出之类的」「不要ad hoc，而是思考系统重新设计」）：
   * 每一步记下它之前的会话 = 在哪个组件里 + 选区（第一条 op 提交时，交给 History 存）；撤销 = 场景和会话一起回到「之前」并顺手记下「之后」，重做 = 一起回到「之后」。
   * 所以撤销组件里的改动时人会回到那个组件里（看得见撤了什么），选区也回来。id 在同一份历史里是确定的（重放同一串 op），还原回去的 id 指的就是同一批东西；
   * 不存在的 id 剪掉；那一层组件已经没了（撤到建组件之前）= 退到还在的最深一层。设计稿 ai-docs/20261026-undo-session-redesign.md。
   */
  private sessionSnap(): Session { return { ctx: { chain: [...this.ctx.chain], group: this.ctx.group }, sel: this.selSnap() }; }
  private sessionRestore(s: Session | undefined): void {
    if (s) { const c = this.validCtx(s.ctx); if (this.ctxKeyOf(c) !== this.ctxKey()) { this.ctx = c; if (c.chain.length === 0 && c.group === null) this._isolate = false; this._revision++; } }
    this.selRestore(s?.sel);
  }
  /** 场景里还在的最深一层上下文（实例链从尾往前剪；组不在了 = 那个实例的根）。 */
  private validCtx(c: EditContext): EditContext {
    const ok = (cand: EditContext): boolean => {
      try {
        this.scene.poolOfContext(cand); this.scene.xformOfContext(cand);
        return cand.group === null || this.scene.brep(this.scene.defOfContext(cand)).groups.has(cand.group);
      } catch { return false; }
    };
    if (ok(c)) return c;
    for (let n = c.chain.length; n >= 0; n--) { const cand: EditContext = { chain: c.chain.slice(0, n), group: null }; if (ok(cand)) return cand; }   // 组没了 → 那个实例的根；实例没了 → 往上退
    return ROOT_CONTEXT;
  }
  private ctxKeyOf(c: EditContext): string { return `${c.chain.join("/")}#${c.group ?? "root"}`; }
  private selSnap(): SelSnap { return { ctx: this.ctxKey(), faces: [...this.selection.faces], edges: [...this.selection.edges], verts: [...this.selection.verts], guides: [...this.selection.guides], pools: [...this.selectedPools.entries()] }; }
  private selRestore(s: SelSnap | undefined): void {
    this.selection = emptySelection(); this.selectedPools.clear();
    if (!s || s.ctx !== this.ctxKey()) return;
    for (const f of s.faces) this.selection.faces.add(f);
    for (const e of s.edges) this.selection.edges.add(e);
    for (const v of s.verts) this.selection.verts.add(v);
    for (const g of s.guides) this.selection.guides.add(g);
    for (const [k, p] of s.pools) this.selectedPools.set(k, p);
    this.pruneSelection();
  }
  /** 用户的一个动作：fn 里提交的全部 op 并成一步（撤销 / 重做一次走完）。可嵌套（外层说了算）。 */
  private step<T>(fn: () => T): T {
    if (this.stepDepth++ === 0) { this.stepHasOp = false; this.stepOps = 0; this.stepFailed = false; }
    try { return fn(); } finally { this.stepDepth--; }
  }
  /** 所有改场景的用户手势走这里：记账（op 日志，按坐标寻址）+ 应用。 */
  private commitOp(op: Op): FaceEvent[] {
    if (this._locked) { this.lockedSay(); this.host.trace?.({ kind: "fail", where: "commit", op, message: "locked (final)" }); return []; }
    if (this.opTouchesLocked(op)) { this.host.hint("已锁定：解锁后再改（选中它 → 解锁）"); this.host.trace?.({ kind: "fail", where: "commit", op, message: "locked (object)" }); return []; }
    if (this.stepDepth > 0 && this.stepFailed) return [];   // 这一步前面已经失败并回滚了：剩下的不再执行（不留半截）
    const t0 = performance.now();
    const join = this.stepDepth > 0 && this.stepHasOp, before = join ? undefined : this.sessionSnap();   // 新的一步：记下它之前的会话（History 存，redo 尾巴一起作废）
    let r: ReturnType<History["commit"]>;
    try { r = perf.time("commit", () => this.history.commit(this.scene, op, join, before)); }
    catch (err) {
      const cause = err instanceof OpApplyError ? err.cause : err;
      if (err instanceof OpApplyError) this.installScene(err.restored);
      const pool = ("at" in op && op.at) ? op.at : this.activePool();
      let preBrep: BrepSnapshot | undefined;
      try { preBrep = this.scene.kernelOf(pool).toBrep(); } catch { /* 池在这一步里才建出来 */ }   // 复现包要「失败那条之前」——回滚整步之前先留
      this.rollbackStep();   // 一步 = 原子：这一步前面已提交的也撤掉，重做队列里不留半截
      if (cause instanceof ShearRejected) { this.host.trace?.({ kind: "fail", where: "commit", op, message: cause.message }); this.host.hint(cause.message); this.host.changed(); this.draw(); return []; }   // 护栏拒绝：不是崩溃，不弹错误胶囊
      this.host.trace?.({ kind: "fail", where: "commit", op, message: cause instanceof Error ? cause.message : String(cause), ...(preBrep ? { brep: preBrep } : {}), pool });
      this.fail("commit", cause);
      return [];
    }
    this.opCount++;
    if (this.stepDepth > 0) { this.stepHasOp = true; this.stepOps++; }
    this.installScene(r.scene);
    this.host.trace?.({ kind: "op", op, events: r.events.length, ms: performance.now() - t0, position: this.history.position() });
    this.host.changed();   // HUD（撤销钮 / 选项条 / 数值小窗）随每个 op 刷新
    return r.events;
  }
  /** 一步中途失败：把这一步已经提交的 op 撤掉（回到这一步之前，连会话），丢掉重做队列，这一步剩下的提交一律不执行。 */
  private rollbackStep(): void {
    if (this.stepDepth === 0) return;
    this.stepFailed = true;
    if (!this.stepOps) return;
    let sc: Scene | null = null, before: Session | undefined;
    for (let i = 0; i < this.stepOps; i++) { const r = this.history.undoOp(); if (!r) break; sc = r.scene; before = r.before ?? before; this.opCount--; }
    this.history.dropRedo();
    this.stepOps = 0; this.stepHasOp = false;
    if (sc) this.installScene(sc, before);
  }
  private bump(): void {
    this._revision++;
    // 上下文可能已不存在（撤掉了建组 / 建组件 / 复制）→ 退到还在的最深一层
    const c = this.validCtx(this.ctx);
    if (this.ctxKeyOf(c) !== this.ctxKey()) { this.ctx = c; if (c.chain.length === 0 && c.group === null) this._isolate = false; }
    this.pruneSelection();
  }
  /**
   * 换场景的唯一入口（2026-10-26 撤销重设计）：换场景 → 校正所在的组件（退到还在的最深一层）→ 剪 / 还原选区 → 充能点重核。
   * **这里不通知界面**——调用方在这之后才关参数小窗、刷新 HUD。以前撤销先关小窗（会刷新界面、读「当前在哪个组件」）后校正：
   * 在组件里一路撤、撤过「建出 / 复制出这个组件」那一步就抛错，撤到一半停住（历史已退、场景已换、人卡在不存在的组件里）。
   */
  private installScene(s: Scene, session?: Session): void {
    this.scene = s;
    this.bump();
    if (session) this.sessionRestore(session);
    this.revalidateCharged();
  }
  private pruneSelection(): void {
    const k = this.kernel;
    for (const e of [...this.selection.edges]) if (!k.graph.hasEdge(e)) this.selection.edges.delete(e);
    for (const f of [...this.selection.faces]) if (!k.face(f)) this.selection.faces.delete(f);
    for (const v of [...this.selection.verts]) if (!k.graph.hasVertex(v)) this.selection.verts.delete(v);
    const def = this.scene.defOfContext(this.ctx);
    for (const [key, p] of [...this.selectedPools]) {
      const ok = p.kind === "group" ? this.scene.brep(def).groups.get(p.group)?.parent === this.ctx.group : this.scene.def(def).instances.get(p.instance)?.parent === this.ctx.group;
      if (!ok) this.selectedPools.delete(key);
    }
  }
  private fail(where: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    this.host.error?.(err, where);
    this.host.hint(`操作失败（${where === "commit" ? "提交" : "预演"}）：${msg}`);
  }

  /** 刚提交的那一步：op + 它之前的活动池 B-rep（复现包「上一步」；成功但错的也能寄）。没有 / 池不是 brep → null。 */
  lastStep(): { op: Op; brep: BrepSnapshot; pool: PoolRef } | null {
    const pos = this.history.position();
    if (pos === 0) return null;
    const op = this.history.log()[pos - 1];
    const pool: PoolRef = ("at" in op && op.at) ? op.at : { def: this.scene.root, group: null };
    try {
      const before = this.history.stateAt(pos - 1);
      if (!before.hasPool(pool) || before.kindOf(pool.def) !== "brep") return null;
      return { op, brep: before.kernelOf(pool).toBrep(), pool };
    } catch { return null; }
  }

  undo(): void {
    this.last = null;
    if (this.gestureActive()) { this.cancelGesture(); this.host.hint(null); this.host.changed(); this.draw(); return; }
    if (this._locked) { this.lockedSay(); return; }
    const r = this.history.undo(this.sessionSnap());   // 撤之前的会话 = 这一步「之后」的样子（重做时还原）
    if (!r) return;
    this.installScene(r.scene, r.before);   // 撤销 = 回到这一步之前：场景 + 在哪个组件里 + 选区一起（先装好，再碰界面）
    this.openParamSession(null);   // 马后炮 / 马前炮跟着那一步走：撤了就关（不然再改值会撤错一步）
    this.cancelGesture();
    this.host.trace?.({ kind: "undo", position: this.history.position(), depth: this.history.depth() });
    this.host.changed();
    this.draw();
  }
  redo(): void {
    this.last = null;
    if (this._locked) { this.lockedSay(); return; }
    let r: ReturnType<History<Session>["redo"]>;
    try { r = this.history.redo(this.scene); }
    catch (err) {
      const cause = err instanceof OpApplyError ? err.cause : err;
      if (err instanceof OpApplyError) this.installScene(err.restored);
      this.host.trace?.({ kind: "fail", where: "redo", op: null, message: cause instanceof Error ? cause.message : String(cause) });
      this.fail("commit", cause);
      return;
    }
    if (!r) return;
    this.installScene(r.scene, r.after);   // 重做 = 回到这一步之后（撤销那一刻的样子）：场景 + 在哪个组件里 + 选区一起
    this.openParamSession(null);
    this.cancelGesture();
    this.host.trace?.({ kind: "redo", position: this.history.position(), depth: this.history.depth() });
    this.host.changed();
    this.draw();
  }
  /** 装载一个场景当新的 checkpoint（打开文件 / 新建）：历史从这里重新开始，上下文回根，选区/充能/手势全清。 */
  loadScene(s: Scene, label = "打开"): void {
    this.last = null;
    this.cancelGesture();
    this.scene = s;
    this.ctx = ROOT_CONTEXT;
    this.history = new History<Session>(s);
    this._revision++;
    this.selection = emptySelection(); this.selectedPools.clear();
    this.clearCharged();
    this.host.trace?.({ kind: "load", label });
    this.host.changed();
    this.draw();
  }
  /** 兼容：单内核当根池装载。 */
  loadKernel(k: Kernel, label = "打开"): void { this.loadScene(new Scene(k), label); }
  /** 干净视角截图（无选区/悬停/吸附/预演）→ RGBA 自上而下；保存时的缩略图源。 */
  captureRgba(w: number, h: number): Uint8Array {
    // 宽高比和屏幕不一样（缩略图永远正方形，user 2026-10-26「thumb应该永远是1:1的而不是依照设备」）→ 取屏幕正中间最大的那块：
    // 眼睛不动，只收窄视野（半高和视场角的正切乘同一个系数，眼距不变）；目标比屏幕窄 = 竖直视野不变、两边裁掉
    const vp = this.vp(), as = vp.w / Math.max(1, vp.h), at = w / Math.max(1, h), k = at >= as ? as / at : 1;
    const cam = this.cam, h0 = cam.halfH, f0 = cam.fovY;
    try {
      if (k !== 1) { cam.halfH = h0 * k; cam.fovY = 2 * Math.atan(Math.tan(f0 / 2) * k); }
      return this.r3.captureRgba(this.worldView(), cam, { w, h }, this.cleanState());
    } finally { cam.halfH = h0; cam.fovY = f0; }
  }
  private cleanState(): ViewState {
    return { selectionEdges: new Set(), selectionFaces: new Set(), scrubEdges: new Set(), hoverEdge: null, hoverFace: null, preview: null, snap: null, snapAnchor: null, revision: this._revision, dimSlots: null, handles: null };
  }
  clearAll(): void {
    this.last = null;
    this.cancelGesture();
    this.selection = emptySelection(); this.selectedPools.clear();
    this.clearCharged();
    this.ctx = ROOT_CONTEXT;
    this.commitOp({ op: "clear" });
    this.draw();
  }
  applyPreset(name: string): boolean {
    const preset = PRESETS.find((p) => p.name === name);
    if (!preset) return false;
    this.cancelGesture();
    this.selection = emptySelection(); this.selectedPools.clear();
    this.clearCharged();
    this.ctx = ROOT_CONTEXT;
    this.commitOp({ op: "preset", name });
    this.draw();
    return true;
  }
  /** 外部喂线段（OBJ 导入等）：一次 addEdges = 一个手势（进活动池，世界坐标 → 本地）。 */
  addSegments(segs: [PtIn, PtIn][], label: string): FaceEvent[] {
    this.cancelGesture();
    this.selection = emptySelection(); this.selectedPools.clear();
    this.host.trace?.({ kind: "load", label });
    const evs = this.commitOp({ op: "addEdges", at: this.activePool(), segs: segs.map(([a, b]) => [this.toLocal({ x: a.x, y: a.y, z: a.z ?? 0 }), this.toLocal({ x: b.x, y: b.y, z: b.z ?? 0 })]) });
    this.draw();
    return evs;
  }
  /**
   * 导入外来 glb（T11 / DT2）：节点树原样变成组件，挂在当前上下文下面（文件坐标 = 世界坐标，同 OBJ）；三角 → 膜在这里跑一次（锐角阈值 = 油漆桶 / 拍平同一个量），
   * 装好的膜随 op 走（撤销重放只做装载）。成功 → 选中导进来的那一份。失败 → 人话原因（不提交）。
   */
  importForeign(data: ImportScene): { ok: true; cast: TriangleCastReport; empties: number; instances: number } | { ok: false; reason: string } {
    this.cancelGesture();
    if (data.nodes.some((n) => hasShear(n.xform))) return { ok: false, reason: "文件里有斜切的节点（glTF 不允许），导不进来" };
    if (!data.roots.length) return { ok: false, reason: "文件里没有节点" };
    const { scene, report } = castImport(data, this.config.get("surface", "sharpDeg"));
    const at = this.activePool(), defId = at.def, before = new Set(this.scene.def(defId).instances.keys());
    this.selection = emptySelection(); this.selectedPools.clear();
    this.host.trace?.({ kind: "load", label: `import ${data.name}` });
    this.commitOp({ op: "importScene", at, scene, place: invert(this.ctxXform()) });
    const added = [...this.scene.def(defId).instances.keys()].filter((id) => !before.has(id));
    if (!added.length) return { ok: false, reason: "没导进来（详情见调试日志）" };
    for (const id of added) this.selectedPools.set(`i${id}`, { kind: "instance", instance: id });
    this.bump(); this.host.changed(); this.draw();
    let instances = 0;
    const count = (d: number, depth: number): void => { if (depth > 64) return; for (const i of this.scene.def(d).instances.values()) { instances++; count(i.def, depth + 1); } };
    for (const id of added) { instances++; count(this.scene.def(defId).instances.get(id)!.def, 0); }
    return { ok: true, cast: report, empties: data.nodes.filter((n) => n.mesh === null && !n.children.length).length, instances };
  }
  pointerHitDistance(sx: number, sy: number): number | null {
    const k = this.liveWorld();
    const fid = pickFace(k, this.frame(), this.fvp(), sx, sy);
    if (fid === undefined) return null;
    const rec = k.planeOf(fid);
    if (!rec) return null;
    const ray = this.frame().ray(sx, sy, this.fvp());
    const q = rayPlane(ray.origin, ray.dir, rec.plane.n, rec.plane.d);
    return q ? Math.hypot(q.x - ray.origin.x, q.y - ray.origin.y, q.z - ray.origin.z) : null;
  }
  /** 选择工具的拾取（点击族共用）：屏幕坐标 → **全局**实体 id（WorldView）。 */
  pickAt(sx: number, sy: number): HitResult3 { return pickEntity(this.liveWorld(), this.frame(), this.fvp(), sx, sy, this.hitPx()); }

  /**
   * 选择扩张（SU 点击族：单击 / 双击 / 三击）：stage 0 = 命中实体本身；1 = 膜 + 其环边；2 = 连通体。命中子 group / 实例 = 选它整体。
   * 点（2026-10-26）：单击 = 这个点；双击 = 连着它的线；三击 = 连通体。
   * mode = 怎么合进已有选区（替换 / 加选 / 减选 / 切换，对齐 Blender）；空命中 + 替换 = 清选区。hit 是 WorldView 的全局 id。
   */
  selectExpand(hit: HitResult3, stage: 0 | 1 | 2, mode: SelMode = "replace"): boolean {
    const view = this.liveWorld();
    const c = this.classify(view, hit);
    if (mode === "replace") { this.selection = emptySelection(); this.selectedPools.clear(); }
    if (c.kind === "pool") { this.mergePools([c.pick], mode); this.afterSelect(); return true; }
    if (c.kind === "none") { this.afterSelect(); return true; }
    const k = this.kernel;
    const picked = emptySelection();
    const h = c.local;
    const addFaceRing = (fid: FaceId): void => {
      const f = k.face(fid);
      if (!f) return;
      picked.faces.add(fid);
      for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) picked.edges.add(d.edge);
    };
    if (h.edge !== undefined && k.graph.hasEdge(h.edge)) {
      picked.edges.add(h.edge);
      const cid = k.curveOf(h.edge);                                             // 0.10：单击曲线的一段 = 整条（SU）
      if (cid !== undefined) for (const e of k.curveById(cid)!.edges) if (k.graph.hasEdge(e)) picked.edges.add(e);
      if (stage >= 1) for (const fid of k.graph.edge(h.edge).faceLinks) picked.faces.add(fid);
    } else if (h.face !== undefined && k.face(h.face)) {
      const surf = surfaceFaces(k, h.face);                                        // 0.10：单击曲面的一片 = 整张（沿软边泛洪；SU）
      if (stage >= 1) for (const f of surf) addFaceRing(f); else for (const f of surf) picked.faces.add(f);
    } else if (h.vertex !== undefined && k.graph.hasVertex(h.vertex)) {
      if (stage === 0) picked.verts.add(h.vertex);
      else for (const eid of k.graph.vertex(h.vertex).edges) picked.edges.add(eid);
    }
    if (stage >= 2) {   // 三击 = 连通体（kernel/flood.ts connectedFrom，T5 收拢）
      const all = connectedFrom(k, picked.edges, picked.faces);
      picked.edges = all.edges; picked.faces = all.faces;
    }
    // 隐藏的（DT49）连通着走、但不选进来；切换按整次点击算（点中的全已选中 = 全去掉）
    const pe = [...picked.edges].filter((e) => !k.isEdgeHidden(e)), pf = [...picked.faces].filter((f) => !k.isFaceHidden(f)), pv = [...picked.verts];
    const all = mode === "toggle" && pe.every((e) => this.selection.edges.has(e)) && pf.every((f) => this.selection.faces.has(f)) && pv.every((v) => this.selection.verts.has(v));
    const m: SelMode = mode === "toggle" ? (all ? "remove" : "add") : mode;
    mergeSel(this.selection.edges, pe, m); mergeSel(this.selection.faces, pf, m); mergeSel(this.selection.verts, pv, m);
    this.afterSelect();
    return true;
  }
  /** 组 / 组件按 mode 合进选区（切换 = 逐个）。 */
  private mergePools(picks: readonly PoolPick[], mode: SelMode, perItem = true): void {
    const keys = picks.map((p) => this.pickKey(p));
    const all = keys.length > 0 && keys.every((k) => this.selectedPools.has(k));
    picks.forEach((p, i) => {
      const k = keys[i], has = this.selectedPools.has(k);
      const del = mode === "remove" || (mode === "toggle" && (perItem ? has : all));
      if (del) this.selectedPools.delete(k); else this.selectedPools.set(k, p);
    });
  }
  /** 反选（Blender Ctrl+I）：当前上下文里没选的面 / 边 / 子组 / 组件；点和参考几何清掉。隐藏的不选。 */
  invertSelection(): boolean {
    const before = this.selection, pools = new Set(this.selectedPools.keys());
    this.selectAllInner();
    for (const f of before.faces) this.selection.faces.delete(f);
    for (const e of before.edges) this.selection.edges.delete(e);
    for (const key of pools) this.selectedPools.delete(key);
    this.afterSelect();
    return true;
  }
  /** 全不选（Blender Alt+A；Esc 也行）。 */
  deselectAll(): void { this.selection = emptySelection(); this.selectedPools.clear(); this.afterSelect(); }
  private afterSelect(): void {
    this.host.readout?.(this.readoutText());
    const info = this.selectionInfo();
    if (info) this.host.hint(info);
    this.host.changed();
    this.draw();
  }
  /** 实体信息（0.10）：选区恰是一条曲线 → 「圆 r=… · N 段」/「弧 …」/「曲线 · N 段」；恰是一张曲面 → 「曲面 · N 面」；别的 → null（不抢提示行）。 */
  private selectionInfo(): string | null {
    const lockedN = [...this.selectedPools.values()].filter((p) => this.pickIsLocked(p)).length;
    if (lockedN) return `已锁定 ${lockedN} 个（不能改 / 移 / 进入；可当推断参考；选区菜单 → 解锁）`;
    const k = this.kernel;
    const es = [...this.selection.edges].filter((e) => k.graph.hasEdge(e)), fs = [...this.selection.faces].filter((f) => k.face(f));
    if (es.length && !fs.length) {
      const cid = k.curveOf(es[0]);
      if (cid === undefined) return null;
      const c = k.curveById(cid);
      if (!c || es.some((e) => k.curveOf(e) !== cid) || es.length !== c.edges.filter((e) => k.graph.hasEdge(e)).length) return null;
      if (c.kind === "circle" && c.params) return `圆 r=${fmtLen(c.params.radius)} · ${c.edges.length} 段`;
      if (c.kind === "arc" && c.params) return `弧 r=${fmtLen(c.params.radius)} · ${c.edges.length} 段`;
      return `曲线 · ${c.edges.length} 段`;
    }
    if (fs.length > 1 && !es.length) {
      const surf = new Set(surfaceFaces(k, fs[0]));
      if (surf.size === fs.length && fs.every((f) => surf.has(f))) return `曲面 · ${fs.length} 面`;
    }
    return null;
  }
  /** 选区里有没有曲线的边（炸开曲线钮）。 */
  hasCurveSelection(): boolean { const k = this.kernel; for (const e of this.selection.edges) if (k.graph.hasEdge(e) && k.curveOf(e) !== undefined) return true; return false; }
  /** 炸开选区里的曲线（SU Explode Curve）：每条曲线给一条代表边，op 按坐标寻址。 */
  /** 选区能焊吗（粗筛，菜单显示用；真判在 planWeld）：≥ 2 条边、没选面。 */
  canWeldSelection(): boolean { const k = this.kernel; return !this.selection.faces.size && [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).length >= 2; }
  /** 焊接选区（B19，SU Weld Edges）：成一条曲线，之后选中整条。 */
  weldSelection(): boolean {
    const k = this.kernel, at = this.activePool();
    const plan = planWeld(k, [...this.selection.edges].filter((e) => k.graph.hasEdge(e)));
    if (typeof plan === "string") { this.host.hint(plan); return false; }
    const keys = plan.edges.map((e) => edgeKey(k, e));
    this.commitOp({ op: "weldEdges", at, edges: keys });
    const k2 = this.kernel; this.selection = emptySelection(); this.selectedPools.clear();
    for (const key of keys) { try { this.selection.edges.add(resolveEdge(k2, key)); } catch { /* 没了就不选 */ } }
    this.host.hint(`焊接：${plan.edges.length} 段 → 一条${plan.spec.kind === "circle" ? "圆" : plan.spec.kind === "arc" ? "弧" : "曲线"}（选 / 擦 / 高亮当整体）`);
    this.host.changed(); this.draw();
    return true;
  }
  explodeCurveSelection(): void {
    const k = this.kernel, at = this.activePool();
    const seen = new Set<number>(); const edges: ReturnType<typeof edgeKey>[] = [];
    for (const e of this.selection.edges) { if (!k.graph.hasEdge(e)) continue; const cid = k.curveOf(e); if (cid === undefined || seen.has(cid)) continue; seen.add(cid); edges.push(edgeKey(k, e)); }
    if (edges.length) this.commitOp({ op: "explodeCurves", at, edges });
    this.host.changed(); this.draw();
  }

  deleteSelection(): void { return this.step(() => this.deleteSelectionStep()); }
  private deleteSelectionStep(): void {
    if (!this.hasSelection()) return;
    const k = this.kernel, at = this.activePool();
    // 删点 = 删连着它的线（Blender「删除顶点」；面跟着线没了就没了）
    const delE = new Set<EdgeId>([...this.selection.edges].filter((e) => k.graph.hasEdge(e)));
    for (const v of this.selection.verts) if (k.graph.hasVertex(v)) for (const e of k.graph.vertex(v).edges) delE.add(e);
    if (this.selection.faces.size || delE.size) {
      this.commitOp({ op: "eraseSelection", at, faces: [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f)), edges: [...delE].map((e) => edgeKey(k, e)) });
    }
    const def = this.scene.defOfContext(this.ctx);
    const kept = new Map<string, PoolPick>();   // 锁住的不删、留在选区里（要解锁得先选中它）
    for (const [key, p] of [...this.selectedPools]) {
      if (this.pickIsLocked(p)) { kept.set(key, p); continue; }
      if (p.kind === "group") this.commitOp({ op: "eraseGroup", at, group: p.group });
      else this.commitOp({ op: "eraseInstance", def, instance: p.instance });
    }
    if (this.selection.guides.size) this.commitOp({ op: "eraseGuides", at, ids: [...this.selection.guides] });   // A31：选中的参考线 / 参考点
    this.selection = emptySelection(); this.selectedPools = kept;
    if (kept.size) this.host.hint(`${kept.size} 个已锁定的组 / 组件没删（选区菜单 → 解锁）`);
    this.host.changed();
    this.draw();
  }

  // ---------- group / component ----------
  /** 选区 → group（选中的膜 / 边搬进新 group；子 group / 实例选区一并进组——先建组再把它们挪进去）。 */
  makeGroup(): boolean {
    if (!this.hasSelection()) return false;
    const at = this.activePool(), k = this.kernel;
    const faces = [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f));
    const edges = [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
    const nest = this.nestPicks();
    if (!faces.length && !edges.length && !nest.groups.length && !nest.instances.length) return false;
    this.commitOp({ op: "makeGroup", at, faces, edges, ...nest.fields });
    this.selection = emptySelection(); this.selectedPools.clear();
    const def = this.scene.brep(this.scene.defOfContext(this.ctx));
    const newest = [...def.groups.values()].filter((g) => g.parent === this.ctx.group).pop();
    if (newest) this.selectedPools.set(`g${newest.id}`, { kind: "group", group: newest.id });
    this.host.changed(); this.draw();
    return true;
  }
  /**
   * 选区 → component（新 definition + 一个实例）。轴默认 = 底面中心（2026-10-26 user「忍不了了哈哈，组件默认是底部中心轴可以吗」；以前 = 包围盒最小角，SketchUp 同款）。
   * 之后右下角马后炮可换原点（user 2026-10-25「建立组件的时候能不能马后炮选择一下轴的居中模式」）：包围盒角 / 包围盒中心 / 底面中心 / 顶点平均——
   * = 撤销建组件、重做建组件 + 给新组件换轴（v0.14.5 组件换轴：世界不动）。
   */
  makeComponent(name: string): boolean { return this.step(() => this.makeComponentStep(name)); }
  /** 选区里一起装进新组 / 新组件的子组和组件（SketchUp 同款嵌套，user 2026-10-26「当然要」）：锁定的不动（提示一句）。 */
  private nestPicks(): { groups: GroupId[]; instances: InstId[]; fields: { groups?: GroupId[]; instances?: InstId[] } } {
    const picks = [...this.selectedPools.values()], locked = picks.filter((p) => this.pickIsLocked(p)).length;
    if (locked) this.host.hint(`${locked} 个已锁定的组 / 组件没装进去（解锁后再装）`);
    const free = picks.filter((p) => !this.pickIsLocked(p));
    const groups = free.filter((p): p is { kind: "group"; group: GroupId } => p.kind === "group").map((p) => p.group);
    const instances = free.filter((p): p is { kind: "instance"; instance: InstId } => p.kind === "instance").map((p) => p.instance);
    return { groups, instances, fields: { ...(groups.length ? { groups } : {}), ...(instances.length ? { instances } : {}) } };
  }
  private makeComponentStep(name: string): boolean {
    if (!this.hasSelection()) return false;
    const at = this.activePool(), k = this.kernel;
    const faces = [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f));
    const edges = [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
    const nest = this.nestPicks();
    if (!faces.length && !edges.length && !nest.groups.length && !nest.instances.length) return false;
    const go = (mode: string): void => {
      const before = new Set(this.scene.defs.keys());
      this.commitOp({ op: "makeComponent", at, faces, edges, name, ...nest.fields });
      const defId = [...this.scene.defs.keys()].find((id) => !before.has(id));
      if (defId === undefined || mode === "corner") return;
      const vs = this.scene.pointsOfDef(defId);   // 全部内容（散几何 + 装进来的组 / 组件）
      if (!vs.length) return;
      let lo = { x: Infinity, y: Infinity, z: Infinity }, hi = { x: -Infinity, y: -Infinity, z: -Infinity }, sum = { x: 0, y: 0, z: 0 };
      for (const v of vs) { lo = { x: Math.min(lo.x, v.x), y: Math.min(lo.y, v.y), z: Math.min(lo.z, v.z) }; hi = { x: Math.max(hi.x, v.x), y: Math.max(hi.y, v.y), z: Math.max(hi.z, v.z) }; sum = add3(sum, v); }
      const c = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, z: (lo.z + hi.z) / 2 };
      const origin = mode === "center" ? c : mode === "bottom" ? { x: c.x, y: c.y, z: lo.z } : scale3(sum, 1 / vs.length);
      this.commitOp({ op: "setAxes", at: { def: defId, group: null }, frame: { origin, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } } });
    };
    const selectNewest = (): void => {
      this.selection = emptySelection(); this.selectedPools.clear();
      const def = this.scene.def(this.scene.defOfContext(this.ctx));
      const newest = [...def.instances.values()].filter((i) => i.parent === this.ctx.group).pop();
      if (newest) this.selectedPools.set(`i${newest.id}`, { kind: "instance", instance: newest.id });
    };
    const n0 = this.opCount;
    go("bottom");
    if (this.opCount === n0) return false;
    selectNewest();
    this.offerAfterthought("建组件", [{ key: "origin", def: { kind: "enum", label: "原点", values: [{ id: "bottom", label: "底面中心" }, { id: "corner", label: "包围盒角" }, { id: "center", label: "包围盒中心" }, { id: "mean", label: "顶点平均" }] } }],
      { origin: "bottom" }, this.opCount - n0, (v) => { go(String(v.origin)); selectNewest(); });
    this.host.changed(); this.draw();
    return true;
  }
  /** 炸开选中的子 group / 实例。 */
  explodeSelection(): boolean { return this.step(() => this.explodeSelectionStep()); }
  private explodeSelectionStep(): boolean {
    if (!this.selectedPools.size) return false;
    const at = this.activePool();
    const kept = new Map<string, PoolPick>();
    for (const [key, p] of [...this.selectedPools]) {
      if (this.pickIsLocked(p)) { kept.set(key, p); continue; }
      this.commitOp(p.kind === "group" ? { op: "explode", at, group: p.group } : { op: "explode", at, instance: p.instance });
    }
    this.selectedPools = kept;
    if (kept.size) this.host.hint(`${kept.size} 个已锁定的组 / 组件没炸开（选区菜单 → 解锁）`);
    this.host.changed(); this.draw();
    return true;
  }
  /** 再放一份选中实例的定义（复制 = 同定义新实例，偏移 delta 世界向量）。 */
  copyInstance(delta: Pt3): boolean { return this.step(() => this.copyInstanceStep(delta)); }
  private copyInstanceStep(delta: Pt3): boolean {
    const picks = [...this.selectedPools.values()].filter((p): p is { kind: "instance"; instance: InstId } => p.kind === "instance");
    if (!picks.length) return false;
    const def = this.scene.defOfContext(this.ctx), at = this.activePool();
    for (const p of picks) {
      const inst = this.scene.instance(def, p.instance);
      this.commitOp({ op: "placeInstance", at, definition: inst.def, xform: compose(this.xformToLocal(translation(delta)), inst.xform) });
    }
    this.host.changed(); this.draw();
    return true;
  }
  // ---------- 锁定（A27，SU Lock；user 2026-10-24 立面图思考题）：对象层属性，所有 kind 通用；推断照吃（WorldView 不看锁）----------
  /** 这条 op 会改到锁住的东西吗：目标池在锁住的 group 里 / 整体动・删・炸一个锁住的子项 / 当前上下文在锁住的实例里面。setLocked 本身豁免（解锁要能做）。 */
  private opTouchesLocked(op: Op): boolean {
    if (op.op === "setLocked" || op.op === "setHidden" || op.op === "unhideAll") return false;   // 解锁要能做；藏 / 显示不改东西（锁着的也能藏）
    if (op.op === "batch") return op.ops.some((o) => this.opTouchesLocked(o));
    const s = this.scene;
    if ("at" in op && op.at && s.hasPool(op.at) && s.poolLocked(op.at)) return true;
    if (op.op === "transformPool") return s.poolLocked(op.at);
    if (op.op === "eraseGroup" || (op.op === "explode" && op.group !== undefined)) return s.poolLocked({ def: op.at.def, group: op.group! });
    if (op.op === "transformInstance" || op.op === "eraseInstance") return s.pickLocked(op.def, { kind: "instance", instance: op.instance });
    if (op.op === "explode" && op.instance !== undefined) return s.pickLocked(op.at.def, { kind: "instance", instance: op.instance });
    return this.contextLocked();
  }
  /** 当前上下文链上有锁住的实例（进不去的地方本来也到不了；双保险）。 */
  private contextLocked(): boolean {
    let def = this.scene.root;
    for (const iid of this.ctx.chain) { if (this.scene.pickLocked(def, { kind: "instance", instance: iid })) return true; def = this.scene.instance(def, iid).def; }
    return false;
  }
  private pickIsLocked(p: PoolPick): boolean { return this.scene.pickLocked(this.scene.defOfContext(this.ctx), p); }
  hasLockedSelection(): boolean { return [...this.selectedPools.values()].some((p) => this.pickIsLocked(p)); }
  hasUnlockedPoolSelection(): boolean { return [...this.selectedPools.values()].some((p) => !this.pickIsLocked(p)); }
  /** 选中的子 group / 实例里能整体动的那些（锁住的不动；提示一次）。 */
  private movablePoolPicks(say = true): PoolPick[] {
    const all = this.selectedPoolPicks(), ok = all.filter((p) => !this.pickIsLocked(p));
    if (say && ok.length < all.length) this.host.hint(`${all.length - ok.length} 个已锁定的组 / 组件不动（解锁后再移）`);
    return ok;
  }
  /** 锁定 / 解锁选中的子 group / 实例（每个一条 op，可撤销）。 */
  lockSelection(on: boolean): boolean { return this.step(() => this.lockSelectionStep(on)); }
  private lockSelectionStep(on: boolean): boolean {
    // 0.14：组不是物体、不能锁（user「组永远不进hierarchy」）——只锁实例；选区里只有组时提示怎么办
    const all = [...this.selectedPools.values()];
    const picks = all.filter((p) => p.kind === "instance" && this.pickIsLocked(p) !== on);
    if (!picks.length) { if (on && all.some((p) => p.kind === "group")) this.host.hint("组不是物体，不能锁；要当参考就先「建组件」（G）再锁"); return false; }
    const at = this.activePool();
    for (const p of picks) if (p.kind === "instance") this.commitOp({ op: "setLocked", at, instance: p.instance, on });
    this.host.hint(on ? `已锁定 ${picks.length} 个：不能改、不能移、不能进入；仍可当推断参考` : `已解锁 ${picks.length} 个`);
    this.host.changed(); this.draw();
    return true;
  }
  // ---------- 隐藏（DT49，user 2026-10-25「然后 hide unhide all也马上需要了，这个gltf规范里有吗？」；存档 = glTF KHR_node_visibility）----------
  // 组件 = 整份藏（藏父连子）；散的面 / 线 = 各自打隐藏标记（user「嗯线和面也可以hidden，这样可以挖洞看里面，blender也支持。合理。」）；
  // 组不是物体、没有自己的隐藏 = 把组里（连同子组、放在里面的实例）的面 / 线 / 实例全藏。
  /**
   * 范围里的断口（共线、只连两段、两边挂的面一样 = 画面上的小鼓包）：有散几何选区 = 选区里的点；scope = "context" 或没选 = 当前在编辑的物体里全部。
   * 纪元排期 T7 / DT5（user「他们语义上就是一个东西，只是作用域……不同」：和焊边橡皮的共轴那支同一个动词）。
   */
  breaksInScope(scope: "selection" | "context" = this.hasGeometrySelection() || this.hasPointSelection() ? "selection" : "context"): VertexId[] {
    const k = this.kernel;
    let cand: Iterable<VertexId>;
    if (scope === "selection") cand = new Set(moveTargetsSelection(k, this.selection));
    else cand = k.vertices().map((v) => v.id);
    const out: VertexId[] = [];
    for (const vid of cand) { const v = k.graph.hasVertex(vid) ? k.graph.vertex(vid) : null; if (v && v.edges.size === 2 && k.isBreakJunction(vid)) out.push(vid); }
    return out;
  }
  /** 焊接全部断口（一次 = 一步）。返回焊了几处。 */
  weldAllBreaks(scope?: "selection" | "context"): number { return this.step(() => {
    const ids = this.breaksInScope(scope), k = this.kernel;
    if (!ids.length) { this.host.hint(scope === "selection" ? "选区里没有断口" : "没有断口（共线、只连两段的点）"); return 0; }
    const n0 = this.opCount;
    this.commitOp({ op: "dissolveVertices", at: this.activePool(), points: ids.map((v) => k.graph.pt(v)) });
    if (this.opCount === n0) return 0;
    this.host.hint(`焊了 ${ids.length} 处断口`);
    this.host.changed(); this.draw();
    return ids.length;
  }); }
  /** 拍平的作用域：选了面 = 选中的面，否则 = 当前在编辑的物体里全部。 */
  private planarScope(scope?: "selection" | "context"): FaceId[] | null {
    const k = this.kernel, useSel = scope === "selection" || (scope === undefined && this.selection.faces.size > 0);
    return useSel ? [...this.selection.faces].filter((f) => k.face(f)) : null;
  }
  /** 范围里有几组要拍平（菜单数字用；O(范围)）。 */
  planarGroupsInScope(scope?: "selection" | "context"): number {
    return planPlanar(this.kernel, this.planarScope(scope), { ...PLANAR_DEFAULTS, deg: this.config.get("surface", "sharpDeg"), eraseInner: false }).groups.length;
  }
  /**
   * 拍平（纪元排期 T9 / DT7）：弯折小于阈值的硬边分开的那些面，每组拍到同一张平面上（默认众数平面）、擦掉组里的内线；一次 = 一步。
   * 马后炮能改阈值 / 拍到哪 / 擦不擦内线。零破面：结算出破面整步拒绝（ops.ts PlanarBurst）。返回拍了几组。
   */
  makePlanar(scope?: "selection" | "context"): number { return this.step(() => {
    const k = this.kernel, at = this.activePool(), faces = this.planarScope(scope);
    const keys = faces ? faces.map((f) => faceKey(k, f)) : [];
    const o0: PlanarOptions = { ...PLANAR_DEFAULTS, deg: this.config.get("surface", "sharpDeg") };
    let groups = 0;
    const go = (o: PlanarOptions): number => {
      const kk = this.kernel, sc = keys.length ? keys.map((fk) => { try { return resolveFace(kk, fk); } catch { return -1; } }).filter((f) => f >= 0) : null;
      const plan = planPlanar(kk, sc, o);
      if (!plan.groups.length) { this.host.hint(`没有要拍平的面（弯折小于 ${o.deg}° 的硬边分开的面）`); return 0; }
      const n0 = this.opCount;
      this.commitOp({ op: "makePlanar", at, faces: keys, deg: o.deg, target: o.target, eraseInner: o.eraseInner });
      if (this.opCount === n0) return 0;
      const nf = plan.groups.reduce((a, g) => a + g.length, 0);
      this.host.hint(`拍平了 ${plan.groups.length} 组（${nf} 张面）${o.eraseInner ? `，擦掉 ${plan.erase.length} 条内线` : ""}`);
      return plan.groups.length;
    };
    const n0 = this.opCount;
    groups = go(o0);
    if (!groups) return 0;
    this.offerAfterthought("拍平", [
      { key: "deg", def: { kind: "number", label: "弯折小于", min: 0.5, max: 45, step: 0.5, unit: "°" } },
      { key: "target", def: { kind: "enum", label: "拍到", values: [{ id: "mode", label: "众数平面", hint: "组里已经落在同一平面上的点最多的那张" }, { id: "median", label: "中位数", hint: "每个点到平面距离的中位数" }, { id: "mean", label: "平均数", hint: "最小二乘" }] } },
      { key: "eraseInner", def: { kind: "bool", label: "擦内线" } },
    ], { deg: o0.deg, target: o0.target, eraseInner: o0.eraseInner }, this.opCount - n0, (v) => { go({ deg: Number(v.deg) || o0.deg, target: (String(v.target) as PlanarTarget), eraseInner: !!v.eraseInner }); });
    this.host.changed(); this.draw();
    return groups;
  }); }
  /** 选中的组件里有被缩放过的（应用缩放钮出不出）。 */
  hasScaledInstanceSelection(): boolean { return this.scaledInstancePicks().length > 0; }
  private scaledInstancePicks(): InstId[] {
    const d = this.scene.def(this.scene.defOfContext(this.ctx)), out: InstId[] = [];
    for (const p of this.selectedPools.values()) if (p.kind === "instance" && !this.pickIsLocked(p)) {
      const X = d.instances.get(p.instance)?.xform;
      if (X && [0, 1, 2].some((j) => Math.abs(Math.hypot(X[j], X[4 + j], X[8 + j]) - 1) > 1e-9)) out.push(p.instance);
    }
    return out;
  }
  /**
   * 应用缩放（2026-10-26，user「这样的话我们需要一个apply scale」）：选中组件的缩放烘进组件本身的几何，这一份只剩旋转 + 平移；
   * 同一组件的别的份乘反比补偿，看起来不变。组件里有转过的子组件时会斜切 → 护栏拦下并说明。一次 = 一步。
   */
  applyScaleSelection(): boolean { return this.step(() => {
    const ids = this.scaledInstancePicks(), def = this.scene.defOfContext(this.ctx);
    if (!ids.length) { this.host.hint("选中的组件没有被缩放过"); return false; }
    const n0 = this.opCount;
    for (const id of ids) this.commitOp({ op: "applyScale", def, instance: id });
    if (this.opCount === n0) return false;
    this.host.hint(`已把缩放烘进 ${ids.length} 个组件的几何（同一组件的别的份看起来没变）`);
    this.host.changed(); this.draw();
    return true;
  }); }
  hasHideableSelection(): boolean { return this.hasGeometrySelection() || this.selectedPools.size > 0 || this.selection.guides.size > 0; }   // 点不单独藏
  /** 藏起选区（每处一条 op，一步撤完）。返回藏了几样（实例 + 面 + 线）。 */
  hideSelection(): number { return this.step(() => this.hideSelectionStep()); }
  private hideSelectionStep(): number {
    const at = this.activePool(), k = this.kernel, def = at.def, body = this.scene.brep(def);
    let n = 0;
    const faces = [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f));
    const edges = [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
    if (faces.length || edges.length) { this.commitOp({ op: "setHidden", at, faces, edges, on: true }); n += faces.length + edges.length; }
    // 组：整棵子树（子组的面 / 线 + 放在这棵树里的实例）
    const groupIds = [...this.selectedPools.values()].filter((p) => p.kind === "group").map((p) => (p as { group: GroupId }).group);
    const tree = new Set<GroupId>(groupIds);
    for (let grew = true; grew;) { grew = false; for (const g of body.groups.values()) if (g.parent !== null && tree.has(g.parent) && !tree.has(g.id)) { tree.add(g.id); grew = true; } }
    for (const gid of tree) {
      const gk = body.groups.get(gid)!.kernel;
      const gf = gk.faces().filter((f) => !gk.isFaceHidden(f.id)).map((f) => faceKey(gk, f.id)), ge = gk.edges().filter((e) => !gk.isEdgeHidden(e.id)).map((e) => edgeKey(gk, e.id));
      if (gf.length || ge.length) { this.commitOp({ op: "setHidden", at: { def, group: gid }, faces: gf, edges: ge, on: true }); n += gf.length + ge.length; }
    }
    const insts = [...this.selectedPools.values()].filter((p): p is { kind: "instance"; instance: InstId } => p.kind === "instance").map((p) => p.instance);
    for (const i of this.scene.def(def).instances.values()) if (i.parent !== null && tree.has(i.parent) && !i.hidden) insts.push(i.id);
    for (const iid of insts) { const inst = this.scene.def(def).instances.get(iid)!; this.commitOp({ op: "setHidden", at: { def, group: inst.parent }, instance: iid, on: true }); n++; }
    if (!n) return 0;
    this.selection = emptySelection(); this.selectedPools.clear();
    this.host.hint(`藏起来了；视图菜单「全部显示」放回来（Alt+H）`);
    this.host.changed(); this.draw();
    return n;
  }
  /** 整个场景里被隐藏的东西：组件份数 + 面 + 线（视图菜单「全部显示（N）」用）。 */
  hiddenCount(): { instances: number; faces: number; edges: number } {
    const c = { instances: 0, faces: 0, edges: 0 };
    for (const d of this.scene.defs.values()) {
      for (const i of d.instances.values()) if (i.hidden) c.instances++;
      if (d.body.kind !== "brep") continue;
      for (const k of [d.body.kernel, ...[...d.body.groups.values()].map((g) => g.kernel)]) { for (const f of k.faces()) if (k.isFaceHidden(f.id)) c.faces++; for (const e of k.edges()) if (k.isEdgeHidden(e.id)) c.edges++; }
    }
    return c;
  }
  /** 全部显示（一条 op，可撤销）。返回放回了几样。 */
  unhideAll(): number {
    const c = this.hiddenCount(), n = c.instances + c.faces + c.edges;
    if (!n) { this.host.hint("没有隐藏的东西"); return 0; }
    this.commitOp({ op: "unhideAll" });
    this.host.hint(`全部放回来了（${[c.instances ? `组件 ${c.instances} 份` : "", c.faces ? `面 ${c.faces}` : "", c.edges ? `线 ${c.edges}` : ""].filter(Boolean).join("、")}）`);
    this.host.changed(); this.draw();
    return n;
  }
  /** 进入选中（或命中）的子 group / 实例编辑。 */
  enterPool(p: PoolPick): void {
    if (this.pickIsLocked(p)) { this.host.hint("已锁定：解锁后再进入（选中它 → 解锁）"); return; }
    this.last = null;
    this.cancelGesture();
    this.selection = emptySelection(); this.selectedPools.clear();
    if (p.kind === "group") this.ctx = { chain: this.ctx.chain, group: p.group };
    else this.ctx = { chain: [...this.ctx.chain, p.instance], group: null };
    this._revision++;
    this.host.changed(); this.draw();
  }
  enterSelected(): boolean {
    const p = [...this.selectedPools.values()][0];
    if (!p) return false;
    this.enterPool(p);
    return true;
  }
  /** 退出一层（到父 group / 父实例）；已在根 → false。 */
  exitContext(): boolean {
    this.last = null;
    if (this.ctx.chain.length === 0 && this.ctx.group === null) return false;
    this.cancelGesture();
    this.selection = emptySelection(); this.selectedPools.clear();
    const def = this.scene.defOfContext(this.ctx);
    let reselect: PoolPick | null = null;
    if (this.ctx.group !== null) {
      const g = this.scene.group({ def, group: this.ctx.group });
      reselect = { kind: "group", group: g.id };
      this.ctx = { chain: this.ctx.chain, group: g.parent };
    } else {
      const chain = this.ctx.chain.slice(0, -1);
      const parentDef = this.scene.defOfContext({ chain, group: null });
      const inst = this.scene.instance(parentDef, this.ctx.chain[this.ctx.chain.length - 1]);
      reselect = { kind: "instance", instance: inst.id };
      this.ctx = { chain, group: inst.parent };
    }
    if (reselect) this.selectedPools.set(this.pickKey(reselect), reselect);
    this._revision++;
    this.host.changed(); this.draw();
    return true;
  }

  // ---------- 材质 / 油漆桶 ----------
  get paint(): PaintPick { return this.paintPick; }
  setPaint(p: PaintPick): void { this.paintPick = p; this.host.changed(); }
  /** 文档材质表（只读）。 */
  materials(): readonly import("../scene/scene.ts").Material[] { return this.scene.materials; }
  /** 蘸的材质在文档材质表里的索引（没有就新建一条 addMaterial op）；null = 默认。 */
  private materialIndexForPick(): number | null {
    const p = this.paintPick;
    if (!p) return null;
    const same = (m: import("../scene/scene.ts").Material): boolean => p.kind === "color"
      ? !m.texture && m.name === p.name && m.color.every((c, i) => Math.abs(c - p.color[i]) < 1e-6)
      : !!m.texture && m.name === p.name && m.texture.bytes === p.bytes;
    const i = this.scene.materials.findIndex(same);
    if (i >= 0) return i;
    if (p.kind === "color") this.commitOp({ op: "addMaterial", name: p.name, color: p.color });
    else this.commitOp({ op: "addMaterial", name: p.name, color: [1, 1, 1], texture: { mimeType: p.mimeType, bytes: p.bytes, sizeM: p.sizeM } });
    return this.scene.materials.length - 1;
  }
  /** 给活动池里的这些面涂当前材质（op）。 */
  paintFaces(faces: readonly FaceId[], sides?: readonly (0 | 1)[]): void {
    const k = this.kernel;
    const idx = faces.map((f, i) => i).filter((i) => k.face(faces[i]));
    if (!idx.length) return;
    const keys = idx.map((i) => faceKey(k, faces[i]));
    const material = this.materialIndexForPick();
    this.commitOp({ op: "paintFaces", at: this.activePool(), faces: keys, material, ...(sides ? { sides: idx.map((i) => sides[i] ?? 0) } : {}) });   // DT8：sides = 每张面涂哪一侧；不给 = 两侧
  }
  /** 吸色：把这张面这一侧的材质设成油漆桶当前「蘸的」（没材质 = 默认灰）。 */
  pickMaterialOf(face: FaceId, side: 0 | 1 = 0): void {
    const k = this.kernel;
    const m = this.scene.materialOfSlot(this.scene.defOfContext(this.ctx), k.faceMaterialOf(face, side));
    if (!m) { this.setPaint(null); return; }
    this.setPaint(m.texture ? { kind: "texture", name: m.name, mimeType: m.texture.mimeType, bytes: m.texture.bytes, sizeM: [m.texture.sizeM[0], m.texture.sizeM[1]] } : { kind: "color", name: m.name, color: [m.color[0], m.color[1], m.color[2]] });
  }
  /** 把选区（面）涂上当前材质。 */
  paintSelection(): boolean {
    if (!this.selection.faces.size) return false;
    this.paintFaces([...this.selection.faces]);
    this.draw();
    return true;
  }

  // ---------- 平滑组：软化 / 硬化 ----------
  /** 给这些边（本地 id）软化（soft + smooth）或硬化。 */
  softenEdges(ids: readonly EdgeId[], on: boolean): void {
    const k = this.kernel;
    const edges = ids.filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
    if (!edges.length) return;
    this.commitOp({ op: "setEdgeLayers", at: this.activePool(), edges, layers: ["soft", "smooth"], on });
    this.draw();
  }
  /** 按二面角阈值软化：有选区 → 选区的边（含选中膜的环边）；否则活动池全部。只碰恰好两膜的边。 */
  softenByAngle(maxDeg: number, on = true): number {
    const k = this.kernel;
    let pool: EdgeId[];
    if (this.hasGeometrySelection()) {
      const set = new Set<EdgeId>(this.selection.edges);
      for (const fid of this.selection.faces) { const f = k.face(fid); if (f) for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) set.add(d.edge); }
      pool = [...set];
    } else pool = k.edges().map((e) => e.id);
    const hit = pool.filter((e) => { const a = k.bendDeg(e); return a !== null && a <= maxDeg + 1e-9 && a > 1e-9; });   // 弯折角（尖屋脊不再被当成小角度）
    if (hit.length) this.softenEdges(hit, on);
    return hit.length;
  }
  /** 选区的边软化 / 硬化（不看角度）。 */
  softenSelection(on: boolean): number {
    const k = this.kernel;
    const set = new Set<EdgeId>(this.selection.edges);
    for (const fid of this.selection.faces) { const f = k.face(fid); if (f) for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) set.add(d.edge); }
    const ids = [...set].filter((e) => k.graph.hasEdge(e) && k.graph.edge(e).faceLinks.length >= 2);
    if (ids.length) this.softenEdges(ids, on);
    return ids.length;
  }

  // ---------- 相机 ----------
  setView(name: Parameters<OrbitCamera["setView"]>[0]): void { this.cam.setView(name); this.draw(); }
  zoomExtents(): void {
    const view = this.worldView();
    this.cam.fitPoints([...view.vertices(), ...this.emptyMarkers(view).map((e) => e.frame.origin)], this.vp());   // 空组件（导入的空节点）也算「全部」
    this.draw();
  }
  /** 放大镜点一下（user 2026-10-25「放大镜按一下是Zoom to fit, 取决于是否有选区。然后按多下是选区 当前物体 全局 切换。……只有合法的切换才入档」）：
   *  档 = 选区（有选区才有）→ 当前物体（进组编辑时 = 那一组）→ 全部；和前一档一样大的不入档。
   *  相机没被动过就接着往下一档（按多下轮换），动过相机再按 = 从第一档起。 */
  private zoomCycle: { keys: string; idx: number; cam: string } | null = null;
  zoomTo(): void {
    const stages = this.zoomStages();
    if (!stages.length) { this.zoomExtents(); return; }
    const keys = stages.map((x) => x.key).join("|"), zc = this.zoomCycle;
    const idx = zc && zc.keys === keys && zc.cam === this.camKey() ? (zc.idx + 1) % stages.length : 0;
    const b = stages[idx].b, pts: Pt3[] = [];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) pts.push({ x, y, z });
    this.cam.fitPoints(pts, this.vp());
    this.zoomCycle = { keys, idx, cam: this.camKey() };
    this.host.hint(stages.length > 1 ? `缩放到${stages[idx].label}（再按 = ${stages[(idx + 1) % stages.length].label}）` : `缩放到${stages[idx].label}`);
    this.draw();
  }
  /** 放大镜的档（只有合法的才入档）。 */
  zoomStages(): { key: string; label: string; b: { min: Pt3; max: Pt3 } }[] {
    const out: { key: string; label: string; b: { min: Pt3; max: Pt3 } }[] = [];
    const sel = this.hasSelection() ? this.targetBounds() : null;
    if (sel) out.push({ key: "sel", label: "选区", b: sel });
    if (this.contextDepth() > 0) { const s = this.worldView().activeSlot(); const b = poolBounds(s.kernel, s.xform); if (b) out.push({ key: "obj", label: "当前物体", b }); }
    let min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const v of this.worldView().vertices()) { min = { x: Math.min(min.x, v.x), y: Math.min(min.y, v.y), z: Math.min(min.z, v.z) }; max = { x: Math.max(max.x, v.x), y: Math.max(max.y, v.y), z: Math.max(max.z, v.z) }; }
    if (Number.isFinite(min.x)) out.push({ key: "all", label: "全部", b: { min, max } });
    const same = (a: { min: Pt3; max: Pt3 }, c: { min: Pt3; max: Pt3 }): boolean => { const tol = 1e-6 * Math.max(1, Math.hypot(a.max.x - a.min.x, a.max.y - a.min.y, a.max.z - a.min.z)); return [a.min.x - c.min.x, a.min.y - c.min.y, a.min.z - c.min.z, a.max.x - c.max.x, a.max.y - c.max.y, a.max.z - c.max.z].every((d) => Math.abs(d) <= tol); };
    return out.filter((x, i) => i === 0 || !same(out[i - 1].b, x.b));
  }
  private camKey(): string { const c = this.cam, t = c.target; return `${c.yaw.toFixed(5)}|${c.pitch.toFixed(5)}|${c.halfH.toFixed(5)}|${t.x.toFixed(4)},${t.y.toFixed(4)},${t.z.toFixed(4)}|${c.projection}`; }
  // ---------- 镜像会话（马前炮；纪元账本 DT23）：选区 → 右下参数小窗设选项 + 场景里镜像面 gizmo + 预演 → 应用 → 马后炮还能改选项 ----------
  // user 2026-10-25「你选中，右键mirror之后……同时有一个gizmos确定mirror的轴。拖动gizmos可以snap，然后也有把手for rotate and move」「dialogue还可以快速flip」
  //   「镜像面默认放在 a 不过是当前物体，不过我习惯先画右半？」→ 默认 = 当前上下文的轴原点、红轴当法线、留 +X 那侧。
  private gizmo: { g: PlaneGizmo; hot: GizmoHandle | null; grab: GizmoGrab | null } | null = null;
  /** 指令预演（镜像）：跑在活动内核的克隆上；开着时 liveWorld 画影子内核（没有手势也画）。 */
  private cmdPreview: ((k: Kernel) => FaceEvent[]) | null = null;
  private cmdGhosts: (() => { picks: PoolPick[]; xform: Xform } | null) | null = null;
  mirrorActive(): boolean { return this.gizmo !== null; }
  /** 镜像…：作用在选区（散几何 + 选中的组件实例）上；没有可镜的 → false。 */
  beginMirror(): boolean {
    const k = this.kernel;
    const faces = [...this.selection.faces].filter((f) => k.face(f)), edges = [...this.selection.edges].filter((e) => k.graph.hasEdge(e));
    const instPicks = [...this.selectedPools.values()].filter((p): p is { kind: "instance"; instance: InstId } => p.kind === "instance");
    if (!faces.length && !edges.length && !instPicks.length) { this.host.hint("镜像：先选要镜的几何或组件"); return false; }
    this.cancelGesture();
    const f = this.contextFrame();
    this.gizmo = { g: { origin: { ...f.origin }, normal: normalize3(f.x) }, hot: null, grab: null };
    const at = this.activePool();
    const faceKeys = faces.map((id) => faceKey(k, id)), edgeKeys = edges.map((id) => edgeKey(k, id));
    const vals: Record<string, ParamValue> = { deleteOpposite: true, mergeSeam: true, weld: 0, guardMm: CUT_SNAP * 1000, ...(instPicks.length ? { instances: true } : {}) };
    const planeLocal = (): MirrorPlane => { const m = invert(this.ctxXform()), g = this.gizmo!.g; return { origin: applyPt(m, g.origin), normal: normalize3(applyDir(m, g.normal)) }; };
    const opts = (v: Readonly<Record<string, ParamValue>>): MirrorOptions => ({ deleteOpposite: !!v.deleteOpposite, mergeSeam: !!v.mergeSeam, weld: Number(v.weld) || 0, guard: Math.max(0, Number(v.guardMm) || 0) / 1000 });
    this.cmdPreview = (c) => (faces.length || edges.length ? mirrorGeometry(c, faces.filter((x) => c.face(x)), edges.filter((x) => c.graph.hasEdge(x)), planeLocal(), opts(vals)) : []);
    // 组件的预演：原点在留下这侧的那几份，副本槽画镜过去的样子（删对面那半的实例预演不画，应用时照删）
    this.cmdGhosts = () => {
      if (!instPicks.length || !vals.instances || !this.gizmo) return null;
      const g = this.gizmo.g, n = normalize3(g.normal), view = this.worldView();
      const keep = instPicks.filter((p) => { const sl = view.slots.find((x) => { const tp = this.topChild(x); return tp?.kind === "instance" && tp.instance === p.instance && x.chain.length === this.ctx.chain.length + 1; }); return !!sl && dot3(sub3(applyPt(sl.xform, { x: 0, y: 0, z: 0 }), g.origin), n) > 1e-6; });
      return keep.length ? { picks: keep, xform: reflectionXform({ origin: g.origin, normal: n }) } : null;
    };
    const fields: ParamField[] = [
      { key: "deleteOpposite", def: { kind: "bool", label: "删掉对面" } },
      { key: "mergeSeam", def: { kind: "bool", label: "缝上自愈" } },
      { key: "weld", def: { kind: "number", label: "融合阈值", min: 0, max: 0.1, step: 0.001, unit: " m" } },
      { key: "guardMm", def: { kind: "number", label: "防碎距离", min: 0, max: 2, step: 0.01, unit: " mm" } },   // 2026-10-26 user「加防碎距离」：离镜像面这么近的点吸上去、太短的切段不要；0 = 关（小零件调小）
      ...(instPicks.length ? [{ key: "instances", def: { kind: "bool" as const, label: "组件也镜" } }] : []),
    ];
    const buttons: ParamButton[] = [{ key: "axX", label: "X" }, { key: "axY", label: "Y" }, { key: "axZ", label: "Z" }, { key: "flip", label: "翻转" }, { key: "cancel", label: "取消" }, { key: "apply", label: "应用", primary: true }];
    const opOf = (v: Readonly<Record<string, ParamValue>>, pl: MirrorPlane): Op => ({ op: "mirror", at, faces: faceKeys, edges: edgeKeys, instances: v.instances ? instPicks.map((p) => p.instance) : [], plane: pl, ...opts(v) });
    const apply = (): void => {
      const pl = planeLocal(), n0 = this.opCount;
      this.endMirror();
      this.commitOp(opOf(vals, pl));
      if (this.opCount === n0) return;   // 被拒（破面 / 锁着）：报错已出，不进马后炮
      this.selection = emptySelection(); this.selectedPools.clear();
      this.offerAfterthought("镜像", fields, { ...vals }, this.opCount - n0, (v) => { this.commitOp(opOf(v, pl)); });
      this.host.hint("镜像好了：右下角还能改选项（撤销重做）");
    };
    const session: ParamSession = {
      phase: "before", title: "镜像", fields, buttons, values: vals,
      set: (key, v) => { vals[key] = v; this.refreshCmdPreview(); },
      press: (key) => {
        const g = this.gizmo?.g, F = this.contextFrame();
        if (key === "apply") { apply(); return; }
        if (key === "cancel") { this.openParamSession(null); this.host.hint("镜像已取消"); return; }
        if (!g) return;
        if (key === "flip") g.normal = scale3(g.normal, -1);
        else if (key === "axX") g.normal = normalize3(F.x);
        else if (key === "axY") g.normal = normalize3(F.y);
        else if (key === "axZ") g.normal = normalize3(F.z);
        this.refreshCmdPreview();
      },
      dispose: () => { this.endMirror(); },
    };
    this.openParamSession(session);
    this.refreshCmdPreview();
    this.host.hint("镜像：拖镜像面上的把手（中心 = 移，箭头 = 推，边上的点 = 转）；右下角应用 / 取消（回车 / Esc）");
    return true;
  }
  private endMirror(): void {
    this.gizmo = null; this.cmdPreview = null; this.cmdGhosts = null;
    this.live = null; this.liveOverride = null; this.liveEvents = [];
    this.snapInfo = null;
    this.draw();
  }
  private refreshCmdPreview(): void {
    this.live = null; this.liveEvents = []; this.liveOverride = null;
    if (this.cmdPreview) {
      const c = this.kernel.clone();
      try { this.liveEvents = this.cmdPreview(c); this.live = c; }
      catch (err) { this.live = null; this.host.hint(`镜像预演不行：${err instanceof Error ? err.message : String(err)}`); }
      const gh = this.cmdGhosts?.();
      if (gh) this.liveOverride = { picks: gh.picks, xform: gh.xform, copy: true };
    }
    this.host.changed(); this.draw();
  }
  /** 镜像会话里的指针：按在把手上就拖；别处不动作（视角照转，由手势层管）。返回 true = 吃掉了。 */
  private gizmoPointer(kind: "down" | "move" | "up", ev: ToolPointer): boolean {
    const G = this.gizmo;
    if (!G) return false;
    const pf = this.frame(), vp = this.fvp();
    if (kind === "down") { const h = hitGizmo(G.g, pf, vp, ev.x, ev.y); if (h) G.grab = grabGizmo(G.g, h, pf, vp, ev.x, ev.y); G.hot = h; this.draw(); return true; }
    if (kind === "up") { G.grab = null; this.snapInfo = null; this.draw(); return true; }
    if (!G.grab) { const h = hitGizmo(G.g, pf, vp, ev.x, ev.y); if (h !== G.hot) { G.hot = h; this.draw(); } return true; }
    // 拖：移 / 推 吸附（用没改过的世界 = 不吸预演出来的镜像副本，免得自己吸自己）
    let snap: Pt3 | null = null;
    if (G.grab.handle === "move" || G.grab.handle === "push") {
      const view = this.worldView();
      const sn = snapPoint(view, pf, vp, ev.x, ev.y, this.snapPx(), { plane: cameraPlane(pf, G.grab.g0.origin), alignSources: this.alignSrcs(), chargedEdges: this.alignEdges(), hand: NO_HAND });
      this.snapInfo = sn;
      snap = G.grab.handle === "move" ? sn.p : (sn.kind ? sn.p : null);
    }
    G.g = dragGizmo(G.grab, pf, vp, ev.x, ev.y, { snap, frame: this.contextFrame() });
    this.refreshCmdPreview();
    return true;
  }

  // ---------- 参数小窗（param-panel.ts；user 2026-10-25「把右下角的数值小窗扩成一个「参数小窗」 同意」）：马前炮 / 马后炮 ----------
  private param: ParamSession | null = null;
  /** 小窗现在要画的参数会话（null = 没有）；马后炮在这一步之后又提交过别的 / 撤销过就自动作废。 */
  paramPanel(): ParamPanelState | null {
    const p = this.param;
    if (!p) return null;
    if (p.stale?.()) { p.dispose?.(); this.param = null; return null; }
    return p;
  }
  setParam(key: string, value: ParamValue): void { this.step(() => this.param?.set(key, value)); this.host.changed(); this.draw(); }
  pressParam(key: string): void { this.step(() => this.param?.press(key)); this.host.changed(); this.draw(); }
  /** 换一个会话（旧的收尾）；null = 关掉。 */
  openParamSession(s: ParamSession | null): void { if (this.param && this.param !== s) this.param.dispose?.(); this.param = s; this.host.changed(); }
  /**
   * 移动 / 旋转 / 缩放 / 变换落定之后的马后炮（user 2026-10-26「移动旋转也是ctrl复制开关吧。以及马后炮都能override」）：
   * 「复制」开关（事后改成复制 / 不复制）+ 变换工具的「轴心」；改了 = 撤这一步、按新选项重做（和数值小窗的重做同一套：按坐标、复制走 commitCopies）。
   * 数值小窗改完数之后会再挂一次（读最新的 last），所以两边能接着改。
   */
  private offerXformAfterthought(): void {
    const L0 = this.last;
    if (!L0 || (L0.kind !== "move" && L0.kind !== "rotate" && L0.kind !== "scale") || !L0.entities) return;
    const L = L0, ents = L0.entities;
    const fields: ParamField[] = [{ key: "copy", def: { kind: "bool", label: "复制" } }];
    const values: Record<string, ParamValue> = { copy: !!L.copy };
    const pivots = L.kind !== "move" ? L.pivots : undefined;
    if (pivots && L.kind !== "move" && L.pivotUsed) {
      const labels: Record<string, string> = { auto: "自动", bbox: "包围盒中心", mean: "顶点平均", active: "最后选的物体原点", picked: "拾取的点" };
      const same = (a?: Pt3, b?: Pt3): boolean => !!a && !!b && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-9;
      if (pivots.auto) labels.auto = same(pivots.auto, pivots.bbox) ? "自动（包围盒中心）" : "自动（物体轴原点）";   // 说清这次自动落在了哪
      fields.push({ key: "pivot", def: { kind: "enum", label: "轴心", values: Object.keys(pivots).map((id) => ({ id, label: labels[id] ?? id })) } });
      values.pivot = L.pivotUsed;
    }
    const title = L.kind === "move" ? "移动" : L.kind === "rotate" ? "旋转" : "缩放";
    this.offerAfterthought(title, fields, values, L.ops, (v) => {
      const copy = !!v.copy, pid = typeof v.pivot === "string" ? v.pivot : undefined, piv = pid && pivots ? pivots[pid] : undefined;
      if (pid && pid !== "picked" && pid !== (L.kind !== "move" ? L.pivotUsed : undefined)) this.config.set("transform", "pivot", pid as "auto" | "bbox" | "mean" | "active");   // 工具自己记住
      const at = L.at, n0 = this.opCount;
      const X = L.kind === "move" ? translation(L.delta) : L.kind === "rotate" ? rotationAbout(piv ?? L.center, L.axis, L.angle) : L.dirs ? scalingAlongAxes(piv ?? L.anchor, L.dirs, L.f.x) : scalingAbout(piv ?? L.anchor, L.f);
      if (copy) { const XL = this.xformToLocal(X); this.commitCopies([{ payload: this.copyPayload(XL, ents), XL }], L.pools, at); }
      else this.redoXform(X, L.froms, L.pools, at);
      const ops = this.opCount - n0;
      this.last = L.kind === "move" ? { ...L, copy, ops } : L.kind === "rotate" ? { ...L, copy, ops, center: piv ?? L.center, ...(pid ? { pivotUsed: pid } : {}) } : { ...L, copy, ops, anchor: piv ?? L.anchor, ...(pid ? { pivotUsed: pid } : {}) };
    });
  }
  /** 马后炮：刚提交的那一步（nOps 个操作）还能按新参数重做。 */
  private offerAfterthought(title: string, fields: readonly ParamField[], values: Record<string, ParamValue>, nOps: number, redo: (v: Readonly<Record<string, ParamValue>>) => void): void {
    this.openParamSession(afterthought({ title, fields, values, nOps, opCount: () => this.opCount, undoN: (n) => this.undoN(n), redo }));
  }

  // ---------- 轴移到选择中心（user 2026-10-25「加一个把轴移动到选择中心的命令……现在先用blender的bounding box center」「选中轴工具之后如果有选择就出现这个，然后点了之后右下角的马后炮可以选择是哪种居中算法」）----------
  /** 选区（散几何 + 选中的组 / 组件）的全部顶点（世界坐标）。 */
  private selectionWorldPoints(): Pt3[] {
    const out: Pt3[] = [], k = this.kernel, X = this.ctxXform();
    const vids = new Set<VertexId>();
    for (const f of this.selection.faces) { const F = k.face(f); if (F) for (const r of [F.outer, ...F.holes]) for (const v of r.vids) vids.add(v); }
    for (const e of this.selection.edges) if (k.graph.hasEdge(e)) { const E = k.graph.edge(e); vids.add(E.a); vids.add(E.b); }
    for (const v of this.selection.verts) if (k.graph.hasVertex(v)) vids.add(v);
    for (const v of vids) out.push(applyPt(X, k.graph.pt(v)));
    if (this.selectedPools.size) {
      const view = this.liveWorld();
      for (const sl of view.slots) { const p = this.topChild(sl); if (!p || !this.selectedPools.has(this.pickKey(p))) continue; for (const v of view.parts[sl.index].verts.values()) out.push({ x: v.x, y: v.y, z: v.z }); }
    }
    return out;
  }
  /** 选择中心：bbox = 包围盒中心（Blender 默认）；mean = 顶点平均（Blender 的 median point）。 */
  selectionCenter(algo: "bbox" | "mean" = "bbox"): Pt3 | null { return Editor.centerOf(this.selectionWorldPoints(), algo); }
  private static centerOf(pts: readonly Pt3[], algo: "bbox" | "mean"): Pt3 | null {
    if (!pts.length) return null;
    if (algo === "mean") { let x = 0, y = 0, z = 0; for (const p of pts) { x += p.x; y += p.y; z += p.z; } return { x: x / pts.length, y: y / pts.length, z: z / pts.length }; }
    let lo = { ...pts[0] }, hi = { ...pts[0] };
    for (const p of pts) { lo = { x: Math.min(lo.x, p.x), y: Math.min(lo.y, p.y), z: Math.min(lo.z, p.z) }; hi = { x: Math.max(hi.x, p.x), y: Math.max(hi.y, p.y), z: Math.max(hi.z, p.z) }; }
    return { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, z: (lo.z + hi.z) / 2 };
  }
  /** 把当前上下文的轴原点挪到选择中心（朝向不变）；之后右下角马后炮可换算法。没选区 → false。 */
  axesToSelectionCenter(algo: "bbox" | "mean" = "bbox"): boolean { return this.step(() => this.axesToSelectionCenterStep(algo)); }
  private axesToSelectionCenterStep(algo: "bbox" | "mean"): boolean {
    const pts = this.selectionWorldPoints();   // 先记下：马后炮撤销那一步时选区会被清掉，重做按记下的点算
    const go = (a: "bbox" | "mean"): boolean => { const c = Editor.centerOf(pts, a); if (!c) return false; const f = this.contextFrame(); this.setContextAxes({ origin: c, x: f.x, y: f.y, z: f.z }); return true; };
    const n0 = this.opCount;
    if (!go(algo)) return false;
    this.offerAfterthought("轴移到选择中心", [{ key: "algo", def: { kind: "enum", label: "中心", values: [{ id: "bbox", label: "包围盒中心" }, { id: "mean", label: "顶点平均" }] } }], { algo }, this.opCount - n0, (v) => { go(v.algo as "bbox" | "mean"); });
    this.host.hint(this.activePool().group !== null ? "组的轴原点移到了选择中心" : this.contextDepth() ? "组件的轴原点移到了选择中心（每份实例跟着补）" : "绘图轴原点移到了选择中心");
    return true;
  }

  // ---------- 数值小窗（vcb.ts；SU Measurements）：刚做完的那一步，撤销后按精确值重做 ----------
  /** 小窗当前状态：kind = 能改哪类（null = 没有）；prompt = 提示字；echo = 现值回显。 */
  vcbState(): { kind: VcbKind | null; prompt: string; echo: string } {
    const L = this.last;
    if (!L || this.vcbBlocked()) return { kind: null, prompt: "", echo: "" };
    const u = this.vcbUnit, fl = (m: number): string => fmtVcbLength(m, u);
    const echo = L.kind === "line" ? fl(dist(L.a, L.b)) : L.kind === "pp" ? fl(L.h) : L.kind === "offset" ? fl(L.d) : L.kind === "move" ? fl(len3(L.delta))
      : L.kind === "circle" ? `${fl(dist(L.center, L.rim))} · ${L.segments}s` : L.kind === "rotate" ? fmtDeg(L.angle) : L.kind === "scale" ? (L.axis ? `${(L.axis.x ? L.f.x : L.axis.y ? L.f.y : L.f.z).toFixed(3)}` : `${L.f.x.toFixed(3)}`)
      : L.kind === "rect" ? (() => { const d = sub3(L.corner, L.anchor), [bu, bv] = Editor.rectAxes(L.plane.basis), k2 = L.from === "center" ? 2 : 1; return `${fl(Math.abs(dot3(d, bu)) * k2)} , ${fl(Math.abs(dot3(d, bv)) * k2)}`; })()   // 从中心画：回显整宽整高（和输入的意思一致）
      : L.kind === "tape" ? fl(L.d) : L.kind === "protractor" ? fmtDeg(L.angle) : "";
    return { kind: L.kind, prompt: vcbPrompt(L.kind), echo };
  }
  /** 矩形「宽,高」的两根轴：面基 (u, v) 里更贴近世界 X 的那根算「宽」（平手看 Y）——地面矩形 = (x, y)，立面 = (水平, 竖直)。 */
  private static rectAxes(basis: { u: Pt3; v: Pt3 }): [Pt3, Pt3] { return rectAxesOf(basis); }
  /** 手势进行中不能输（例外：画线的连画态只是下一笔的锚点）。 */
  private vcbBlocked(): boolean { return this.gestureActive() && !(this._tool === "line" && this.armed && this.anchor3 !== null); }
  /** 应用一条输入：解析 → 撤销那一步的 op → 按精确值重做 → 更新 last（可以连着改）。 */
  applyVcb(text: string): { ok: true; message: string } | { ok: false; error: string } { return this.step(() => this.applyVcbStep(text)); }
  private applyVcbStep(text: string): { ok: true; message: string } | { ok: false; error: string } {
    const L = this.last;
    if (!L) return { ok: false, error: "先做一步（画 / 推拉 / 移动…），再输精确值" };
    if (this.vcbBlocked()) return { ok: false, error: "先松手落定，再输精确值" };
    if (this._locked) return { ok: false, error: "定稿了：锁着。☰「改稿」才能改" };
    const v = parseVcb(text, L.kind, { unit: this.vcbUnit });
    if ("error" in v) return { ok: false, error: v.error };
    const at = L.at;
    if (!samePool(at, this.activePool())) return { ok: false, error: "已经换了上下文，这一步改不了了" };
    const sign = (x: number): number => (x < 0 ? -1 : 1);
    // 撤销那一步
    this.undoN(L.ops);
    const n0 = this.opCount;
    let msg = "";
    switch (L.kind) {
      case "line": {
        if (v.kind !== "length") break;
        const b = add3(L.a, scale3(normalize3(sub3(L.b, L.a)), v.m));
        this.commitOp({ op: "addEdges", at, segs: [[this.toLocal(L.a), this.toLocal(b)]] });
        this.last = { ...L, ops: this.opCount - n0, b };
        { const HL = this.handlers.line; if (this._tool === "line" && HL) { HL.vcbContinue?.(this.toolCtx, b); this.armed = HL.active(); } }
        msg = `线长 ${fmtLen(Math.abs(v.m))}`;
        break;
      }
      case "rect": {
        if (v.kind !== "dims") break;
        const d = sub3(L.corner, L.anchor), [u, w] = Editor.rectAxes(L.plane.basis), from = L.from ?? "corner", k = from === "center" ? 0.5 : 1;
        const corner = add3(L.anchor, add3(scale3(u, sign(dot3(d, u)) * Math.abs(v.a) * k), scale3(w, sign(dot3(d, w)) * Math.abs(v.b) * k)));
        const segs = rectSegmentsOnPlane(L.plane.plane, L.plane.basis, rectOpposite(L.anchor, corner, from), corner);
        if (segs.length) this.commitOp({ op: "addEdges", at, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]) });
        this.last = { ...L, ops: this.opCount - n0, corner };
        msg = `矩形 ${fmtLen(Math.abs(v.a))} × ${fmtLen(Math.abs(v.b))}`;
        break;
      }
      case "rrect": {
        // 2026-10-26 旋转矩形三下对齐：角度 = 绕第一边转的角（0 = 平躺、90° = 立起来），宽 = 第二边长（user「第二下设置角度…第三下设置长度」）
        const n = L.plane.plane.n, th = rrectThetaOf(L.a, L.b, n, L.c);
        let c: Pt3;
        if (v.kind === "angleWidth") c = add3(L.b, scale3(rrectDirAt(L.a, L.b, n, (v.deg * Math.PI) / 180), v.m));
        else if (v.kind === "length") c = add3(L.b, scale3(rrectDirAt(L.a, L.b, n, th), v.m));
        else break;
        const segs = rrectSegments(L.a, L.b, c);
        if (segs.length) this.commitOp({ op: "addEdges", at, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]) });
        this.last = { ...L, ops: this.opCount - n0, c };
        msg = `旋转矩形 ${fmtLen(dist(L.a, L.b))} × ${fmtLen(dist(L.b, c))} · ${fmtDeg(rrectThetaOf(L.a, L.b, n, c))}`;
        break;
      }
      case "arc": {
        const g: ArcGesture = { mode: L.mode, plane: L.plane, a: L.a, b: L.b, p: L.p, center: L.center, sweep: L.sweep, segments: L.segments };
        if (v.kind === "segments") { g.segments = v.n; this.config.set("arc", "segments", v.n); }
        else if (v.kind === "angle" && (g.mode === "center" || g.mode === "pie")) g.sweep = (v.deg * Math.PI / 180) * ((g.sweep ?? 1) < 0 ? -1 : 1);
        else if (v.kind === "length" && (g.mode === "center" || g.mode === "pie") && g.center) g.a = add3(g.center, scale3(normalize3(sub3(g.a, g.center)), v.m));
        else if (v.kind === "length" && g.b && g.p) g.p = bulgePointForRadius(g.a, g.b, g.p, v.m);
        else { msg = ""; this.last = L; break; }
        const built = buildArc(g);
        if (!built) { this.last = L; break; }
        this.commitOp(arcOp((p) => this.toLocal(p), at, built));
        this.last = { ...L, ...g, ops: this.opCount - n0 };
        msg = `弧 r=${fmtLen(built.radius)} · ${fmtDeg(Math.abs(built.sweep))} · ${built.segs.length} 段`;
        break;
      }
      case "circle": {
        let rim = L.rim, segments = L.segments;
        if (v.kind === "length") rim = add3(L.center, scale3(normalize3(sub3(L.rim, L.center)), Math.abs(v.m)));
        else if (v.kind === "segments") { segments = v.n; this.config.set("circle", "segments", v.n); }
        else break;
        const segs = circleSegmentsOnPlane(L.plane.plane, L.plane.basis, L.center, rim, segments);
        if (segs.length) this.commitOp({ op: "addEdges", at, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]), curve: circleCurveSpec((pt) => this.toLocal(pt), L.center, rim, L.plane, segments) });
        this.last = { ...L, ops: this.opCount - n0, rim, segments };
        msg = `圆 半径 ${fmtLen(dist(L.center, rim))} · ${segments} 段`;
        break;
      }
      case "pp": {
        if (v.kind !== "length") break;
        const h = sign(L.h) * v.m, hl = L.h !== 0 ? h * (L.hl / L.h) : h;
        this.commitOp({ op: "pushpull", at, face: L.face, dist: hl, ...(L.keepRing ? { keepRing: true } : {}) });
        this.last = { ...L, ops: this.opCount - n0, h, hl };
        msg = `推拉 ${fmtLen(h)}`;
        break;
      }
      case "offset": {
        if (v.kind !== "length") break;
        const d = sign(L.d) * v.m;
        const ring2 = L.ring.map((p) => projectToPlane(p, L.plane.basis));
        const r = offsetRing(ring2, -d);
        if (r.length >= 3) {
          const r3 = r.map((q) => liftFromPlane(q, L.plane.plane, L.plane.basis));
          const spec = L.circle ? offsetCircleSpec(L.circle, d) : null;   // 0.10：源面是圆 → 偏移环也是圆
          this.commitOp({ op: "addEdges", at, segs: r3.map((p, i) => [this.toLocal(p), this.toLocal(r3[(i + 1) % r3.length])]), ...(spec ? { curve: curveSpecToLocal((pt) => this.toLocal(pt), spec) } : {}) });
        }
        this.last = { ...L, ops: this.opCount - n0, d };
        msg = `偏移 ${d > 0 ? "向内" : "向外"} ${fmtLen(Math.abs(d))}`;
        break;
      }
      case "protractor": {
        if (v.kind !== "angle") break;
        const angle = (v.deg * Math.PI) / 180;
        const dir = rotateDir(L.center, L.axis, L.ref, angle);
        const mInv = invert(this.ctxXform());
        this.commitOp({ op: "addGuide", at, line: { p: this.toLocal(L.center), dir: normalize3(applyDir(mInv, dir)) } });
        this.last = { ...L, ops: this.opCount - n0, angle };
        msg = `角度参考线 ${fmtDeg(angle)}`;
        break;
      }
      case "tape": {
        if (v.kind !== "length") break;
        const d = Math.abs(v.m);
        const p = add3(L.a, scale3(L.dir, d));
        const mInv = invert(this.ctxXform());
        if (L.make === "line" && L.lineDir) this.commitOp({ op: "addGuide", at, line: { p: this.toLocal(p), dir: normalize3(applyDir(mInv, L.lineDir)) } });
        else this.commitOp({ op: "addGuide", at, point: this.toLocal(p) });
        this.last = { ...L, ops: this.opCount - n0, d };
        msg = L.make === "line" ? `参考线 · 偏移 ${fmtLen(d)}` : `参考点 · 距 ${fmtLen(d)}`;
        break;
      }
      case "move": {
        if (v.kind === "array") {
          // 没按 Ctrl 的普通移动也认阵列（user 2026-10-25「/5 *5应该是没有ctrl的时候也可以用，这么说的话其实用笔的话也可以复制了」）：
          // 这一步已先撤销（原件回原位），直接按阵列放副本，之后这一步按复制算（再输距离 = 改复制距离）。
          const Xs = arrayTranslations(L.delta, v.mode, v.n);
          const copies = Xs.map((X) => { const XL = this.xformToLocal(X); return { payload: this.copyPayload(XL, L.entities), XL }; });   // 全部先从撤销后的内核算
          this.commitCopies(copies, L.pools, at);
          this.last = { ...L, copy: true, ops: this.opCount - n0 };
          msg = v.mode === "x" ? `阵列 ${v.n} 份（每份 ${fmtLen(len3(L.delta))}）` : `内分 ${v.n} 份`;
          break;
        }
        if (v.kind !== "length") break;
        const delta = scale3(normalize3(L.delta), v.m);
        if (L.copy) { const XL = this.xformToLocal(translation(delta)); this.commitCopies([{ payload: this.copyPayload(XL, L.entities), XL }], L.pools, at); }
        else this.redoXform(translation(delta), L.froms, L.pools, at);
        this.last = { ...L, ops: this.opCount - n0, delta };
        msg = `${L.copy ? "复制" : "移动"} ${fmtLen(Math.abs(v.m))}`;
        break;
      }
      case "rotate": {
        // 复制那一步（变换工具 Ctrl / 「复制」开着）重做 = 重新放副本，不是转原件（2026-10-26）
        const redoRot = (ang: number): void => { const X = rotationAbout(L.center, L.axis, ang); if (L.copy && L.entities) { const XL = this.xformToLocal(X); this.commitCopies([{ payload: this.copyPayload(XL, L.entities), XL }], L.pools, at); } else this.redoXform(X, L.froms, L.pools, at); };
        if (v.kind === "array") { redoRot(L.angle); this.last = { ...L, ops: this.opCount - n0 }; return { ok: false, error: "旋转不做 *n /n 阵列（只有移动 / 缩放有）" }; }
        if (v.kind !== "angle") break;
        const angle = (v.deg * Math.PI) / 180;
        redoRot(angle);
        this.last = { ...L, ops: this.opCount - n0, angle };
        msg = `${L.copy ? "复制 · " : ""}旋转 ${fmtDeg(angle)}`;
        break;
      }
      case "scale": {
        const scaleX = (f: Pt3): Xform => (L.dirs ? scalingAlongAxes(L.anchor, L.dirs, f.x) : scalingAbout(L.anchor, f));
        const redoScale = (f: Pt3): void => { const X = scaleX(f); if (L.copy && L.entities) { const XL = this.xformToLocal(X); this.commitCopies([{ payload: this.copyPayload(XL, L.entities), XL }], L.pools, at); } else this.redoXform(X, L.froms, L.pools, at); };
        if (v.kind === "array") {
          // 缩放阵列（user 2026-10-26「变换能不能也支持移动的/5 *5，不过只对move和scale」）：原件回原位（这一步已撤），放 n 份——x = 第 k 份 f^k，/ = 第 k 份 f^(k/n)
          const Xs = L.dirs ? (v.mode === "/" && L.f.x < 0 ? null : Array.from({ length: v.n }, (_, i) => scalingAlongAxes(L.anchor, L.dirs!, Math.sign(L.f.x) ** (i + 1) * Math.abs(L.f.x) ** (v.mode === "x" ? i + 1 : (i + 1) / v.n)))) : arrayScalings(L.anchor, L.f, v.mode, v.n);
          if (!Xs || !L.entities) { redoScale(L.f); this.last = { ...L, ops: this.opCount - n0 }; return { ok: false, error: !Xs ? "带镜像（负倍率）的缩放不能内分：用 3x 这种" : "这一步做不了阵列" }; }
          const ents = L.entities;
          this.commitCopies(Xs.map((X) => { const XL = this.xformToLocal(X); return { payload: this.copyPayload(XL, ents), XL }; }), L.pools, at);
          this.last = { ...L, copy: true, ops: this.opCount - n0 };
          msg = v.mode === "x" ? `缩放阵列 ${v.n} 份（一份比一份 ×${L.f.x === L.f.y && L.f.y === L.f.z ? L.f.x.toFixed(3) : "倍率"}）` : `缩放内分 ${v.n} 份`;
          break;
        }
        if (v.kind !== "factor") break;
        const f: Pt3 = L.dirs ? { x: v.f[0], y: v.f[0], z: v.f[0] } : v.f.length === 3 ? { x: v.f[0], y: v.f[1], z: v.f[2] } : L.axis ? { x: L.axis.x ? v.f[0] : 1, y: L.axis.y ? v.f[0] : 1, z: L.axis.z ? v.f[0] : 1 } : { x: v.f[0], y: v.f[0], z: v.f[0] };
        redoScale(f);
        this.last = { ...L, ops: this.opCount - n0, f };
        msg = `${L.copy ? "复制 · " : ""}缩放 ${f.x.toFixed(3)} × ${f.y.toFixed(3)} × ${f.z.toFixed(3)}`;
        break;
      }
    }
    if (!msg) { this.last = null; this.host.changed(); this.draw(); return { ok: false, error: "这一步不收这种输入" }; }
    this.offerXformAfterthought();   // 改完数，马后炮按最新的那一步再挂上（复制 / 轴心接着能改）
    this.host.changed(); this.draw();
    return { ok: true, message: msg };
  }
  /** 撤销 n 个 op（数值小窗重做用；不清 last、不清选区之外的状态）。 */
  private undoN(n: number): void {
    let before: Session | undefined, sc: Scene | null = null;
    for (let i = 0; i < n; i++) { const r = this.history.undoOp(); if (!r) break; sc = r.scene; before = r.before; this.opCount--; }
    this.stepHasOp = false;   // 重做的第一条另起一步（撤掉的正是这一步）
    if (sc) this.installScene(sc, before);   // 回到这一步之前的会话（数值小窗 / 马后炮按新值重做时选区不丢、组件位置不变）
  }
  /** 按坐标重做一次整体变换：顶点（froms = 撤销后的本地坐标）走 move op，子池走 transformPool / transformInstance。 */
  private redoXform(X: Xform, froms: readonly Pt3[], pools: readonly PoolPick[], at: PoolRef): void {
    const XL = this.xformToLocal(X);
    if (froms.length) this.commitOp({ op: "move", at, moves: froms.map((f) => ({ from: f, to: applyPt(XL, f) })) });
    const def = this.scene.defOfContext(this.ctx);
    for (const p of pools) {
      if (p.kind === "group") this.commitOp({ op: "transformPool", at: { def, group: p.group }, xform: XL });
      else this.commitOp({ op: "transformInstance", def, instance: p.instance, xform: XL });
    }
  }

  // ---------- 上下文菜单（#19）给壳的三个小口 ----------
  /** 作废进行中的指针手势（长按弹菜单时），**选区保留**（cancel() 会清选区）。 */
  abortGesture(): void { this.taps.cancel(); this.cancelGesture(); this.host.marquee(null); this.host.hint(null); this.draw(); }
  /** 手势进行中（含点两下的 armed 态）：相机动了要按笔的屏幕位置重算预览（B23，2026-10-24）。 */
  gestureInProgress(): boolean { return this.gestureActive(); }
  /** 指针下的实体是否已在选区里（右键 = 不在就先选它，SU 同款）。 */
  hitInSelection(hit: HitResult3): boolean {
    const c = this.classify(this.liveWorld(), hit);
    if (c.kind === "pool") return this.selectedPools.has(c.key);
    if (c.kind !== "entity") return false;
    const h = c.local;
    return (h.face !== undefined && this.selection.faces.has(h.face)) || (h.edge !== undefined && this.selection.edges.has(h.edge)) || (h.vertex !== undefined && this.selection.verts.has(h.vertex)) || (h.vertex !== undefined && [...this.selection.edges].some((e) => { const ed = this.kernel.graph.edge(e); return ed.a === h.vertex || ed.b === h.vertex; }));
  }
  /** 把选区扩成连通体（SU「选择 → 所有相连」）。 */
  selectConnected(): boolean {
    const view = this.worldView();
    const seeds: HitResult3[] = [...[...this.selection.faces].map((f) => ({ face: view.global(f) })), ...[...this.selection.edges].map((e) => ({ edge: view.global(e) })), ...[...this.selection.verts].map((v) => ({ vertex: view.global(v) }))];
    if (!seeds.length) return false;
    for (const h of seeds) this.selectExpand(h, 2, "add");
    return true;
  }

  /** 线稿风格：pixel（默认，原生 GL 线 1 设备像素）/ thick（屏幕像素宽粗线）。本版只活这一次会话（持久化要 user 同意）。 */
  get lineStyle(): LineStyle { return this.r3.getLineStyle(); }
  setLineStyle(s: LineStyle): void { this.r3.setLineStyle(s); this.host.changed(); this.draw(); }
  /** 线稿粗细（设备像素；1 = 原生线，> 1 = 粗线 + SU 轮廓线）。 */
  get lineWeight(): number { return this.r3.getLineWeight(); }
  setLineWeight(w: number): void { this.r3.setLineWeight(w); this.host.changed(); this.draw(); }
  toggleProjection(): void {
    this.cam.projection = this.cam.projection === "persp" ? "ortho" : "persp";
    this.host.changed();
    this.draw();
  }

  // ---------- 充能制 ----------
  private alignSrcs(): Pt3[] { return [...this.charged.values()]; }
  private alignEdges(): { a: Pt3; b: Pt3 }[] { return [...this.chargedEdges.values()]; }
  private chargeEdge(e: { a: Pt3; b: Pt3 }): void {
    const key = `e:${e.a.x},${e.a.y},${e.a.z}|${e.b.x},${e.b.y},${e.b.z}`;
    this.chargedEdges.delete(key);
    this.chargedEdges.set(key, { a: { ...e.a }, b: { ...e.b } });
    while (this.chargedEdges.size > 2) this.chargedEdges.delete(this.chargedEdges.keys().next().value!);
  }
  /** 悬停在「边上」时那条边的两端（世界坐标；给充能用）。 */
  private hoveredEdge(view: WorldView, sx: number, sy: number): { a: Pt3; b: Pt3 } | null {
    const hit = pickEntity(view, this.frame(), this.fvp(), sx, sy, this.hitPx());
    if (hit.edge === undefined || !view.graph.hasEdge(hit.edge)) return null;
    const e = view.graph.edge(hit.edge);
    return { a: view.graph.pt(e.a), b: view.graph.pt(e.b) };
  }
  private chargePt(p: Pt3): void {
    const key = `${p.x},${p.y},${p.z}`;
    this.charged.delete(key);
    this.charged.set(key, { ...p });
    while (this.charged.size > 3) this.charged.delete(this.charged.keys().next().value!);
  }
  private trackCharge(sn: Snap3 | null, edge: { a: Pt3; b: Pt3 } | null = null, dwellMs = 300): void {
    if (sn?.kind === "on-edge" && edge) {   // 充能边：停在边上 ≥ dwell
      const key = `e:${edge.a.x},${edge.a.y},${edge.a.z}|${edge.b.x},${edge.b.y},${edge.b.z}`;
      if (this.chargedEdges.has(key)) { this.dwell = null; return; }
      const now = performance.now();
      if (!this.dwell || this.dwell.key !== key) { this.dwell = { key, since: now }; return; }
      if (now - this.dwell.since >= dwellMs) { this.chargeEdge(edge); this.dwell = null; }
      return;
    }
    if (!sn || (sn.kind !== "endpoint" && sn.kind !== "midpoint")) { this.dwell = null; return; }
    const key = `${sn.p.x},${sn.p.y},${sn.p.z}`;
    if (this.charged.has(key)) { this.dwell = null; return; }
    const now = performance.now();
    if (!this.dwell || this.dwell.key !== key) { this.dwell = { key, since: now }; return; }
    if (now - this.dwell.since >= dwellMs) { this.chargePt(sn.p); this.dwell = null; }
  }
  private revalidateCharged(): void {
    if (!this.charged.size) return;
    const view = this.worldView();
    const live = new Set<string>();
    for (const v of view.vertices()) live.add(`${v.x},${v.y},${v.z}`);
    for (const e of view.edges()) {
      const a = view.graph.pt(e.a), b = view.graph.pt(e.b);
      live.add(`${(a.x + b.x) / 2},${(a.y + b.y) / 2},${(a.z + b.z) / 2}`);
    }
    for (const key of [...this.charged.keys()]) if (!live.has(key)) this.charged.delete(key);
    for (const [key, e] of [...this.chargedEdges]) if (!live.has(`${e.a.x},${e.a.y},${e.a.z}`) || !live.has(`${e.b.x},${e.b.y},${e.b.z}`)) this.chargedEdges.delete(key);
  }
  private clearCharged(): void { this.charged.clear(); this.chargedEdges.clear(); this.dwell = null; this.lastSnap = null; }
  private applyHysteresis(sn: Snap3, sx: number, sy: number): Snap3 {
    if (sn.kind !== null) { this.lastSnap = sn; return sn; }
    if (this.lastSnap?.kind) {
      const e = this.frame().eps?.(this.fvp());
      const tol = e ? epsOfKindVR(e, this.lastSnap.kind) : (EPS_OF[this.lastSnap.kind] ?? 8) * (this.fvp().h / 800);
      if (this.frame().distTo(sx, sy, this.lastSnap.p, this.fvp()) <= tol * 1.5) return this.lastSnap;
    }
    this.lastSnap = null;
    return sn;
  }

  // ---------- 世界源 ----------
  private gestureActive(): boolean {
    return this.anchor3 !== null || Object.values(this.handlers).some((h) => h.active());
  }
  /** 手势中 = 影子副本（活动池）+ 整体变换预演；平时 = checkpoint。eraseFace 悬停预告不算手势现实。 */
  private liveWorld(): WorldView { return this.gestureActive() || this.cmdPreview ? this.worldView(this.live, this.liveOverride) : this.worldView(); }
  /** 基线手：活动池里 checkpoint 之外的新生顶点（追光标者）+ 工具自报的移动集（本地 id 谓词）。 */
  private freshHand(view: WorldView, extra?: (vid: VertexId) => boolean, opaque = false): AlignHand {
    const known = new Set(this.kernel.vertices().map((v) => v.id));
    const active = view.activeSlot();
    const hand: AlignHand = {
      has: (gid) => {
        const slot = view.slotOf(gid);
        if (slot?.overridden) return true;   // 正被整体搬的 group / 组件：在手里，不吸自己（SU 把被移实体排除在推断外）
        if (slot !== active) return false;
        const { id } = view.local(gid);
        return !known.has(id) || (extra?.(id) ?? false);
      },
      opaque,
    };
    if (this.handlers[this._tool]?.draws) {
      const born = new Set<FaceId>();
      for (const e of this.liveEvents) if (e.type === "BIRTH") born.add(e.face);
      hand.faces = (fid) => view.slotOf(fid) === active && born.has(view.local(fid).id);
    }
    return hand;
  }

  /** 预演失败时的复现描述（黑匣子）：工具 + 能重建那一步的参数（活动池本地坐标）。 */
  private previewDescriptor(): Record<string, unknown> {
    const tool = this._tool, k = this.kernel;
    const d: Record<string, unknown> = { tool };
    const H = this.handlers[tool];
    if (H?.active()) { d.sample = H.sample(); Object.assign(d, H.describe?.(this.toolCtx) ?? {}); }
    return d;
  }
  // ---------- live（影子副本预演） ----------
  /** 这次预演会把哪个组件斜切（拖的时候就提示「松手会被拦下」；提交时 ops.ts 的护栏真拦）。 */
  private previewShear: string | null = null;
  private computeLive(): void {
    this.live = null;
    this.liveOverride = null;
    this.liveEvents = [];
    this.previewShear = null;
    const run = (fn: (c: Kernel) => FaceEvent[]): void => {
      const c = perf.time("live.clone", () => this.kernel.clone());
      try { this.liveEvents = perf.time("live.run", () => fn(c)); }
      catch (err) {
        this.liveEvents = []; this.live = null;
        this.host.trace?.({ kind: "fail", where: "preview", op: null, message: err instanceof Error ? err.message : String(err), brep: this.kernel.toBrep(), pool: this.activePool(), preview: this.previewDescriptor() });
        this.fail("preview", err); return;
      }
      this.live = c;
    };
    const tool = this._tool;
    let dims = "";
    const H = this.handlers[tool];
    if (H && (H.active() || H.previewOnHover)) dims = H.live(this.toolCtx, run);
    if (dims !== this.dims) { this.dims = dims; this.host.readout?.(this.readoutText()); }
    if (this.live || this.liveOverride || dims) {
      const ev = this.live ? (this.liveEvents.length ? `预览：${this.liveEvents.map(describeEvent).join("；")}` : "预览：无膜变化") : "";
      const sh = this.previewShear ? `会把组件「${this.previewShear}」斜切（glTF 不允许），松手会被拦下：沿它自己的轴缩放（只选它一个时手柄就是它的轴）` : "";
      this.host.hint([sh, dims, ev].filter(Boolean).join(" ｜ "));
    }
  }
  /** 整体变换（世界系 X）的预演：选区顶点走影子副本、子池走叠加变换。 */
  private previewXform(X: Xform, run: (fn: (c: Kernel) => FaceEvent[]) => void, copy?: { faces: readonly FaceId[]; edges: readonly EdgeId[] }): void {
    const vids = moveTargetsSelection(this.kernel, this.selection), XL = this.xformToLocal(X);
    if (copy) {   // 复制（变换工具按住 Ctrl / 开着「复制」）：原件不动，副本吸进影子副本
      const payload = this.copyPayload(XL, copy);
      if (payload) run((c) => { const edgeSegs: Record<string, { a: Pt3; b: Pt3 }[]> = {}; for (const [n, segs] of Object.entries(payload.edgeSegs)) edgeSegs[n] = segs.map(([a, b]) => ({ a, b })); return c.absorb(payload.faces, payload.wires.map(([a, b]) => ({ a, b })), { edgeSegs, faceLayers: payload.faceLayers }); });
    } else if (vids.length) run((c) => c.moveVertices(vids.filter((id) => c.graph.hasVertex(id)).map((id) => ({ id, to: applyPt(XL, c.graph.pt(id)) }))));
    const picks = this.movablePoolPicks(false);
    if (picks.length) this.liveOverride = { picks, xform: X, ...(copy ? { copy: true } : {}) };
    {   // 斜切护栏的提前量：变换后组件矩阵有新斜切 → 提示（提交时 ops.ts 照样拦）
      const d = this.scene.def(this.scene.defOfContext(this.ctx));
      for (const p of picks) if (p.kind === "instance") { const inst = d.instances.get(p.instance); if (inst && !hasShear(inst.xform) && hasShear(compose(XL, inst.xform))) { this.previewShear = this.scene.def(inst.def).name; break; } }
    }
  }
  /**
   * 选区的轴心（变换工具的「轴心」选项 / 马后炮）：最后选的物体原点 = 选区里最后选中的那个组 / 组件的轴原点（Blender 的 Active Element；选区按选的先后存），没选组 / 组件 → 包围盒中心。
   * 自动 = 只选了一个组 / 组件（没有散的面 / 边）→ 它的轴原点；别的 → 包围盒中心。
   */
  private pivotOf(mode: "auto" | "bbox" | "mean" | "active"): Pt3 | null {
    if (mode === "auto" && this.selectedPools.size === 1 && !this.selection.faces.size && !this.selection.edges.size && !this.selection.verts.size) { const fr = this.selectedPoolFrames(this.worldView()); if (fr.length) return fr[0].origin; }
    if (mode === "active") { const fr = this.selectedPoolFrames(this.worldView()); if (fr.length) return fr[fr.length - 1].origin; }
    return this.selectionCenter(mode === "mean" ? "mean" : "bbox");
  }
  /** 选中的点（世界坐标；只画点本身）。 */
  private selVertsView(view: WorldView, g: (id: number) => number): Pt3[] | null {
    if (!this.selection.verts.size) return null;
    const out: Pt3[] = [];
    for (const v of this.selection.verts) { const gv = g(v); if (view.graph.hasVertex(gv)) out.push(view.graph.pt(gv)); }
    return out.length ? out : null;
  }
  // ---------- 渲染 ----------
  viewExtras: (() => Partial<ViewState>) | null = null;
  setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void { this.r3.setLoop(cb); }
  private drawSuspended = false;
  batchDraw(fn: () => void): void {
    this.drawSuspended = true;
    try { fn(); } finally { this.drawSuspended = false; }
    this.draw();
  }
  draw(): void {
    if (this.drawSuspended) return;
    const view = this.liveWorld();
    const active = view.activeSlot();
    const off = active.index;
    const g = (id: number): number => id + off * (1 << 22);
    // 镜像会话里画的是预演的影子内核，选区 id 对不上它 → 不画选区高亮（user 看到的只有预演结果 + gizmo）
    const selE = new Set<number>(this.cmdPreview ? [] : [...this.selection.edges].map(g)), selF = new Set<number>(this.cmdPreview ? [] : [...this.selection.faces].map(g));
    // 子池选区 / 悬停：整池的面与边高亮
    const slotHighlight = (picks: Iterable<PoolPick>): void => {
      for (const p of picks) for (const s of this.slotsOfPick(view, p)) {
        const o = s.index * (1 << 22);
        for (const f of s.kernel.faces()) selF.add(f.id + o);
        for (const e of s.kernel.edges()) selE.add(e.id + o);
      }
    };
    if (!this.cmdPreview) slotHighlight(this.selectedPools.values());
    const dimmed = (this.ctx.chain.length > 0 || this.ctx.group !== null) ? new Set(view.slots.filter((s) => !s.active).map((s) => s.index)) : null;
    this.r3.render(view, this.cam, this.vp(), {
      ...(this.viewExtras?.() ?? {}),
      selectionEdges: selE,
      selectionFaces: selF,
      scrubEdges: new Set<number>(),   // 橡皮模块经 viewExtras 覆盖（擦一段 = 整条，高亮也整条）
      hoverEdge: this.hoverEdge !== null ? g(this.hoverEdge) : null,
      hoverFace: this.hoverFace !== null ? g(this.hoverFace) : null,
      preview: null,
      snap: this.snapInfo,
      snapAnchor: this.anchor3,
      revision: this._revision,
      dimSlots: dimmed,
      handles: null,
      protractor: null,
      guides: view.guides(),
      guideSel: this.selection.guides,
      frame: view.frame(),
      grid: { frame: view.grid()?.frame ?? view.frame(), step: this._grid.step, sub: this._grid.subdiv, on: this._grid.on },   // 吸附没开也按设置的格距画（10-24 小 bug：此前关着就退回 1 m，换制式看不出来）
      charged: { points: this.alignSrcs(), edges: this.alignEdges() },
      selVerts: this.cmdPreview ? null : this.selVertsView(view, g),
      ticks: this.mode.id === "geometry" ? this.breakTicks(view) : null,
      poolAxes: this.selectedPoolFrames(view),
      emptyAxes: this.emptyMarkers(view).map((e) => e.frame),
      planeGizmo: this.gizmo ? (() => { const G = gizmoGeom(this.gizmo.g, this.frame(), this.fvp()); return { origin: G.origin, normal: G.normal, u: G.u, v: G.v, size: G.size, hot: this.gizmo.grab?.handle ?? this.gizmo.hot }; })() : null,
      ...(this.mode.id === "geometry" ? this.unitMarks(view.frame()) : {}),
      ...(this.mode.viewExtras?.() ?? {}),
      ...(this.handlers[this._tool]?.viewExtras?.(this.toolCtx) ?? {}),
    });
  }
  /**
   * A33 断口提示（user 2026-10-24「如果一根直的线中间断了一截，应该有一个垂直的小线段提示一下这里断了，需要weld，不然到游戏引擎了一堆五边面」）：
   * 活动池里 Kernel.isBreakJunction 的顶点 → 世界坐标的点 + 边向（渲染器画屏幕定长的小垂线）。按池版本缓存。
   */
  /** X 轴上一格处的「一格多长」（原「1 m / 1 ft」）+ Z 轴刻度间距（user 2026-10-25「能不能在x轴+1的地方背景颜色的小字写上1m或者别的单位定义。以及我还是希望z轴有刻度」）。 */
  private unitMarks(F: Frame): { labels: WorldLabel[]; axisTickM: number; axisUnitX: number | null } {
    const m = unitMark(this._vcbUnit), empty = this.sceneEmpty();
    // 标记跟着格子走（DT16，user 10-25「1m的标记没有跟着格子的大小更新」）：放在一格处、写一格的长度；Z 轴刻度仍按单位（1 m / 1 ft）
    const step = this._grid.step > 0 ? this._grid.step : m.unitM;
    // 只在空场景出（user「有东西了之后1m就可以不要了。它只是空场景帮你防呆的」）；Z 轴刻度一直在
    return { axisTickM: m.unitM, axisUnitX: empty ? step : null, labels: empty ? [{ id: "unit-x", text: gridStepLabel(step, this._vcbUnit), at: { x: F.origin.x + F.x.x * step, y: F.origin.y + F.x.y * step, z: F.origin.z + F.x.z * step }, style: "scale", anchor: "below" }] : [] };
  }
  /** 场景里一个顶点都没有（按场景版本号缓存，不每帧数）。 */
  private emptyCache: { rev: number; empty: boolean } | null = null;
  private sceneEmpty(): boolean {
    if (this.emptyCache?.rev !== this._revision) this.emptyCache = { rev: this._revision, empty: this.worldView().vertices().length === 0 };
    return this.emptyCache.empty;
  }
  private ticksCache: { kernel: Kernel; rev: number; xform: Xform; ticks: { p: Pt3; dir: Pt3 }[] } | null = null;
  breakTicks(view: WorldView = this.liveWorld()): readonly { p: Pt3; dir: Pt3 }[] {
    const slot = view.activeSlot(), k = slot.kernel;
    const c = this.ticksCache;
    if (c && c.kernel === k && c.rev === k.rev && c.xform === slot.xform) return c.ticks;
    const ticks: { p: Pt3; dir: Pt3 }[] = [];
    const g = k.graph;
    for (const v of k.vertices()) {
      if (v.edges.size !== 2 || !k.isBreakJunction(v.id)) continue;
      const [ea] = [...v.edges];
      const other = g.pt(g.otherEnd(g.edge(ea), v.id));
      const p0 = applyPt(slot.xform, { x: v.x, y: v.y, z: v.z }), p1 = applyPt(slot.xform, other);
      const d = sub3(p1, p0), l = Math.hypot(d.x, d.y, d.z);
      if (l === 0) continue;
      ticks.push({ p: p0, dir: { x: d.x / l, y: d.y / l, z: d.z / l } });
    }
    this.ticksCache = { kernel: k, rev: k.rev, xform: slot.xform, ticks };
    return ticks;
  }
  resize(dpr: number): void { this.r3.resize(this.vp(), dpr); this.draw(); }
  private updateTip(clientX: number, clientY: number): void {
    // 工具提示 > 吸附自带 label（15° / 整数长度的数值…）> 吸附种类标签（user 2026-10-24「incremental 是不是可以 tooltip 跟着指针走」）
    const sn = this.snapInfo;
    this.host.tip(this.toolTip ?? (sn?.kind ? sn.label ?? (sn.kind === "tool" ? "工具" : SNAP_LABELS[sn.kind] ?? sn.kind) : null), clientX, clientY, this.scaleTip(), this.dims);
  }

  // ---------- 缩放柄 ----------
  private targetBounds(): { min: Pt3; max: Pt3 } | null {
    const view = this.worldView();
    let min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
    const add = (p: Pt3): void => { min = { x: Math.min(min.x, p.x), y: Math.min(min.y, p.y), z: Math.min(min.z, p.z) }; max = { x: Math.max(max.x, p.x), y: Math.max(max.y, p.y), z: Math.max(max.z, p.z) }; };
    const k = this.kernel, m = this.ctxXform();
    for (const vid of moveTargetsSelection(k, this.selection)) add(applyPt(m, k.graph.pt(vid)));
    for (const p of this.selectedPools.values()) for (const s of this.slotsOfPick(view, p)) { const b = poolBounds(s.kernel, s.xform); if (b) { add(b.min); add(b.max); } }
    return Number.isFinite(min.x) ? { min, max } : null;
  }
  // ---------- 输入：工具指针 ----------
  pointerDown(ev: ToolPointer): void { this.step(() => this.pointerDownStep(ev)); }
  private pointerDownStep(ev: ToolPointer): void {
    if (this.gizmoPointer("down", ev)) return;   // 镜像会话：把手优先、别处不动作
    const s = ev;
    this.mods = { shift: ev.shiftKey, copy: !!ev.copy };
    { const r = this.frame().ray(s.x, s.y, this.fvp()); this.taps.down(performance.now(), add3(r.origin, r.dir), TAP_RULES[ev.pointerType] ?? frameTapRule(this.eps().tap), (prev) => this.frame().distTo(s.x, s.y, prev, this.fvp())); }
    const H = this.handlers[this._tool];
    if (H) {
      if (H.grammar === "steps" && this.armed && H.active()) {
        // 位移防抖：等下一点时按下的地方离当前锚点在点按容差内 = 「同一处又点了一下」，不取这一子步——画线（连画）= 收笔，别的工具 = 吞掉这一下。
        // 起因（user 2026-10-25「为什么会在同一个地方点两下会在垂直的方向画线？」）：笔点两下差 6 px，第二点被吸到过锚点的竖直线上 = 7 cm 竖线
        // （屏上只有 6 px，世界长度却过了 MIN_GESTURE_LEN 1 cm）。根因（锚点附近不该推竖直线）在求解器，归 Fable（总账记了）；这里是手势层的护栏。探针 probe-pen-tap。
        // 半径 = 吸附半径（点按容差 4 px 拦不住：Pencil「同一处」点两下常差 5–8 px）——这么近本来就该吸回锚点本身，不该另起一段；要画更短的线就放大或输长度。
        if (this.anchor3 && this.frame().distTo(s.x, s.y, this.anchor3, this.fvp()) <= Math.max(this.eps().tap, this.eps().snap)) {
          if (this._tool === "line") { this.cancelGesture(); this.host.hint(null); this.host.changed(); }
          this.draw();
          return;
        }
        // armed 的按下 = 用悬停跟到的值取这一子步
        this.justCommitted = true;
        H.track(this.toolCtx, s, ev.travel);
        H.down(this.toolCtx, ev);
        if (H.active()) this.armed = true; else this.endStepGesture();   // 还有下一子步 → 继续 arm（鼠标已松着）
      } else {
        { const r = this.frame().ray(s.x, s.y, this.fvp()); this.downPoint = add3(r.origin, r.dir); }
        this.samples = [];   // 新手势：样本环从零（抬笔结算只看这一次）
        H.down(this.toolCtx, ev);
        if (H.grammar === "steps") { if (H.active()) { this.armed = false; this.canArm = !!ev.armable; } else this.endStepGesture(); }
      }
    }
    this.consumeCharges();
    this.draw();
  }
  // ---------- 血槽位读数（A28；user 2026-10-24「右下角的血槽位应该显示推拉距离，方形大小面积之类的。然后你点中面血槽位也可以显示面积」）----------
  /** 手势中 = 工具的 dims；否则选中面的面积合计 / 选中边的长度合计；都没有 = ""。 */
  readoutText(): string {
    if (this.dims) return this.dims;
    const k = this.kernel;
    const fs = [...this.selection.faces].filter((f) => k.face(f)), es = [...this.selection.edges].filter((e) => k.graph.hasEdge(e));
    const parts: string[] = [];
    if (fs.length) {
      let a = 0;
      for (const f of fs) { const r = k.faceRings3(f); if (!r) continue; a += polygonArea3(r.outer); for (const h of r.holes) a -= polygonArea3(h); }
      parts.push(`面积 ${fmtArea(a)}${fs.length > 1 ? `（${fs.length} 面）` : ""}`);
    }
    const vn = [...this.selection.verts].filter((v) => k.graph.hasVertex(v)).length;
    if (vn) parts.push(`${vn} 个点`);
    if (es.length) {
      let L = 0;
      for (const e of es) { const E = k.graph.edge(e); L += len3(sub3(k.graph.pt(E.b), k.graph.pt(E.a))); }
      parts.push(`长 ${fmtLen(L)}${es.length > 1 ? `（${es.length} 边）` : ""}`);
    }
    return parts.join(" · ");
  }
  /** 全选（Ctrl+A，A7）：当前上下文的全部几何 + 直接子 group / 实例。 */
  selectAll(): boolean { this.selectAllInner(); this.afterSelect(); return this.hasSelection(); }
  private selectAllInner(): void {
    const k = this.kernel;
    this.selection = emptySelection(); this.selectedPools.clear();
    for (const f of k.faces()) if (!k.isFaceHidden(f.id)) this.selection.faces.add(f.id);   // 隐藏的（DT49）不选
    for (const e of k.edges()) if (!k.isEdgeHidden(e.id)) this.selection.edges.add(e.id);
    const def = this.scene.def(this.scene.defOfContext(this.ctx));
    const shown = (gk: Kernel): boolean => gk.faces().some((f) => !gk.isFaceHidden(f.id)) || gk.edges().some((e) => !gk.isEdgeHidden(e.id));
    if (def.body.kind === "brep") for (const g of def.body.groups.values()) if (g.parent === this.ctx.group && (shown(g.kernel) || [...def.body.groups.values()].some((c) => c.parent === g.id))) this.selectedPools.set(`g${g.id}`, { kind: "group", group: g.id });
    for (const i of def.instances.values()) if (i.parent === this.ctx.group && chainVisible(this.scene, [...this.ctx.chain, i.id])) this.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id });   // 藏起来的（隐藏 / 藏层）不选
  }
  /** steps 工具做完最后一子步：底座这边的手势残留清干净（锚点 / 光标 / 样本环 / arm / 预演），提示留给工具。 */
  private endStepGesture(): void {
    this.anchor3 = null; this.cursor3 = null; this.snapInfo = null;
    this._axisLock = null; this._planeLock = null; this._planeLockN = null;   // 手势落定 = 锁解（SU 同款）
    this.samples = []; this.armed = false; this.canArm = false; this.downPoint = null; this.justCommitted = false;
    this.live = null; this.liveOverride = null; this.liveEvents = [];
  }
  /** 充能生命周期 = 工具子步（user 2026-10-24「充能只影响下一个按下……充能的生命周期应该是每一下点，是工具的子步的生命周期」）：每次按下 / 松手落定都消费掉，这一子步悬停时再蹭。 */
  private consumeCharges(): void { this.clearCharged(); }

  pointerMove(ev: ToolPointer): void { this.step(() => this.pointerMoveStep(ev)); }
  private pointerMoveStep(ev: ToolPointer): void {
    if (this.gizmoPointer("move", ev)) return;
    const s = ev;
    this.lastPtr = { x: s.x, y: s.y };
    this.lastMoveEv = ev;
    this.mods = { shift: ev.shiftKey, copy: !!ev.copy };
    if (!this.gestureActive()) {
      this.snapInfo = null;
      this.hoverEdge = null;
      this.hoverFace = null;
      const H = this.handlers[this._tool];
      if (H) { H.hover?.(this.toolCtx, s); if (H.previewOnHover) this.computeLive(); }
      this.updateTip(ev.clientX, ev.clientY);
      perf.time("hover.draw", () => this.draw());
      return;
    }
    this.trackGesture(s, ev.travel);
    this.recordSample(s);
    if (this._tool !== "select") this.computeLive();
    this.updateTip(ev.clientX, ev.clientY);
    this.draw();
  }

  /** 手势中的取点（pointerMove 与松开帧共用）：交给当前工具模块。 */
  private trackGesture(s: { x: number; y: number }, travel?: number): void {
    const H = this.handlers[this._tool];
    if (H?.active()) H.track(this.toolCtx, s, travel);
  }
  /** 工具模块的上下文（tool-handler.ts ToolCtx）：底座能力的窄出口；工具只认它。 */
  private makeToolCtx(): EditorCore {
    const self = this;
    return {
      scene: () => this.scene,
      context: () => this.ctx,
      revision: () => this._revision,
      modeId: () => this.mode.id,
      get config() { return self.config; },   // getter：toolCtx 字段先于 config 字段初始化，直接取值会是 undefined（v0.13.11 vcb / scene 探针抓到）
      kernel: () => this.kernel,
      selection: () => this.selection,
      world: () => this.worldView(),
      live: () => this.liveWorld(),
      frame: () => this.frame(),
      vp: () => this.fvp(),
      eps: () => this.eps(),
      snapPx: () => this.snapPx(),
      pickFace: (sx, sy) => pickFace(this.liveWorld(), this.frame(), this.fvp(), sx, sy),
      pick: (sx, sy) => this.pickAt(sx, sy),
      classify: (view, hit) => this.classify(view, hit),
      snap: (view, sx, sy, q) => snapPoint(view, this.frame(), this.fvp(), sx, sy, this.snapPx(), { chargedEdges: this.alignEdges(), xrayPoints: this.poolOrigins(view), ...q }),
      applyLock: (sn, sx, sy) => this.applyLock(sn, this.anchor3, sx, sy),
      lockedPlane: (through) => this.lockedPlaneThrough(through),
      alignSources: () => this.alignSrcs(),
      hand: (view, extra, opaque) => this.freshHand(view, extra, opaque),
      toLocal: (p) => this.toLocal(p),
      ctxXform: () => this.ctxXform(),
      activePool: () => this.activePool(),
      intentOn: (s, travel) => this.intentOn(s, travel),
      commitOp: (op) => this.commitOp(op),
      opCount: () => this.opCount,
      hint: (t) => this.host.hint(t),
      tip: (t) => { this.toolTip = t; },
      anchor: () => this.anchor3,
      setAnchor: (p) => { this.anchor3 = p; },
      setCursor: (p) => { this.cursor3 = p; },
      setSnap: (sn) => { this.snapInfo = sn; },
      recordLast: (L) => { this.last = L; this.offerXformAfterthought(); },
      contextFrame: () => this.contextFrame(),
      orientFrame: () => this.orientFrame(),
      boxIn: (f) => this.boxIn(f),
      setAxes: (f) => this.setContextAxes(f),
      hoverSnap: (s) => this.hoverSnap(s),
      setHoverEdge: (e) => { this.hoverEdge = e; },
      hysteresis: (sn, sx, sy) => this.applyHysteresis(sn, sx, sy),
      dropHysteresis: () => { this.lastSnap = null; },
      charge: (sn, dwellMs) => this.trackCharge(sn, null, dwellMs),
      moved: (s, travel) => this.movedSinceDown(s, travel),
      tapSlop: () => this.taps.slop(),
      clicks: () => this.taps.clicks(),
      cursor: () => this.cursor3,
      mods: () => this.mods,
      currentSnap: () => this.snapInfo,
      setHoverFace: (f) => { this.hoverFace = f; },
      paintMaterialIndex: () => this.materialIndexForPick(),
      paintFaces: (faces, sides) => this.paintFaces(faces, sides),
      pickMaterialOf: (f, side) => this.pickMaterialOf(f, side),
      grid: () => (this.gridEff === this._grid.on ? this._grid : { ...this._grid, on: this.gridEff }),   // 工具看到的是有效开关（按住 Shift 反过来）
      pickLocked: (p) => this.pickIsLocked(p),
      setLiveOverride: (o) => { this.liveOverride = o; },
      xformToLocal: (X) => this.xformToLocal(X),
      copyPayload: (XL, entities) => this.copyPayload(XL, entities),
      commitCopies: (copies, pools, at) => this.commitCopies(copies, pools, at),
      commitXform: (X, vids, pools) => this.commitXform(X, vids, pools),
      previewXform: (X, run, copy) => this.previewXform(X, run, copy),
      pivotOf: (m) => this.pivotOf(m),
      offerAfterthought: (title, fields, values, nOps, redo) => this.offerAfterthought(title, fields, values, nOps, redo),
      movablePoolPicks: (say) => this.movablePoolPicks(say),
      targetBounds: () => this.targetBounds(),
      marquee: (r) => this.host.marquee(r),
      marqueePick: (box) => marqueeScreen(this.liveWorld(), this.cam, this.vp(), box),
      emptyAt: (sx, sy) => this.emptyAt(sx, sy),
      emptiesIn: (box) => this.emptiesIn(box),
      replaceSelection: (sel, mode) => {
        if (mode === "replace") { this.selection = emptySelection(); this.selectedPools.clear(); }
        mergeSel(this.selection.edges, sel.edges, mode, true);
        mergeSel(this.selection.faces, sel.faces, mode, true);
        mergeSel(this.selection.guides, sel.guides ?? [], mode, true);
        this.mergePools(sel.pools, mode);
      },
      selectGuide: (id, mode) => {
        if (mode === "replace") { this.selection = emptySelection(); this.selectedPools.clear(); }
        mergeSel(this.selection.guides, [id], mode);
        this.host.changed(); this.draw();
      },
      afterSelect: () => this.afterSelect(),
      selectExpand: (hit, stage, mode) => this.selectExpand(hit, stage, mode),
      enterPool: (p) => this.enterPool(p),
      exitContext: () => this.exitContext(),
      contextDepth: () => this.contextDepth(),
      hasSelection: () => this.hasSelection(),
      softenEdges: (ids, on) => this.softenEdges(ids, on),
    };
  }
  /** 取点悬停（无手势）：画面平面 + 吸附（迟滞）+ 充能。内建的画线 / 矩形 / 圆 / 移动与模块工具共用。 */
  private hoverSnap(s: { x: number; y: number }): void {
    const view = this.liveWorld();
    const plane = perf.time("hover.plane", () => drawPlaneAt(view, this.frame(), this.fvp(), s.x, s.y));
    this.snapInfo = perf.time("hover.snap", () => this.applyHysteresis(snapPoint(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), { plane, alignSources: this.alignSrcs(), chargedEdges: this.alignEdges(), xrayPoints: this.poolOrigins(view), hand: this.freshHand(view) }), s.x, s.y));
    this.trackCharge(this.snapInfo, this.snapInfo?.kind === "on-edge" ? this.hoveredEdge(view, s.x, s.y) : null);
  }
  private projectToPlaneThrough(p: Pt3, c: Pt3, n: Pt3): Pt3 { const d = dot3(sub3(p, c), n); return sub3(p, scale3(n, d)); }
  private currentSample(): { cursor3: Pt3 | null; snap: Snap3 | null; extra: Record<string, number> } {
    return { cursor3: this.cursor3, snap: this.snapInfo, extra: this.handlers[this._tool]?.sample() ?? {} };
  }
  private recordSample(s: { x: number; y: number }): void {
    if (!this.gestureActive()) return;
    const t = performance.now();
    this.samples.push({ t, sx: s.x, sy: s.y, cursor3: this.cursor3, snap: this.snapInfo, extra: this.handlers[this._tool]?.sample() ?? {} });
    while (this.samples.length > 256 || (this.samples.length && t - this.samples[0].t > 2000)) this.samples.shift();
  }
  /**
   * 抬笔结算（A21）——按物理过程判：样本按「同一处」（HOLD_PX 内）分成一段段停留。松开处停留 ≥ FINAL_HOLD_MS → 有意，用松开帧；
   * 否则回看 RELEASE_WINDOW_MS 内结束的停留，取最长的那段（≥ MIN_DWELL_MS 且比松开处停得久）= 用户对齐时停住的地方；都没有 → 松开帧。
   */
  private settledSample(): GestureSample | null {
    const n = this.samples.length;
    if (!n) return null;
    const last = this.samples[n - 1];
    const holdScale = this.fvp().h / 800;
    const runs: { first: number; lastIdx: number; dur: number }[] = [];
    for (let i = 0; i < n; i++) {
      const r = runs[runs.length - 1];
      if (r && Math.hypot(this.samples[i].sx - this.samples[r.first].sx, this.samples[i].sy - this.samples[r.first].sy) <= HOLD_PX * holdScale) { r.lastIdx = i; continue; }
      if (r) r.dur = this.samples[i].t - this.samples[r.first].t;
      runs.push({ first: i, lastIdx: i, dur: 0 });
    }
    const fin = runs[runs.length - 1];
    fin.dur = last.t - this.samples[fin.first].t;
    if (fin.dur >= FINAL_HOLD_MS) return last;
    let dwell: typeof fin | null = null;
    for (let k = runs.length - 2; k >= 0; k--) {
      const r = runs[k];
      if (last.t - this.samples[r.lastIdx].t > RELEASE_WINDOW_MS) break;
      if (r.dur >= MIN_DWELL_MS && r.dur > fin.dur && (!dwell || r.dur > dwell.dur)) dwell = r;
    }
    // 停留帧只在「抬笔小滑」范围内顶替最后一帧：滑出 DWELL_SLIP_PX 之外 = 抬笔前又有意挪了地方，按最后一帧（A21 只杀肌肉抖动，不改人的最后决定）
    if (dwell) { const d = this.samples[dwell.lastIdx]; if (Math.hypot(last.sx - d.sx, last.sy - d.sy) <= DWELL_SLIP_PX * holdScale) return d; }
    return last;
  }

  /** 意图门开关：屏上拖够 eps.drag 才有意图（intent.ts hasIntent）。 */
  private intentOn(s: { x: number; y: number }, travel?: number): boolean {
    const moved = this.movedSinceDown(s, travel);
    return hasIntent(moved, this.eps().drag);
  }

  pointerUp(ev: ToolPointer): void { this.step(() => this.pointerUpStep(ev)); }
  private pointerUpStep(ev: ToolPointer): void {
    if (this.gizmoPointer("up", ev)) return;
    const s = ev;
    { const at = this.taps.pressAt(); this.taps.up(performance.now(), ev.travel ?? (at ? this.frame().distTo(s.x, s.y, at, this.fvp()) : 0)); }
    const isTap = (): boolean => !!this.downPoint && this.taps.clicks() > 0;   // 点 / 拖 = 点按族一处判（笔跟进的那一下偏向点）
    const settle = (): GestureSample | null => {
      if (this.justCommitted) return null;
      this.trackGesture(s);
      this.recordSample(s);
      return this.settledSample();
    };
    const H = this.handlers[this._tool];
    if (H?.active()) {
      if (H.grammar === "direct") H.up?.(this.toolCtx, ev, () => { const smp = settle(); return smp ? { cursor3: smp.cursor3, snap: smp.snap, extra: smp.extra } : null; });
      else if (this.justCommitted) this.justCommitted = false;
      else if (this.canArm && isTap()) { this.armed = true; this.host.hint("移动预览，再点一下落定；中途可以转视角；Esc / 单指轻点取消"); }
      else {
        // 拖拽松手 = 松手处（抬笔结算帧）的一次按下：先把工具跟到结算帧，再按下
        const smp = settle();
        if (smp) H.track(this.toolCtx, { x: smp.sx, y: smp.sy }, ev.travel);
        // 按下也发生在结算帧的位置（不是原始抬笔点）：弧 / 旋转矩形 / 轴 / 量角器这类在 down 里重新取点的工具，落定的点 = 预演的点
        // （user 2026-10-24「笔的时候吸附的点和落笔实际画的点不一样，你是不是接线接错了」——是，之前这里递的是 ev）。
        H.down(this.toolCtx, smp ? { ...ev, x: smp.sx, y: smp.sy } : ev);
        if (H.active()) this.armed = true; else this.endStepGesture();
      }
    }
    this.consumeCharges();
    this.host.changed();   // 手势落定后再刷一次 HUD：数值小窗要看到刚记下的 last
    this.draw();
  }

  pointerLeave(): void {
    if (!this.gestureActive()) {
      this.snapInfo = null;
      this.hoverEdge = null;
      this.hoverFace = null;
        this.live = null;
      this.host.tip(null, 0, 0);
      this.host.hint(null);
      this.draw();
    }
  }

  /** 复制落地：每份 = absorb 载荷 + 子池 copyGroup / placeInstance（移动复制与阵列共用）。 */
  private commitCopies(copies: { payload: ReturnType<Editor["copyPayload"]>; XL: Xform }[], pools: readonly PoolPick[], at: PoolRef): void {
    const def = this.scene.defOfContext(this.ctx);
    for (const { payload, XL } of copies) {
      if (payload) this.commitOp({ op: "absorb", at, faces: payload.faces, wires: payload.wires, edgeSegs: payload.edgeSegs, faceLayers: payload.faceLayers });
      for (const p of pools) {
        if (p.kind === "group") this.commitOp({ op: "copyGroup", at, group: p.group, xform: XL });
        else { const inst = this.scene.instance(def, p.instance); this.commitOp({ op: "placeInstance", at, definition: inst.def, xform: compose(XL, inst.xform) }); }
      }
    }
  }
  /** 复制模式的几何载荷：被移实体（选区的膜 / 边）抠成快照 → 经本地变换 → absorb 的坐标载荷。 */
  private copyPayload(XL: Xform, entities: { faces: readonly FaceId[]; edges: readonly EdgeId[] }): { faces: Pt3[][][]; wires: [Pt3, Pt3][]; edgeSegs: Record<string, [Pt3, Pt3][]>; faceLayers: (Record<string, number> | undefined)[] } | null {
    const k = this.kernel;
    const faces = entities.faces.filter((f) => k.face(f)), edges = entities.edges.filter((e) => k.graph.hasEdge(e));
    if (!faces.length && !edges.length) return null;
    const snap = transformSnapshot(extractSnapshot(k, faces, edges), XL);
    const P = snap.vertices;
    const inFace = new Set<string>();
    for (const f of snap.faces) for (const r of [f.outer, ...f.holes]) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; inFace.add(a < b ? `${a}-${b}` : `${b}-${a}`); }
    const lp = snapshotLayerPayload(snap, P);
    const edgeSegs: Record<string, [Pt3, Pt3][]> = {};
    for (const [n, segs] of Object.entries(lp.edgeSegs)) edgeSegs[n] = segs.map((sg) => [sg.a, sg.b] as [Pt3, Pt3]);
    return {
      faces: snap.faces.map((f) => [f.outer.map((i) => P[i]), ...f.holes.map((h) => h.map((i) => P[i]))]),
      wires: snap.edges.filter(([a, b]) => !inFace.has(a < b ? `${a}-${b}` : `${b}-${a}`)).map(([a, b]) => [P[a], P[b]] as [Pt3, Pt3]),
      edgeSegs,
      faceLayers: lp.faceLayers,
    };
  }
  /** 世界系变换 X 作用于：活动池顶点集（move op，本地坐标）+ 子池（transformPool / transformInstance，父空间变换）。 */
  private commitXform(X: Xform, vids: readonly VertexId[], pools: readonly PoolPick[]): void {
    const at = this.activePool(), k = this.kernel, XL = this.xformToLocal(X);
    if (vids.length) {
      const moves = vids.filter((id) => k.graph.hasVertex(id)).map((id) => ({ from: k.graph.pt(id), to: applyPt(XL, k.graph.pt(id)) }));
      this.commitOp({ op: "move", at, moves, ...(det3(XL) < 0 ? { mirror: true } : {}) });   // 镜像挪点：两个表面跟着法向走（DT8）
    }
    const def = this.scene.defOfContext(this.ctx);
    for (const p of pools) {
      if (p.kind === "group") this.commitOp({ op: "transformPool", at: { def, group: p.group }, xform: XL });
      else this.commitOp({ op: "transformInstance", def, instance: p.instance, xform: XL });
    }
  }
}
