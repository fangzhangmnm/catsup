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

import { Kernel, type RewindMark } from "../kernel/kernel.ts";
import { type WorldLabel, gridStepLabel, unitMark } from "./world-labels.ts";
import type { BrepSnapshot, EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport, rayPlane } from "./camera.ts";
import type { PointerFrame } from "./pointer-frame.ts";
import { type AlignHand, type DrawPlane, type HitResult3, type Snap3, type SnapKind, GROUND, cameraPlane, drawPlaneAt, grazing, pickEntity, pickFace, rectFirstPlane, resolveRectPlane, snapPoint , type PickKinds, faceDotPoint } from "./pick.ts";
import { HIT_PX, MESH_VERT_HIT_PX, NO_HAND, SNAP_PX, frameEps } from "./solver.ts";
import { type MirrorAxis, type MirrorMode, type MirrorMovesResult, type MirrorSetting, type SymmetrizeResult, MIRROR_TOL, coordOf, isSymmetric, mirrorMoves, mirrorPairs, sideOfChange, symmetrize } from "../mesh/mirror.ts";
import { MIRROR_TOPO_ACTIONS, opsOfClass } from "../mesh/mirror-ops.ts";
import { marqueeScreen, areaTest, type ScreenArea } from "./marquee.ts";
import type { EpsSet } from "./pointer-frame.ts";
import { type Selection, type BrepSelection, type SelMode, circleSegmentsOnPlane, emptySelection, guidesOf, mergeSel, moveTargetsSelection, rectSegmentsOnPlane, curveSpecToLocal, offsetCircleSpec, circleCurveSpec, rrectSegments, rrectDirAt, rrectThetaOf, bulgePointForRadius, rectOpposite, rectAxesOf } from "./tools.ts";
import { type ArcGesture, arcOp, buildArc } from "./arc-build.ts";
import { offsetRing } from "./offset.ts";
import { type CatsUpToolConfig, TOOL_OPTIONS, ToolConfig } from "./tool-config.ts";
import type { EditorCore, ToolCtx, ToolHandler } from "./tool-handler.ts";
import { rotateDir } from "./protractor-geom.ts";
import { type GridSettings, NEW_DOC_GRID, gridFrame, gridPreset } from "./grid-settings.ts";
import { guideCount } from "../scene/guides.ts";
import { compassOp } from "./tools/compass.ts";
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
import { POOL_AXES_PX, Renderer3, frameInput, type LineStyle, type ViewState } from "./render3.ts";
import { EditorStreamProvider } from "./stream-provider.ts";   // 编辑器 = 流提供者（Minccino 契约；Tron 第一刀步 3）
import { type BreakTicksCache, breakTicksOf } from "./break-ticks.ts";
import { PRESETS } from "./presets.ts";
import { type Op, ShearRejected, edgeKey, faceKey, resolveEdge, resolveFace } from "./ops.ts";
import { IMPORT_UNITS, type ImportScene, type ImportUp, reorientImport } from "../format/gltf-import.ts";
import type { TriangleCastReport } from "../kernel/from-triangles.ts";
import { castImport } from "../scene/import-build.ts";
import { REPAIR_STEPS } from "./repairs/index.ts";
import { actionById, commandById, placementsAt, routesOf } from "./commands/registry.ts";
import type { Surface } from "./commands/action.ts";
import type { Command, CommandEnv, CommandId, ObjectUnit, Params as CmdParams, PlanOut, PoolUnit, Unit, UnitKind } from "./commands/command.ts";
import { planWeld } from "../kernel/weld.ts";
import { History, OpApplyError, type StepLabel } from "./history.ts";
import { add3, cross3, dot3, len3, normalize3, polygonArea3, scale3, sub3 } from "../kernel/geom.ts";
import { type DefId, type EditContext, type GroupId, type InstId, type PoolRef, ROOT_CONTEXT, Scene, extractSnapshot, poolBounds, poolKey, samePool, snapshotLayerPayload, transformSnapshot, type Instance } from "../scene/scene.ts";
import { accept as transferAccept, castPayload, extract as transferExtract, localize as transferLocalize, transferSay } from "./transfer.ts";
import { clipboard } from "./clipboard.ts";
import { bodyEmpty } from "./ops.ts";
import { type PoolSlot, WorldView, slotKey, PART_STATS } from "../scene/world-view.ts";
import { chainVisible } from "../scene/layers.ts";
import { gridEffective } from "./increments.ts";
import { type Frame, type Xform, IDENTITY, applyDir, applyPt, compose, det3, frameToXform, hasShear, invert, rotationAbout, scalingAbout, scalingAlongAxes, translation, WORLD_FRAME, transformFrame } from "../scene/xform.ts";

export { TOOLS, type Tool } from "./tool-ids.ts";
import type { Tool } from "./tool-ids.ts";
import type { Mode, ModeId } from "./mode.ts";
import { GeometryMode } from "./modes/geometry.ts";
import { SurfaceMode } from "./modes/surface.ts";
import { FreeformMode } from "./modes/freeform.ts";
import { VerifyMode } from "./modes/verify.ts";
import { KINDS } from "../scene/kinds.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import type { KernelView } from "../scene/kernel-view.ts";
import { meshViewOf } from "../mesh/mesh-view.ts";
import { triangulateRings } from "../format/triangulate.ts";
import { addPrimitive, mergeVerts, splitEdge, PRIMITIVES, primitiveDims, primitiveDefaultLen, isFlatPrimitive, type PrimitiveKind } from "../mesh/ops/index.ts";
import { MeshKernel, F_HIDDEN } from "../mesh/mesh-kernel.ts";
import { edgeLoop } from "../mesh/select-loop.ts";
import type { OptionKv } from "./tool-config.ts";

/** 油漆桶当前「蘸的」材质：颜色（名字 + sRGB 0..1）/ 贴图（名字 + 原图字节 + 物理尺寸 米）/ null = 默认灰。 */
export type PaintPick = { kind: "color"; name: string; color: [number, number, number] } | { kind: "texture"; name: string; mimeType: string; bytes: Uint8Array; sizeM: [number, number] } | null;

/** 工具指针事件（canvas 本地坐标 + 定位提示用的 client 坐标）。 */
/** 菜单 / 物体窗口作用在谁上（Editor.withMenuTarget）：selection = 当前选区（几何层）；self = 你所在的这一层本身；children = 选中的子物体。 */
export type MenuTarget = "selection" | "self" | "children";
export type GestureStart = "pointer" | "keyboard";
export interface ToolPointer {
  x: number; y: number;
  clientX: number; clientY: number;
  pointerType: string;
  /** 这一下手势怎么起的（周账 F-125）：pointer = 真按下（鼠标 / 笔 / 手指 / XR）；keyboard = G / R / S / E / I 键盘起手（只有 ToolCtx.keyboardStart 造它）。缺 = pointer。
   *  谁关心：selecting.ts pressTarget——键盘起手永远对选区做，不走「按在选区外的东西上 = 对它做」的三分法。 */
  start?: GestureStart;
  /** 允许「点两下」模式（第一击是点击不是拖 → 移动预览再点放置）：桌面鼠标 = true；数位笔/手指 = false（误触发意外连线）。由适配器裁决。 */
  armable?: boolean;
  shiftKey: boolean;
  /** 复制修饰（Ctrl / Alt / ⌘）：移动 = 留一份原件再放（SU Move+Ctrl）。 */
  copy?: boolean;
  /** 单独的 Alt（点边 = 选环 / 洞；2026-10-28）。copy 里照旧含 Alt（移动复制），选区的减选只认 Ctrl / ⌘。 */
  altKey?: boolean;
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
  | { kind: "step"; label: string; ops: number; session: boolean }   // 一步封账（设计稿 §3 层 6）
  | { kind: "load"; label: string }
  /** 工作台和活动池的身体种类对不上（不变量 I5：本该不可能；画之前查到 = 当场纠正 + 记一行）。where = 谁漏了。 */
  | { kind: "drift"; where: string; mode: string; body: string }
  /** 失败行另带复现材料（黑匣子，2026-10-24）：那一步之前的活动池 B-rep + 池地址；预演失败带工具描述。宿主只在内存里留。 */
  | { kind: "fail"; where: string; op: Op | null; message: string; brep?: BrepSnapshot; pool?: PoolRef; preview?: Record<string, unknown> };

export interface EditorHost {
  hint(text: string | null): void;
  /** 跟指针的提示框；measure = 手势中的读数（user 2026-10-25「优先显示长度，参考只是参考」：第一行、最显眼）；scale = B43 尺度参考（拖动时才有；样式归宿主画）。 */
  tip(text: string | null, clientX: number, clientY: number, scale?: ScaleTipView | null, measure?: string): void;
  trace?(entry: EditorTrace): void;
  marquee(r: { x: number; y: number; w: number; h: number } | null): void;
  /** 套索轨迹（canvas 本地 CSS px；null = 收起；缺 = 宿主不画套索）。 */
  lasso?(pts: readonly { x: number; y: number }[] | null): void;
  /** 软选择的半径圈（画布本地 CSS px；null = 收）。 */
  softRing?(c: { x: number; y: number; r: number } | null): void;
  /** 扩 / 缩选区的拖动条（画布本地 CSS px；null = 收）。 */
  selGrowBar?(at: { x: number; y: number } | null): void;
  changed(): void;
  error?(err: unknown, where: string): void;
  /** 右下角血槽位的尺寸读数（手势中的 dims / 选中面的面积 / 选中边的长度；"" = 空）。A28。 */
  readout?(text: string): void;
  /** 工具选项的 device 持久化接缝（app 的 device-kv）；不给 = 只活这一次。 */
  optionKv?: OptionKv;
  /** 问一句「做 / 不做」（应用内确认框，不用系统弹窗）。慢的事先问、不替 user 决定不做（user 10-26「不要因为性能静默不做，宁愿弹警告问yes no。诚实性问题」）。不给 = 直接做。 */
  confirm?(title: string, message: string, okLabel: string): Promise<boolean>;
  /** 要等的大活的细进度条（顶边一条线，MoonSinger 同款；账本 UX7）：label = 露出来、返回「已经画上了」的 Promise（等它再开跑，不然卡住的那一帧画不出来）；null = 收起。缺 = 宿主不画。 */
  working?(label: string | null): Promise<void> | void;
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
// 抬笔结算（A21）的物理量和充能停留时长住手感表 controller/feel.ts（2026-10-28）
/** 手势最小位移（世界单位=米，A10 纪律）：短于此的线/移动/推拉视为没动。 */
/** 圆的多边形段数（SU 默认 24）。 */
/** 圆的默认段数（SSoT 在 tool-config 表；这里只是给老调用方 / 测试的镜像）。 */
export const CIRCLE_SEGMENTS = TOOL_OPTIONS.circle.segments.def;

import { fmtArea, fmtDeg, fmtLen, parseQuantity, setDisplayUnit } from "./units.ts";
import { SEGMENT_TIERS, SEG_MAX, clampSegments, segMin, segmentNote, tierOf, tierSegments } from "./segment-ref.ts";
export { fmtLen, fmtDeg } from "./units.ts";   // 读数走单位深模块（2026-10-24）
import { MIN_GESTURE_LEN, SNAP_LABELS } from "./gesture-consts.ts";
import { RELEASE_WINDOW_MS, FINAL_HOLD_MS, MIN_DWELL_MS, HOLD_PX, DWELL_SLIP_PX, CHARGE_DWELL_MS } from "../controller/feel.ts";
import { lockLines, lockThrough } from "../controller/lock-guide.ts";
import { stepSelection, type SelSets } from "../mesh/select-grow.ts";
import { SNAP_BASE, deviceOf, stanceOf } from "../controller/stance.ts";
import { createTypedInput, type TypedInput } from "../controller/typed-input.ts";
export { MIN_GESTURE_LEN, SNAP_LABELS };   // 2026-10-28 搬去 gesture-consts.ts（工具不再运行时 import 编辑器本体 = 工具层能无头跑）；这里转出给老调用方

/** 子池选区项（相对活动上下文的直接子项）。 */
export type PoolPick = { kind: "group"; group: number } | { kind: "instance"; instance: InstId };

/** 组件原点的现成位置（建组件马后炮 / 改组件原点马后炮共用；DT86）。 */
type OriginPreset = "bottom" | "corner" | "center" | "mean";
const ORIGIN_PRESETS: readonly { id: OriginPreset; label: string }[] = [{ id: "bottom", label: "底面中心" }, { id: "corner", label: "包围盒角" }, { id: "center", label: "包围盒中心" }, { id: "mean", label: "顶点平均" }];
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
  | { kind: "rotate"; ops: number; at: PoolRef; froms: Pt3[]; pools: PoolPick[]; center: Pt3; axis: Pt3; angle: number; copy?: boolean; entities?: { faces: FaceId[]; edges: EdgeId[] }; /** 变换工具：抓的时候几种变换中心（马后炮换变换中心重做）+ 用的是哪种。 */ pivots?: Record<string, Pt3>; pivotUsed?: string }
  | { kind: "scale"; ops: number; at: PoolRef; froms: Pt3[]; pools: PoolPick[]; anchor: Pt3; axis: Pt3 | null; f: Pt3; copy?: boolean; entities?: { faces: FaceId[]; edges: EdgeId[] }; /** 沿任意方向缩放（变换工具的缩放块，帧可能是斜的）：1 根 = 单轴块、2 根 = 平面块（2026-10-26）；有就按 scalingAlongAxes、f 用 x 分量。 */ dirs?: readonly Pt3[]; pivots?: Record<string, Pt3>; pivotUsed?: string }
  /** 卷尺（0.11）：起点 a、产物方向 dir（线 = 垂直偏移方向；点 = 起点→终点）、距离 d；line 另带参考线方向。 */
  | { kind: "tape"; ops: number; at: PoolRef; a: Pt3; dir: Pt3; d: number; make: "line" | "point"; lineDir?: Pt3 }
  /** 量角器（0.11）：圆心 / 转轴 / 参考点 / 角度 → 角度参考线；VCB 改度数。 */
  | { kind: "protractor"; ops: number; at: PoolRef; center: Pt3; axis: Pt3; ref: Pt3; angle: number }
  /** 圆规 / 球规（DT50）：圆心 / 法向（世界）/ 半径 → 参考圆或参考球；VCB 改半径、x5 / 5 = 同心圆。 */
  | { kind: "compass"; ops: number; at: PoolRef; center: Pt3; n: Pt3; r: number; sphere: boolean; copies?: number };

/** 样本环的一帧（抬笔结算 A21）：屏幕位置 + 当时的手势量。 */
interface GestureSample { t: number; sx: number; sy: number; cursor3: Pt3 | null; snap: Snap3 | null; extra: Record<string, number> }

/** 修复指令（DT85 作用范围统一 + 传播到子物体）。 */
/** 修复指令 = 注册表里 brep 族一条指令的 id（查法 = commands/registry.ts；修复一族的清单 = repairs/index.ts）。 */
type RepairKind = CommandId;
/** pools[].xf = 这个池的定义坐标 → 当前上下文定义坐标（组 = 不带变换；组件 = 一路实例变换的乘积，几条路径到同一定义取先到的那条）。 */
interface RepairScope { pools: PoolUnit[]; mode: "selection" | "context"; components: number; copies: number; locked: number }

/**
 * 一步的通行证（2026-10-28 Claude Opus 5.5；user「找到背后的深层系统性问题。然后思考能不能在静态甚至是写代码时就堵住」）：
 * 「一个用户动作 = 一步（它的全部 op + 之后的选区一起撤销）」以前靠每个入口自觉包 step()，类型上随处都能提交——漏包一个，
 * 动作之后改的选区被补记成一条空的「选区」步、连着提交的几条 op 拆成好几步撤销（user「undo还是萎靡不振的，特别是物体模式下，比如建组之类的」）。
 * 现在：commitOp 必须带通行证，通行证只有 step() 发 → 步外提交写出来就编译不过；给工具的 ToolCtx.commitOp 在边界上运行时查（工具只在包好的指针事件里被调）。
 */
declare const STEP_PASS_BRAND: unique symbol;
export interface StepPass { readonly [STEP_PASS_BRAND]: true }
const STEP_PASS = Object.freeze({}) as StepPass;

/** op → 一步的默认标签（中文动词；显式给了 step() 标签的用那个）。开放集：没登记的用 op 名。 */
const OP_TITLES: Readonly<Record<string, string>> = {
  addEdges: "画线", eraseEdges: "擦边", eraseFaces: "擦面", eraseSelection: "删除", move: "移动", pushpull: "推拉", followme: "跟随", absorb: "合并", weldEdges: "焊接", dissolveVertices: "溶解点",
  explodeCurves: "炸开曲线", setEdgeLayers: "软化 / 硬化", paintFaces: "上色", plugin: "修复", mirror: "镜像", setHidden: "隐藏 / 显示", unhideAll: "全部显示", transformInstance: "移动物件", placeInstance: "放置",
  eraseInstance: "删除物件", eraseGroup: "删除组", setLocked: "锁定 / 解锁", assignLayer: "分层", addLayer: "加层", renameLayer: "改层名", setLayerVisible: "层显隐", removeLayer: "删层", addMaterial: "加材质",
  setAxes: "改原点", setDrawFrame: "坐标架", castDefinition: "转换身体", addGuide: "参考线", eraseGuides: "删参考线", clearGuides: "清参考线", makeGroup: "建组", makeComponent: "建组件", explode: "炸开",
  copyGroup: "复制", transformPool: "移动组", applyScale: "应用缩放", importScene: "导入", batch: "一步", clear: "清空", preset: "预置",
  meshEdgeMarks: "标边", meshSmoothDefault: "默认平滑", meshBevel: "倒角", meshBevelVerts: "倒角", meshSymmetrize: "对称", meshSymmetrySnap: "对称对齐", meshSubdivide: "细分", meshMerge: "合并", meshMove: "移动", meshExtrude: "挤出", meshKnife: "切割", meshLoopCut: "环切", meshDelete: "删除", meshInset: "插入", meshAddPrimitive: "新建",
};
/** 只记骨架（内核没动）的 op：复现包「上一步」的内核 = 现在这份。 */
const SKELETON_ONLY: ReadonlySet<string> = new Set(["transformInstance", "placeInstance", "eraseInstance", "setLocked", "assignLayer", "addLayer", "renameLayer", "setLayerVisible", "removeLayer", "addMaterial", "setDrawFrame", "addGuide", "eraseGuides", "clearGuides"]);
function opLabel(op: Op): StepLabel { return { title: OP_TITLES[op.op] ?? op.op }; }
function labelText(l: StepLabel | undefined): string { return l ? (l.count ? `${l.title}（${l.count}）` : l.title) : "一步"; }

export class Editor {
  readonly cam = new OrbitCamera();
  private r3: Renderer3; private readonly provider: EditorStreamProvider;
  private scene = new Scene();
  private ctx: EditContext = ROOT_CONTEXT;
  private _grid: GridSettings = { ...NEW_DOC_GRID };
  /** 演示锁（护栏 ②，周账 F-124；ai-docs/20261024-finalize.md §0）：true = 改模型的入口全拒（commit / undo / redo / VCB / 指针按下 / 键盘起手）；看 / 选工作台 / 走路照旧。由 session 按 desk.locked 设。 */
  private _locked = false;
  get locked(): boolean { return this._locked; }
  setLocked(on: boolean): void { if (this._locked === on) return; this._locked = on; this.cancelGesture(); this.host.changed(); this.draw(); }
  private lockedSay(): void { this.host.hint("锁着：只能看；☰「解锁」才能改"); }
  get grid(): Readonly<GridSettings> { return this._grid; }
  setGrid(patch: Partial<GridSettings>): void {
    this._grid = { ...this._grid, ...patch };
    this.viewCache = null;
    this.host.changed();
    this.draw();
  }
  private history = new History<Session>();
  /** 上一次经过选区口子 / 装场景时的会话：选区变了 = 记一步「只改选区」（撤销也撤选区，user 10-27「这个我们要」；连续几下不合并，Blender 同款）。上下文变了（进 / 出组件）不算选区步，只刷新。 */
  private static sessionKey(s: Session): string { return JSON.stringify(s); }
  private _tool: Tool = "select";   // 开机 = 鼠标（选择）工具（user 10-27「硬建模默认也是鼠标工具」）
  private _revision = 0;                  // 场景每次变（commit/undo/redo/load/进出上下文）+1；碰撞世界等消费方据此重建

  // ---- 瞬态 ----
  private anchor3: Pt3 | null = null;
  private cursor3: Pt3 | null = null;
  private snapInfo: Snap3 | null = null;
  // 工具模块（tool-handler.ts 接缝；架构重构 2026-10-21）：有模块的工具走这里，其余仍在本文件的 case 里（Opus 票 3 逐个搬）
  /** 编辑模式（0.13 刀 ① / 刀 ③）：几何 / 表面；工具集 + 手势模块表住模式里；左上下拉框切（user「切换编辑模式还是左上下拉框」）。 */
  private readonly modeList: readonly Mode[] = [new GeometryMode(), new SurfaceMode(), new FreeformMode(), new VerifyMode()];
  private mode: Mode = this.modeList[0];
  get modeId(): ModeId { return this.mode.id; }
  /** 左上下拉框里的工作台 = 管活动池这种身体的那些（SU 体：硬表面建模 / 表面；网格体：自由建模）。 */
  modes(): readonly { id: ModeId; label: string }[] { const kind = this.activeKind(); return this.modeList.filter((m) => (m.kinds as readonly BodyKind[]).includes(kind)).map((m) => ({ id: m.id, label: m.label })); }
  /** 当前模式有哪些工具（左柱按它排）。 */
  modeTools(): readonly Tool[] { return this.mode.tools; }
  /** 某工具的手势模块（上下文条要碰工具自己的状态，如吸色锁定）。 */
  toolHandler(t: Tool): ToolHandler | undefined { return this.mode.handlers[t]; }
  /** 切模式：清手势；当前工具不在新模式里 → 换成它的默认工具；选区留着（面选区两边都认）。 */
  setMode(id: ModeId): void {
    return this.step((pass) => {
    const next = this.modeList.find((m) => m.id === id);
    if (!next || next === this.mode) return;
    if (!(next.kinds as readonly BodyKind[]).includes(this.activeKind())) { this.host.hint(`「${next.label}」管不了现在这个物件`); return; }   // 不变量：工作台管活动池的身体种类
    this.cancelGesture();
    this.mode.leave?.(this.toolCtx);
    this.openParamSession(null);   // 换工作台：马前炮 / 马后炮都收
    this.mode = next;
    this.mode.enter?.(this.toolCtx);
    if (!next.tools.includes(this._tool)) this._tool = next.defaultTool;
    this.last = null;
    this.clearCharged();
    this.host.changed();
    this.draw();
    });   // 一个用户动作 = 一步（2026-10-28：通行证逼出来的漏包入口）
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
  /** 网格体池的预演副本（自由建模工作台；brep 的影子是 live）。 */
  private liveMesh: MeshKernel | null = null;
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
  /** 步外提交的次数（应当永远是 0；探针 / 测试读它）。 */
  stepViolations = 0;
  private stepHasOp = false;
  /** 这一步已提交了几条 / 有没有失败过（一步 = 原子：中途有一条失败 → 这一步已提交的全部回滚、剩下的不再执行；2026-10-26）。 */
  private stepOps = 0;
  private stepFailed = false;
  private stepTouched = false;                   // 这一步里会话（选区 / 上下文）被写过（写口 clearSel / setCtx / afterSelect 标）
  private stepBefore: Session | null = null;     // 这一步开始前的会话（手势按下时点选的那份延后到落定那一步）
  private stepLabel: StepLabel | undefined;      // 这一步的标签（提示行「撤销：建组」）
  private deferredBefore: Session | null = null; // 手势中改的选区：等手势落定那一步一起封（SU：按下选中 + 拖 = 一步）
  /** 数值小窗的默认长度单位（文档级单位设置落地前 = 出厂 m；后缀可覆盖）。 */
  /** A9 方向锁（user 2026-09-06 / 10-24「键盘小箭头控制axis，然后触屏上应该有对应的虚拟键」）：SU 同款 → X / ← Y / ↑ Z / ↓ 解锁；
   *  轴 = 上下文帧（绘图轴 / 组轴）的轴。生命周期 = 一次手势：手势结束 / 换工具 / Esc 就解。只对调用 ctx.applyLock 的工具生效（画线 / 移动 / 卷尺）。
   *  面锁（user 2026-10-25「Shift + 方向键锁平面、矩形工具的平面锁、触屏常驻三颗轴键。 要！」；键位 = ledger A9 的 Blender Shift+X 语义）：
   *  锁到「排除该轴」的平面 = 法向是该轴的面（Shift+→ YZ / Shift+← XZ / Shift+↑ XY / Shift+↓ 光标下那张膜的面）。
   *  先定平面的工具（矩形 / 圆 / 旋转矩形 / 弧 / 旋转 / 量角器，`lock: "plane"`）不吃方向锁：方向键直接锁平面（SU 旋转矩形「按方向键定平面」同款），
   *  平面过首点（ctx.lockedPlane）；沿轴走的工具（`lock: "axis"`）Shift+方向键 = 点投到过锚点的那张面上（ctx.applyLock）。方向锁与面锁互斥。 */
  private _axisLock: LockAxis | null = null;
  private _planeLock: PlaneLock | null = null;
  private _planeLockN: Pt3 | null = null;   // 面锁法向（世界、单位长）；"face" 锁时 = 按下那一刻光标下那张膜的法向
  private lastPtr: { x: number; y: number } | null = null;
  /** 最近一次真指针的种类（键盘起手不算）：自由建模吸附的底按它查 SNAP_BASE。 */
  private lastPtrType = "mouse";
  /** 这次按下以后离按下处最远到过多远（点按容差的量纲；松手时判点 / 拖用）。 */
  private pressPeak = 0;
  private lastMoveEv: ToolPointer | null = null;   // Shift 按下 / 松开时按它重算（setShiftHeld）   // 最后一次指针位置（Shift+↓ 取光标下的膜用）
  get axisLock(): LockAxis | null { return this._axisLock; }
  get planeLock(): PlaneLock | null { return this._planeLock; }
  /** 当前工具吃哪种锁（null = 不吃锁：方向键 / 虚拟轴键无效）。 */
  lockStyle(): "axis" | "plane" | null { return this.handlers[this._tool]?.lock ?? null; }
  setAxisLock(a: LockAxis | null): void {
    if (this._axisLock === a && this._planeLock === null) return;
    this._axisLock = a; this._planeLock = null; this._planeLockN = null;
    this.host.hint(a ? `方向锁 ${a.toUpperCase()}（再按同一个方向键或 ↓ 解锁）` : null);
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
  /**
   * 先按好锁、对下一下生效（自由建模的 X / Y / Z 在手势之外；user 10-28「然后移动的时候能不能x y z 这种设置锁轴？就是先按y的话可以对下一个操作生效」）：
   * 不看当前工具（拿着选择工具先按 Y、再按 S 也算）；Shift = 锁面；再按同一个 = 解；下一下落定 / Esc / 取消 = 解（同手势里的锁）。
   */
  armLock(axis: LockAxis, plane: boolean): void {
    if (plane) this.togglePlaneLock(axis); else this.toggleAxisLock(axis);
    const on = plane ? this._planeLock === axis : this._axisLock === axis;
    if (on) this.host.hint(`${plane ? `面锁 ${planeLockLabel(axis)}` : `方向锁 ${axis.toUpperCase()}`}：下一下移动 / 旋转 / 缩放 / 挤出生效（再按一次解锁，Esc 也解）`);
  }
  /** 方向键 / 触屏虚拟轴键的唯一入口：axis = 键对应的轴（→ X / ← Y / ↑ Z），null = ↓；plane = Shift。按当前工具的锁种分派。 */
  lockKey(axis: LockAxis | null, plane: boolean): void {
    const style = this.lockStyle();
    if (!style) { this.host.hint("这把工具没有方向锁 / 面锁"); return; }
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
  /** 锁的事后约束（求解器本身不动，排序规则归 Fable）：方向锁 → lockToAxis；面锁 → lockToPlane；没锁 = 原样。 */
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
    return { p, kind: `axis-${ax}` as SnapKind, label: `方向锁 ${ax.toUpperCase()}${strong ? " · 从点" : ""}`, hints: [{ a: anchor, b: p, axis: ax }, ...(strong ? [{ a: sn.p, b: p, axis: "i" as const }] : [])] };
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
    this.r3 = new Renderer3(canvas, perf); this.provider = new EditorStreamProvider(() => this.r3.lineStyleInUse() === "thick"); this.r3.setProvider(this.provider);
    this.cam.pitch = 0.61;
    this.cam.projection = "persp";
  }

  // ---------- 只读 ----------
  get tool(): Tool { return this._tool; }
  /** 活动池的内核（上下文所在的几何池；根上下文 = 根池）。 */
  get kernel(): Kernel { return this.scene.kernelOf(this.activePool()); }
  /** 活动池的身体种类（选区的 id 空间、工作台、指令的单位种类都跟它走；2026-10-27 接缝）。 */
  activeKind(): BodyKind { return this.scene.kindOf(this.activePool().def); }
  /** 你所在的这一层自己有没有几何（不算子组件）：工作台下拉换种类时，空的直接转、有东西的先问（main.ts pickWorkbench）。 */
  layerHasGeometry(): boolean { return this.activeView.vertices().length > 0; }
  /** 某个定义的身体种类（物体窗口：对称只有网格体有）。 */
  kindOfDef(def: number): BodyKind { return this.scene.kindOf(def); }
  /** 活动池的显示视图（渲染 / 拾取读的那份契约 kernel-view.ts；任何种类的内核都有——选区的通用路径只认它）。 */
  private get activeView(): KernelView { return this.scene.viewOf(this.activePool()); }
  /** 按活动池的种类造空选区（不变量：selection.kind === activeKind()）。 */
  private blankSelection(): Selection { return emptySelection(this.activeKind()); }
  /** brep 专属动词的守门：活动池不是 SU 体 → 提示一句、不做（网格体上的同名动词 = 自由建模工作台 M4）。不静默。 */
  private requireBrep(verb: string): boolean {
    if (this.activeKind() === "brep") return true;
    this.host.hint(`「${verb}」是硬表面体的动词；网格体上的还没接（自由建模工作台）`);
    return false;
  }
  /**
   * 不变量 I5：工作台管得了活动池的身体种类（2026-10-28；user「想一下深层次的原因，为什么工作台没有跟着物体」「然后多码几层瑞士奶酪」）。
   * 根：「人在哪」和「用哪个工作台」是两份状态，以前靠每个改「人在哪」的入口事后自觉补一句 → 「打开模型」漏了（黑匣子「definition 1 body is "brep", not mesh」）。
   * 层 1：它住在「人在哪 / 场景」的写口里面（setCtx / sessionRestore / bump / installScene / loadScene），不是调用方的事；
   * 层 2：守卫 test/step-pass-guard.test.ts 第五条——写 this.ctx / this.scene 的函数必须同一个函数里调它；
   * 层 3：画之前 checkModeFits 再查一次，对不上 = 当场纠正 + 黑匣子记一行 drift；层 4：撤销 fuzz 探针每步核对、带「重开模型」动作。
   * 只切工作台本身（不是用户的一步、不画、不通知；调用方之后自己画）。
   */
  private syncModeToKind(): void {
    const kind = this.activeKind();
    if ((this.mode.kinds as readonly BodyKind[]).includes(kind)) return;
    const next = this.modeList.find((m) => (m.kinds as readonly BodyKind[]).includes(kind));
    if (!next) return;
    this.cancelGesture();
    this.mode.leave?.(this.toolCtx);
    this.openParamSession(null);
    this.mode = next;
    this.mode.enter?.(this.toolCtx);
    if (!next.tools.includes(this._tool)) this._tool = next.defaultTool;
    this.last = null;
    this.clearCharged();
  }
  /** 层 3：画之前核对 I5；对不上 = 有入口绕过了写口（层 1 / 2 都漏了）→ 记一行、当场纠正。 */
  private checkModeFits(where: string): void {
    const kind = this.activeKind();
    if ((this.mode.kinds as readonly BodyKind[]).includes(kind)) return;
    this.host.trace?.({ kind: "drift", where, mode: this.mode.id, body: kind });
    this.syncModeToKind();
  }
  get sceneRef(): Scene { return this.scene; }
  worldGeom(): WorldView { return this.worldView(); }   // 全场景世界坐标只读几何（OBJ 导出 / 统计）
  /** 「导出模型 · 选中的物体」（导出设计稿 §4）：选中的组件实例（这一层里的；世界变换 = 这一层的变换 ∘ 实例的变换）。没选组件 = 空。 */
  exportPicks(): { def: number; xform: Xform; name: string }[] {
    const s = this.scene, ctxDef = s.defOfContext(this.ctx), X = this.ctxXform(), out: { def: number; xform: Xform; name: string }[] = [];
    for (const p of this.selectedPools.values()) { if (p.kind !== "instance") continue; const inst = s.def(ctxDef).instances.get(p.instance); if (inst) out.push({ def: inst.def, xform: compose(X, inst.xform), name: inst.name ?? s.def(inst.def).name }); }
    return out;
  }
  get context(): EditContext { return this.ctx; }
  get renderer3(): Renderer3 { return this.r3; }
  get revision(): number { return this._revision; }
  canUndo(): boolean { return this.history.canUndo(); }
  canRedo(): boolean { return this.history.canRedo(); }
  hasSelection(): boolean { return this.selection.edges.size > 0 || this.selection.faces.size > 0 || this.selection.verts.size > 0 || guidesOf(this.selection).size > 0 || this.selectedPools.size > 0; }
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
  private worldView(live: KernelView | null = null, override: { picks: PoolPick[]; xform: Xform; copy?: boolean } | null = null): WorldView {
    // 复制模式：原件不动；副本当「副本槽」画出来（DT14，此前副本要到 commit 才出现 = 没预演）
    const copy = override?.copy ? override : null;
    if (copy) override = null;
    const keyOf = (o: { picks: PoolPick[]; xform: Xform }): string => `${o.picks.map((p) => (p.kind === "group" ? `g${p.group}` : `i${p.instance}`)).join(",")}:${o.xform.map((v) => v.toFixed(9)).join(",")}`;
    const ovKey = override ? keyOf(override) : copy ? `copy:${keyOf(copy)}` : "";
    const grid = this.gridEff ? { step: this._grid.step, sub: this._grid.subdiv, frame: gridFrame(this.scene.frameOfContext(this.ctx), this._grid.plane) } : null;
    // 影子的 rev 也进键（2026-10-27 Claude Opus 5.5；user「拖动矩形的时候显示也不对，有退化」「move的显示也有问题」）：v0.15.14 起预演影子同一个对象每帧倒回复用，
    // 只按对象身份当键 = 拖动中一直拿到第一帧的合成视图、渲染器的重建键也不变 → 屏幕停在旧的那帧。
    const key = `${this._revision}|${live ? `${this.kid(live)}.${live.rev}` : 0}|${this.ctxKey()}|${ovKey}|${grid ? `${grid.step}/${grid.sub}` : ""}|${this._isolate ? "iso" : ""}`;
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
      if (inHand.has(key) || p.kind !== "instance") continue;   // 组不配有原点（DT86，user「组不是物体只是管理sticky geometry用的」）：没有小三轴、不当原点吸、变换中心按包围盒
      out.push(this.scene.originOfChain([...this.ctx.chain, p.instance]));
    }
    return out;
  }
  private poolOrigins(view: WorldView): Pt3[] { return this.selectedPoolFrames(view).map((f) => f.origin); }
  /** 组件里坐标架另摆了（和组件原点不在一处 / 朝向不同）→ 原点处画淡小三轴（DT86 披露「现在是两个」）；进组时比的是组的坐标架。 */
  private originMarker(): Frame[] | null {
    if (!this.contextDepth()) return null;
    const o = this.scene.originOfChain(this.ctx.chain), f = this.contextFrame();
    const near = (a: Pt3, b: Pt3): boolean => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-9;
    return near(o.origin, f.origin) && near(o.x, f.x) && near(o.y, f.y) && near(o.z, f.z) ? null : [o];
  }
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
      const wpp = worldPerPx(pf, vp, o);   // 和渲染画标记的换算同一个（不按轴方向量）
      for (const u of [em.frame.x, em.frame.y, em.frame.z]) {
        const s1 = wpp ? pf.project?.(add3(o, scale3(u, POOL_AXES_PX * wpp)), vp) : null;
        if (s1) d = Math.min(d, distToSegment(q, s0, s1));
      }
      if (d <= r && d < bd) { bd = d; best = em.pick; }
    }
    return best ? { pick: best, key: this.pickKey(best) } : null;
  }
  /** 屏幕框里的空组件标记（原点投影在框里）。 */
  private emptiesIn(area: ScreenArea): { pick: PoolPick; key: string }[] {
    const pf = this.frame(), vp = this.fvp(), out: { pick: PoolPick; key: string }[] = [], inside = areaTest(area);
    for (const em of this.emptyMarkers(this.liveWorld())) {
      if (!em.pick) continue;
      const s0 = pf.project?.(em.frame.origin, vp);
      if (s0 && inside(s0)) out.push({ pick: em.pick, key: this.pickKey(em.pick) });
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
    if (!this.mode.tools.includes(t)) {   // 工具属于别的模式（快捷键 B 在几何模式按了油漆桶）→ 先切过去；只切到管活动池这种身体的工作台（网格体里按画线键不能切进硬表面建模）
      const kind = this.activeKind(), owner = this.modeList.find((m) => m.tools.includes(t) && (m.kinds as readonly BodyKind[]).includes(kind));
      if (!owner) { const any = this.modeList.find((m) => m.tools.includes(t)); if (any) this.host.hint(`「${this.mode.label}」工作台里没有这把工具（它在「${any.label}」里，管的是别的物件）`); return; }
      this.setMode(owner.id);
    }
    this.last = null;
    if (this.param?.phase === "after") { this.openParamSession(null); this.host.hint("刚才那一步的参数已收起（换了工具）"); }   // 马后炮寿命 = 栈顶没变 ∧ 工具没换 ∧ 没撤销过（设计稿 §7 第 4 条；user「切换工具…还是显示着“刚才”」）
    this._tool = t;
    this.originEdit = null;   // 改组件原点会话随换工具结束（beginComponentOrigin 在换完之后才开）
    // 手势之外先按好的锁（armLock：「下一下」生效）跟着换工具留下来——先按 Y 再按 S / 换移动工具，锁照样作用在那一下（2026-10-28）
    const armed = this.gestureActive() ? null : { a: this._axisLock, p: this._planeLock, n: this._planeLockN };
    this.cancelGesture();
    if (armed) { this._axisLock = armed.a; this._planeLock = armed.p; this._planeLockN = armed.n; }
    this.clearCharged();   // 充能生命周期 = 工具子步（user 2026-10-24）：换工具就清
    this.host.changed();
    this.draw();
  }

  cancel(): void {
    if (this.gizmo) { this.openParamSession(null); this.host.hint("镜像已取消"); return; }   // 镜像会话里 Esc = 取消镜像（选区留着）
    if (this.liveOriginEdit()) { const t = this.originEdit!.prevTool; this.setTool(t); this.host.hint("改组件原点：取消了"); return; }   // 选区留着
    this.taps.cancel();
    this.last = null;
    this.step((pass) => { this.clearSel(pass); this.cancelGesture(); this.host.changed(); this.draw(); }, { title: "取消选择" });
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
    return this.step((pass) => {
    const m = invert(this.ctxXform());
    this.commitIn(pass, { op: "addGuide", at: this.activePool(), line: { p: this.toLocal(p), dir: normalize3(applyDir(m, dir)) } });
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  addGuidePoint(p: Pt3): void { return this.step((pass) => { this.commitIn(pass, { op: "addGuide", at: this.activePool(), point: this.toLocal(p) }); }); }
  eraseGuides(ids: readonly number[]): void { return this.step((pass) => { if (ids.length) this.commitIn(pass, { op: "eraseGuides", at: this.activePool(), ids: [...ids] }); }); }
  /** 清空活动池的参考几何（SU「删除参考线」同款）。 */
  clearGuides(): void { return this.step((pass) => { this.commitIn(pass, { op: "clearGuides", at: this.activePool() }); }); }
  hasGuides(): boolean { return guideCount(this.scene.guidesOf(this.activePool())) > 0; }
  /**
   * 搬坐标架（世界坐标帧进来；DT86，user「坐标架同意 组件原点同意」）：最外层 = 绘图轴；组里 = 组的坐标架；组件里 = 组件的坐标架——都不碰几何。
   * 「改组件原点」会话里（beginComponentOrigin）= 改那个组件的原点（挪几何、每份实例补，世界不动）。提示行说清这次动的是哪一个（默认 + 披露）。
   */
  setContextAxes(frame: Frame): void {
    return this.step((pass) => {
    if (this.liveOriginEdit()) { this.commitComponentOrigin(pass, frame); return; }
    const m = invert(this.ctxXform());
    const local: Frame = { origin: this.toLocal(frame.origin), x: normalize3(applyDir(m, frame.x)), y: normalize3(applyDir(m, frame.y)), z: normalize3(applyDir(m, frame.z)) };
    const at = this.activePool(), n0 = this.opCount;
    this.commitIn(pass, { op: "setDrawFrame", at, frame: local });
    if (this.opCount === n0) return;   // 没提交（定稿锁着 / 锁定）：commitOp 已经说了原因
    this.host.hint(at.group !== null ? "组里的坐标架已搬（几何没动）" : this.contextDepth() ? "组件里的坐标架已搬——组件原点没动；工具条「设为组件原点」可以把原点对过来" : "坐标架已搬（画图 / 网格 / 推断跟着它；几何没动）");
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  /** 坐标架工具点一下只换位置时沿用的朝向：平时 = 当前坐标架；改组件原点时 = 那个组件现在的原点。 */
  axesBase(): Frame {
    const E = this.liveOriginEdit();
    if (E) { const inst = this.scene.def(this.scene.defOfContext(this.ctx)).instances.get(E.instance); if (inst) return transformFrame(compose(this.ctxXform(), inst.xform), WORLD_FRAME); }
    return this.contextFrame();
  }
  /** 重置坐标架（工具条「重置坐标架」）：最外层 → 世界；组里 → 它所在那层的坐标架；组件里 → 跟组件原点。 */
  resetContextFrame(): void {
    return this.step((pass) => {
    const at = this.activePool(), n0 = this.opCount;
    this.commitIn(pass, { op: "setDrawFrame", at, frame: null });
    if (this.opCount === n0) return;
    this.host.hint(at.group !== null ? "组里的坐标架回到外面那层的" : this.contextDepth() ? "坐标架回到组件原点" : "坐标架回到世界");
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  /** 现在在组件里（不在组里）——「设为组件原点」按钮出不出。 */
  inComponentRoot(): boolean { return this.contextDepth() > 0 && this.ctx.group === null; }
  /** 一个组件在整个场景里放了几份（改原点 = 这么多份一起换，提示行披露）。 */
  private copiesOf(def: DefId): number { let n = 0; for (const d of this.scene.defs.values()) for (const i of d.instances.values()) if (i.def === def) n++; return n; }
  /**
   * 「设为组件原点」（DT86；user「比起被记住的开关我建议是一个可以随手按一下的按钮」）：把组件原点对到当前坐标架——
   * 挪几何、每份实例补（世界不动；user「原点挪几何，因为是低频commitment」），坐标架回到「跟原点」。一步撤销。
   */
  setComponentOriginToFrame(): boolean {
    return this.step((pass) => {
    if (!this.inComponentRoot()) return false;
    const at = this.activePool(), body = this.scene.brep(at.def);
    if (!body.drawFrame) { this.host.hint("坐标架就在组件原点上"); return false; }
    const f = body.drawFrame, n = this.copiesOf(at.def);
    return this.step((pass) => {
      const n0 = this.opCount;
      this.commitIn(pass, { op: "setAxes", at, frame: f });
      if (this.opCount === n0 || this.stepFailed) return false;
      this.commitIn(pass, { op: "setDrawFrame", at, frame: null });
      this.host.hint(`组件原点换到了坐标架（世界里没动；${n} 份一起换）`);
      this.host.changed(); this.draw();
      return true;
    });
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  /** 改组件原点会话（右键 / 顶部浮条「改组件原点…」）：坐标架工具的同一套点击，落定改的是这个组件。 */
  private originEdit: { instance: InstId; def: DefId; prevTool: Tool; ctx: string } | null = null;
  /** 会话还算数吗：换了一层（进 / 出组件、撤销回到别的上下文、新文档）= 作废。 */
  private liveOriginEdit(): { instance: InstId; def: DefId; prevTool: Tool; ctx: string } | null {
    if (this.originEdit && this.originEdit.ctx !== this.ctxKey()) this.originEdit = null;
    return this.originEdit;
  }
  /** 「改组件原点…」的对象：只选了一个 brep 组件（没有散几何）；没有 = null。 */
  private originEditTarget(): { p: PoolPick; inst: Instance } | null {
    if (this.selectedPools.size !== 1 || this.selection.faces.size || this.selection.edges.size || this.selection.verts.size) return null;
    const p = [...this.selectedPools.values()][0];
    if (p.kind !== "instance") return null;
    const inst = this.scene.def(this.scene.defOfContext(this.ctx)).instances.get(p.instance);
    return inst && this.scene.kindOf(inst.def) === "brep" ? { p, inst } : null;
  }
  /** 右键 / 顶部浮条出不出「改组件原点…」。 */
  canEditComponentOrigin(): boolean { const t = this.originEditTarget(); return !!t && !t.inst.locked; }
  /** 只选了一个组件（没有散几何）→ 开会话；否则 false。 */
  beginComponentOrigin(): boolean {
    const t = this.originEditTarget();
    if (!t) return false;
    const { p, inst } = t;
    if (inst.locked) { this.host.hint("已锁定：解锁后再改（选中它 → 解锁）"); return false; }
    const prevTool = this._tool;
    this.setTool("axes");
    this.originEdit = { instance: inst.id, def: inst.def, prevTool, ctx: this.ctxKey() };
    this.selectedPools.set(this.pickKey(p), p);   // 换工具不清选区；这里再确认一次：小三轴看得见
    this.host.hint(`改组件原点「${this.scene.def(inst.def).name}」：点新原点（${this.copiesOf(inst.def)} 份一起换；Esc 取消）`);
    this.host.changed(); this.draw();
    return true;
  }
  /** 会话落定：世界帧 → 那个组件的定义坐标 → setAxes（挪几何、每份实例补）；马后炮给现成位置（同建组件那套）；回到原来的工具。 */
  private commitComponentOrigin(pass: StepPass, frameWorld: Frame): void {
    const E = this.originEdit!;
    this.originEdit = null;
    const inst = this.scene.def(this.scene.defOfContext(this.ctx)).instances.get(E.instance);
    if (!inst) return;
    const Wi = invert(compose(this.ctxXform(), inst.xform));
    const picked: Frame = { origin: applyPt(Wi, frameWorld.origin), x: normalize3(applyDir(Wi, frameWorld.x)), y: normalize3(applyDir(Wi, frameWorld.y)), z: normalize3(applyDir(Wi, frameWorld.z)) };
    const at: PoolRef = { def: E.def, group: null }, n = this.copiesOf(E.def), name = this.scene.def(E.def).name;
    const go = (mode: string): boolean => {
      const o = mode === "picked" ? picked.origin : this.originPresetPoint(E.def, mode as OriginPreset);
      if (!o) return false;
      const k0 = this.opCount;
      this.commitIn(pass, { op: "setAxes", at, frame: { ...picked, origin: o } });
      return this.opCount !== k0;
    };
    const n0 = this.opCount;
    if (!go("picked")) { this.setTool(E.prevTool); return; }
    this.offerAfterthought(`改组件原点「${name}」`, [{ key: "where", def: { kind: "enum", label: "原点", values: [{ id: "picked", label: "刚才点的" }, ...ORIGIN_PRESETS] } }], { where: "picked" }, this.opCount - n0, (v) => { go(String(v.where)); });
    this.setTool(E.prevTool);
    const pick: PoolPick = { kind: "instance", instance: inst.id };
    this.selectedPools.set(this.pickKey(pick), pick);
    this.host.hint(`组件原点已换（世界里没动；${n} 份一起换）`);
    this.host.changed(); this.draw();
  }
  /** 组件原点的现成位置（定义坐标；建组件马后炮和改组件原点共用）：包围盒角 / 中心 / 底面中心 / 顶点平均。没内容 = null。 */
  private originPresetPoint(defId: DefId, mode: OriginPreset): Pt3 | null {
    const vs = this.scene.pointsOfDef(defId);   // 全部内容（散几何 + 装进来的组 / 组件）
    if (!vs.length) return null;
    let lo = { x: Infinity, y: Infinity, z: Infinity }, hi = { x: -Infinity, y: -Infinity, z: -Infinity }, sum = { x: 0, y: 0, z: 0 };
    for (const v of vs) { lo = { x: Math.min(lo.x, v.x), y: Math.min(lo.y, v.y), z: Math.min(lo.z, v.z) }; hi = { x: Math.max(hi.x, v.x), y: Math.max(hi.y, v.y), z: Math.max(hi.z, v.z) }; sum = add3(sum, v); }
    const c = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, z: (lo.z + hi.z) / 2 };
    return mode === "corner" ? lo : mode === "center" ? c : mode === "bottom" ? { x: c.x, y: c.y, z: lo.z } : scale3(sum, 1 / vs.length);
  }
  private cancelGesture(): void {
    this.host.softRing?.(null);   // 软选择的半径圈跟手势走
    this.anchor3 = null;
    this._axisLock = null; this._planeLock = null; this._planeLockN = null;   // 方向锁 / 面锁随手势解（换工具 / Esc / 取消）
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
    this.live = null; this.liveMesh = null;
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
    this.syncModeToKind();
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
  private selSnap(): SelSnap { return { ctx: this.ctxKey(), faces: [...this.selection.faces], edges: [...this.selection.edges], verts: [...this.selection.verts], guides: [...guidesOf(this.selection)], pools: [...this.selectedPools.entries()] }; }
  private selRestore(s: SelSnap | undefined): void {
    this.selection = this.blankSelection(); this.selectedPools.clear();   // 装场景路径：不是用户的写，不经写口
    if (!s || s.ctx !== this.ctxKey()) return;
    for (const f of s.faces) this.selection.faces.add(f);
    for (const e of s.edges) this.selection.edges.add(e);
    for (const v of s.verts) this.selection.verts.add(v);
    if (this.selection.kind === "brep") for (const g of s.guides) this.selection.guides.add(g);
    for (const [k, p] of s.pools) this.selectedPools.set(k, p);
    this.pruneSelection();
  }
  /** 用户的一个动作：fn 里提交的全部 op 并成一步（撤销 / 重做一次走完）。可嵌套（外层说了算）。 */
  private step<T>(fn: (pass: StepPass) => T, label?: StepLabel): T {
    if (this.stepDepth++ === 0) { this.mirrorNote = ""; this.mirrorNoteShown = false; this.mirrorDeferred = false; this.stepHasOp = false; this.stepOps = 0; this.stepFailed = false; this.stepTouched = false; this.stepBefore = this.deferredBefore ?? this.sessionSnap(); this.stepLabel = label; }
    else if (label && !this.stepLabel) this.stepLabel = label;
    try { return fn(STEP_PASS); }
    finally { if (--this.stepDepth === 0) this.closeStep(); }
  }
  /**
   * 一步结束时封账（设计稿 ai-docs/20261028-undo-step-regime.md §2 I1 / I4）：有 op 的步 → 把「之后」的会话封进栈顶那一步（重做回到它）；
   * 没 op 但写过会话的步 → 同一上下文里选区变了才记一条 0 op 的选区步（进 / 出组件不算，FM106）；手势中按下时的点选延后到落定那一步一起；失败的步 = 没这一步，会话也退回。
   * 以前（≤ v0.15.28）是事后对账：拿现在的选区和上次记的比——分不清「用户点了一下」和「建组做完顺手选中新组」，补出来的空步就是撤销「没反应」的根。
   */
  private closeStep(): void {
    this.typing.sync();   // 打的数一次手势一份 / 一步一份：去向变了就清（typed-input.ts）
    const before = this.stepBefore ?? this.sessionSnap(), label = this.stepLabel, touched = this.stepTouched, hadOp = this.stepHasOp && !this.stepFailed, failed = this.stepFailed, ops = this.stepOps;
    this.stepBefore = null; this.stepLabel = undefined; this.stepTouched = false;
    if (failed) { this.deferredBefore = null; this.sessionRestore(before); this.host.changed(); return; }
    if (hadOp) {
      this.deferredBefore = null;
      this.history.sealStep(this.sessionSnap(), label);
      this.host.trace?.({ kind: "step", label: this.history.topLabel()?.title ?? "", ops, session: touched });
      if (this.mirrorNote && !this.mirrorNoteShown) { this.host.hint(this.mirrorNote); this.mirrorNoteShown = true; }   // 工具拖动那条路也要披露（并点 / 夹住 / 对面找不到）
      return;
    }
    if (!touched && this.deferredBefore === null) return;
    if (this.gestureActive()) { this.deferredBefore ??= before; return; }
    this.deferredBefore = null;
    const after = this.sessionSnap();
    if (!Editor.sameCtx(before, after) || Editor.sessionKey(before) === Editor.sessionKey(after)) return;
    const L = label ?? { title: "选择" };
    this.history.commitSession(before, after, L);
    this.host.trace?.({ kind: "step", label: L.title, ops: 0, session: true });
    this.host.changed();
  }
  private static sameCtx(a: Session, b: Session): boolean { return a.ctx.group === b.ctx.group && a.ctx.chain.join("/") === b.ctx.chain.join("/"); }
  /** 会话（选区 + 上下文）的写口（设计稿 §2 I4）：只在一步里、带通行证；这一步结束时按「之前 / 之后」记进栈。守卫测试钉死：editor.ts 里 selection / selectedPools 的整体赋值、ctx 的赋值只准出现在写口和装场景的路径里。 */
  private clearSel(_pass: StepPass): void { this.selection = this.blankSelection(); this.selectedPools.clear(); this.stepTouched = true; }
  private setCtx(_pass: StepPass, ctx: EditContext): void { this.ctx = ctx; this.stepTouched = true; this.syncModeToKind(); }

  /** 对外的提交口（探针 / 脚本 / 测试；`api` 放置的指令也走它）：一次调用 = 一步。编辑器内部不许调它（守卫测试 test/step-pass-guard.test.ts）——内部一个动作里的几条 op 要同一张通行证进 commitIn，不然拆成好几步撤销。 */
  commitOp(op: Op): FaceEvent[] { return this.step((pass) => this.commitIn(pass, op)); }
  // ---------- 镜像（编辑方式那一层；纪元账本 FM23 / FM39 / FM134 / FM136；纯几何 = mesh/mirror.ts）----------
  // 设置按网格体定义记（不进撤销、还没存进文件）。镜像编辑 = 挪点补上对面（提交前改写 op、预演同一道）；强行对称 = 这一步做完同一步里补一条
  // meshSymmetrize（动了哪边哪边为准）；镜像编辑开着时改拓扑 = 护栏：直说、给「关掉镜像，照做 / 取消」（user「护栏？直接说要么关了自己决定要不要对齐」）。
  /** 网格体的「对称」属性表 = 场景的那张（Scene.meshMirrors：随文件走、克隆共享 = 不进撤销）。 */
  private get mirrors(): Map<number, MirrorSetting> { return this.scene.meshMirrors; }
  private mirrorLastSide = new Map<number, -1 | 1>();
  /** 这一步里镜像想说的话（对面找不到的点 / 这一步没对称）：接在这一下的提示后面。 */
  private mirrorNote = "";
  /** 护栏把这一下工具的提交挡下来在等确认：这一下工具自己的提示 / 选区不作数（不谎报「挤出了」）。 */
  private mirrorDeferred = false;
  /** 正在提交镜像并点（落到中缝的点和孪生点并成一个的 meshMerge）：这几条不各自触发对称化，等整步最后那一次。 */
  private mirrorMerging = false;
  /** 这一步的镜像披露（并点 / 夹住 / 对面找不到）已经进提示行了吗：指令自己拼进去的算，没拼的步结束时补一条（工具拖动那条路）。 */
  private mirrorNoteShown = false;
  // 镜像下每条 op / 动作归哪一类 = mesh/mirror-ops.ts 的分类表（守卫 test/mirror-ops.test.ts 逼新 op 登记；F-113 审计 2026-10-28 晚）；这里只按类取集合
  private static readonly MIRROR_TOPO = new Set<Op["op"]>(opsOfClass("topo"));
  private static readonly MIRROR_TOPO_ACTIONS = MIRROR_TOPO_ACTIONS;
  private static readonly NO_SYMMETRIZE = new Set<Op["op"]>(opsOfClass("meta"));
  /** 网格体的「对称」属性：缺 def = 正在编辑的那个（不在网格体里 = null）；给 def = 那个网格体（物体窗口里设子物体的）。 */
  mirrorOf(def?: number): MirrorSetting | null {
    const d = def ?? (this.activeKind() === "mesh" ? this.activePool().def : undefined);
    return d !== undefined && this.scene.kindOf(d) === "mesh" ? this.mirrors.get(d) ?? null : null;
  }
  /** 开 / 关 / 换轴（mode = null 关）。开强行对称 = 马上对称一次（一步，可撤销）。缺 def = 正在编辑的网格体。 */
  setMirror(mode: MirrorMode | null, axis?: MirrorAxis, defIn?: number): void {
    const def = defIn ?? (this.activeKind() === "mesh" ? this.activePool().def : undefined);
    if (def === undefined || this.scene.kindOf(def) !== "mesh") { this.host.hint("对称：只有网格体有这个属性"); return; }
    const ax = axis ?? this.mirrors.get(def)?.axis ?? 0, A = "XYZ"[ax];
    if (!mode) { this.mirrors.delete(def); this._revision++; this.host.hint("镜像：关"); this.host.changed(); this.draw(); return; }
    this.mirrors.set(def, { mode, axis: ax }); this._revision++;   // 属性进文件了（CATSUP_mesh 1.2）：算改动，存盘钮要亮
    if (mode === "edit") {
      const lone = [...mirrorPairs(this.scene.mesh(def).kernel, ax).values()].filter((w) => w < 0).length;
      this.host.hint(`镜像编辑：开（${A} 轴；挪点时对面的点一起镜，中缝上的点钉在镜像面上；改拓扑的操作不镜）${lone ? `——${lone} 个点对面找不到（镜像面在这个物体自己的原点上，模型对它不对称），挪它们只改这一边。模型偏在一边：全选、右键「设置原点到选择中心」把镜像面挪到中间；只是歪了一点：右键「镜像 › 对称对齐」` : ""}`);
    } else this.symmetrizeNow(def, ax);
    this.host.changed(); this.draw();
  }
  /** 选区重心在镜像面哪一边（没选区 / 正好在面上 = null）。 */
  private selectionSide(def: number, ax: MirrorAxis): -1 | 1 | null {
    if (this.selection.kind !== "mesh") return null;
    const m = this.scene.mesh(def).kernel, vs = new Set<number>(this.selection.verts);
    for (const e of this.selection.edges) if (m.hasE(e)) { vs.add(m.edgeA[e]); vs.add(m.edgeB[e]); }
    for (const f of this.selection.faces) if (m.hasF(f)) for (const v of m.faceVerts(f)) vs.add(v);
    let c = 0; for (const v of vs) if (m.hasV(v)) c += coordOf(m.pt(v), ax);
    return c > MIRROR_TOL ? 1 : c < -MIRROR_TOL ? -1 : null;
  }
  private symmetrizeNow(def: number, ax: MirrorAxis): void {
    return this.step((pass) => {
      const m = this.scene.mesh(def).kernel, A = "XYZ"[ax];
      if (isSymmetric(m, ax)) { this.host.hint(`强行对称：开（${A} 轴；已经是对称的）——以后每一步都会对称，动了哪边哪边为准`); return; }
      const side = this.selectionSide(def, ax) ?? this.mirrorLastSide.get(def) ?? 1, r = this.trySymmetrize(m, ax, side);
      if (!r) { this.host.hint(`强行对称：开，但有面跨过镜像面、而且一刀劈不开（凹的面）：先在中缝上手动切一刀；在那之前每一步都不对称`); return; }
      this.mirrorLastSide.set(def, side);
      this.commitIn(pass, { op: "meshSymmetrize", def, axis: ax, side });
      this.host.hint(`强行对称：开（${A} 轴，以 ${side > 0 ? "+" : "−"}${A} 那半为准；${r.cutEdges ? `沿镜像面切开了 ${r.cutEdges} 条边、` : ""}另一半删了 ${r.removedFaces} 张面、镜过来 ${r.added} 张面）——以后每一步都会对称`);
    }, { title: "强行对称" });
  }
  /** 在副本上试一次对称（会先沿镜像面切开）：成了 = 结果（切了几条边、删了 / 镜了几张面，说给人听），劈不开 = null。 */
  private trySymmetrize(m: MeshKernel, ax: MirrorAxis, side: -1 | 1): SymmetrizeResult | null {
    try { return symmetrize(m.clone(), ax, side); } catch { return null; }
  }
  /**
   * 挪点在镜像下的纪律（两种模式；设计稿 `ai-docs/20261028-mirror-redo-design.md` §1）：中缝上的点钉住、想穿过去的夹在面上、落到中缝的和孪生点并成一个；
   * 镜像编辑另外补上对面的点、手标补上对面的边。提交前改写；进日志的是改写后的 op = 重放一致；并点作为同一步里紧跟的 meshMerge 提交（commitIn）。
   */
  private mirrorRewrite(op: Op): { op: Op; merges: MirrorMovesResult["merges"] } {
    if (op.op !== "meshMove" && op.op !== "meshEdgeMarks") return { op, merges: [] };
    const ms = this.mirrors.get(op.def);
    if (!ms) return { op, merges: [] };
    const m = this.scene.mesh(op.def).kernel;
    if (op.op === "meshMove") {
      const r = mirrorMoves(m, op.moves, ms.axis, ms.mode), notes: string[] = [];
      if (r.unpaired && ms.mode === "edit") notes.push(`${r.unpaired} 个点对面找不到，只改了这一边（右上角镜像方片是橙的 = 模型对镜像面不对称）`);
      if (r.clamped) notes.push(`${r.clamped} 个点想穿过镜像面，停在了中缝上`);
      if (r.merges.length) notes.push(`${r.merges.length} 处在中缝上并成一个点`);
      if (notes.length) this.mirrorNote = `${ms.mode === "edit" ? "镜像编辑" : "强行对称"}：${notes.join("；")}`;
      return { op: { ...op, moves: r.moves }, merges: r.merges };
    }
    if (ms.mode !== "edit") return { op, merges: [] };
    const p = mirrorPairs(m, ms.axis), es = new Set(op.edges);
    for (const e of op.edges) { const a = p.get(m.edgeA[e]) ?? -1, b = p.get(m.edgeB[e]) ?? -1; if (a >= 0 && b >= 0 && a !== b) { const t = m.edgeOf(a, b); if (t >= 0) es.add(t); } }
    return { op: { ...op, edges: [...es].sort((x, y) => x - y) }, merges: [] };
  }
  private mirrorForceBefore(op: Op): MeshKernel | null {
    if (this.mirrorMerging || !op.op.startsWith("mesh") || !("def" in op) || Editor.NO_SYMMETRIZE.has(op.op)) return null;
    const ms = this.mirrors.get((op as { def: number }).def);
    return ms && ms.mode === "force" ? this.scene.mesh((op as { def: number }).def).kernel.clone() : null;
  }
  private mirrorForceAfter(pass: StepPass, op: Op, before: MeshKernel): void {
    const def = (op as { def: number }).def, ms = this.mirrors.get(def);
    if (!ms) return;
    const m = this.scene.mesh(def).kernel;
    if (isSymmetric(m, ms.axis)) return;
    const side = sideOfChange(before, m, ms.axis) || this.mirrorLastSide.get(def) || 1;
    if (!this.trySymmetrize(m, ms.axis, side)) { this.mirrorNote = "强行对称：有面跨过镜像面、而且一刀劈不开（凹的面），这一步没对称（先在中缝上手动切一刀）"; return; }
    this.mirrorLastSide.set(def, side);
    this.commitIn(pass, { op: "meshSymmetrize", def, axis: ms.axis, side });
  }
  /** 预演同一道：影子上做同一套挪点纪律（钉 / 不穿 / 并；镜像编辑补对面）——拖到中缝眼睛看到的就是并好的样子，松手前拖回去 = 影子从真身重算、自然分开；强行对称再把影子对称一遍（真身不动）。 */
  private mirrorPreview(def: number, base: MeshKernel, c: MeshKernel): void {
    const ms = this.mirrors.get(def);
    if (!ms) return;
    const moves: { v: number; to: Pt3 }[] = [];
    for (const v of c.verts()) if (base.hasV(v)) { const p = c.pt(v), q = base.pt(v); if (p.x !== q.x || p.y !== q.y || p.z !== q.z) moves.push({ v, to: p }); }
    if (moves.length) {
      const r = mirrorMoves(base, moves, ms.axis, ms.mode);
      for (const mv of r.moves) if (c.hasV(mv.v)) c.setPos(mv.v, mv.to);
      for (const mg of r.merges) { const ids = [mg.keep, ...mg.drop].filter((v) => c.hasV(v)); if (mg.split && c.hasE(mg.split.edge)) ids.push(splitEdge(c, mg.split.edge, mg.split.t)); if (ids.length >= 2) mergeVerts(c, ids, mg.at); }
    }
    if (ms.mode === "edit" || isSymmetric(c, ms.axis)) return;
    const probe = c.clone();
    try { symmetrize(probe, ms.axis, sideOfChange(base, c, ms.axis) || this.mirrorLastSide.get(def) || 1); c.swapWith(probe); } catch { /* 劈不开：预演照原样（提交时会说） */ }
  }
  /** 镜像编辑开着、这一下要改拓扑：直说，「关掉镜像，照做」/ 取消（不硬拦）。挡下来了 = true（确认了再在新的一步里提交同一条 op）。 */
  private mirrorBlocks(op: Op): boolean {
    if (!Editor.MIRROR_TOPO.has(op.op) || !this.host.confirm) return false;
    const def = (op as { def: number }).def, ms = this.mirrors.get(def);
    if (!ms || ms.mode !== "edit") return false;
    this.mirrorDeferred = true;
    const what = opLabel(op).title;
    void this.mirrorAsk(what).then((ok) => {
      if (!ok) return;
      this.mirrors.delete(def);
      this.step((pass) => this.commitIn(pass, op), { title: what });
      this.host.hint(`镜像已关，「${what}」照做了（只改了这一边；要对齐用右键「镜像 › 对称对齐」，要两边一起长用「强行对称」）`);
      this.host.changed(); this.draw();
    });
    return true;
  }
  private mirrorAsk(what: string): Promise<boolean> {
    return this.host.confirm!("镜像编辑开着", `「${what}」会改拓扑。镜像编辑只镜挪点、不镜它：照做的话只改这一边。要两边一起长，换成「强行对称」。`, "关掉镜像，照做")
      .then((ok) => { if (!ok) this.host.hint(`「${what}」没做（镜像编辑开着）`); return ok; });
  }
  /** 右键指令 / 删除的同一道护栏（入口处问，问完从头再来一次）。 */
  private mirrorGateEntry(what: string, again: () => void): boolean {
    const ms = this.mirrorOf();
    if (!ms || ms.mode !== "edit" || !this.host.confirm) return false;
    const def = this.activePool().def;
    void this.mirrorAsk(what).then((ok) => { if (ok) { this.mirrors.delete(def); again(); } });
    return true;
  }
  /** 中缝上的点（自由建模、开着镜像时）。镜像面本身不画在模型上（2026-10-28 user「这边镜像面也不应该随着内容变大。其实我倾向于不画。可以画在gizmos之类的上面。
   *  而不要干扰用户观察建模。自由建模模型上的干扰需要少一点」）：开没开、哪根轴、对不对得上 = mirrorIndicator → 右上角视图 gizmo。 */
  private mirrorView(view: WorldView, g: (id: number) => number): { key: string; seam: Pt3[] } | null {
    const ms = this.mode.id === "freeform" && !this.cmdPreview ? this.mirrorOf() : null;
    if (!ms) return null;
    const m = this.scene.mesh(this.activePool().def).kernel, ax = ms.axis, seam: Pt3[] = [];
    for (const v of m.verts()) if (Math.abs(coordOf(m.pt(v), ax)) <= MIRROR_TOL) { const gv = g(v); if (view.graph.hasVertex(gv)) seam.push(view.graph.pt(gv)); }
    return { key: `${this.kid(view)}|${ax}|${ms.mode}`, seam };
  }
  private mirrorIndCache: { key: string; unpaired: number } | null = null;
  /**
   * 镜像的状态（给右上角视图 gizmo 画）：镜像面的法线和面内两根轴（世界方向，跟着物体自己的轴）+ 几个点对面找不到（> 0 = 镜像编辑挪它们只改一边，
   * 2026-10-28 user「镜像编辑还是坏的」：模型不对称于镜像面时以前只在状态行闪一句）。不在网格体里 / 没开 = null。
   */
  mirrorIndicator(): { mode: MirrorMode; axis: MirrorAxis; normal: Pt3; span: [Pt3, Pt3]; unpaired: number } | null {
    const ms = this.mode.id === "freeform" ? this.mirrorOf() : null;
    if (!ms) return null;
    const def = this.activePool().def, m = this.scene.mesh(def).kernel, X = this.ctxXform(), ax = ms.axis;
    const dir = (i: number): Pt3 => normalize3(applyDir(X, { x: i === 0 ? 1 : 0, y: i === 1 ? 1 : 0, z: i === 2 ? 1 : 0 }));
    const key = `${def}|${m.rev}|${ax}`;
    if (this.mirrorIndCache?.key !== key) this.mirrorIndCache = { key, unpaired: [...mirrorPairs(m, ax).values()].filter((w) => w < 0).length };
    return { mode: ms.mode, axis: ax, normal: dir(ax), span: [dir((ax + 1) % 3), dir((ax + 2) % 3)], unpaired: this.mirrorIndCache.unpaired };
  }

  /** 工具边界（ToolCtx）的通行证：工具拿不到通行证，它们只在包好的指针事件里被调；这里按运行时发——真在步外被调，commitOp 的运行时检查会抓（黑匣子 + stepViolations）。全文件只有这里和 step() 碰 STEP_PASS（守卫测试 test/step-pass-guard.test.ts）。 */
  private toolPass(): StepPass { return STEP_PASS; }
  private toolCommit(op: Op): FaceEvent[] { return this.mirrorBlocks(op) ? [] : this.commitIn(this.toolPass(), op); }
  /** 所有改场景的用户手势走这里：记账（op 日志，按坐标寻址）+ 应用。 */
  private commitIn(pass: StepPass, op0: Op): FaceEvent[] {
    if (this.stepDepth === 0) {   // 通行证被闭包带到步外来用（编译期拦不住的那一种）：照样包成一步做完，但记进黑匣子 + 控制台，测试 / 探针据此抓
      this.stepViolations++;
      this.host.trace?.({ kind: "fail", where: "commit", op: op0, message: "op committed outside a step (StepPass leaked)" });
      console.error("[editor] op committed outside a step:", op0.op);
      return this.step((p) => this.commitIn(p, op0));
    }
    // 工作流亚种（DT87）的唯一口：挪点自动折出的折缝带哪些边层，写进 op（日志重放一致），不靠全局状态。
    // 自由建模工作台 = 折线；其余（SketchUp 式）= **硬边、看得见**（user 2026-10-27 先说改软 + 平滑、同日改回：「因为看不见的东西很谜语人，我们的披露原则」「我想了下还是折硬边」「就像折纸一样。你会先画一道」；SketchUp 的自动折缝也是可见硬边——新手常问「一挪点面上怎么多了条斜线」）。v0.15.2 曾默认软 + 平滑，v0.15.3 撤回。Claude Fable 5.1
    const rw = this.mirrorRewrite(op0.op === "move" && !op0.creaseLayers && this.mode.workflow?.autofold === "fold" ? { ...op0, creaseLayers: ["fold"] } : op0), op: Op = rw.op;   // 镜像：挪点的纪律（钉 / 不穿 / 并；镜像编辑补对面，FM134 / UX31）
    if (this._locked) { this.lockedSay(); this.host.trace?.({ kind: "fail", where: "commit", op, message: "locked (presentation)" }); return []; }
    if (this.opTouchesLocked(op)) { this.host.hint("已锁定：解锁后再改（选中它 → 解锁）"); this.host.trace?.({ kind: "fail", where: "commit", op, message: "locked (object)" }); return []; }
    if (this.stepDepth > 0 && this.stepFailed) return [];   // 这一步前面已经失败并回滚了：剩下的不再执行（不留半截）
    const t0 = performance.now();
    const join = this.stepDepth > 0 && this.stepHasOp, before = join ? undefined : (this.stepBefore ?? this.sessionSnap());   // 新的一步：它之前的会话（步开始时记的；手势按下时点选的那份延后进来）
    const label = join ? undefined : (this.stepLabel ?? opLabel(op));
    const symBefore = this.mirrorForceBefore(op);   // 强行对称：这一步之前的样子（判「动了哪边」）
    let r: ReturnType<History["commit"]>;
    try { r = perf.time("commit", () => this.history.commit(this.scene, op, join, before, label)); }
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
    if (rw.merges.length && op.op === "meshMove") {   // 落到中缝的点和孪生点并成一个：同一步里紧跟着提交（写进日志 = 重放一致；对称化等并完才跑）
      this.mirrorMerging = true;
      try { for (const mg of rw.merges) { this.commitIn(pass, { op: "meshMerge", def: op.def, verts: [mg.keep, ...mg.drop], to: mg.at, ...(mg.split ? { split: mg.split } : {}) }); if (this.stepFailed) return []; } }
      finally { this.mirrorMerging = false; }
    }
    if (symBefore) this.mirrorForceAfter(pass, op, symBefore);   // 同一步里补一条对称（撤销一下 = 一起撤）
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
    this.syncModeToKind();
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
    this.syncModeToKind();
    this.revalidateCharged();
  }
  private pruneSelection(): void {
    if (this.selection.kind !== this.activeKind()) this.selection = this.blankSelection();   // 上下文换了身体种类（撤到转换之前 / 之后）：旧 id 空间作废
    const v = this.activeView;
    for (const e of [...this.selection.edges]) if (!v.graph.hasEdge(e)) this.selection.edges.delete(e);
    for (const f of [...this.selection.faces]) if (!v.face(f)) this.selection.faces.delete(f);
    for (const x of [...this.selection.verts]) if (!v.graph.hasVertex(x)) this.selection.verts.delete(x);
    const def = this.scene.defOfContext(this.ctx);
    for (const [key, p] of [...this.selectedPools]) {
      const ok = p.kind === "group" ? this.scene.def(def).body.kind === "brep" && this.scene.brep(def).groups.get(p.group)?.parent === this.ctx.group : this.scene.def(def).instances.get(p.instance)?.parent === this.ctx.group;
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
      if (!this.scene.hasPool(pool) || this.scene.kindOf(pool.def) !== "brep") return null;
      const k = this.history.beforeLastOp(pool) ?? (this.history.log()[pos - 1] && SKELETON_ONLY.has(op.op) ? this.scene.kernelOf(pool) : null);   // 按记录倒推，不重放指令流（v0.15.32）
      if (!k) return null;
      return { op, brep: k.toBrep(), pool };
    } catch { return null; }
  }

  undo(): void {
    this.last = null;
    if (this.gestureActive()) { this.cancelGesture(); this.host.hint(null); this.host.changed(); this.draw(); return; }
    if (this._locked) { this.lockedSay(); return; }
    const r = this.history.undo();
    if (!r) { const n = this.history.evictedSteps(); this.host.hint(n ? `撤到头了（更早的 ${n} 步超过 128 MB 配额，撤不回去）` : "没有可撤销的"); return; }
    this.deferredBefore = null;
    this.installScene(r.scene, r.before);   // 撤销 = 回到这一步之前：场景 + 在哪个组件里 + 选区一起（先装好，再碰界面）
    this.openParamSession(null);   // 马后炮 / 马前炮跟着那一步走：撤了就关（不然再改值会撤错一步）
    this.cancelGesture();
    this.host.trace?.({ kind: "undo", position: this.history.position(), depth: this.history.depth() });
    this.host.hint(`撤销：${labelText(r.label)}`);   // user 10-28「undo redo的时候信息应该有显示都做了啥，还是失败了」
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
      if (err instanceof OpApplyError) this.installScene(err.restored, this.sessionSnap());   // 场景和会话一起回到重做前（§2 乱用表）
      this.host.trace?.({ kind: "fail", where: "redo", op: null, message: cause instanceof Error ? cause.message : String(cause) });
      this.host.hint(`重做失败：${cause instanceof Error ? cause.message : String(cause)}`);
      this.fail("commit", cause);
      return;
    }
    if (!r) { this.host.hint("没有可重做的"); return; }
    this.deferredBefore = null;
    this.installScene(r.scene, r.after);   // 重做 = 回到这一步之后（步结束时封的那份）：场景 + 在哪个组件里 + 选区一起
    this.openParamSession(null);
    this.host.hint(`重做：${labelText(r.label)}`);
    this.cancelGesture();
    this.host.trace?.({ kind: "redo", position: this.history.position(), depth: this.history.depth() });
    this.host.changed();
    this.draw();
  }
  /** 装载一个场景当新的 checkpoint（打开文件 / 新建）：历史从这里重新开始，上下文回根，选区/充能/手势全清。 */
  /** 第几个模型（换模型 = 加一）：剪贴板据此认出「这是从别的模型拷来的」（clipboard.ts）。 */
  private docEpoch = 0;
  loadScene(s: Scene, label = "打开"): void {
    this.docEpoch++;
    this.last = null;
    this.cancelGesture();
    this.scene = s;
    this.ctx = ROOT_CONTEXT;   // 装场景：不经写口
    this.history = new History<Session>(s);
    this._revision++;
    this.selection = this.blankSelection(); this.selectedPools.clear();   // 装场景：不经写口
    this.clearCharged();
    this.syncModeToKind();   // 人回到根上：工作台跟着根的身体种类走（2026-10-28 user 黑匣子「definition 1 body is "brep", not mesh」= 在网格体里重开模型，工作台还停在自由建模）
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
      const world = this.worldView(); this.provider.setWorld(world, this._revision);
      return this.r3.captureRgba(frameInput(world, cam, { w, h }, this.cleanState(), this.provider.layout()));
    } finally { cam.halfH = h0; cam.fovY = f0; }
  }
  private cleanState(): ViewState {
    return { selectionEdges: new Set(), selectionFaces: new Set(), scrubEdges: new Set(), hoverEdge: null, hoverFace: null, snap: null, snapAnchor: null, revision: this._revision, dimSlots: null, handles: null };
  }
  clearAll(): void {
    return this.step((pass) => {
    this.last = null;
    this.cancelGesture();
    this.clearSel(pass);
    this.clearCharged();
    this.setCtx(pass, ROOT_CONTEXT);
    this.commitIn(pass, { op: "clear" });
    this.draw();
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  applyPreset(name: string): boolean {
    return this.step((pass) => {
    const preset = PRESETS.find((p) => p.name === name);
    if (!preset) return false;
    this.cancelGesture();
    this.clearSel(pass);
    this.clearCharged();
    this.setCtx(pass, ROOT_CONTEXT);
    this.commitIn(pass, { op: "preset", name });
    this.draw();
    return true;
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  /** 外部喂线段（OBJ 导入等）：一次 addEdges = 一个手势（进活动池，世界坐标 → 本地）。 */
  addSegments(segs: [PtIn, PtIn][], label: string): FaceEvent[] {
    return this.step((pass) => {
    this.cancelGesture();
    this.clearSel(pass);
    this.host.trace?.({ kind: "load", label });
    const evs = this.commitIn(pass, { op: "addEdges", at: this.activePool(), segs: segs.map(([a, b]) => [this.toLocal({ x: a.x, y: a.y, z: a.z ?? 0 }), this.toLocal({ x: b.x, y: b.y, z: b.z ?? 0 })]) });
    this.draw();
    return evs;
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  /**
   * 导入外来 glb（T11 / DT2）：节点树原样变成组件，挂在当前上下文下面（文件坐标 = 世界坐标，同 OBJ）；三角 → 膜在这里跑（锐角阈值 = 油漆桶 / 拍平同一个量），
   * 装好的膜随 op 走（撤销重放只做装载）。成功 → 选中导进来的那一份 + 右下角参数小窗（DT84：上方向 / 文件单位，改了 = 撤掉按新值重做 = 预览）。
   * 失败 → 人话原因（不提交）。
   */
  importForeign(data: ImportScene): { ok: true; cast: TriangleCastReport; empties: number; instances: number } | { ok: false; reason: string } {
    return this.step((pass) => {
    this.cancelGesture();
    if (data.nodes.some((n) => hasShear(n.xform))) return { ok: false, reason: "文件里有斜切的节点（glTF 不允许），导不进来" };
    if (!data.roots.length) return { ok: false, reason: "文件里没有节点" };
    const at = this.activePool(), defId = at.def, place = invert(this.ctxXform()), deg = this.config.get("surface", "sharpDeg");
    const casts = new Map<string, ReturnType<typeof castImport>>();   // 每种「上方向 + 单位」只转一次（来回切 = 瞬间）
    const castOf = (up: ImportUp, unit: string): ReturnType<typeof castImport> => {
      const key = `${up}|${unit}`;
      let c = casts.get(key);
      if (!c) { c = castImport(reorientImport(data, up, IMPORT_UNITS[unit] ?? 1), deg); casts.set(key, c); }
      return c;
    };
    let added: number[] = [];
    const go = (up: ImportUp, unit: string): void => {
      const before = new Set(this.scene.def(defId).instances.keys());
      this.clearSel(pass);
      this.commitIn(pass, { op: "importScene", at, scene: castOf(up, unit).scene, place });
      added = [...this.scene.def(defId).instances.keys()].filter((id) => !before.has(id));
      for (const id of added) this.selectedPools.set(`i${id}`, { kind: "instance", instance: id });
      this.bump();
    };
    this.host.trace?.({ kind: "load", label: `import ${data.name}` });
    const n0 = this.opCount;
    go("y", "m");
    if (!added.length || this.opCount === n0) return { ok: false, reason: "没导进来（详情见调试日志）" };
    this.offerAfterthought(`导入 ${data.name}`, [
      { key: "up", def: { kind: "enum", label: "上方向", values: [{ id: "y", label: "Y 朝上", hint: "glTF 标准；大多数软件导出的" }, { id: "z", label: "Z 朝上", hint: "按 Z 朝上写的文件（躺倒了就换这个）" }] } },
      { key: "unit", def: { kind: "enum", label: "文件单位", values: [{ id: "m", label: "米", hint: "glTF 标准" }, { id: "cm", label: "厘米" }, { id: "mm", label: "毫米" }, { id: "in", label: "英寸" }, { id: "ft", label: "英尺" }] } },
    ], { up: "y", unit: "m" }, this.opCount - n0, (v) => { go(v.up === "z" ? "z" : "y", String(v.unit ?? "m")); this.zoomExtents(); });
    this.host.changed(); this.draw();
    let instances = 0;
    const count = (d: number, depth: number): void => { if (depth > 64) return; for (const i of this.scene.def(d).instances.values()) { instances++; count(i.def, depth + 1); } };
    for (const id of added) { instances++; count(this.scene.def(defId).instances.get(id)!.def, 0); }
    return { ok: true, cast: castOf("y", "m").report, empties: data.nodes.filter((n) => n.mesh === null && !n.children.length).length, instances };
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
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
  pickAt(sx: number, sy: number, opts?: { soft?: boolean; kinds?: PickKinds }): HitResult3 { return pickEntity(this.liveWorld(), this.frame(), this.fvp(), sx, sy, this.hitPx(), { ...opts, xray: this._xray && this._tool === "select", ...this.meshPickOpts() }); }
  /** 自由建模的拾取：正在编辑的网格体的平滑边点得中（FM138）+ 点用常量大半径（FM165）。硬表面 = 空（照旧）。 */
  private meshPickOpts(): { softActive?: boolean; vertexPx?: number } {
    return this.mode.id === "freeform" ? { softActive: true, vertexPx: (this.hitPx() * MESH_VERT_HIT_PX) / HIT_PX } : {};
  }
  // ---------- X 光（纪元账本 DT17 的拾取 + 叠加层两半；半透明渲染留 Tron 纪元）----------
  // user 10-26「X光模式有一半是tron纪元的渲染器的事情，但是我现在想的是拾取模式和overlay 这个是不是现在就可以做？」
  // 开着：选择工具点得到被面挡住的点 / 边；画面上池的边透过面画淡的、选中的边不被挡。框选本来就会选到被挡的（SketchUp 同款），不变。
  // 视图设置：不进文件、不进撤销；快捷键 Alt+Z（Blender 同键）。
  private _xray = false; get xray(): boolean { return this._xray; }
  setXray(on: boolean): void { if (this._xray === on) return; this._xray = on; this.host.hint(on ? "X 光开：选择工具点得到被挡住的点 / 边 / 面（面 = 每张面中心的小方点），边透过面画出来（Alt+Z 关）" : "X 光关"); this.host.changed(); this.draw(); }

  /**
   * 选择扩张（SU 点击族：单击 / 双击 / 三击）：stage 0 = 命中实体本身；1 = 膜 + 其环边；2 = 连通体。命中子 group / 实例 = 选它整体。
   * 点（2026-10-26）：单击 = 这个点；双击 = 连着它的线；三击 = 连通体。
   * mode = 怎么合进已有选区（替换 / 加选 / 减选 / 切换，对齐 Blender）；空命中 + 替换 = 清选区。hit 是 WorldView 的全局 id。
   */
  selectExpand(hit: HitResult3, stage: 0 | 1 | 2, mode: SelMode = "replace"): boolean { return this.step((pass) => this.selectExpandIn(pass, hit, stage, mode)); }
  /**
   * Alt 点边 = 环 / 洞（网格体；mesh/select-loop.ts）。镜像开着 = 把这个网格体的镜像面交给走法（中缝的开口不算洞）。不是网格体的边 = false（照常点）。
   * user 10-28「对了，alt 点边可以选择洞还是环，然后有镜像的时候环的算法要小心一点」。
   */
  selectLoop(hit: HitResult3, mode: SelMode = "replace"): boolean {
    if (this.activeKind() !== "mesh") return false;
    const c = this.classify(this.liveWorld(), hit);
    if (c.kind !== "entity" || c.local.edge === undefined) return false;
    const e = c.local.edge;
    return this.step((pass) => {
      const m = this.scene.mesh(this.activePool().def).kernel, ms = this.mirrorOf(), r = edgeLoop(m, e, ms ? { mirror: { axis: ms.axis, tol: MIRROR_TOL } } : {});
      const edges = r.edges.filter((x) => !(m.edgeFlags[x] & F_HIDDEN));
      if (mode === "replace") this.clearSel(pass);
      const all = mode === "toggle" && edges.every((x) => this.selection.edges.has(x));
      mergeSel(this.selection.edges, edges, mode === "toggle" ? (all ? "remove" : "add") : mode);
      this.afterSelect(pass);
      this.host.hint(`${r.kind === "hole" ? "洞" : r.kind === "wire" ? "线" : "环"}：${edges.length} 条边${r.closed ? "（闭合）" : ""}`);
      return true;
    }, { title: "选环" });
  }
  /** 右键「选成环 / 洞」（触屏没有 Alt）：选中的每条边都扩成它的环 / 洞（网格体）。 */
  selectLoopsOfSelection(): boolean {
    if (this.activeKind() !== "mesh" || this.selection.kind !== "mesh" || !this.selection.edges.size) return false;
    return this.step((pass) => {
      const m = this.scene.mesh(this.activePool().def).kernel, ms = this.mirrorOf(), opts = ms ? { mirror: { axis: ms.axis, tol: MIRROR_TOL } } : {};
      const add: number[] = [];
      for (const e of [...this.selection.edges]) for (const x of edgeLoop(m, e, opts).edges) if (!(m.edgeFlags[x] & F_HIDDEN)) add.push(x);
      mergeSel(this.selection.edges, add, "add");
      this.afterSelect(pass);
      this.host.hint(`选成环 / 洞：一共 ${this.selection.edges.size} 条边`);
      return true;
    }, { title: "选成环" });
  }
  /** 选区里组 / 组件各几个、有没有几何（右键往哪送：只选了组件 = 物体菜单）。 */
  selectionMakeup(): { groups: number; instances: number; geometry: boolean } {
    let groups = 0, instances = 0;
    for (const p of this.selectedPools.values()) if (p.kind === "group") groups++; else instances++;
    return { groups, instances, geometry: this.hasGeometrySelection() || this.hasPointSelection() };
  }
  /** 选区里有网格体的边吗（右键「选成环 / 洞」露不露）。 */
  hasMeshEdgeSelection(): boolean { return this.activeKind() === "mesh" && this.selection.kind === "mesh" && this.selection.edges.size > 0; }
  private selectExpandIn(pass: StepPass, hit: HitResult3, stage: 0 | 1 | 2, mode: SelMode): boolean {
    const view = this.liveWorld();
    const c = this.classify(view, hit);
    if (mode === "replace") { this.clearSel(pass); }
    if (c.kind === "pool") { this.mergePools([c.pick], mode); this.afterSelect(pass); return true; }
    if (c.kind === "none") { this.afterSelect(pass); return true; }
    if (this.activeKind() !== "brep") return this.selectExpandView(pass, c.local, stage, mode);
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
    this.afterSelect(pass);
    return true;
  }
  /**
   * 非 brep 的池（网格体……）的点击族，只认显示契约 KernelView：一下 = 点 / 边 / 面本身；两下 = 面连同它的环、边连同两侧的面、点连同它的边；三下 = 沿边连通的面。
   * 曲线 / 曲面 / 参考几何是 brep 的概念，这里没有；隐藏的不选。新种类的内核只要给了 KernelView 就自动有这一套。
   */
  private selectExpandView(pass: StepPass, h: HitResult3, stage: 0 | 1 | 2, mode: SelMode): boolean {
    const v = this.activeView, picked = this.blankSelection();
    const ringEdges = (fid: number): void => { const f = v.face(fid); if (!f) return; picked.faces.add(fid); for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) picked.edges.add(d.edge); };
    if (h.edge !== undefined && v.graph.hasEdge(h.edge)) { picked.edges.add(h.edge); if (stage >= 1) for (const fid of v.graph.edge(h.edge).faceLinks) picked.faces.add(fid); }
    else if (h.face !== undefined && v.face(h.face)) { if (stage >= 1) ringEdges(h.face); else picked.faces.add(h.face); }
    else if (h.vertex !== undefined && v.graph.hasVertex(h.vertex)) { if (stage === 0) picked.verts.add(h.vertex); else for (const eid of v.graph.vertex(h.vertex).edges) picked.edges.add(eid); }
    if (stage >= 2) {   // 连通体：沿边的 faceLinks 泛洪
      const faces = new Set(picked.faces), edges = new Set(picked.edges), queue = [...faces];
      for (const e of edges) for (const f of v.graph.edge(e).faceLinks) if (!faces.has(f)) { faces.add(f); queue.push(f); }
      while (queue.length) { const f = v.face(queue.pop()!); if (!f) continue; for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) { edges.add(d.edge); for (const g of v.graph.edge(d.edge).faceLinks) if (!faces.has(g)) { faces.add(g); queue.push(g); } } }
      picked.faces = faces; picked.edges = edges;
    }
    const pe = [...picked.edges].filter((e) => !v.isEdgeHidden(e)), pf = [...picked.faces].filter((f) => !v.isFaceHidden(f)), pv = [...picked.verts];
    const all = mode === "toggle" && pe.every((e) => this.selection.edges.has(e)) && pf.every((f) => this.selection.faces.has(f)) && pv.every((x) => this.selection.verts.has(x));
    const m: SelMode = mode === "toggle" ? (all ? "remove" : "add") : mode;
    mergeSel(this.selection.edges, pe, m); mergeSel(this.selection.faces, pf, m); mergeSel(this.selection.verts, pv, m);
    this.afterSelect(pass);
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
    return this.step((pass) => {
    const before = this.selection, pools = new Set(this.selectedPools.keys());
    this.selectAllInner(pass);
    for (const f of before.faces) this.selection.faces.delete(f);
    for (const e of before.edges) this.selection.edges.delete(e);
    for (const key of pools) this.selectedPools.delete(key);
    this.afterSelect(pass);
    return true;
    }, { title: "反选" });
  }
  /** 全不选（Blender Alt+A；Esc 也行）。 */
  deselectAll(): void { this.step((pass) => { this.clearSel(pass); this.afterSelect(pass); }, { title: "取消选择" }); }
  /** 选区变化的口子：每一处改完选区都调它（带通行证 = 一定在一步里；步结束时记账）。 */
  private afterSelect(_pass: StepPass): void {
    this.stepTouched = true;
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
    if (this.activeKind() !== "brep") return null;   // 曲线 / 曲面是 brep 的概念
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
  hasCurveSelection(): boolean { if (this.activeKind() !== "brep") return false; const k = this.kernel; for (const e of this.selection.edges) if (k.graph.hasEdge(e) && k.curveOf(e) !== undefined) return true; return false; }
  /** 炸开选区里的曲线（SU Explode Curve）：每条曲线给一条代表边，op 按坐标寻址。 */
  /** 选区能焊吗（粗筛，菜单显示用；真判在 planWeld）：≥ 2 条边、没选面。 */
  canWeldSelection(): boolean { if (this.activeKind() !== "brep") return false; const k = this.kernel; return !this.selection.faces.size && [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).length >= 2; }
  /** 焊接选区（B19，SU Weld Edges）：成一条曲线，之后选中整条。 */
  weldSelection(): boolean {
    return this.step((pass) => {
    if (!this.requireBrep("焊接")) return false;
    const k = this.kernel, at = this.activePool();
    const plan = planWeld(k, [...this.selection.edges].filter((e) => k.graph.hasEdge(e)));
    if (typeof plan === "string") { this.host.hint(plan); return false; }
    const keys = plan.edges.map((e) => edgeKey(k, e));
    this.commitIn(pass, { op: "weldEdges", at, edges: keys });
    const k2 = this.kernel; this.clearSel(pass);
    for (const key of keys) { try { this.selection.edges.add(resolveEdge(k2, key)); } catch { /* 没了就不选 */ } }
    this.host.hint(`焊接：${plan.edges.length} 段 → 一条${plan.spec.kind === "circle" ? "圆" : plan.spec.kind === "arc" ? "弧" : "曲线"}（选 / 擦 / 高亮当整体）`);
    this.host.changed(); this.draw();
    return true;
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  explodeCurveSelection(): void {
    return this.step((pass) => {
    if (!this.requireBrep("炸开曲线")) return;
    const k = this.kernel, at = this.activePool();
    const seen = new Set<number>(); const edges: ReturnType<typeof edgeKey>[] = [];
    for (const e of this.selection.edges) { if (!k.graph.hasEdge(e)) continue; const cid = k.curveOf(e); if (cid === undefined || seen.has(cid)) continue; seen.add(cid); edges.push(edgeKey(k, e)); }
    if (edges.length) this.commitIn(pass, { op: "explodeCurves", at, edges });
    this.host.changed(); this.draw();
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }

  deleteSelection(): void {
    if (this.activeKind() === "mesh" && this.hasSelection() && this.mirrorGateEntry("删除", () => this.deleteSelection())) return;   // 镜像编辑开着删网格：先问
    return this.step((pass) => this.deleteSelectionStep(pass));
  }
  private deleteSelectionStep(pass: StepPass): void {
    if (!this.hasSelection()) return;
    const at = this.activePool(), n0 = this.opCount;
    if (this.activeKind() === "brep") {
      const k = this.kernel;
      // 删点 = 删连着它的线（Blender「删除顶点」；面跟着线没了就没了）
      const delE = new Set<EdgeId>([...this.selection.edges].filter((e) => k.graph.hasEdge(e)));
      for (const v of this.selection.verts) if (k.graph.hasVertex(v)) for (const e of k.graph.vertex(v).edges) delE.add(e);
      if (this.selection.faces.size || delE.size) {
        this.commitIn(pass, { op: "eraseSelection", at, faces: [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f)), edges: [...delE].map((e) => edgeKey(k, e)) });
      }
    } else if (this.activeKind() === "mesh" && (this.hasGeometrySelection() || this.hasPointSelection())) {
      // 网格体：按选区的种类删（Blender X 同语义）——有面 = 只删面（面带的环边不连累邻面）、否则有边 = 删边（连着的面一起）、否则删点（2026-10-27 Opus 5.5）
      const sel = this.selection, f = [...sel.faces], e = [...sel.edges], v = [...sel.verts];
      this.commitIn(pass, { op: "meshDelete", def: at.def, ...(f.length ? { faces: f } : e.length ? { edges: e } : { verts: v }) });
    } else if (this.hasGeometrySelection() || this.hasPointSelection()) this.requireBrep("删除几何");
    const def = this.scene.defOfContext(this.ctx);
    const kept = new Map<string, PoolPick>();   // 锁住的不删、留在选区里（要解锁得先选中它）
    for (const [key, p] of [...this.selectedPools]) {
      if (this.pickIsLocked(p)) { kept.set(key, p); continue; }
      if (p.kind === "group") this.commitIn(pass, { op: "eraseGroup", at, group: p.group });
      else this.commitIn(pass, { op: "eraseInstance", def, instance: p.instance });
    }
    const gsel = guidesOf(this.selection);
    if (gsel.size) this.commitIn(pass, { op: "eraseGuides", at, ids: [...gsel] });   // A31：选中的参考线 / 参考点
    if (this.opCount === n0) return;   // 什么都没删（网格体的几何 / 全锁着）：选区留着，不假装删过
    this.clearSel(pass); this.selectedPools = kept;   // 写口已标过
    if (kept.size) this.host.hint(`${kept.size} 个已锁定的组 / 组件没删（选区菜单 → 解锁）`);
    this.host.changed();
    this.draw();
  }

  // ---------- group / component ----------
  /** 选区 → group（选中的膜 / 边搬进新 group；子 group / 实例选区一并进组——先建组再把它们挪进去）。 */
  makeGroup(): boolean {
    return this.step((pass) => {
    if (!this.hasSelection()) return false;
    if (!this.requireBrep("建组 / 建组件")) return false;
    const at = this.activePool(), k = this.kernel;
    const faces = [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f));
    const edges = [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
    const nest = this.nestPicks();
    if (!faces.length && !edges.length && !nest.groups.length && !nest.instances.length) return false;
    this.commitIn(pass, { op: "makeGroup", at, faces, edges, ...nest.fields });
    this.clearSel(pass);
    const def = this.scene.brep(this.scene.defOfContext(this.ctx));
    const newest = [...def.groups.values()].filter((g) => g.parent === this.ctx.group).pop();
    if (newest) this.selectedPools.set(`g${newest.id}`, { kind: "group", group: newest.id });
    this.host.changed(); this.draw();
    return true;
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  /**
   * 选区 → component（新 definition + 一个实例）。轴默认 = 底面中心（2026-10-26 user「忍不了了哈哈，组件默认是底部中心轴可以吗」；以前 = 包围盒最小角，SketchUp 同款）。
   * 之后右下角马后炮可换原点（user 2026-10-25「建立组件的时候能不能马后炮选择一下轴的居中模式」）：包围盒角 / 包围盒中心 / 底面中心 / 顶点平均——
   * = 撤销建组件、重做建组件 + 给新组件换轴（v0.14.5 组件换轴：世界不动）。
   */
  makeComponent(name: string): boolean { return this.step((pass) => this.makeComponentStep(pass, name)); }
  // ---------- 物件层动词（设计稿 ai-docs/20261028-object-layer-and-clipboard-design.md §4；user 10-28 夜）----------
  // 分开 = 原地建组件（「分开」撤了：user「分开的大部分场景就是你想单独修改某个东西，所以逻辑上还是属于这个物体」「先这么试着」）；
  // 合并 = 宏：剪切其余 → 进目标 → 原位粘贴 → 炸开，一步撤销，目标 = 右键点的那个 / 光标下那个（user「你右键点在谁身上，谁留下 可以」）；
  // 贴进 / 并进摆了多份的组件 = 每份都变（SketchUp 语义，不再拒绝）；要只改这一份 = 先「做成唯一」。
  /** 网格体里建组件（user 10-28 夜「mesh也要有和sketchup类似的组件管理」）：选中的面搬进一个新的网格体组件、嵌在这一层里（op separateObject，摆在这一层）；炸开它 = 并回来。 */
  private makeMeshComponentStep(pass: StepPass, name: string): boolean {
    if (!this.canMakeComponent()) { this.host.hint("建组件：先在网格体里选要做成组件的面"); return false; }
    const def = this.activePool().def, faces = [...(this.selection as { faces: Set<number> }).faces].sort((a, b) => a - b);
    const before = new Set(this.scene.def(def).instances.keys());
    this.commitIn(pass, { op: "separateObject", at: { def, group: null }, def, faces, name });
    this.clearSel(pass);
    const fresh = [...this.scene.def(def).instances.keys()].find((id) => !before.has(id));
    if (fresh !== undefined) this.selectedPools.set(`i${fresh}`, { kind: "instance", instance: fresh });
    const copies = this.copiesOf(def);
    this.host.hint(`建了组件「${name}」：${faces.length} 张面，嵌在这一层里${copies > 1 ? `（这个组件摆了 ${copies} 份，每份都有了）` : ""}；双击进去改、炸开 = 并回来`);
    this.host.changed(); this.draw();
    return true;
  }
  /** 能建组件：网格体 = 选了面；硬表面 = 选了几何或子物件。 */
  canMakeComponent(): boolean { return this.activeKind() === "mesh" ? this.selection.kind === "mesh" && this.selection.faces.size > 0 : this.hasGeometrySelection() || this.hasPoolSelection(); }
  /** 选中的物件（这一层的实例）。 */
  private instancePicks(): InstId[] { return [...this.selectedPools.values()].filter((p): p is { kind: "instance"; instance: InstId } => p.kind === "instance").map((p) => p.instance); }
  /** 右键点在哪个选中的物件上（点在选区里的物件上才算；别的选着 ≥ 1 个）→ 合并的目标。 */
  mergeTargetAt(x: number, y: number): InstId | null {
    const picks = this.instancePicks();
    if (picks.length < 2) return null;
    const c = this.classify(this.liveWorld(), this.pickAt(x, y));
    return c.kind === "pool" && c.pick.kind === "instance" && picks.includes(c.pick.instance) ? c.pick.instance : null;
  }
  /** Ctrl+J 压着的那个（lastPtr 算出来、记到下一次按画布）；没有 = 右键那一点（ctxPick）。注册表 env.pointedInstance() 读它。 */
  private pointed: InstId | null = null;
  pointedInstance(): InstId | null { if (this.pointed !== null && this.instancePicks().includes(this.pointed)) return this.pointed; const c = this.ctxPick; return c ? this.mergeTargetAt(c.x, c.y) : null; }
  /** 右键菜单「把其余合并进这个」= 右键点的那个留下（注册表 object.mergeInto）。 */
  mergeAtContextPoint(): void { this.pointed = null; if (this.pointedInstance() === null) { this.host.hint("合并：右键点在要保留的那个物件上（别的选着）"); return; } this.runAction("mergeInto"); }
  /** Ctrl+J = 光标压着的那个留下。 */
  mergeUnderCursor(): void {
    const p = this.lastPtr, t = p ? this.mergeTargetAt(p.x, p.y) : null;
    if (t === null) { this.host.hint(this.instancePicks().length < 2 ? "合并：先选两个以上的物件" : "合并：把鼠标放在要保留的那个物件上再按 Ctrl+J（或右键它 → 把其余合并进这个）"); return; }
    this.pointed = t;
    this.runAction("mergeInto");
  }
  /** 做成唯一 / 应用缩放 / 锁 / 解锁：都是注册表物件族的指令（objects/verbs.ts），这几个只是键盘 / 探针的入口。 */
  makeUniqueSelection(): boolean { return this.runAction("makeUnique") > 0; }
  applyScaleSelection(): boolean { return this.runAction("applyScale") > 0; }
  lockSelection(on: boolean): boolean {
    const all = [...this.selectedPools.values()];
    if (!all.some((p) => p.kind === "instance")) { if (on && all.some((p) => p.kind === "group")) this.host.hint("组不是物件，不能锁；要当参考就先「建组件」（G）再锁"); return false; }   // 0.14：组不是物体、不能锁
    return this.runAction(on ? "lock" : "unlock") > 0;
  }
  /** 选区里一起装进新组 / 新组件的子组和组件（SketchUp 同款嵌套，user 2026-10-26「当然要」）：锁定的不动（提示一句）。 */
  private nestPicks(): { groups: GroupId[]; instances: InstId[]; fields: { groups?: GroupId[]; instances?: InstId[] } } {
    const picks = [...this.selectedPools.values()], locked = picks.filter((p) => this.pickIsLocked(p)).length;
    if (locked) this.host.hint(`${locked} 个已锁定的组 / 组件没装进去（解锁后再装）`);
    const free = picks.filter((p) => !this.pickIsLocked(p));
    const groups = free.filter((p): p is { kind: "group"; group: GroupId } => p.kind === "group").map((p) => p.group);
    const instances = free.filter((p): p is { kind: "instance"; instance: InstId } => p.kind === "instance").map((p) => p.instance);
    return { groups, instances, fields: { ...(groups.length ? { groups } : {}), ...(instances.length ? { instances } : {}) } };
  }
  private makeComponentStep(pass: StepPass, name: string): boolean {
    if (!this.hasSelection()) return false;
    if (this.activeKind() === "mesh") return this.makeMeshComponentStep(pass, name);   // 网格体里：选中的面 → 嵌在这一层里的网格体组件（= 「分开」，原地）
    if (!this.requireBrep("建组 / 建组件")) return false;
    const at = this.activePool(), k = this.kernel;
    const faces = [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f));
    const edges = [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
    const nest = this.nestPicks();
    if (!faces.length && !edges.length && !nest.groups.length && !nest.instances.length) return false;
    const go = (mode: string): void => {
      const before = new Set(this.scene.defs.keys());
      this.commitIn(pass, { op: "makeComponent", at, faces, edges, name, ...nest.fields });
      const defId = [...this.scene.defs.keys()].find((id) => !before.has(id));
      if (defId === undefined || mode === "corner") return;
      const origin = this.originPresetPoint(defId, mode as OriginPreset);
      if (!origin) return;
      this.commitIn(pass, { op: "setAxes", at: { def: defId, group: null }, frame: { origin, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } } });
    };
    const selectNewest = (): void => {
      this.clearSel(pass);
      const def = this.scene.def(this.scene.defOfContext(this.ctx));
      const newest = [...def.instances.values()].filter((i) => i.parent === this.ctx.group).pop();
      if (newest) this.selectedPools.set(`i${newest.id}`, { kind: "instance", instance: newest.id });
    };
    const n0 = this.opCount;
    go("bottom");
    if (this.opCount === n0) return false;
    selectNewest();
    this.offerAfterthought("建组件", [{ key: "origin", def: { kind: "enum", label: "原点", values: [...ORIGIN_PRESETS] } }],
      { origin: "bottom" }, this.opCount - n0, (v) => { go(String(v.origin)); selectNewest(); });
    this.host.changed(); this.draw();
    return true;
  }
  /** 炸开选中的：组（硬表面的分区，不是物件）手写炸；实例走注册表 object.explode（跨种类先问「转成 X 再炸」）。 */
  explodeSelection(): boolean {
    return this.step((pass) => {
      const groups = this.explodeGroupsStep(pass);
      const n = this.runAction("explode");   // 同一步里（step 嵌套 = 并进这一步）；要问的那种会另起一步
      return groups + n > 0;
    });
  }
  /** 只炸选中的组（右键几何层「炸开组」）。 */
  explodeGroups(): boolean { return this.step((pass) => this.explodeGroupsStep(pass) > 0); }
  private explodeGroupsStep(pass: StepPass): number {
    const at = this.activePool(), groups = [...this.selectedPools.values()].filter((p): p is { kind: "group"; group: GroupId } => p.kind === "group" && !this.pickIsLocked(p));
    if (!groups.length) return 0;
    const n0 = this.opCount;
    for (const p of groups) this.commitIn(pass, { op: "explode", at, group: p.group });
    if (this.opCount === n0) return 0;
    const kept = [...this.selectedPools].filter(([, p]) => p.kind !== "group");
    this.clearSel(pass); for (const [k, p] of kept) this.selectedPools.set(k, p);
    this.host.hint(`炸开了 ${groups.length} 个组`);
    this.host.changed(); this.draw();
    return groups.length;
  }
  hasGroupSelection(): boolean { return [...this.selectedPools.values()].some((p) => p.kind === "group"); }
  /** 再放一份选中实例的定义（复制 = 同定义新实例，偏移 delta 世界向量）。 */
  copyInstance(delta: Pt3): boolean { return this.step((pass) => this.copyInstanceStep(pass, delta)); }
  // ---------- 剪贴板（设计稿 ai-docs/20261028-object-layer-and-clipboard-design.md §3；user 10-28 夜「复制黏贴我们没做」「paste落点：原位落下」）----------
  // 剪切 = 拷贝 + 删除；粘贴 = 原位（世界位置不动；在摆了多份的组件里按你进来的那条链换算）；散几何种类对不上 = 弹应用内的选择「转过去再贴 / 不贴」（不静默转）。
  /** 拷贝选中的（几何 + 组 + 物件）到剪贴板。 */
  copySelection(): boolean {
    const p = transferExtract(this.scene, this.ctx, this.selection, [...this.selectedPools.values()]);
    if (!p) { this.host.hint("拷贝：先选中要拷的东西"); return false; }
    clipboard.set(p, this.docEpoch);
    this.host.hint(`拷贝了 ${transferSay(p)}（Ctrl+V 原位粘贴；到别的组件里也能贴）`);
    this.host.changed();
    return true;
  }
  /** 剪切 = 拷贝 + 删除（锁着的不剪：和删除一样）。 */
  cutSelection(): boolean {
    if ([...this.selectedPools.values()].some((p) => this.pickIsLocked(p))) { this.host.hint("剪切：选区里有锁定的组 / 组件，先解锁"); return false; }
    if (!this.copySelection()) return false;
    const n0 = this.opCount;
    this.deleteSelection();
    if (this.opCount === n0) { this.host.hint("剪切：拷到剪贴板了，但这里删不掉（照拷贝算）"); return false; }
    this.host.hint(`剪切了 ${transferSay(clipboard.get()!)}（Ctrl+V 原位粘贴；到别的组件里也能贴）`);
    return true;
  }
  canPaste(): boolean { return clipboard.has() && clipboard.doc() === this.docEpoch; }
  /** 原位粘贴进当前上下文。散几何种类对不上 → 先问「转过去再贴」（castPayload），点了才贴。 */
  pasteClipboard(): void {
    const p = clipboard.get();
    if (!p) { this.host.hint("粘贴：剪贴板是空的（先 Ctrl+C / Ctrl+X）"); return; }
    if (clipboard.doc() !== this.docEpoch) { this.host.hint("粘贴：剪贴板里的东西是从另一个模型拷的——跨模型拷贝还没做（组件和材质对不上会贴错），没贴；这件在愿望单里"); return; }
    if (this.activeKind() === "mesh" && this.mirrorGateEntry("粘贴", () => this.pasteClipboard())) return;
    const kind = this.activeKind(), a = transferAccept(p, kind);
    if (a.ok) { this.pasteNow(p); return; }
    const to = a.cast === "mesh" ? "网格体" : "硬表面体";
    if (!this.host.confirm) { this.host.hint(`粘贴：${a.what}要先转成${to}才能贴进这一层（这里不能问，没贴）`); return; }
    void this.host.confirm("粘贴：要转种类", `${a.what}是另一种身体的几何，贴进这一层要先转成${to}（和物件设置里的转换一样，会丢它那一种才有的东西）。转过去再贴吗？`, `转成${to}再贴`)
      .then((ok) => { if (ok) this.pasteNow(castPayload(p, a.cast)); else { this.host.hint("粘贴：没贴（你选了不转）"); this.draw(); } });
  }
  private pasteNow(p: import("./transfer.ts").TransferPayload): void {
    this.step((pass) => {
      const at = this.activePool(), def = at.def;
      for (const i of p.instances ?? []) if (this.scene.defs.has(i.def) && this.scene.references(i.def, def)) { this.host.hint("粘贴：不能把一个物件贴进它自己（或它的子孙）里"); return; }
      for (const i of p.instances ?? []) if (!this.scene.defs.has(i.def)) { this.host.hint("粘贴：剪贴板里的物件在这个模型里已经没有了（撤销过了头），没贴"); return; }
      const local = transferLocalize(p, invert(this.ctxXform()));
      const instBefore = new Set(this.scene.def(def).instances.keys()), groupBefore = new Set(this.scene.kindOf(def) === "brep" ? this.scene.brep(def).groups.keys() : []);
      const meshBefore = this.scene.kindOf(def) === "mesh" ? new Set(this.scene.mesh(def).kernel.faces()) : null;
      const n0 = this.opCount;
      const events = this.commitIn(pass, { op: "paste", at, ...(local.brep ? { brep: local.brep } : {}), ...(local.groups ? { groups: local.groups } : {}), ...(local.mesh ? { mesh: local.mesh } : {}), ...(local.instances ? { instances: local.instances } : {}) });
      if (this.opCount === n0) return;
      // 贴出来的成为选区（接着 G 就能挪）
      this.clearSel(pass);
      for (const id of this.scene.def(def).instances.keys()) if (!instBefore.has(id)) this.selectedPools.set(`i${id}`, { kind: "instance", instance: id });
      if (this.scene.kindOf(def) === "brep") for (const id of this.scene.brep(def).groups.keys()) if (!groupBefore.has(id) && this.scene.brep(def).groups.get(id)!.parent === at.group) this.selectedPools.set(`g${id}`, { kind: "group", group: id });
      if (meshBefore && this.selection.kind === "mesh") for (const f of this.scene.mesh(def).kernel.faces()) if (!meshBefore.has(f)) this.selection.faces.add(f);
      if (this.selection.kind === "brep") for (const e of events) if (e.type === "BIRTH") this.selection.faces.add(e.face);
      const copies = this.copiesOf(def);
      this.host.hint(`贴了 ${transferSay(p)}（原位${copies > 1 ? `；这个组件摆了 ${copies} 份，每份都多了` : ""}）`);
      this.host.changed(); this.draw();
    });
  }
  private copyInstanceStep(pass: StepPass, delta: Pt3): boolean {
    const picks = [...this.selectedPools.values()].filter((p): p is { kind: "instance"; instance: InstId } => p.kind === "instance");
    if (!picks.length) return false;
    const def = this.scene.defOfContext(this.ctx), at = this.activePool();
    for (const p of picks) {
      const inst = this.scene.instance(def, p.instance);
      this.commitIn(pass, { op: "placeInstance", at, definition: inst.def, xform: compose(this.xformToLocal(translation(delta)), inst.xform) });
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

  // ---------- 隐藏（DT49，user 2026-10-25「然后 hide unhide all也马上需要了，这个gltf规范里有吗？」；存档 = glTF KHR_node_visibility）----------
  // 组件 = 整份藏（藏父连子）；散的面 / 线 = 各自打隐藏标记（user「嗯线和面也可以hidden，这样可以挖洞看里面，blender也支持。合理。」）；
  // 组不是物体、没有自己的隐藏 = 把组里（连同子组、放在里面的实例）的面 / 线 / 实例全藏。
  /**
   * 范围里的断口（共线、只连两段、两边挂的面一样 = 画面上的小鼓包）：有散几何选区 = 选区里的点；scope = "context" 或没选 = 当前在编辑的物体里全部。
   * 纪元排期 T7 / DT5（user「他们语义上就是一个东西，只是作用域……不同」：和焊边橡皮的共轴那支同一个动词）。
   */
  // ---------- 修复指令：作用范围 + 传播到子物体（DT85）----------
  // user 10-26：有选区 = 只对选中的、没选 = 当前在编辑的整个物体（「可以」）；「默认传播，同一个组件只修一次，锁着的跳过，面板里放『含子物体』开关。同意，
  // 现在你差不多知道我的默认+披露原则是怎么样的了」——默认做最有用的、提示行说清碰了什么、小窗给开关。
  /** 含子物体（会话记住；参数小窗里改它）。 */
  private repairChildren = true;
  /**
   * 修复指令修哪些池。有选区 = 活动池里选中的面 / 边 / 点 + 选中的组 / 组件；没选 = 当前在编辑的整个物体（活动池；含子物体时 + 它下面的组、组件，一层层往里）。
   * 组件按定义去重：几条路径到同一个定义只修一次（没有环——放实例时就拒了）。锁着的那份不往里走；别的没锁的路能到照修。
   * 组不是物体，选中的组连同它下面的组一起算；组里放的组件看「含子物体」。
   */
  private repairScope(scope: "auto" | "context", children: boolean): RepairScope {
    const s = this.scene, ctxDef = s.defOfContext(this.ctx), active = this.activePool();
    const geoSel = this.selection.faces.size > 0 || this.selection.edges.size > 0 || this.selection.verts.size > 0;
    const mode: "selection" | "context" = scope === "auto" && (geoSel || this.selectedPools.size > 0) ? "selection" : "context";
    const out: RepairScope = { pools: [], mode, components: 0, copies: 0, locked: 0 };
    const seenPool = new Set<string>(), seenDef = new Set<DefId>([ctxDef]);
    const addPool = (at: PoolRef, sel: BrepSelection | null, xf: Xform = IDENTITY): void => { const key = `${at.def}/${at.group ?? "root"}`; if (seenPool.has(key) || s.def(at.def).body.kind !== "brep") return; seenPool.add(key); out.pools.push({ kind: "brep", at, sel, xf }); };
    const groupsUnder = (def: DefId, gid: GroupId | null): GroupId[] => {
      const body = s.def(def).body;
      if (body.kind !== "brep") return [];
      const res: GroupId[] = [];
      for (const g of body.groups.values()) { let p: GroupId | null = g.parent; for (let i = 0; i < 64 && p !== gid && p !== null; i++) p = body.groups.get(p)?.parent ?? null; if (gid === null || p === gid) res.push(g.id); }
      return res;
    };
    const addInst = (inst: { def: DefId; locked?: boolean; xform: Xform }, parentXf: Xform = IDENTITY): void => {
      if (inst.locked) { out.locked++; return; }
      if (seenDef.has(inst.def)) return;
      const xf = compose(parentXf, inst.xform);
      seenDef.add(inst.def); out.components++; out.copies += s.instanceCount(inst.def);
      addPool({ def: inst.def, group: null }, null, xf);
      for (const g of groupsUnder(inst.def, null)) addPool({ def: inst.def, group: g }, null, xf);
      if (children) for (const i of s.def(inst.def).instances.values()) addInst(i, xf);
    };
    const instsIn = (def: DefId, groups: ReadonlySet<GroupId | null>): void => { for (const i of s.def(def).instances.values()) if (groups.has(i.parent)) addInst(i); };
    if (mode === "context") {
      addPool(active, null);
      if (children) {
        const gs = groupsUnder(ctxDef, active.group);
        for (const g of gs) addPool({ def: ctxDef, group: g }, null);
        instsIn(ctxDef, new Set<GroupId | null>([active.group, ...gs]));
      }
      return out;
    }
    if (geoSel && this.selection.kind === "brep") addPool(active, this.selection);   // 修复是 brep 的动词：网格体的几何选区不进它的作用域
    for (const p of this.selectedPools.values()) {
      if (p.kind === "group") {
        const gs = [p.group, ...groupsUnder(ctxDef, p.group)];
        for (const g of gs) addPool({ def: ctxDef, group: g }, null);
        if (children) instsIn(ctxDef, new Set<GroupId | null>(gs));
      } else { const inst = s.def(ctxDef).instances.get(p.instance); if (inst) addInst(inst); }
    }
    return out;
  }
  /** 提示行的「作用于」那半句（披露）。 */
  private scopeText(sc: RepairScope): string {
    const where = sc.mode === "selection" ? "选中的" : "整个物件";
    const parts = [sc.components ? `含 ${sc.components} 个组件、共 ${sc.copies} 份` : "", sc.locked ? `锁着的 ${sc.locked} 个跳过` : ""].filter(Boolean);
    return `作用于：${where}${parts.length ? `；${parts.join("；")}` : ""}`;
  }
  /** 修复模块（repairs/）用的窄接口：模块不碰 Editor 本体。 */
  private get repairCtx(): CommandEnv {
    const self = this;
    return { get scene() { return self.scene; }, gridFineStep: () => this.gridFineStep(), snapStepChoices: () => this.snapStepChoices(), snapLattice: (at, xf, f) => this.snapLattice(at, xf, f), sharpDeg: () => this.config.get("surface", "sharpDeg"), pointedInstance: () => this.pointedInstance(), circleSegments: () => this.config.get("circle", "segments") };
  }
  /** 这个修复模块在不在清单里（☰ 里的老入口按它显隐：模块扔了不报错）。 */
  repairLoaded(kind: RepairKind): boolean { return !!commandById(kind); }
  private repairModule(kind: RepairKind): Command<PoolUnit> { const m = commandById(kind); if (!m || m.unit !== "brep") throw new Error(`command "${kind}" is not loaded (or is not a brep command)`); return m as Command<PoolUnit>; }
  /** 选区浮条上的入口 = 放置表里 contextBar 面上的动作（按现在的范围数出来 > 0 的才露；按工作台筛）：main.ts 照着画。数 = 路由表里每种单位各数各的（brep 走修复那条作用域、其余按单位规划）。 */
  /** 放置表某个面上现在能做的动作（菜单显示什么 = 按面查表；contextBar = 几何层的右键 / 浮条，objectWindow = 物体窗口——在 withMenuTarget 里数）。 */
  commandMenu(where: Surface = "contextBar"): { id: string; label: string; icon: string; submenu?: { label: string; item: string } }[] {
    const out: { id: string; label: string; icon: string; submenu?: { label: string; item: string } }[] = [];
    for (const p of placementsAt(where, this.mode.id)) {
      const a = actionById(p.action); if (!a) continue;
      let n = 0;
      for (const r of routesOf(a)) n += r.kind === "brep" ? (this.unitTarget === "children" ? 0 : this.repairMenuCount(r.command.id, this.unitTarget === "self" ? "context" : "auto")) : this.unitCount(r.command, r.kind);
      if (n) out.push({ id: a.id, label: a.label(n), icon: a.icon ?? "", ...(p.submenu ? { submenu: { label: p.submenu.label, item: p.submenu.item ?? a.label(n) } } : {}) });
    }
    return out;
  }
  /** 老入口（动作 id = 指令 id 的那些）；新代码走 runAction。 */
  runCommand(id: CommandId): number { return this.runAction(id); }
  /** 一条指令在它那种单位上会碰几处（object 族按 perDefinition 去重后数）。 */
  private unitCount(c: Command, kind: UnitKind): number {
    // 菜单 / 浮条数数（每次选区一变就跑）：哪一条指令在这份几何上出错，都只当 0 处、记进调试日志——数数炸了不能把界面一起带走（2026-10-29 Opus：
    // user 日志 `loopCut: edge 18 has 4 faces` 就是选东西时右键菜单数「环切」抛出来的；指令自己也修了，这一层兜所有指令）
    try {
      const v = c.defaults(this.repairCtx);
      let n = 0;
      for (const u of this.unitsFor(c, kind)) n += c.quickCount ? c.quickCount(this.repairCtx, u) : c.plan(this.repairCtx, u, v).count;
      return n;
    } catch (err) {
      console.warn(`[菜单] 数「${c.title}」时出错，当 0 处：${String((err as Error)?.message ?? err)}`);
      return 0;
    }
  }
  /**
   * 作用域解成单位（注册表提案 §2.1 的最小版，按种类；2026-10-27 接缝）：brep / mesh = 活动池 + 它的几何选区（没选几何 = 没有这个单位；修复那条路另有「整个物体」的作用域）；
   * object = 选中的、没锁的实例（场景里摆着的每一份一个单位）。加一种身体 = 这里多一个分支 + 它的选区类型，别处不动。
   */
  private unitsOf(kind: UnitKind, includeLocked = false): Unit[] {
    const s = this.scene, at = this.activePool();
    if (this.unitTarget !== "selection") return this.targetUnits(kind, includeLocked);
    if (kind === "object") {
      const ctxDef = s.defOfContext(this.ctx), out: ObjectUnit[] = [];
      for (const p of this.selectedPools.values()) {
        if (p.kind !== "instance") continue;
        const inst = s.instance(ctxDef, p.instance);
        if (inst.locked && !includeLocked) continue;
        const d = s.def(inst.def);
        out.push({ kind: "object", at, instance: inst.id, def: d.id, name: d.name, body: d.body.kind, copies: s.instanceCount(d.id), xf: inst.xform });
      }
      // 什么都没选 = 你所在的这一层（最外层 / 进着的组件；组不是物体、不算）：只给声明了 takesContext 的指令（unitsFor 筛）
      if (!out.length && this.ctx.group === null && !this.hasGeometrySelection() && !this.hasPointSelection()) {
        const d = s.def(ctxDef);
        out.push({ kind: "object", at, instance: null, def: d.id, name: ctxDef === s.root ? "最外层" : d.name, body: d.body.kind, copies: Math.max(1, s.instanceCount(d.id)), xf: IDENTITY });
      }
      return out;
    }
    if (this.activeKind() !== kind) return [];
    // 网格体：没选区也交出整个网格体（sel = null；2026-10-28：「默认平滑」「细分」这种管整个网格体的指令以前没选区就拿不到单位、右键里不露）。
    // 要选区的指令（插入 / 倒角 / 标边……）自己在 sel = null 时数 0、照样不露。硬表面照旧：没选区 = 没单位（修复那条路自己管作用域）。
    if (!this.hasGeometrySelection() && !this.hasPointSelection()) return kind === "mesh" ? [{ kind: "mesh", def: at.def, sel: null, xf: IDENTITY }] : [];
    const sel = this.selection;
    return sel.kind === "brep" ? [{ kind: "brep", at, sel, xf: IDENTITY }] : [{ kind: "mesh", def: at.def, sel, xf: IDENTITY }];
  }
  // ---------- 菜单 / 物体窗口的目标（UX 心智模型 §2.1 / §2.2，2026-10-28；user「自己的object property: 物体设置选窗」「孩子的：选中孩子，右键…物体选项只是其中一项」）----------
  /** 单位按谁取：selection = 当前选区（几何层的右键 / 浮条，默认）；self = 你所在的这一层本身（物体钮）；children = 选中的子物体（子组件的物体菜单 → 物体设置…）。 */
  private unitTarget: MenuTarget = "selection";
  /** 目标不是选区时的单位：self = 这一层（object = 它本身；网格体 = 整个；硬表面的几何不算）；children = 选中的子物体（object = 那几份；子物体是网格体 = 整个）。 */
  private targetUnits(kind: UnitKind, includeLocked = false): Unit[] {
    const s = this.scene, at = this.activePool(), ctxDef = s.defOfContext(this.ctx);
    if (this.unitTarget === "self") {
      if (kind === "object") { const d = s.def(ctxDef); return [{ kind: "object", at, instance: null, def: d.id, name: ctxDef === s.root ? "最外层" : d.name, body: d.body.kind, copies: Math.max(1, s.instanceCount(d.id)), xf: IDENTITY }]; }
      return kind === "mesh" && this.activeKind() === "mesh" ? [{ kind: "mesh", def: at.def, sel: null, xf: IDENTITY }] : [];
    }
    const out: Unit[] = [];
    for (const p of this.selectedPools.values()) {
      if (p.kind !== "instance") continue;
      const inst = s.def(ctxDef).instances.get(p.instance);
      if (!inst || (inst.locked && !includeLocked)) continue;
      const d = s.def(inst.def);
      if (kind === "object") out.push({ kind: "object", at, instance: inst.id, def: d.id, name: d.name, body: d.body.kind, copies: s.instanceCount(d.id), xf: inst.xform });
      else if (kind === "mesh" && d.body.kind === "mesh" && !out.some((u) => u.kind === "mesh" && u.def === d.id)) out.push({ kind: "mesh", def: d.id, sel: null, xf: inst.xform });
    }
    return out;
  }
  /** 在某个目标下数 / 跑指令（物体窗口用；跑完恢复成选区）。 */
  withMenuTarget<T>(t: MenuTarget, fn: () => T): T { const prev = this.unitTarget; this.unitTarget = t; try { return fn(); } finally { this.unitTarget = prev; } }
  /** 物体窗口的第一行：设置的是哪个物体（user「选窗要说明选择的是哪个object」）。 */
  describeTarget(t: Exclude<MenuTarget, "selection">): { title: string; defs: number[] } {
    const s = this.scene, kindLabel = (d: number): string => (s.kindOf(d) === "mesh" ? "网格体" : "硬表面体");
    if (t === "self") { const d = s.defOfContext(this.ctx); return { title: `${d === s.root ? "最外层" : `组件「${s.def(d).name}」`}（${kindLabel(d)}）`, defs: [d] }; }
    const ctxDef = s.defOfContext(this.ctx), defs: number[] = [];
    let n = 0;
    for (const p of this.selectedPools.values()) if (p.kind === "instance") { n++; const inst = s.def(ctxDef).instances.get(p.instance); if (inst && !defs.includes(inst.def)) defs.push(inst.def); }
    return { title: n === 1 && defs.length === 1 ? `组件「${s.def(defs[0]).name}」（${kindLabel(defs[0])}）` : `选中的 ${n} 个物件`, defs };
  }
  /** 指令声明 perDefinition（改定义不改这一份）时按定义去重：同一定义几份实例只喂一次（copies 披露「N 份一起变」）。 */
  private unitsFor(c: Command, kind: UnitKind): Unit[] {
    const all = this.unitsOf(kind, !!c.takesLocked).filter((u) => u.kind !== "object" || u.instance !== null || !!c.takesContext);
    if (!c.perDefinition || kind !== "object") return all;
    const seen = new Set<DefId>();
    return all.filter((u) => u.kind === "object" && !seen.has(u.def) && !!seen.add(u.def));
  }
  /**
   * 跑一个动作（浮条 / 右键 / 以后的搜索与脚本）：按路由表把作用域里每种单位喂给它那条指令，全部调用合成一步；表里没有的种类跳过并说出来（不静默）。
   * 今天的两个特例（注册表第三步把 28 条选区动作搬进表时折进通用跑法）：只路由 brep 一种 = 修复那条路（作用域「选中的 / 整个物体」、含子物体、擦线估时、马后炮都在那）；只路由 object 一种 = 物体那条路（估时 + 按定义去重）。
   */
  runAction(id: string, params?: CmdParams): number {
    if (Editor.MIRROR_TOPO_ACTIONS.has(id) && this.mirrorGateEntry(actionById(id)?.label(1).replace(/（.*$/, "") ?? id, () => this.runAction(id, params))) return 0;   // 镜像编辑开着改拓扑：先问
    const a = actionById(id);
    if (!a) { this.host.hint(`动作「${id}」没装`); return 0; }
    const routes = routesOf(a);
    if (!params && routes.length === 1 && routes[0].kind === "brep") return this.repair(routes[0].command.id, this.unitTarget === "self" ? "context" : "auto");   // 物体窗口（self）= 整个物体，不看几何选区
    if (!params && routes.length === 1 && routes[0].kind === "object") return this.runObjectCommand(routes[0].command.id);
    return this.step((pass) => {
      // 单位只取一次：马后炮按新参数重做时用同一批（上一次做完的选区已经换成结果了）
      const plans = routes.map(({ kind, command: c }) => ({ c, units: this.unitsFor(c, kind) }));
      const skips: string[] = [];
      for (const kind of ["brep", "mesh", "object"] as const) if (!a.commands[kind] && this.unitsOf(kind).some((u) => u.kind !== "object" || u.instance !== null)) skips.push(`跳过了${kind === "brep" ? "硬表面体的几何" : kind === "mesh" ? "网格体的几何" : "选中的物件"}：「${a.label(0)}」不管它`);
      const valuesOf = (c: Command, units: readonly Unit[], p?: CmdParams): CmdParams => ({ ...c.defaults(this.repairCtx, units), ...(p ?? {}) });
      const go = (p?: CmdParams): number => {
        const ops: Op[] = [], notes = new Set<string>(skips), dones: { c: Command; n: number; v: CmdParams }[] = [];
        let sel: NonNullable<PlanOut["select"]> | null = null, selN = 0;   // 做完的选区（PlanOut.select；只有一个单位给了才用）
        let count = 0;
        for (const { c, units } of plans) {
          const v = valuesOf(c, units, p);
          let n = 0;
          for (const u of units) { const r = c.plan(this.repairCtx, u, v); ops.push(...r.ops); n += r.count; for (const t of r.notes ?? []) notes.add(t); if (r.select && r.ops.length) { sel = r.select; selN++; } }
          if (n) dones.push({ c, n, v });
          count += n;
        }
        const tail = [...notes].map((t) => `；${t}`).join("");
        if (!ops.length) { this.host.hint(`${[...new Set(routes.map((r) => r.command.none))].join("；")}${tail}`); return 0; }
        const n0 = this.opCount;
        for (const op of ops) { this.commitIn(pass, op); if (this.opCount === n0 && this.stepFailed) return 0; }
        if (this.opCount === n0) return 0;
        if (sel && selN === 1) { const S = sel; this.clearSel(pass); for (const x of S.verts ?? []) this.selection.verts.add(x); for (const x of S.edges ?? []) this.selection.edges.add(x); for (const x of S.faces ?? []) this.selection.faces.add(x); this.pruneSelection(); this.afterSelect(pass); }
        this.host.hint(`${dones.map((d) => d.c.done(d.n, 0, d.v)).join("；")}${tail}${this.mirrorNote ? ` ｜ ${this.mirrorNote}` : ""}`); this.mirrorNoteShown = true;
        this.host.changed(); this.draw();
        return count;
      };
      const n0 = this.opCount, count = go(params);
      // 有参数的指令（只路由到一条、从菜单点的 = 没带参数）给马后炮：做完就能改数（右键「插入」的宽度等；同新建、物体指令那套）。带了参数的调用（api / 搜索）不开界面
      const one = plans.length === 1 && !params ? plans[0] : null, fields = one ? one.c.params(this.repairCtx) : [];
      if (count && one && fields.length) this.offerAfterthought(one.c.title, fields, valuesOf(one.c, one.units, params), this.opCount - n0, (v) => { go(v); });
      return count;
    });
  }
  /** 确认了要等的大活：先请宿主把细进度条画出来（画上了再跑——跑的时候主线程卡住、画不了），跑完收起（账本 UX7）。 */
  private runSlow(label: string, run: () => void): void {
    const go = (): void => { try { run(); } finally { this.host.working?.(null); } };
    const w = this.host.working?.(`${label}：在算…`);
    if (w && typeof (w as Promise<void>).then === "function") void (w as Promise<void>).then(go); else go();
  }
  /** 跑一条物体指令：一次 = 一步；要等很久先问；做完说清做了什么、丢了什么；有参数的给马后炮。 */
  private runObjectCommand(id: CommandId): number {
    const c = commandById(id) as Command<ObjectUnit>, v0 = c.defaults(this.repairCtx), units = this.unitsFor(c, "object") as ObjectUnit[];
    const q = c.ask?.(this.repairCtx, units, v0);   // 先问一句（跨种类转）：点了「做」才带着补的参数跑；不能问 = 如实说没做
    if (q) {
      if (!this.host.confirm) { this.host.hint(`${c.title}：${q.message}（这里不能问，没做）`); return 0; }
      void this.host.confirm(q.title, q.message, q.okLabel).then((ok) => { if (ok) this.runObjectNow(c, units, { ...v0, ...q.params }); else { this.host.hint(`${c.title}：没做（你选了不转）`); this.draw(); } });
      return 0;
    }
    const est = c.estimate?.(this.repairCtx, units, v0);
    if (est && est.seconds >= Editor.ERASE_ASK_SECONDS && this.host.confirm) {
      const t = est.seconds < 90 ? `${Math.round(est.seconds)} 秒` : `${(est.seconds / 60).toFixed(1)} 分钟`;
      void this.host.confirm(`${c.title}：要等一会儿`, `${est.what}，估计 ${t} 左右（按量级估），期间界面会卡住。要做吗？`, "做（会卡住一会儿）").then((ok) => { if (ok) this.runSlow(c.title, () => this.runObjectNow(c, units, v0)); else { this.host.hint(`${c.title}：没做（你选了不做）`); this.draw(); } });
      return 0;
    }
    return this.runObjectNow(c, units, v0);
  }
  private runObjectNow(c: Command<ObjectUnit>, units: readonly ObjectUnit[], v0: CmdParams): number { return this.step((pass) => {
    const go = (v: CmdParams): number => {
      const ops: Op[] = [], notes = new Set<string>();
      let count = 0;
      for (const u of units) { const r = c.plan(this.repairCtx, u, v); ops.push(...r.ops); count += r.count; for (const n of r.notes ?? []) notes.add(n); for (const i of r.selectObjects ?? []) selectAfter.add(i); }
      const tail = [...notes].map((n) => `；${n}`).join("");
      if (!ops.length) { this.host.hint(`${c.none}${tail}`); return 0; }
      const n0 = this.opCount;
      for (const op of ops) { this.commitIn(pass, op); if (this.opCount === n0 && this.stepFailed) return 0; }
      if (this.opCount === n0) return 0;
      this.host.hint(`${c.done(count, 0, v)}${tail}`);
      return count;
    };
    const selectAfter = new Set<InstId>();
    const n0 = this.opCount, count = go(v0);
    if (count && c.params(this.repairCtx).length) this.offerAfterthought(c.title, c.params(this.repairCtx), v0, this.opCount - n0, (v) => { go(v); });
    if (!count) { this.host.changed(); this.draw(); return 0; }
    if (selectAfter.size) { this.clearSel(pass); for (const i of selectAfter) if (this.scene.def(this.scene.defOfContext(this.ctx)).instances.has(i)) this.selectedPools.set(`i${i}`, { kind: "instance", instance: i }); }   // 做完选中（合并 = 留下的那个）
    else if (!c.keepSelection) this.clearSel(pass);   // 身体换了种类 / 炸开：旧的选区对不上，清掉（诚实）；锁 / 藏 / 做成唯一留着
    this.host.changed(); this.draw();
    return count;
  }); }
  /** 各修复指令在一个池里要做的事（纯规划；不提交）。 */
  private repairPlan(kind: RepairKind, at: PoolRef, sel: BrepSelection | null, v: Readonly<Record<string, ParamValue>>, xf: Xform = IDENTITY): PlanOut {
    return this.repairModule(kind).plan(this.repairCtx, { kind: "brep", at, sel, xf }, v);
  }
  /** 「吸到格点」格子边长的选项：第一项 = 画图用的那个格子；后面按文档的格子制式给常用档（公制 / 英尺英寸）。值 = 米数的字符串。 */
  private snapStepChoices(): { id: string; label: string; hint?: string }[] {
    const fine = this.gridFineStep();
    const fixed: [number, string][] = gridPreset(this._grid.preset).unit === "ft"
      ? [[0.3048, "1 ft"], [0.1524, "6 in"], [0.0254, "1 in"], [0.00635, "1/4 in"], [0.0015875, "1/16 in"]]
      : [[1, "1 m"], [0.1, "10 cm"], [0.05, "5 cm"], [0.01, "1 cm"], [0.005, "5 mm"], [0.001, "1 mm"]];
    return [{ id: "grid", label: `画图的格子（${fmtLen(fine)}）`, hint: "格距 ÷ 细分，和画图时吸附的格点同一套" }, ...fixed.filter(([m]) => Math.abs(m - fine) > 1e-9).map(([m, label]) => ({ id: String(m), label }))];
  }
  /** 画图吸附用的那个格子边长（格距 ÷ 细分；「吸到格点」的默认）。 */
  private gridFineStep(): number { return this._grid.step / this._grid.subdiv; }
  /**
   * 「吸到格点」的格子（池本地坐标 → 格子坐标）。own = 这个池自己的坐标架（根 = 绘图轴、组 = 组的坐标架、组件 = 定义的坐标架，没摆过 = 组件原点）；
   * world = 根上的绘图轴（= 在根上看到的格子），经当前上下文 + xf 换到这个池里。
   */
  private snapLattice(at: PoolRef, xf: Xform, frame: "own" | "world"): Xform {
    const s = this.scene;
    if (frame === "world") return compose(invert(frameToXform(s.axes)), compose(s.xformOfContext(this.ctx), xf));
    const body = s.brep(at.def);
    const f = at.group !== null ? s.group({ def: at.def, group: at.group }).axes : at.def === s.root ? s.axes : body.drawFrame ?? WORLD_FRAME;
    return invert(frameToXform(f));
  }
  private repairDefaults(kind: RepairKind): Record<string, ParamValue> { return this.repairModule(kind).defaults(this.repairCtx); }
  private repairCountCache: { key: string; n: number } | null = null;
  /** 菜单上的数字：按现在的范围（含子物体按会话记住的）这条修复指令会碰几处。按场景版本 + 选区签名缓存（菜单每次重画都问）。 */
  repairCount(kind: RepairKind, scope: "auto" | "context" = "auto"): number {
    const key = `${kind}|${this.repairKey(scope, this.repairChildren)}`;
    if (this.repairCountCache?.key === key) return this.repairCountCache.n;
    const sc = this.repairScope(scope, this.repairChildren), v = this.repairDefaults(kind);
    let n = 0;
    for (const p of sc.pools) n += this.repairPlan(kind, p.at, p.sel, v, p.xf).count;
    this.repairCountCache = { key, n };
    return n;
  }
  /** 一条修复指令这一次做了什么（提交 op，不出提示）。failed = 被拒（报错已出）。 */
  private runRepair(pass: StepPass, kind: RepairKind, scope: "auto" | "context", v: Readonly<Record<string, ParamValue>>): { count: number; text: string; scope: string; failed: boolean } {
    const sc = this.repairScope(scope, v.children !== false), names = this.repairModule(kind);
    let count = 0, extra = 0, skipped = 0;
    const ops: Op[] = [];
    // deepFirst（恢复层级）：深的池先跑（父层会把素组合进组件；先合了父层，轮到那个组自己时它已经不在了）
    const depth = (at: PoolRef): number => { if (at.group === null) return 0; let d = 1; for (let g = this.scene.group({ def: at.def, group: at.group }).parent; g !== null && d < 64; d++) g = this.scene.group({ def: at.def, group: g }).parent; return d; };
    const pools = names.deepFirst ? [...sc.pools].sort((a, b) => depth(b.at) - depth(a.at)) : sc.pools;
    const notes = new Set<string>();
    for (const p of pools) { const r = this.repairPlan(kind, p.at, p.sel, v, p.xf); ops.push(...r.ops); count += r.count; extra += r.extra ?? 0; skipped += r.skipped ?? 0; for (const n of r.notes ?? []) notes.add(n); }
    const skipText = `${skipped && names.skippedText ? `；${names.skippedText(skipped, v)}` : ""}${[...notes].map((n) => `；${n}`).join("")}`;
    const scopeText = `${this.scopeText(sc)}${skipText}`;
    if (!ops.length) return { count: 0, text: names.none, scope: scopeText, failed: false };
    // 会挪点的修复（tally：拉正 / 吸到格点）的披露：合并了几个点（落到同一格点）、面多了几张（折开 / 三角化）——账本 DT4「预演照样报『合并 N 点 / 折 M 张面』」
    const tally = (): { v: number; f: number } => { let nv = 0, nf = 0; for (const p of sc.pools) { const k = this.scene.kernelOf(p.at); nv += k.vertices().length; nf += k.faces().length; } return { v: nv, f: nf }; };
    const before = names.tally ? tally() : null;
    const n0 = this.opCount;
    for (const op of ops) { this.commitIn(pass, op); if (this.opCount === n0 && this.stepFailed) return { count: 0, text: "", scope: scopeText, failed: true }; }
    if (this.opCount === n0) return { count: 0, text: "", scope: scopeText, failed: true };
    let more = "";
    if (before) { const after = tally(), merged = before.v - after.v, folded = after.f - before.f; more = [merged > 0 ? `合并了 ${merged} 个点` : "", folded > 0 ? `面多了 ${folded} 张（被吸歪的面折开 / 三角化，折缝 = ${v.crease === "hard" ? "硬边" : "软边"}）` : ""].filter(Boolean).join("，"); if (more) more = `；${more}`; }
    return { count, text: `${names.done(count, extra, v)}${more}`, scope: scopeText, failed: false };
  }
  /** 各修复指令自己的参数（马后炮里改）。 */
  private repairFields(kind: RepairKind): ParamField[] { return this.repairModule(kind).params(this.repairCtx); }
  /** 跑一条修复指令：一次 = 一步（原子）；之后右下角参数小窗（含子物体 + 这条指令自己的参数），改了 = 撤掉按新值重做。返回碰了几处。 */
  repair(kind: RepairKind, scope: "auto" | "context" = "auto"): number {
    const v0: Record<string, ParamValue> = { children: this.repairChildren, ...this.repairDefaults(kind) };
    // 大物体上要擦线 = 要等一会儿：先问，不替 user 决定不做（user 10-26「不要因为性能静默不做，宁愿弹警告问yes no。诚实性问题」）
    const est = this.host.confirm ? this.eraseEstimate([{ kind, v: v0 }], scope) : null;
    if (est) {
      const title = this.repairModule(kind).title;
      void this.host.confirm!(`${title}：要等一会儿`, this.eraseAskText(title, est), "做（会卡住一会儿）").then((ok) => { if (ok) this.runSlow(title, () => this.repairNow(kind, scope, v0)); else { this.host.hint(`${title}：没做（你选了不做）`); this.draw(); } });
      return 0;
    }
    return this.repairNow(kind, scope, v0);
  }
  /** 大物体上擦线的量级估计。v0.15.4 擦边局部化（Fable 账单 T2）之后坦克（3.2 万面）擦 50 条 45 ms、200 条 76 ms（以前 95 s），按面数线性推算（剩下的是一次扫边）。量纲：秒。 */
  private static readonly ERASE_REF = { faces: 32220, seconds: 0.1 };
  /** 估计超过这么多秒才问（量纲：秒；AI 定的门槛）。 */
  private static readonly ERASE_ASK_SECONDS = 5;
  private eraseEstimate(steps: readonly { kind: RepairKind; v: Readonly<Record<string, ParamValue>> }[], scope: "auto" | "context"): { edges: number; seconds: number; faces: number } | null {
    let edges = 0, seconds = 0, faces = 0;
    for (const { kind, v } of steps) for (const p of this.repairScope(scope, v.children !== false).pools) {
      const r = this.repairPlan(kind, p.at, p.sel, v, p.xf);
      if (!r.erases) continue;
      const F = this.scene.kernelOf(p.at).faces().length;
      edges += r.erases; faces = Math.max(faces, F); seconds += Editor.ERASE_REF.seconds * (F / Editor.ERASE_REF.faces);
    }
    return edges && seconds >= Editor.ERASE_ASK_SECONDS ? { edges, seconds, faces } : null;
  }
  private eraseAskText(title: string, e: { edges: number; seconds: number; faces: number }): string {
    const t = e.seconds < 90 ? `${Math.round(e.seconds)} 秒` : `${(e.seconds / 60).toFixed(1)} 分钟`;
    return `${title}要擦掉 ${e.edges} 条面和面之间的线。内核现在每擦一次线都要把整个物件重新整理一遍（这里最大的物件有 ${e.faces} 张面），估计要 ${t} 左右，期间界面会卡住——按坦克 3.2 万面实测一次约 95 秒推算，只是量级。要做吗？`;
  }
  private repairNow(kind: RepairKind, scope: "auto" | "context", v0: Record<string, ParamValue>): number { return this.step((pass) => {
    const go = (v: Readonly<Record<string, ParamValue>>): number => {
      const r = this.runRepair(pass, kind, scope, v);
      if (!r.failed) this.host.hint(`${r.text}（${r.scope}）`);
      return r.count;
    };
    const n0 = this.opCount;
    const count = go(v0);
    if (!count && !this.repairModule(kind).offerAlways) return 0;
    this.offerAfterthought(this.repairModule(kind).title, [{ key: "children", def: { kind: "bool", label: "含子物件" } }, ...this.repairFields(kind)], v0, this.opCount - n0,
      (v) => { this.repairChildren = v.children !== false; go(v); });
    this.host.changed(); this.draw();
    return count;
  }); }

  // ---------- 修复面板（纪元账本 DT6 + DT9「检查」，排期 T6）----------
  // user 10-25「要不所有的东西整合到一个修复面板里面？」→「面板同意」；「修复窗口里面可以加一个检查的模式，可以高亮这种小伤」（看起来平、其实折过的软边：推拉推不动、用户不知道为什么）。
  // 住右下角参数小窗（DT28：不另做对话框），马前炮：勾几步 → 说明行按现在的样子数每步会碰几处 → 应用 = 按固定顺序跑完 = 一步撤销 → 马后炮改勾选重做。
  // AI 定的默认（默认 + 披露，user 没拍）：焊断口 / 拍平 / 软边变硬默认勾（只动小毛病），吸到格点默认不勾（会挪点、合并点，看格子大小）；每步的细参数用各自默认值，要细调从菜单单独跑那条。
  /** 「检查」的门槛：弯折 ≤ 这么多度的软边 = 看起来平、其实被折过（折线层是有意折的，不算）。量纲：度。 */
  private static readonly SUBTLE_FOLD_DEG = 1;
  /** 修复面板里跑的顺序 = 清单顺序（repairs/index.ts 头注释说为什么是这个顺序）。 */
  private static readonly REPAIR_ORDER: readonly RepairKind[] = REPAIR_STEPS.map((s) => s.command);
  /** 当前的修复面板会话（马前炮或应用后的马后炮）；它在右下角开着时才画「检查」高亮。 */
  private repairSession: ParamSession | null = null;
  private repairInspect = true;
  repairPanelOpen(): boolean { return !!this.repairSession && this.param === this.repairSession && !this.repairSession.stale?.(); }
  /** 选区 / 场景版本签名（修复计数的缓存键）。 */
  private repairKey(scope: string, children: boolean): string {
    const sel = this.selection;
    return `${scope}|${this._revision}|${children}|${sel.faces.size},${sel.edges.size},${sel.verts.size}|${[...sel.faces].slice(0, 8).join(",")}|${[...sel.edges].slice(0, 8).join(",")}|${[...this.selectedPools.keys()].join(",")}|${this.ctxKey()}`;
  }
  private subtleCache: { key: string; byPool: Map<string, EdgeId[]>; n: number } | null = null;
  /** 「检查」：范围里看起来平、其实折过的软边（弯折 ≤ SUBTLE_FOLD_DEG，两侧都是面；折线不算）。按池给（键 = poolKey）。 */
  private subtleFolds(children: boolean): { byPool: Map<string, EdgeId[]>; n: number } {
    const key = this.repairKey("auto", children);
    if (this.subtleCache?.key === key) return this.subtleCache;
    const byPool = new Map<string, EdgeId[]>();
    let n = 0;
    for (const p of this.repairScope("auto", children).pools) {
      const k = this.scene.kernelOf(p.at), cand = new Set<EdgeId>();
      if (p.sel) { for (const e of p.sel.edges) cand.add(e); for (const f of p.sel.faces) { const F = k.face(f); if (F) for (const r of [F.outer, ...F.holes]) for (const d of r.edges) cand.add(d.edge); } }
      else for (const e of k.edges()) cand.add(e.id);
      const hit = [...cand].filter((e) => { if (!k.graph.hasEdge(e) || !k.isSoft(e) || k.isFold(e) || k.graph.edge(e).faceLinks.length !== 2) return false; const b = k.bendDeg(e); return b !== null && b <= Editor.SUBTLE_FOLD_DEG; });
      if (hit.length) { byPool.set(poolKey(p.at), hit); n += hit.length; }
    }
    this.subtleCache = { key, byPool, n };
    return this.subtleCache;
  }
  /** 菜单上露不露「修复…」：有任何一步会碰东西，或者有要检查的小伤。 */
  repairWorth(): boolean { return Editor.REPAIR_ORDER.some((k) => this.repairMenuCount(k) > 0) || this.subtleFolds(this.repairChildren).n > 0; }
  private quickCache = new Map<RepairKind, { key: string; n: number }>();
  /** 菜单上的数：模块有便宜数法（quickCount）就用它（大模型上每步都要算），没有就用完整规划的 count。 */
  repairMenuCount(kind: RepairKind, scope: "auto" | "context" = "auto"): number {
    const m = this.repairModule(kind);
    if (!m.quickCount) return this.repairCount(kind, scope);
    const key = this.repairKey(scope, this.repairChildren), hit = this.quickCache.get(kind);
    if (hit?.key === key) return hit.n;
    let n = 0;
    for (const p of this.repairScope(scope, this.repairChildren).pools) n += m.quickCount(this.repairCtx, p);
    this.quickCache.set(kind, { key, n });
    return n;
  }
  /** 「检查」高亮：画面上的边 id（每个画到这些池的槽都算）。修复面板没开 / 检查关着 = null。 */
  private inspectHighlights(view: WorldView): Set<number> | null {
    if (!this.repairInspect || !this.repairPanelOpen()) return null;
    const { byPool } = this.subtleFolds(this.repairChildren);
    if (!byPool.size) return null;
    const out = new Set<number>();
    for (const sl of view.slots) { const ids = byPool.get(poolKey(sl.pool)); if (ids) for (const id of ids) out.add(id + sl.index * (1 << 22)); }
    return out;
  }
  /** 打开修复面板（马前炮）。 */
  beginRepairPanel(): void {
    return this.step((pass) => {
    this.cancelGesture();
    const vals: Record<string, ParamValue> = { children: this.repairChildren, inspect: this.repairInspect };
    for (const s of REPAIR_STEPS) vals[s.command] = s.on;   // 默认勾不勾 = 步骤表说（拉正 / 焊断口 / 拍平 / 软边变硬勾：只动小毛病；吸格点 / 恢复层级不勾）
    const stepFields = (): ParamField[] => REPAIR_STEPS.map((s) => ({ key: s.command, def: { kind: "bool" as const, label: s.label(this.repairCtx) } }));
    const fields: ParamField[] = [{ key: "children", def: { kind: "bool", label: "含子物件" } }, { key: "inspect", def: { kind: "bool", label: "检查：高亮看起来平、其实折过的软边" } }, ...stepFields()];
    const note = (v: Readonly<Record<string, ParamValue>>): string => {
      const ch = v.children !== false, counts = Editor.REPAIR_ORDER.filter((k) => v[k]).map((k) => {
        const sc = this.repairScope("auto", ch), dv = { ...this.repairDefaults(k), children: ch };
        let n = 0; for (const p of sc.pools) n += this.repairPlan(k, p.at, p.sel, dv, p.xf).count;
        return `${this.repairModule(k).title} ${n}`;
      });
      const sub = this.subtleFolds(ch).n;
      return `会碰（按现在的样子数，前一步做完后一步可能变）：${counts.length ? counts.join(" · ") : "没勾"}；检查：${sub ? `${sub} 条微折软边${v.inspect ? "（橙色高亮）" : ""}` : "没有微折软边"}`;
    };
    const runAll = (v: Readonly<Record<string, ParamValue>>): string[] => {
      const parts: string[] = [];
      for (const k of Editor.REPAIR_ORDER) {
        if (!v[k]) continue;
        const r = this.runRepair(pass, k, "auto", { ...this.repairDefaults(k), children: v.children !== false });
        if (r.failed) { parts.push(`${this.repairModule(k).title}：被拒，后面的没做`); break; }
        if (r.count) parts.push(r.text);
      }
      return parts;
    };
    const apply = (): void => {
      // 大物体上要擦线：先问（同编辑条入口）
      const est = this.host.confirm ? this.eraseEstimate(REPAIR_STEPS.filter((s) => vals[s.command]).map((s) => ({ kind: s.command, v: { ...this.repairDefaults(s.command), children: vals.children !== false } })), "auto") : null;
      if (est) { void this.host.confirm!("修复：要等一会儿", this.eraseAskText("这几步", est), "做（会卡住一会儿）").then((ok) => { if (ok) this.runSlow("修复", applyNow); else { this.host.hint("修复：没做（你选了不做）"); this.draw(); } }); return; }
      applyNow();
    };
    const applyNow = (): void => { this.step((pass) => {
      this.repairChildren = vals.children !== false; this.repairInspect = !!vals.inspect;
      const n0 = this.opCount, parts = runAll(vals), sc = this.scopeText(this.repairScope("auto", vals.children !== false));
      if (this.opCount === n0) { this.host.hint(`修复：没有要改的（${sc}）`); this.openParamSession(null); return; }
      const after = afterthought({ title: "修复", fields: [{ key: "children", def: { kind: "bool", label: "含子物件" } }, ...stepFields()], values: { ...vals }, nOps: this.opCount - n0, opCount: () => this.opCount, undoN: (n) => this.undoN(n),
        redo: (v) => { this.repairChildren = v.children !== false; const ps = runAll(v); this.host.hint(`修复：${ps.length ? ps.join("；") : "没有要改的"}（${this.scopeText(this.repairScope("auto", v.children !== false))}）`); },
        note: (v) => { const sub = this.subtleFolds(v.children !== false).n; return sub ? `还剩 ${sub} 条微折软边（橙色高亮）` : "没有剩下的微折软边"; } });
      this.repairSession = after; this.openParamSession(after);
      this.host.hint(`修复：${parts.join("；")}（${sc}）；右下角还能改勾选重做`);
      this.host.changed(); this.draw();
    }); };
    const session: ParamSession = {
      phase: "before", title: "修复", fields, buttons: [{ key: "cancel", label: "取消" }, { key: "apply", label: "应用", primary: true }], values: vals,
      get note() { return note(vals); },
      set: (key, v) => { vals[key] = v; if (key === "children") this.repairChildren = v !== false; if (key === "inspect") this.repairInspect = !!v; this.host.changed(); this.draw(); },
      press: (key) => { if (key === "apply") apply(); else if (key === "cancel") { this.openParamSession(null); this.host.hint("修复已取消"); this.draw(); } },
    };
    this.repairSession = session; this.openParamSession(session);
    this.host.hint("修复：右下角勾要做的几步，说明行数着每步会碰几处；「检查」把看起来平、其实折过的软边标成橙色");
    this.draw();
    });   // 打开面板这一下包成一步：面板里「应用」的闭包要带着通行证（应用时由 pressParam 包成真正的一步）
  }
  /** 兼容老入口（☰「焊接全部断口」/ 选区「焊接断口」）。 */
  weldAllBreaks(scope: "auto" | "context" = "auto"): number { return this.repair("brep.weld", scope); }
  /** 兼容老入口（☰「拍平几乎共面的面」/ 选区「拍平」）。 */
  makePlanar(scope: "auto" | "context" = "auto"): number { return this.repair("brep.planar", scope); }
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
  hasHideableSelection(): boolean { return this.hasGeometrySelection() || this.selectedPools.size > 0 || guidesOf(this.selection).size > 0; }   // 点不单独藏
  /** 藏起选区（每处一条 op，一步撤完）。返回藏了几样（实例 + 面 + 线）。 */
  hideSelection(): number { return this.step((pass) => this.hideSelectionStep(pass)); }
  private hideSelectionStep(pass: StepPass): number {
    const at = this.activePool(), def = at.def;
    let n = 0;
    if (this.activeKind() === "brep") {   // 几何 + 组（硬表面才有）：手写；直接选中的实例 → 注册表 object.hide（两种身体都行）
      const k = this.kernel, body = this.scene.brep(def);
      const faces = [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f));
      const edges = [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
      if (faces.length || edges.length) { this.commitIn(pass, { op: "setHidden", at, faces, edges, on: true }); n += faces.length + edges.length; }
      // 组：整棵子树（子组的面 / 线 + 放在这棵树里的实例）
      const groupIds = [...this.selectedPools.values()].filter((p) => p.kind === "group").map((p) => (p as { group: GroupId }).group);
      const tree = new Set<GroupId>(groupIds);
      for (let grew = true; grew;) { grew = false; for (const g of body.groups.values()) if (g.parent !== null && tree.has(g.parent) && !tree.has(g.id)) { tree.add(g.id); grew = true; } }
      for (const gid of tree) {
        const gk = body.groups.get(gid)!.kernel;
        const gf = gk.faces().filter((f) => !gk.isFaceHidden(f.id)).map((f) => faceKey(gk, f.id)), ge = gk.edges().filter((e) => !gk.isEdgeHidden(e.id)).map((e) => edgeKey(gk, e.id));
        if (gf.length || ge.length) { this.commitIn(pass, { op: "setHidden", at: { def, group: gid }, faces: gf, edges: ge, on: true }); n += gf.length + ge.length; }
      }
      for (const i of this.scene.def(def).instances.values()) if (i.parent !== null && tree.has(i.parent) && !i.hidden) { this.commitIn(pass, { op: "setHidden", at: { def, group: i.parent }, instance: i.id, on: true }); n++; }
    }
    if (this.activeKind() !== "brep" && this.hasGeometrySelection() && !this.selectedPools.size) { this.requireBrep("隐藏"); return 0; }   // 网格体的面 / 线还藏不了：如实说（物件照藏）
    if (this.selectedPools.size) n += this.runAction("hide");   // 直接选中的实例（同一步；两种身体都行）
    if (!n) return 0;
    this.clearSel(pass);
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
    return this.step((pass) => {
    const c = this.hiddenCount(), n = c.instances + c.faces + c.edges;
    if (!n) { this.host.hint("没有隐藏的东西"); return 0; }
    this.commitIn(pass, { op: "unhideAll" });
    this.host.hint(`全部放回来了（${[c.instances ? `组件 ${c.instances} 份` : "", c.faces ? `面 ${c.faces}` : "", c.edges ? `线 ${c.edges}` : ""].filter(Boolean).join("、")}）`);
    this.host.changed(); this.draw();
    return n;
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  /** 进入选中（或命中）的子 group / 实例编辑。 */
  enterPool(p: PoolPick): void {
    return this.step((pass) => {
    if (p.kind === "group" && !(this.scene.def(this.scene.defOfContext(this.ctx)).body.kind === "brep" && this.scene.brep(this.scene.defOfContext(this.ctx)).groups.get(p.group)?.parent === this.ctx.group)) { this.host.hint("要进的那个组不在这一层（选区过期了）"); return; }
    if (this.pickIsLocked(p)) { this.host.hint("已锁定：解锁后再进入（选中它 → 解锁）"); return; }
    if (p.kind === "instance") {   // 进一份实例 = 进它的定义：那种身体得有工作台管（KindDef.modes 登记 + 这里装了那个 Mode），没有就诚实拦住
      const inst = this.scene.def(this.scene.defOfContext(this.ctx)).instances.get(p.instance);
      if (!inst || inst.parent !== this.ctx.group) { this.host.hint("要进的那个组件不在这一层（选区过期了）"); return; }   // 规章定义的结果（设计稿 §2 I5）：过期的拾取不炸
      const kind = this.scene.kindOf(inst.def);
      if (!KINDS[kind].modes.length || !this.modeList.some((m) => (m.kinds as readonly BodyKind[]).includes(kind))) { this.host.hint(`${KINDS[kind].label}：还没有能编辑它的工作台，现在只能整体挪 / 转 / 缩`); return; }
    }
    this.last = null;
    this.cancelGesture();
    this.clearSel(pass);
    this.setCtx(pass, p.kind === "group" ? { chain: this.ctx.chain, group: p.group } : { chain: [...this.ctx.chain, p.instance], group: null });
    this.selection = this.blankSelection();   // 上下文定了再造（选区的 id 空间 = 活动池的种类；写口已标过）；工作台在 setCtx 里已经跟上
    this._revision++;
    this.host.changed(); this.draw();
    });
  }
  enterSelected(): boolean {
    const p = [...this.selectedPools.values()][0];
    if (!p) return false;
    this.enterPool(p);
    return true;
  }
  /** 退出一层（到父 group / 父实例）；已在根 → false。 */
  exitContext(): boolean {
    return this.step((pass) => {
    this.last = null;
    if (this.ctx.chain.length === 0 && this.ctx.group === null) return false;
    this.cancelGesture();
    this.clearSel(pass);
    const def = this.scene.defOfContext(this.ctx);
    let reselect: PoolPick | null = null;
    if (this.ctx.group !== null) {
      const g = this.scene.group({ def, group: this.ctx.group });
      reselect = { kind: "group", group: g.id };
      this.setCtx(pass, { chain: this.ctx.chain, group: g.parent });
    } else {
      const chain = this.ctx.chain.slice(0, -1);
      const parentDef = this.scene.defOfContext({ chain, group: null });
      const inst = this.scene.instance(parentDef, this.ctx.chain[this.ctx.chain.length - 1]);
      reselect = { kind: "instance", instance: inst.id };
      this.setCtx(pass, { chain, group: inst.parent });
    }
    this.selection = this.blankSelection();   // 退到的那层可能是另一种身体（从网格体退回硬表面体；写口已标过；工作台在 setCtx 里已经跟上）
    if (reselect) this.selectedPools.set(this.pickKey(reselect), reselect);
    this._revision++;
    this.host.changed(); this.draw();
    return true;
    });
  }

  // ---------- 材质 / 油漆桶 ----------
  get paint(): PaintPick { return this.paintPick; }
  setPaint(p: PaintPick): void { this.paintPick = p; this.host.changed(); }
  /** 文档材质表（只读）。 */
  materials(): readonly import("../scene/scene.ts").Material[] { return this.scene.materials; }
  /** 蘸的材质在文档材质表里的索引（没有就新建一条 addMaterial op）；null = 默认。 */
  private materialIndexForPick(pass: StepPass): number | null {
    const p = this.paintPick;
    if (!p) return null;
    const same = (m: import("../scene/scene.ts").Material): boolean => p.kind === "color"
      ? !m.texture && m.name === p.name && m.color.every((c, i) => Math.abs(c - p.color[i]) < 1e-6)
      : !!m.texture && m.name === p.name && m.texture.bytes === p.bytes;
    const i = this.scene.materials.findIndex(same);
    if (i >= 0) return i;
    if (p.kind === "color") this.commitIn(pass, { op: "addMaterial", name: p.name, color: p.color });
    else this.commitIn(pass, { op: "addMaterial", name: p.name, color: [1, 1, 1], texture: { mimeType: p.mimeType, bytes: p.bytes, sizeM: p.sizeM } });
    return this.scene.materials.length - 1;
  }
  /** 给活动池里的这些面涂当前材质（op）。 */
  paintFaces(faces: readonly FaceId[], sides?: readonly (0 | 1)[]): void {
    return this.step((pass) => {
    const k = this.kernel;
    const idx = faces.map((f, i) => i).filter((i) => k.face(faces[i]));
    if (!idx.length) return;
    const keys = idx.map((i) => faceKey(k, faces[i]));
    const material = this.materialIndexForPick(pass);
    this.commitIn(pass, { op: "paintFaces", at: this.activePool(), faces: keys, material, ...(sides ? { sides: idx.map((i) => sides[i] ?? 0) } : {}) });   // DT8：sides = 每张面涂哪一侧；不给 = 两侧
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
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
    return this.step((pass) => {
    if (!this.requireBrep("软化 / 硬化")) return;
    const k = this.kernel;
    const edges = ids.filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
    if (!edges.length) return;
    this.commitIn(pass, { op: "setEdgeLayers", at: this.activePool(), edges, layers: ["soft", "smooth"], on });
    this.draw();
    });   // 一个用户动作 = 一步（op + 之后的选区一起；2026-10-28 Opus：以前在步外提交，后面改选区被补记成一条空的「选区」步、多条 op 拆成好几步撤销）
  }
  /** 按二面角阈值软化：有选区 → 选区的边（含选中膜的环边）；否则活动池全部。只碰恰好两膜的边。 */
  softenByAngle(maxDeg: number, on = true): number {
    if (!this.requireBrep("软化 / 硬化")) return 0;
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
    if (!this.requireBrep("软化 / 硬化")) return 0;
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
    if (this.contextDepth() > 0) { const s = this.worldView().activeSlot(); const b = poolBounds(s.kernel, s.xform); if (b) out.push({ key: "obj", label: "当前物件", b }); }
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
  /** 镜像面把手这一帧在屏上的位置（探针用：别在外面另抄一份把手大小的算法；不在镜像会话 = null）。 */
  gizmoHandlesPx(): Partial<Record<GizmoHandle, { x: number; y: number }>> | null {
    if (!this.gizmo) return null;
    const pf = this.frame(), vp = this.fvp(), G = gizmoGeom(this.gizmo.g, pf, vp), out: Partial<Record<GizmoHandle, { x: number; y: number }>> = {};
    for (const h of Object.keys(G.handles) as GizmoHandle[]) { const q = pf.project?.(G.handles[h], vp); if (q) out[h] = q; }
    return out;
  }
  /** 镜像…：作用在选区（散几何 + 选中的组件实例）上；没有可镜的 → false。 */
  beginMirror(): boolean {
    return this.step((pass) => {
    if (!this.requireBrep("镜像")) return false;
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
      { key: "weld", def: { kind: "number", label: "融合阈值", min: 0, max: 0.1, step: 0.001, quantity: { q: "length" } } },
      { key: "guardMm", def: { kind: "number", label: "防碎距离", min: 0, max: 2, step: 0.01, unit: " mm" } },   // 2026-10-26 user「加防碎距离」：离镜像面这么近的点吸上去、太短的切段不要；0 = 关（小零件调小）
      ...(instPicks.length ? [{ key: "instances", def: { kind: "bool" as const, label: "组件也镜" } }] : []),
    ];
    const buttons: ParamButton[] = [{ key: "axX", label: "X" }, { key: "axY", label: "Y" }, { key: "axZ", label: "Z" }, { key: "flip", label: "翻转" }, { key: "cancel", label: "取消" }, { key: "apply", label: "应用", primary: true }];
    const opOf = (v: Readonly<Record<string, ParamValue>>, pl: MirrorPlane): Op => ({ op: "mirror", at, faces: faceKeys, edges: edgeKeys, instances: v.instances ? instPicks.map((p) => p.instance) : [], plane: pl, ...opts(v) });
    const apply = (): void => {
      const pl = planeLocal(), n0 = this.opCount;
      this.endMirror();
      this.commitIn(pass, opOf(vals, pl));
      if (this.opCount === n0) return;   // 被拒（破面 / 锁着）：报错已出，不进马后炮
      this.clearSel(pass);
      this.offerAfterthought("镜像", fields, { ...vals }, this.opCount - n0, (v) => { this.commitIn(pass, opOf(v, pl)); });
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
    });   // 一个用户动作 = 一步（2026-10-28：通行证逼出来的漏包入口）
  }
  private endMirror(): void {
    this.gizmo = null; this.cmdPreview = null; this.cmdGhosts = null;
    this.live = null; this.liveMesh = null; this.liveOverride = null; this.liveEvents = [];
    this.snapInfo = null;
    this.draw();
  }
  private refreshCmdPreview(): void {
    this.live = null; this.liveMesh = null; this.liveEvents = []; this.liveOverride = null;
    if (this.cmdPreview) {
      const c = this.kernel.clone();
      try { this.liveEvents = this.cmdPreview(c); this.live = c; }
      catch (err) { this.live = null; this.liveMesh = null; this.host.hint(`镜像预演不行：${err instanceof Error ? err.message : String(err)}`); }
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
   * 「复制」开关（事后改成复制 / 不复制）+ 变换工具的「变换中心」；改了 = 撤这一步、按新选项重做（和数值小窗的重做同一套：按坐标、复制走 commitCopies）。
   * 数值小窗改完数之后会再挂一次（读最新的 last），所以两边能接着改。
   */
  private offerXformAfterthought(pass: StepPass): void {
    const L0 = this.last;
    if (!L0 || (L0.kind !== "move" && L0.kind !== "rotate" && L0.kind !== "scale") || !L0.entities) return;
    const L = L0, ents = L0.entities;
    const fields: ParamField[] = [{ key: "copy", def: { kind: "bool", label: "复制" } }];
    const values: Record<string, ParamValue> = { copy: !!L.copy };
    const pivots = L.kind !== "move" ? L.pivots : undefined;
    if (pivots && L.kind !== "move" && L.pivotUsed) {
      const labels: Record<string, string> = { auto: "自动", bbox: "包围盒中心", mean: "顶点平均", active: "最后选的物件原点", picked: "拾取的点" };
      const same = (a?: Pt3, b?: Pt3): boolean => !!a && !!b && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-9;
      if (pivots.auto) labels.auto = same(pivots.auto, pivots.bbox) ? "自动（包围盒中心）" : "自动（组件原点）";   // 说清这次自动落在了哪
      fields.push({ key: "pivot", def: { kind: "enum", label: "变换中心", values: Object.keys(pivots).map((id) => ({ id, label: labels[id] ?? id })) } });
      values.pivot = L.pivotUsed;
    }
    const title = L.kind === "move" ? "移动" : L.kind === "rotate" ? "旋转" : "缩放";
    this.offerAfterthought(title, fields, values, L.ops, (v) => {
      const copy = !!v.copy, pid = typeof v.pivot === "string" ? v.pivot : undefined, piv = pid && pivots ? pivots[pid] : undefined;
      if (pid && pid !== "picked" && pid !== (L.kind !== "move" ? L.pivotUsed : undefined)) this.config.set("transform", "pivot", pid as "auto" | "bbox" | "mean" | "active");   // 工具自己记住
      const at = L.at, n0 = this.opCount;
      const X = L.kind === "move" ? translation(L.delta) : L.kind === "rotate" ? rotationAbout(piv ?? L.center, L.axis, L.angle) : L.dirs ? scalingAlongAxes(piv ?? L.anchor, L.dirs, L.f.x) : scalingAbout(piv ?? L.anchor, L.f);
      if (copy) { const XL = this.xformToLocal(X); this.commitCopies(pass, [{ payload: this.copyPayload(XL, ents), XL }], L.pools, at); }
      else this.redoXform(pass, X, L.froms, L.pools, at);
      const ops = this.opCount - n0;
      this.last = L.kind === "move" ? { ...L, copy, ops } : L.kind === "rotate" ? { ...L, copy, ops, center: piv ?? L.center, ...(pid ? { pivotUsed: pid } : {}) } : { ...L, copy, ops, anchor: piv ?? L.anchor, ...(pid ? { pivotUsed: pid } : {}) };
    });
  }
  /** 马后炮：刚提交的那一步（nOps 个操作）还能按新参数重做。note = 说明行（按当前值现算）。 */
  private offerAfterthought(title: string, fields: readonly ParamField[], values: Record<string, ParamValue>, nOps: number, redo: (v: Readonly<Record<string, ParamValue>>) => void, note?: (v: Readonly<Record<string, ParamValue>>) => string): void {
    this.openParamSession(afterthought({ title, fields, values, nOps, opCount: () => this.opCount, stackKey: () => `${this.history.position()}/${this.history.depth()}`, undoN: (n) => this.undoN(n), redo, ...(note ? { note } : {}) }));
  }
  /** 每一步记下来之后挂哪种马后炮：变换类（复制 / 变换中心）、圆 / 弧（段数）。 */
  private offerLastAfterthought(pass: StepPass): void {
    const k = this.last?.kind;
    if (k === "circle" || k === "arc") this.offerSegmentsAfterthought(pass);
    else this.offerXformAfterthought(pass);
  }
  /** 圆：按新的边缘点 / 段数重画（数值小窗和段数马后炮共用；调用方已撤掉上一步）。 */
  private redrawCircle(pass: StepPass, L: Extract<LastGesture, { kind: "circle" }>, rim: Pt3, segments: number): void {
    const n0 = this.opCount;
    const segs = circleSegmentsOnPlane(L.plane.plane, L.plane.basis, L.center, rim, segments);
    if (segs.length) this.commitIn(pass, { op: "addEdges", at: L.at, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]), curve: circleCurveSpec((pt) => this.toLocal(pt), L.center, rim, L.plane, segments) });
    this.last = { ...L, ops: this.opCount - n0, rim, segments };
  }
  /** 弧：按新的手势量重画（同上）；构不出来 = null，什么都不提交。 */
  private redrawArc(pass: StepPass, L: Extract<LastGesture, { kind: "arc" }>, g: ArcGesture): ReturnType<typeof buildArc> {
    const built = buildArc(g);
    if (!built) return null;
    const n0 = this.opCount;
    this.commitIn(pass, arcOp((p) => this.toLocal(p), L.at, built));
    this.last = { ...L, ...g, ops: this.opCount - n0 };
    return built;
  }
  /**
   * 圆 / 弧画完的马后炮（纪元账本 DT95，user 2026-10-26「马后炮选择段数的时候给一下公差和试用对象参考。加上次世代和lowpoly的推荐值」）：
   * 档位（数据 = segment-tiers.json）+ 段数；说明行 = 这个段数的弦高公差 + 对上的那一档适用什么。改了 = 撤这一步、按新段数重画，并记进工具选项（同数值小窗 24s）。
   */
  private offerSegmentsAfterthought(pass: StepPass): void {
    const L0 = this.last;
    if (!L0 || (L0.kind !== "circle" && L0.kind !== "arc")) return;
    const arc = L0.kind === "arc";
    const built = L0.kind === "arc" ? buildArc(L0) : null;
    if (L0.kind === "arc" && !built) return;
    const r = L0.kind === "circle" ? dist(L0.center, L0.rim) : built!.radius, sweep = L0.kind === "circle" ? 2 * Math.PI : built!.sweep;
    const tierId = (n: number): string => tierOf(n, r, sweep, arc)?.id ?? "custom";
    const fields: ParamField[] = [
      { key: "tier", def: { kind: "enum", label: "档位", values: [...SEGMENT_TIERS.map((t) => ({ id: t.id, label: `${t.name} · ${t.segments !== undefined ? `${t.segments} 段` : t.typical}` })), { id: "custom", label: "自定" }] } },
      { key: "segments", def: { kind: "number", label: "段数", min: segMin(arc), max: SEG_MAX, step: 1 } },
    ];
    let cur: LastGesture = L0, prevTier = tierId(L0.segments);
    this.offerAfterthought(arc ? "弧" : "圆", fields, { tier: prevTier, segments: L0.segments }, L0.ops, (v) => {
      let n = Number(v.segments);
      const t = v.tier !== prevTier ? SEGMENT_TIERS.find((x) => x.id === v.tier) : undefined;
      if (t) n = tierSegments(t, r, sweep);
      n = clampSegments(n, arc);
      if (cur.kind === "circle") { this.redrawCircle(pass, cur, cur.rim, n); this.config.set("circle", "segments", n); }
      else if (cur.kind === "arc") { this.redrawArc(pass, cur, { ...cur, segments: n }); this.config.set("arc", "segments", n); }
      if (this.last) cur = this.last;
      const w = v as Record<string, ParamValue>;
      w.segments = n; w.tier = prevTier = tierId(n);
    }, (v) => segmentNote(r, sweep, Number(v.segments), arc, (m) => fmtLen(m)));
  }

  // ---------- 轴移到选择中心（user 2026-10-25「加一个把轴移动到选择中心的命令……现在先用blender的bounding box center」「选中轴工具之后如果有选择就出现这个，然后点了之后右下角的马后炮可以选择是哪种居中算法」）----------
  /** 选区（散几何 + 选中的组 / 组件）的全部顶点（世界坐标）。 */
  private selectionWorldPoints(): Pt3[] {
    // 读显示契约（KernelView），不读硬表面内核：网格体池里也要能算变换中心（2026-10-28 晚：锁轴线在自由建模里算过哪一点，读 this.kernel = 抛「body is mesh」，probe-lock-line 抓到）
    const out: Pt3[] = [], k = this.activeView, X = this.ctxXform();
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
    this.offerAfterthought("坐标架移到选择中心", [{ key: "algo", def: { kind: "enum", label: "中心", values: [{ id: "bbox", label: "包围盒中心" }, { id: "mean", label: "顶点平均" }] } }], { algo }, this.opCount - n0, (v) => { go(v.algo as "bbox" | "mean"); });
    this.host.hint(this.activePool().group !== null ? "组里的坐标架移到了选择中心（几何没动）" : this.contextDepth() ? "组件里的坐标架移到了选择中心——组件原点没动；工具条「设为组件原点」可以把原点对过来" : "坐标架移到了选择中心（几何没动）");
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
      : L.kind === "tape" ? fl(L.d) : L.kind === "protractor" ? fmtDeg(L.angle) : L.kind === "compass" ? fl(L.r) : "";
    return { kind: L.kind, prompt: vcbPrompt(L.kind), echo };
  }
  /** 矩形「宽,高」的两根轴：面基 (u, v) 里更贴近世界 X 的那根算「宽」（平手看 Y）——地面矩形 = (x, y)，立面 = (水平, 竖直)。 */
  private static rectAxes(basis: { u: Pt3; v: Pt3 }): [Pt3, Pt3] { return rectAxesOf(basis); }
  /** 手势进行中不能输（例外：画线的连画态只是下一笔的锚点）。 */
  private vcbBlocked(): boolean { return this.gestureActive() && !(this._tool === "line" && this.armed && this.anchor3 !== null); }
  /** 应用一条输入：解析 → 撤销那一步的 op → 按精确值重做 → 更新 last（可以连着改）。 */
  applyVcb(text: string): { ok: true; message: string } | { ok: false; error: string } { return this.step((pass) => this.applyVcbStep(pass, text)); }
  private applyVcbStep(pass: StepPass, text: string): { ok: true; message: string } | { ok: false; error: string } {
    const L = this.last;
    if (!L) return { ok: false, error: "先做一步（画 / 推拉 / 移动…），再输精确值" };
    if (this.vcbBlocked()) return { ok: false, error: "先松手落定，再输精确值" };
    if (this._locked) return { ok: false, error: "锁着：只能看；☰「解锁」才能改" };
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
        this.commitIn(pass, { op: "addEdges", at, segs: [[this.toLocal(L.a), this.toLocal(b)]], harden: true });
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
        if (segs.length) this.commitIn(pass, { op: "addEdges", at, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]), harden: true });
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
        if (segs.length) this.commitIn(pass, { op: "addEdges", at, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]), harden: true });
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
        const built = this.redrawArc(pass, L, g);
        if (!built) { this.last = L; break; }
        msg = `弧 r=${fmtLen(built.radius)} · ${fmtDeg(Math.abs(built.sweep))} · ${built.segs.length} 段`;
        break;
      }
      case "circle": {
        let rim = L.rim, segments = L.segments;
        if (v.kind === "length") rim = add3(L.center, scale3(normalize3(sub3(L.rim, L.center)), Math.abs(v.m)));
        else if (v.kind === "segments") { segments = v.n; this.config.set("circle", "segments", v.n); }
        else break;
        this.redrawCircle(pass, L, rim, segments);
        msg = `圆 半径 ${fmtLen(dist(L.center, rim))} · ${segments} 段`;
        break;
      }
      case "pp": {
        if (v.kind !== "length") break;
        const h = sign(L.h) * v.m, hl = L.h !== 0 ? h * (L.hl / L.h) : h;
        this.commitIn(pass, { op: "pushpull", at, face: L.face, dist: hl, ...(L.keepRing ? { keepRing: true } : {}) });
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
          this.commitIn(pass, { op: "addEdges", at, segs: r3.map((p, i) => [this.toLocal(p), this.toLocal(r3[(i + 1) % r3.length])]), ...(spec ? { curve: curveSpecToLocal((pt) => this.toLocal(pt), spec) } : {}) });
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
        this.commitIn(pass, { op: "addGuide", at, line: { p: this.toLocal(L.center), dir: normalize3(applyDir(mInv, dir)) } });
        this.last = { ...L, ops: this.opCount - n0, angle };
        msg = `角度参考线 ${fmtDeg(angle)}`;
        break;
      }
      case "compass": {
        // 打长度 = 精确半径；x5 = 5 个同心（r、2r…5r）；/5 = 把半径五等分（r/5、2r/5…r）
        const radii = v.kind === "length" ? [Math.abs(v.m)] : v.kind === "array" ? Array.from({ length: v.n }, (_, i) => (v.mode === "x" ? L.r * (i + 1) : (L.r * (i + 1)) / v.n)) : null;
        if (!radii) break;
        for (const r of radii) this.commitIn(pass, compassOp(this.toolCtx, at, L.center, L.n, r, L.sphere));
        const r0 = v.kind === "length" ? radii[0] : L.r;
        this.last = { ...L, ops: this.opCount - n0, r: r0, copies: radii.length };
        msg = radii.length > 1 ? `${radii.length} 个同心${L.sphere ? "球" : "圆"}（半径 ${radii.map((r) => fmtLen(r)).join("、")}）` : `${L.sphere ? "参考球" : "参考圆"} 半径 ${fmtLen(r0)}`;
        break;
      }
      case "tape": {
        if (v.kind !== "length") break;
        const d = Math.abs(v.m);
        const p = add3(L.a, scale3(L.dir, d));
        const mInv = invert(this.ctxXform());
        if (L.make === "line" && L.lineDir) this.commitIn(pass, { op: "addGuide", at, line: { p: this.toLocal(p), dir: normalize3(applyDir(mInv, L.lineDir)) } });
        else this.commitIn(pass, { op: "addGuide", at, point: this.toLocal(p) });
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
          this.commitCopies(pass, copies, L.pools, at);
          this.last = { ...L, copy: true, ops: this.opCount - n0 };
          msg = v.mode === "x" ? `阵列 ${v.n} 份（每份 ${fmtLen(len3(L.delta))}）` : `内分 ${v.n} 份`;
          break;
        }
        if (v.kind !== "length") break;
        const delta = scale3(normalize3(L.delta), v.m);
        if (L.copy) { const XL = this.xformToLocal(translation(delta)); this.commitCopies(pass, [{ payload: this.copyPayload(XL, L.entities), XL }], L.pools, at); }
        else this.redoXform(pass, translation(delta), L.froms, L.pools, at);
        this.last = { ...L, ops: this.opCount - n0, delta };
        msg = `${L.copy ? "复制" : "移动"} ${fmtLen(Math.abs(v.m))}`;
        break;
      }
      case "rotate": {
        // 复制那一步（变换工具 Ctrl / 「复制」开着）重做 = 重新放副本，不是转原件（2026-10-26）
        const redoRot = (ang: number): void => { const X = rotationAbout(L.center, L.axis, ang); if (L.copy && L.entities) { const XL = this.xformToLocal(X); this.commitCopies(pass, [{ payload: this.copyPayload(XL, L.entities), XL }], L.pools, at); } else this.redoXform(pass, X, L.froms, L.pools, at); };
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
        const redoScale = (f: Pt3): void => { const X = scaleX(f); if (L.copy && L.entities) { const XL = this.xformToLocal(X); this.commitCopies(pass, [{ payload: this.copyPayload(XL, L.entities), XL }], L.pools, at); } else this.redoXform(pass, X, L.froms, L.pools, at); };
        if (v.kind === "array") {
          // 缩放阵列（user 2026-10-26「变换能不能也支持移动的/5 *5，不过只对move和scale」）：原件回原位（这一步已撤），放 n 份——x = 第 k 份 f^k，/ = 第 k 份 f^(k/n)
          const Xs = L.dirs ? (v.mode === "/" && L.f.x < 0 ? null : Array.from({ length: v.n }, (_, i) => scalingAlongAxes(L.anchor, L.dirs!, Math.sign(L.f.x) ** (i + 1) * Math.abs(L.f.x) ** (v.mode === "x" ? i + 1 : (i + 1) / v.n)))) : arrayScalings(L.anchor, L.f, v.mode, v.n);
          if (!Xs || !L.entities) { redoScale(L.f); this.last = { ...L, ops: this.opCount - n0 }; return { ok: false, error: !Xs ? "带镜像（负倍率）的缩放不能内分：用 3x 这种" : "这一步做不了阵列" }; }
          const ents = L.entities;
          this.commitCopies(pass, Xs.map((X) => { const XL = this.xformToLocal(X); return { payload: this.copyPayload(XL, ents), XL }; }), L.pools, at);
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
    this.offerLastAfterthought(pass);   // 改完数，马后炮按最新的那一步再挂上（复制 / 变换中心 / 段数接着能改）
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
  private redoXform(pass: StepPass, X: Xform, froms: readonly Pt3[], pools: readonly PoolPick[], at: PoolRef): void {
    const XL = this.xformToLocal(X);
    if (froms.length) this.commitIn(pass, { op: "move", at, moves: froms.map((f) => ({ from: f, to: applyPt(XL, f) })) });
    const def = this.scene.defOfContext(this.ctx);
    for (const p of pools) {
      if (p.kind === "group") this.commitIn(pass, { op: "transformPool", at: { def, group: p.group }, xform: XL });
      else this.commitIn(pass, { op: "transformInstance", def, instance: p.instance, xform: XL });
    }
  }

  // ---------- 上下文菜单（#19）给壳的三个小口 ----------
  /** 作废进行中的指针手势（长按弹菜单时），**选区保留**（cancel() 会清选区）。 */
  rightClickInGesture(): boolean { if (!this.gestureActive()) return false; if (!this.commitInPlace()) this.abortGesture(); return true; }   // 手势中右键（两种工作台一样，T102）：能原地留下的原地留下，别的只取消这一下；不在手势里 = false（app 弹菜单）
  abortGesture(): void { this.taps.cancel(); this.cancelGesture(); this.host.marquee(null); this.host.lasso?.(null); this.host.softRing?.(null); this.host.hint(null); this.draw(); }
  /** 手势进行中（含点两下的 armed 态）：相机动了要按笔的屏幕位置重算预览（B23，2026-10-24）。 */
  gestureInProgress(): boolean { return this.gestureActive(); }
  /** 指针下的实体是否已在选区里（右键 = 不在就先选它，SU 同款）。 */
  hitInSelection(hit: HitResult3): boolean {
    const c = this.classify(this.liveWorld(), hit);
    if (c.kind === "pool") return this.selectedPools.has(c.key);
    if (c.kind !== "entity") return false;
    const h = c.local;
    return (h.face !== undefined && this.selection.faces.has(h.face)) || (h.edge !== undefined && this.selection.edges.has(h.edge)) || (h.vertex !== undefined && this.selection.verts.has(h.vertex)) || (h.vertex !== undefined && [...this.selection.edges].some((e) => { const ed = this.activeView.graph.edge(e); return ed.a === h.vertex || ed.b === h.vertex; }));
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
  private trackCharge(sn: Snap3 | null, edge: { a: Pt3; b: Pt3 } | null = null, dwellMs = CHARGE_DWELL_MS): void {
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
  /**
   * 键盘起手（自由建模的 Blender G / R / S / E；user 10-27「然后能不能blender 快捷键无缝接上」）：有选区 = 切到那把工具、以光标处为起点直接进手势
   * （跟着鼠标走、点一下落定、Esc / 右键取消）；没选区 / 不在自由建模 / 正在手势里 = false（调用方退回「切工具」）。
   */
  /** variant = 同一格里的哪种（插入那一格：Ctrl+B "bevel" / Ctrl+Shift+B "bevelVerts"）；工具自己认。 */
  startModal(tool: Tool, variant?: string): boolean {
    if (this._locked) { this.lockedSay(); return true; }   // 演示锁：G / R / S / E / I 不起手也不切工具（返回 true = 调用方别再切工具）
    if (this.mode.id !== "freeform" || this.gestureActive() || !this.lastPtr) return false;
    if (!this.mode.tools.includes(tool)) return false;
    const at = this.lastPtr;
    if (this._tool !== tool) this.setTool(tool);
    const H = this.handlers[tool];
    if (!H?.startModal) return false;
    this.samples = []; this.downPoint = null;
    if (!H.startModal(this.toolCtx, at, variant)) return false;
    this.armed = true; this.canArm = true; this.justCommitted = false;
    this.computeLive(); this.host.changed(); this.draw();
    return true;
  }
  // ---------- 手势中打数（Blender「S Z 0」；user 10-28 晚「s z 0这个快捷键能不能接住……这也是一个新的模式」「可以打小数点，然后接上我们的单位系统，然后最后可以打单位」
  //            「所以就是一个parser啦，看一下能不能和单位文本框深模块窄接口」；设计稿 ai-docs/20261028-typed-amount.md）----------
  // 打的字的唯一主人 = controller/typed-input.ts（2026-10-29 周账 F-125：手势中打数 + 数值小窗一份缓冲、一层键表、一个小键盘）。去向 gesture = 手势进行中且这把工具收数；
  //   读法 = units.ts parseQuantity（单位文本框同一个）；哪个键能进 = units.ts quantityKey；工具只问 ctx.typed()。vcb 那一半由 app/vcb.ts 订阅同一个主人。
  readonly typing: TypedInput = createTypedInput({
    gestureQuantity: () => (this.gestureActive() ? this.handlers[this._tool]?.typedQuantity ?? null : null),
    vcbOpen: () => !!this.vcbState().kind,
  });
  private readonly _typingSub = this.typing.subscribe((e) => {
    if (e.target !== "gesture") return;
    if (e.kind === "confirm") { this.confirmGesture(); return; }
    this.computeLive(); this.host.changed(); this.draw();   // 字变了：预演跟着变（状态行由 computeLive 写：打的字 + 预演读数一起）
  });
  /** 打的数（按工具的量读）；没打 / 看不懂 / 没在手势里 = null。 */
  typedValue(): number | null {
    const q = this.handlers[this._tool]?.typedQuantity, t = this.typing.text();
    if (!q || !t || !this.gestureActive()) return null;
    const v = parseQuantity(t, q);
    return typeof v === "number" ? v : null;
  }
  /** 正在打的字（探针 / 状态行）。 */
  typedText(): string { return this.gestureActive() ? this.typing.text() : ""; }
  /** 手势里现在收的是什么量（小键盘的单位键按它换；没在收 = null）。 */
  typedQuantityTag(): "length" | "angle" | "factor" | "speed" | null { return this.gestureActive() ? this.handlers[this._tool]?.typedQuantity?.q ?? null : null; }
  /** 自由建模手势中右键：这把工具会「原地落定」（挤出：几何留在原地、新的成为选区，接着 G）就做，返回 true；不会 = false（调用方当取消）。 */
  commitInPlace(): boolean {
    const H = this.handlers[this._tool];
    if (!H?.commitInPlace || !H.active()) return false;
    this.step(() => { H.commitInPlace!(this.toolCtx); this.endStepGesture(); });
    this.host.changed(); this.draw();
    return true;
  }
  /** 回车 = 定：「点一下落定」那一下（键盘起手 / 点了一下在等下一点的手势）；按着没松的拖 = 松手才定，回车不管。 */
  confirmGesture(): void {
    const ev = this.lastMoveEv, H = this.handlers[this._tool];
    if (!this.gestureActive() || !ev) return;
    if (!this.armed && !(H?.grammar === "direct" && H.awaitsClick?.())) return;   // direct 工具松着手还在等一下（新建第二步的环）也认
    this.pointerDown({ ...ev }); this.pointerUp({ ...ev });
  }
  /** 手指双击（触屏；鼠标双击同语义）：点在子组件 / 组上 = 进去；点在空处 = 退一层；点在这一层自己的几何上 = 什么都不做。返回做了什么。 */
  hierarchyTapAt(x: number, y: number): "enter" | "exit" | null {
    const c = this.classify(this.liveWorld(), this.pickAt(x, y));
    if (c.kind === "pool") { this.enterPool(c.pick); this.host.changed(); this.draw(); return "enter"; }
    if (c.kind === "none" && this.ctx.chain.length + (this.ctx.group !== null ? 1 : 0) > 0) { this.exitContext(); this.host.changed(); this.draw(); return "exit"; }
    return null;
  }
  // ---------- 扩 / 缩选区（拖动条；gizmo-design §7，user 10-28 夜「select按第二次的的gizmos」；算子 mesh/select-grow.ts）----------
  // 拖的时候直接改选区（看得见），松手才记一步（「之前」= 开始拖时的会话），中间几十次变化不进撤销栈。
  private selGrow: { before: Session; base: SelSets; steps: number } | null = null;
  selGrowBegin(): boolean {
    const s = this.selection;
    if (this.activeKind() !== "mesh" || s.kind !== "mesh" || !this.hasSelection() || this.gestureActive()) return false;
    this.selGrow = { before: this.sessionSnap(), base: { verts: new Set(s.verts), edges: new Set(s.edges), faces: new Set(s.faces) }, steps: 0 };
    return true;
  }
  /** 从开始拖时的选区走 steps 圈（正 = 扩、负 = 缩）；返回现在选着几个。 */
  selGrowTo(steps: number): number {
    const g = this.selGrow, s = this.selection;
    if (!g || s.kind !== "mesh") return 0;
    const r = stepSelection(this.scene.mesh(this.activePool().def).kernel, g.base, steps);
    for (const k of ["verts", "edges", "faces"] as const) { s[k].clear(); for (const x of r[k]) s[k].add(x); }
    g.steps = steps;
    this.host.changed(); this.draw();
    return s.verts.size + s.edges.size + s.faces.size;
  }
  selGrowEnd(): void {
    const g = this.selGrow;
    this.selGrow = null;
    if (!g || g.steps === 0) return;
    this.step(() => { this.stepBefore = g.before; this.stepTouched = true; }, { title: g.steps > 0 ? "扩选区" : "缩选区" });
    this.host.changed(); this.draw();
  }
  /** Ctrl+R（自由建模）：切到切割、下一下点边 = 环切。 */
  armLoopCut(): boolean {
    if (this.mode.id !== "freeform" || !this.mode.tools.includes("knife")) return false;
    if (this._tool !== "knife") this.setTool("knife"); else this.cancelGesture();
    this.handlers.knife?.armLoop?.(this.toolCtx);
    this.draw();
    return true;
  }
  // ---------- 右键新建（纪元账本 FM120；user 10-27「创建物体可以放右键」「右键新建物体的时候按右键的位置吸附，比如顶点，面，原点，地面平面。然后新建的时候马后炮有对齐方式，默认法向对齐」
  //            「然后以后圆柱，长立方体建立的时候都是原点在底部中心，和锥体一样。不过球的话还是圆点在原点」）----------
  private ctxPick: { x: number; y: number; blank: boolean } | null = null;
  /** 右键菜单打开时记下按在哪（新建的落点，点 / 面 / 原点 / 地面都吸）；blank = 光标下没有几何。画布上再按一下就作废。 */
  noteContextPoint(x: number, y: number, blank: boolean): void { this.ctxPick = { x, y, blank }; }
  /** 刚右键过（新建那几项露在右键菜单里；点在点 / 面上也露 = 落在那上面，user「按右键的位置吸附，比如顶点，面，原点，地面平面」）。 */
  contextNewAllowed(): boolean { return !!this.ctxPick && this.mode.id === "freeform"; }   // 只在自由建模（user 10-27「然后硬表面建模不应该有新建网络体」）
  /** 右键点 → 新建落点（世界）+ 法向（朝镜头）：点 > 面 > 原点 > 地面（上下文坐标架的 XY 面）。 */
  private newObjectAnchor(): { p: Pt3; n: Pt3 | null; on: string; e?: Pt3 } | null { const c = this.ctxPick; return c ? this.newObjectAnchorAt(c.x, c.y) : null; }
  /** 新建物体的落点（屏幕点 → 打到的点 / 边 / 面 / 原点 / 地面 + 法向）：右键新建记下的那一点，或新建工具按下的那一点。
   *  e = 起始朝向看的那条边（世界方向；user 10-28 夜「初始角度的推理能不能智能一点，比如看边？」→「不一定是最近边吧。最长？」）：
   *  落在面上 = 这张面外环最长的那条边（和点在面上哪儿无关）；落在边上 = 这条边；落在点上 = 连着它的最长那条边。法向对齐时基本体的 X 顺着它（primitivePlan）。 */
  private newObjectAnchorAt(cx: number, cy: number): { p: Pt3; n: Pt3 | null; on: string; e?: Pt3 } | null {
    const c = { x: cx, y: cy };
    const view = this.worldView(), fr = this.frame(), vp = this.fvp(), ray = fr.ray(c.x, c.y, vp);
    const toward = (v: Pt3): Pt3 => (dot3(v, ray.dir) > 0 ? scale3(v, -1) : v);
    const hit = pickEntity(view, fr, vp, c.x, c.y, this.hitPx(), {});
    if (hit.vertex !== undefined && view.graph.hasVertex(hit.vertex)) {
      let acc = { x: 0, y: 0, z: 0 };
      for (const e of view.graph.vertex(hit.vertex).edges) for (const f of view.graph.edge(e).faceLinks) { const r = view.planeOf(f); if (r) acc = add3(acc, toward(r.plane.n)); }
      const p0 = view.graph.pt(hit.vertex);
      let e: Pt3 | undefined, best = 1e-12;
      for (const id of view.graph.vertex(hit.vertex).edges) { const E = view.graph.edge(id), d = sub3(view.graph.pt(E.a === hit.vertex ? E.b : E.a), p0), L = len3(d); if (L > best) { best = L; e = scale3(d, 1 / L); } }
      return { p: p0, n: len3(acc) > 1e-9 ? normalize3(acc) : null, on: "点", ...(e ? { e } : {}) };
    }
    if (hit.edge !== undefined && view.graph.hasEdge(hit.edge)) {   // 边：落在光标下边上的那一点（不是边的中点；user「新建对齐的是点中的那个点而不是点中的那个图元的中心」）
      const E = view.graph.edge(hit.edge), a = view.graph.pt(E.a), b = view.graph.pt(E.b), u = sub3(b, a), w0 = sub3(a, ray.origin);
      const A = dot3(u, u), B = dot3(u, ray.dir), C = dot3(ray.dir, ray.dir), D = dot3(u, w0), Ee = dot3(ray.dir, w0), den = A * C - B * B;
      const t = den > 1e-12 ? Math.max(0, Math.min(1, (B * Ee - C * D) / den)) : 0.5;
      let acc = { x: 0, y: 0, z: 0 };
      for (const f of E.faceLinks) { const r = view.planeOf(f); if (r) acc = add3(acc, toward(r.plane.n)); }
      return { p: add3(a, scale3(u, t)), n: len3(acc) > 1e-9 ? normalize3(acc) : null, on: "边", ...(len3(u) > 1e-12 ? { e: normalize3(u) } : {}) };
    }
    if (hit.face !== undefined) {   // 面：光标打到的那一点——按面真正的三角形（扭过的网格面不平，不能用平均平面），法向 = 打到的那个三角形的
      const F = view.face(hit.face), r = view.planeOf(hit.face);
      if (F && r) {
        const pts = [F.outer, ...F.holes].flatMap((g) => g.vids.map((v) => view.graph.pt(v))), outer = F.outer.vids.map((_, i) => i);
        let base = F.outer.vids.length; const holes = F.holes.map((h) => { const idx = h.vids.map((_, i) => base + i); base += h.vids.length; return idx; });
        let best: { t: number; n: Pt3 } | null = null;
        for (const [i, j, k] of triangulateRings(pts, r.plane, outer, holes)) {
          const A0 = pts[i], e1 = sub3(pts[j], A0), e2 = sub3(pts[k], A0), pv = cross3(ray.dir, e2), det = dot3(e1, pv);
          if (Math.abs(det) < 1e-14) continue;
          const tv = sub3(ray.origin, A0), uu = dot3(tv, pv) / det; if (uu < -1e-9 || uu > 1 + 1e-9) continue;
          const qv = cross3(tv, e1), vv = dot3(ray.dir, qv) / det; if (vv < -1e-9 || uu + vv > 1 + 1e-9) continue;
          const t = dot3(e2, qv) / det;
          if (t > 0 && (!best || t < best.t)) best = { t, n: normalize3(cross3(e1, e2)) };
        }
        // 起始朝向：这张面外环最长的那条边
        let e: Pt3 | undefined;
        { let bl = 1e-12; const g = F.outer.vids; for (let i = 0; i < g.length; i++) { const u = sub3(view.graph.pt(g[(i + 1) % g.length]), view.graph.pt(g[i])), L = len3(u); if (L > bl) { bl = L; e = scale3(u, 1 / L); } } }
        if (best) return { p: add3(ray.origin, scale3(ray.dir, best.t)), n: toward(best.n), on: "面", ...(e ? { e } : {}) };
        const p = rayPlane(ray.origin, ray.dir, r.plane.n, r.plane.d); if (p) return { p, n: normalize3(toward(r.plane.n)), on: "面", ...(e ? { e } : {}) };
      }
    }
    const F = this.contextFrame(), os = fr.project?.(F.origin, vp);
    if (os && Math.hypot(os.x - c.x, os.y - c.y) <= this.snapPx()) return { p: F.origin, n: null, on: "原点" };
    const zN = normalize3(F.z), g = rayPlane(ray.origin, ray.dir, zN, dot3(zN, F.origin));
    if (g && dot3(sub3(g, ray.origin), ray.dir) > 0) return { p: g, n: null, on: "地面" };
    return null;
  }
  /** 新建基本体的计划（落点 + 对齐 + 尺寸 → 本地坐标架 + 三个尺寸）：提交（addPrimitive）和新建工具的预演共用一份。尺寸 = 边长（立方体 / 平面）或直径（圆的几种），世界长度。 */
  /** spin = 绕底面法向（坐标架 z）转多少弧度（新建工具第二步的环；马后炮「朝向」）。 */
  private primitivePlan(kind: PrimitiveKind, A: { p: Pt3; n: Pt3 | null; e?: Pt3 }): (align: string, sizeW: number, seg: number, spin?: number, aspect?: number) => { frame: { o: Pt3; x: Pt3; y: Pt3; z: Pt3 }; world: { o: Pt3; x: Pt3; y: Pt3; z: Pt3 }; size: [number, number, number]; segments: number } {
    const Xi = invert(this.ctxXform()), F = this.contextFrame();
    const frameW = (align: string, spin: number): { o: Pt3; x: Pt3; y: Pt3; z: Pt3 } => {
      let z: Pt3, x0: Pt3;
      if (align === "world") { z = { x: 0, y: 0, z: 1 }; x0 = { x: 1, y: 0, z: 0 }; }
      else if (align === "object") { z = normalize3(F.z); x0 = normalize3(F.x); }
      else { z = A.n ?? normalize3(F.z); x0 = A.e ?? normalize3(F.x); }   // 法向对齐：X 顺着落点看的那条边（没有 = 上下文 X）
      let x = sub3(x0, scale3(z, dot3(x0, z)));
      if (len3(x) < 1e-6) { const y0 = normalize3(F.y); x = sub3(y0, scale3(z, dot3(y0, z))); }
      x = normalize3(x);
      if (spin) { const y0 = cross3(z, x); x = normalize3(add3(scale3(x, Math.cos(spin)), scale3(y0, Math.sin(spin)))); }
      return { o: A.p, x, y: cross3(z, x), z };
    };
    const toLocal = (f: { o: Pt3; x: Pt3; y: Pt3; z: Pt3 }): { o: Pt3; x: Pt3; y: Pt3; z: Pt3 } => ({ o: applyPt(Xi, f.o), x: normalize3(applyDir(Xi, f.x)), y: normalize3(applyDir(Xi, f.y)), z: normalize3(applyDir(Xi, f.z)) });
    const dims = (sz: number, aspect: number): [number, number, number] => primitiveDims(kind, sz, aspect);
    const scaleL = len3(applyDir(Xi, { x: 1, y: 0, z: 0 })) || 1;
    return (align, sizeW, seg, spin = 0, aspect = 1) => { const w = frameW(align, spin); return { frame: toLocal(w), world: w, size: dims(sizeW * scaleL, aspect), segments: seg }; };
  }
  /** 新建工具第二步（定朝向的环）：在 (x, y) 落下时的世界坐标架（还没转；对齐 = 法向 / 落在地面 = 世界，和预演同一份）。落不到东西 = null。 */
  primitiveFrameAt(x: number, y: number): { o: Pt3; x: Pt3; y: Pt3; z: Pt3 } | null {
    const A = this.newObjectAnchorAt(x, y);
    return A ? this.primitivePlan("box", A)(A.n ? "normal" : "world", 1, 16).world : null;
  }
  /** 新建工具：从按下那一点拖到 (x1, y1) = 多大（世界长度：屏上拖的距离 × 落点那里一像素多长）；落不到东西 = null。 */
  primitiveDragSize(x0: number, y0: number, x1: number, y1: number): number | null {
    const A = this.newObjectAnchorAt(x0, y0), wpp = A ? worldPerPx(this.frame(), this.fvp(), A.p) : null;
    return A && wpp ? Math.hypot(x1 - x0, y1 - y0) * wpp : null;
  }
  /** 新建工具的预演：在影子网格上按同一份计划长出来（对齐 = 法向 / 落在地面 = 世界）。返回说法；落不到东西 = null。 */
  previewPrimitive(kind: PrimitiveKind, x: number, y: number, sizeW: number, m: MeshKernel, spin = 0, aspect = 1): string | null {
    const A = this.newObjectAnchorAt(x, y), P = PRIMITIVES[kind];
    if (!A) return null;
    const { frame, size, segments } = this.primitivePlan(kind, A)(A.n ? "normal" : "world", sizeW, 16, spin, aspect);
    addPrimitive(m, kind, frame, size, segments);
    return `拉出${P.label}（${Math.abs(aspect - 1) > 1e-9 ? `宽 ${fmtLen(sizeW)} × 深 ${fmtLen(sizeW * aspect)}` : `${P.measure} ${fmtLen(sizeW)}`}${spin ? ` · 朝向 ${fmtDeg(spin)}` : ""}）`;   // 预演只有拉出工具用
  }
  /** 右键新建一个基本体：网格体里 = 长进这个网格体（Blender 编辑模式的 Shift+A）；别处 = 新的网格体组件。马后炮：对齐（法向 / 世界 / 物体，默认法向）、大小、段数。 */
  addPrimitive(kind: PrimitiveKind, opts: { at?: { x: number; y: number }; size?: number; spin?: number; aspect?: number; verb?: string } = {}): boolean { return this.step((pass) => {
    const verb = opts.verb ?? "新建";   // 右键「新建 ›」= 新建；左柱工具 = 拉出（user 10-28 夜「拉出也行吧」）
    const A = opts.at ? this.newObjectAnchorAt(opts.at.x, opts.at.y) : this.newObjectAnchor(), P = PRIMITIVES[kind];
    if (!A) { this.host.hint(opts.at ? `${verb}：按在点 / 面 / 原点 / 地面上` : `${verb}：右键点在点 / 面 / 原点 / 地面上`); return false; }
    if (this.activeKind() !== "mesh") { this.host.hint(`${verb}：只在自由建模（网格体）里`); return false; }   // user 10-27「然后硬表面建模不应该有新建网络体」
    const at = this.activePool(), plan = this.primitivePlan(kind, A);
    const go = (v: Readonly<Record<string, ParamValue>>): void => {
      const flat = isFlatPrimitive(kind), w = Number(v.size), aspect = flat && w > 0 && Number(v.depth) > 0 ? Number(v.depth) / w : 1;   // 平的几种：马后炮「宽 / 深」两个数
      const { frame: fL, size, segments: seg } = plan(String(v.align), w, Number(v.segments) || 16, Number(v.spin) || 0, aspect);
      const def = at.def, probe = this.scene.mesh(def).kernel.clone(), r = addPrimitive(probe, kind, fL, size, seg);
      this.commitIn(pass, { op: "meshAddPrimitive", def, kind, frame: fL, size, ...(P.round ? { segments: seg } : {}) });
      this.clearSel(pass);
      for (const f of r.faces) this.selection.faces.add(f);
      if (this.selection.kind === "mesh") for (const e of r.edges) this.selection.edges.add(e);   // 圆圈 / 方框：只有边，选中那一圈（接着挤出 / 补洞）
      this.bump();
    };
    const v0: Record<string, ParamValue> = { align: A.n ? "normal" : "world", size: opts.size ?? primitiveDefaultLen(kind), segments: 16, spin: opts.spin ?? 0 };
    if (isFlatPrimitive(kind)) v0.depth = Number(v0.size) * (opts.aspect ?? 1);
    const n0 = this.opCount;
    go(v0);
    if (this.opCount === n0) return false;
    const fields: ParamField[] = [
      { key: "align", def: { kind: "enum", label: "对齐", values: [{ id: "normal", label: "法向", hint: "贴着右键点到的面 / 点（默认）" }, { id: "world", label: "世界", hint: "世界的 X Y Z" }, { id: "object", label: "物件", hint: "所在物件自己的轴" }] } },
      { key: "size", def: { kind: "number", label: isFlatPrimitive(kind) ? (P.measure === "直径" ? "宽（直径）" : "宽") : P.measure, min: 0.001, max: 10000, step: 0.1, quantity: { q: "length" } } },
      ...(isFlatPrimitive(kind) ? [{ key: "depth", def: { kind: "number" as const, label: P.measure === "直径" ? "深（直径）" : "深", min: 0.001, max: 10000, step: 0.1, quantity: { q: "length" as const } } }] : []),
      ...(P.round ? [{ key: "segments", def: { kind: "number" as const, label: "段数", min: 3, max: 128, step: 1 } }] : []),
      { key: "spin", def: { kind: "number", label: "朝向", min: -2 * Math.PI, max: 2 * Math.PI, step: Math.PI / 12, quantity: { q: "angle" } } },
    ];
    this.offerAfterthought(`${verb}${P.label}`, fields, v0, this.opCount - n0, (v) => go(v));
    this.host.hint(`${verb}了${P.label}：落在${A.on}上`);
    this.host.changed(); this.draw();
    return true;
  }); }
  /** 探针用：手势中的实时世界（预演）。 */
  liveWorldForProbe(): WorldView { return this.liveWorld(); }
  private liveWorld(): WorldView { return this.gestureActive() || this.cmdPreview ? this.worldView(this.live ?? (this.liveMesh ? meshViewOf(this.liveMesh) : null), this.liveOverride) : this.worldView(); }
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
    const tool = this._tool;   // 2026-10-29：以前这里白读一次硬表面内核——网格体池里预演失败时 catch 里先抛「body is mesh, not brep」，把真错误盖住（F-126 第一刀抓到的洞）
    const d: Record<string, unknown> = { tool };
    const H = this.handlers[tool];
    if (H?.active()) { d.sample = H.sample(); Object.assign(d, H.describe?.(this.toolCtx) ?? {}); }
    return d;
  }
  // ---------- live（影子副本预演） ----------
  /** 这次预演会把哪个组件斜切（拖的时候就提示「松手会被拦下」；提交时 ops.ts 的护栏真拦）。 */
  private previewShear: string | null = null;
  /** 移动中切了沿边滑：手势模块重新挑边（G G），再按现在的指针重算预演。 */
  refreshSlide(): void { const H = this.handlers[this._tool] as { resetSlide?(): void } | undefined; H?.resetSlide?.(); this.refreshGesture(); }
  /** 移动中再按 G（Blender G G）：这一次操作切沿边滑 / 照常，不动工具条上的常驻开关。 */
  toggleSlideOnce(): void { const H = this.handlers[this._tool] as { toggleSlideOnce?(): void } | undefined; if (!this.gestureActive() || !H?.toggleSlideOnce) return; H.toggleSlideOnce(); this.refreshGesture(); }
  /** 手势进行中换了会影响预演的设置（软选择开关 / 半径）：照现在的指针重算预演。 */
  refreshGesture(): void { if (this.gestureActive()) { this.computeLive(); this.draw(); } }
  private computeLive(): void {
    this.live = null; this.liveMesh = null;
    this.liveOverride = null;
    this.liveEvents = [];
    this.previewShear = null;
    const run = (fn: (c: Kernel) => FaceEvent[]): void => {
      const c = this.shadowKernel();
      try { this.liveEvents = perf.time("live.run", () => fn(c)); }
      catch (err) {
        this.liveEvents = []; this.live = null; this.liveMesh = null;
        this.host.trace?.({ kind: "fail", where: "preview", op: null, message: err instanceof Error ? err.message : String(err), ...(this.activeKind() === "brep" ? { brep: this.kernel.toBrep() } : {}), pool: this.activePool(), preview: this.previewDescriptor() });   // 网格体池里不带 brep 快照（以前这一句在 catch 里再抛一次，真错误没进黑匣子）
        this.fail("preview", err); return;
      }
      this.live = c;
    };
    const tool = this._tool;
    let dims = "";
    const H = this.handlers[tool];
    const runMesh = (fn: (m: MeshKernel) => void): void => {   // 网格体：拷一份（类型数组，几毫秒）改完画；真身不动
      const def = this.activePool().def, base = this.scene.mesh(def).kernel, c = base.clone();
      try { perf.time("live.run", () => { fn(c); this.mirrorPreview(def, base, c); }); }
      catch (err) { this.liveMesh = null; this.host.trace?.({ kind: "fail", where: "preview", op: null, message: err instanceof Error ? err.message : String(err) }); this.fail("preview", err); return; }
      this.liveMesh = c;
    };
    if (H && (H.active() || H.previewOnHover)) dims = this.activeKind() === "mesh" ? (H.liveMesh ? H.liveMesh(this.toolCtx, runMesh) : "") : H.live(this.toolCtx, run);
    if (dims !== this.dims) { this.dims = dims; this.host.readout?.(this.readoutText()); }
    if (this.live || this.liveMesh || this.liveOverride || dims) {
      const ev = this.live ? (this.liveEvents.length ? `预览：${this.liveEvents.map(describeEvent).join("；")}` : "预览：无膜变化") : "";
      const sh = this.previewShear ? `会把组件「${this.previewShear}」斜切（glTF 不允许），松手会被拦下：沿它自己的轴缩放（只选它一个时手柄就是它的轴）` : "";
      const typing = this.typing.text() && this.gestureActive() ? `打数：${this.typing.text()}▏${this.typedValue() === null ? "（还没看懂，接着打）" : ""} · 回车 / 点一下 = 定 · 退格改 · Esc 取消` : "";   // 打的字一直看得见（预演读数会盖掉 typeIntoGesture 写的那句）
      this.host.hint([sh, typing, dims, ev].filter(Boolean).join(" ｜ "));
    }
  }
  /** 预演的影子副本（O1「拷一次 + 每帧退回」）：真身没变（同一对象、同一 rev）就把上一帧的影子倒回去再用；变了 / 倒不回（日志丢段）/ 全局结算模式 = 重新拷一份。 */
  private shadow: { k: Kernel; base: Kernel; baseRev: number; mark: RewindMark } | null = null;
  private shadowKernel(): Kernel {
    const base = this.kernel, s = this.shadow;
    if (s && s.base === base && s.baseRev === base.rev && base.settleMode !== "global") {
      const r = perf.time("live.rewind", () => s.k.rewindTo(base, s.mark));
      if (r) { perf.count["live.rewind"] = (perf.count["live.rewind"] ?? 0) + 1; return s.k; }
    }
    const k = perf.time("live.clone", () => base.clone());
    this.shadow = { k, base, baseRev: base.rev, mark: k.rewindMark() };
    return k;
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
   * 选区的变换中心（变换工具的「变换中心」选项 / 马后炮）：最后选的物体原点 = 选区里最后选中的那个组 / 组件的轴原点（Blender 的 Active Element；选区按选的先后存），没选组 / 组件 → 包围盒中心。
   * 自动 = 只选了一个组 / 组件（没有散的面 / 边）→ 它的轴原点；别的 → 包围盒中心。
   */
  /** 锁着时画的轴线（所有工具同一处：锁状态只有这一份）：方向 = 上下文坐标架；过 = 手势中的锚点 / 没手势时下一下要动的东西的变换中心。 */
  private lockGuide(): ReturnType<typeof lockLines> | null {
    if (!this._axisLock && !this._planeLock) return null;
    const st = stanceOf(this.mode.id, this._tool), acts = !!st && st.center !== "none" && this.hasSelection();
    const pivot = acts ? this.pivotOf(this.mode.id === "freeform" ? "mean" : "auto") : null;
    const ls = lockLines({ axis: this._axisLock, plane: this._planeLock, planeN: this._planeLockN }, this.contextFrame(), lockThrough(this.gestureActive(), this.anchor3, pivot));
    return ls.length ? ls : null;
  }
  private pivotOf(mode: "auto" | "bbox" | "mean" | "active"): Pt3 | null {
    if (mode === "auto" && this.selectedPools.size === 1 && !this.selection.faces.size && !this.selection.edges.size && !this.selection.verts.size) { const fr = this.selectedPoolFrames(this.worldView()); if (fr.length) return fr[0].origin; }
    if (mode === "active") { const fr = this.selectedPoolFrames(this.worldView()); if (fr.length) return fr[fr.length - 1].origin; }
    return this.selectionCenter(mode === "mean" ? "mean" : "bbox");
  }
  /** 选中的点（世界坐标；只画点本身）。 */
  private selVertsView(view: WorldView, g: (id: number) => number): Pt3[] | null {
    const ids = new Set<number>(this.selection.verts);
    if (this.mode.id === "freeform") {   // 自由建模：选中的边 / 面的角也画成选中的点（这一下会动的就是它们；user「应该能看到顶点和选择」，不要半截边那种画法）
      for (const e of this.selection.edges) { const ge = g(e); if (view.graph.hasEdge(ge)) { const E = view.graph.edge(ge); ids.add(E.a - g(0)); ids.add(E.b - g(0)); } }
      for (const f of this.selection.faces) { const F = view.face(g(f)); if (F) for (const r of [F.outer, ...F.holes]) for (const v of r.vids) ids.add(v - g(0)); }
    }
    if (!ids.size) return null;
    const out: Pt3[] = [];
    for (const v of ids) { const gv = g(v); if (view.graph.hasVertex(gv)) out.push(view.graph.pt(gv)); }
    return out.length ? out : null;
  }
  /** 自由建模：活动池里的平滑边（世界坐标；棱照常画，平滑边淡淡地画出来、也点得中——纪元账本 FM138）。 */
  private softEdgesView(view: WorldView, g: (id: number) => number): { key: string; segs: { a: Pt3; b: Pt3 }[] } | null {
    if (this.mode.id !== "freeform" || this.cmdPreview) return null;
    const k = view.activeSlot().kernel, segs: { a: Pt3; b: Pt3 }[] = [];
    for (const e of k.edges()) {
      const ge = g(e.id);
      if (!view.isSoft(ge) || !view.graph.hasEdge(ge)) continue;
      const E = view.graph.edge(ge); segs.push({ a: view.graph.pt(E.a), b: view.graph.pt(E.b) });
    }
    return segs.length ? { key: String(this.kid(view)), segs } : null;
  }
  /** 自由建模：活动池的全部顶点（世界坐标）。键 = 合成视图的身份（几何 / 预演一变它就是新的）。 */
  /** X 光面点（FM3）：开着 X 光时，正在编辑那一层每张面中心一个点（pick.ts faceDotPoint，和点得中的地方是同一个）；选中的面另一种颜色。 */
  private faceDotsView(view: WorldView, g: (id: number) => number): { key: string; pts: Pt3[]; sel: boolean[] } | null {
    if (!this._xray || this.cmdPreview) return null;
    const selG = new Set<number>([...this.selection.faces].map(g)), pts: Pt3[] = [], sel: boolean[] = [];
    for (const f of view.faces()) {
      if (view.isActive && !view.isActive(f.id)) continue;
      const c = faceDotPoint(view, f.id); if (!c) continue;
      pts.push(c); sel.push(selG.has(f.id));
    }
    return { key: `${this.kid(view)}|${[...selG].sort((a, b) => a - b).join(",")}`, pts, sel };
  }
  private vertDotsView(view: WorldView, g: (id: number) => number): { key: string; pts: Pt3[] } | null {
    if (this.mode.id !== "freeform" || this.cmdPreview) return null;
    const k = view.activeSlot().kernel, pts: Pt3[] = [];
    for (const v of k.vertices()) { const gv = g(v.id); if (view.graph.hasVertex(gv)) pts.push(view.graph.pt(gv)); }
    return { key: String(this.kid(view)), pts };
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
    this.checkModeFits("draw");
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
    this.provider.setWorld(view, this._revision);   // 这一帧画哪个世界：提供者按它吐块（引擎拉）；版本进内容键
    this.r3.render(frameInput(view, this.cam, this.vp(), {   // view-state.ts：相机 / 网格 / 叠加层（选中高亮 + 线点标记文字）交给后端，引擎给量尺
      ...(this.viewExtras?.() ?? {}),
      selectionEdges: selE,
      selectionFaces: selF,
      scrubEdges: new Set<number>(),   // 橡皮模块经 viewExtras 覆盖（擦一段 = 整条，高亮也整条）
      warnEdges: this.inspectHighlights(view),   // 修复面板「检查」：微折软边（DT9）
      hoverEdge: this.hoverEdge !== null ? g(this.hoverEdge) : null,
      hoverFace: this.hoverFace !== null ? g(this.hoverFace) : null,
      snap: this.snapInfo,
      snapAnchor: this.anchor3,
      revision: this._revision,
      dimSlots: dimmed,
      xray: this._xray,
      handles: null,
      protractor: null,
      guides: view.guides(),
      guideSel: guidesOf(this.selection),
      frame: view.frame(),
      grid: { frame: view.grid()?.frame ?? view.frame(), step: this._grid.step, sub: this._grid.subdiv, on: this._grid.on },   // 吸附没开也按设置的格距画（10-24 小 bug：此前关着就退回 1 m，换制式看不出来）
      charged: { points: this.alignSrcs(), edges: this.alignEdges() },
      selVerts: this.cmdPreview ? null : this.selVertsView(view, g),
      vertDots: this.vertDotsView(view, g),
      faceDots: this.faceDotsView(view, g),
      softEdges: this.softEdgesView(view, g),
      mirror: this.mirrorView(view, g),
      ticks: this.mode.id === "geometry" ? this.breakTicks(view) : null,
      poolAxes: this.selectedPoolFrames(view),
      lockLines: this.lockGuide(),   // 锁看得见（controller/lock-guide.ts；user 10-28 晚「轴锁的时候能不能看到小轴线」）
      originAxes: this.originMarker(),
      emptyAxes: this.emptyMarkers(view).map((e) => e.frame),
      planeGizmo: this.gizmo ? (() => { const G = gizmoGeom(this.gizmo.g, this.frame(), this.fvp()); return { origin: G.origin, normal: G.normal, u: G.u, v: G.v, size: G.size, hot: this.gizmo.grab?.handle ?? this.gizmo.hot }; })() : null,
      ...(this.mode.id === "geometry" ? this.unitMarks(view.frame()) : {}),
      ...(this.mode.viewExtras?.() ?? {}),
      ...(this.handlers[this._tool]?.viewExtras?.(this.toolCtx) ?? {}),
    }, this.provider.layout()));
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
  private ticksCache: BreakTicksCache | null = null;
  breakTicks(view: WorldView = this.liveWorld()): readonly { p: Pt3; dir: Pt3 }[] { return (this.ticksCache = breakTicksOf(view.activeSlot(), this.ticksCache)).ticks; }   // 纯函数在 break-ticks.ts
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
    const v = this.activeView, m = this.ctxXform();
    for (const vid of moveTargetsSelection(v, this.selection)) add(applyPt(m, v.graph.pt(vid)));
    for (const p of this.selectedPools.values()) for (const s of this.slotsOfPick(view, p)) { const b = poolBounds(s.kernel, s.xform); if (b) { add(b.min); add(b.max); } }
    return Number.isFinite(min.x) ? { min, max } : null;
  }
  // ---------- 输入：工具指针 ----------
  pointerDown(ev: ToolPointer): void { this.step(() => this.pointerDownStep(ev)); }
  private pointerDownStep(ev: ToolPointer): void {
    if (this._locked) { this.lockedSay(); return; }   // 护栏 ②（演示锁）：工具指针在这一个口全拒——鼠标 / 笔 / 手指 / 键盘起手 / 回车落定都从这进；相机不走这里
    this.lastPtrType = ev.pointerType;   // 键盘起手的那一下带的也是真设备（keyboardStart 填的）
    this.ctxPick = null; this.pointed = null;   // 右键菜单那一下记的点 / Ctrl+J 压着的那个：画布上再按一下就作废
    if (this.gizmoPointer("down", ev)) return;   // 镜像会话：把手优先、别处不动作
    const s = ev;
    this.mods = { shift: ev.shiftKey, copy: !!ev.copy };
    this.pressPeak = 0;
    { const r = this.frame().ray(s.x, s.y, this.fvp()); this.taps.down(performance.now(), add3(r.origin, r.dir), TAP_RULES[ev.pointerType] ?? frameTapRule(this.eps().tap), (prev) => this.frame().distTo(s.x, s.y, prev, this.fvp())); }
    const H = this.handlers[this._tool];
    if (H) {
      if (H.grammar === "steps" && this.armed && H.active()) {
        // 位移防抖：等下一点时按下的地方离当前锚点在点按容差内 = 「同一处又点了一下」，不取这一子步——画线（连画）= 收笔，别的工具 = 吞掉这一下。
        // 起因（user 2026-10-25「为什么会在同一个地方点两下会在垂直的方向画线？」）：笔点两下差 6 px，第二点被吸到过锚点的竖直线上 = 7 cm 竖线
        // （屏上只有 6 px，世界长度却过了 MIN_GESTURE_LEN 1 cm）。根因（锚点附近不该推竖直线）在求解器，归 Fable（总账记了）；这里是手势层的护栏。探针 probe-pen-tap。
        // 半径 = 吸附半径（点按容差 4 px 拦不住：Pencil「同一处」点两下常差 5–8 px）——这么近本来就该吸回锚点本身，不该另起一段；要画更短的线就放大或输长度。
        if (!H.repeatTap && this.anchor3 && this.frame().distTo(s.x, s.y, this.anchor3, this.fvp()) <= Math.max(this.eps().tap, this.eps().snap)) {
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
    if (this.activeKind() !== "brep") {   // 非 brep 的池：只认显示契约——数面 / 点、量边长（面积要平面环，brep 才有）
      const v = this.activeView, fs = [...this.selection.faces].filter((f) => v.face(f)).length, vn = [...this.selection.verts].filter((x) => v.graph.hasVertex(x)).length, es = [...this.selection.edges].filter((e) => v.graph.hasEdge(e));
      let L = 0; for (const e of es) { const E = v.graph.edge(e); L += len3(sub3(v.graph.pt(E.b), v.graph.pt(E.a))); }
      return [fs ? `${fs} 面` : "", vn ? `${vn} 个点` : "", es.length ? `长 ${fmtLen(L)}${es.length > 1 ? `（${es.length} 边）` : ""}` : ""].filter(Boolean).join(" · ");
    }
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
  selectAll(): boolean { return this.step((pass) => { this.selectAllInner(pass); this.afterSelect(pass); return this.hasSelection(); }, { title: "全选" }); }
  private selectAllInner(pass: StepPass): void {
    const v = this.activeView;   // 显示契约：任何种类的池都能全选
    this.clearSel(pass);
    for (const f of v.faces()) if (!v.isFaceHidden(f.id)) this.selection.faces.add(f.id);   // 隐藏的（DT49）不选
    for (const e of v.edges()) if (!v.isEdgeHidden(e.id)) this.selection.edges.add(e.id);
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
    this.live = null; this.liveMesh = null; this.liveOverride = null; this.liveEvents = [];
  }
  /** 充能生命周期 = 工具子步（user 2026-10-24「充能只影响下一个按下……充能的生命周期应该是每一下点，是工具的子步的生命周期」）：每次按下 / 松手落定都消费掉，这一子步悬停时再蹭。 */
  private consumeCharges(): void { this.clearCharged(); }

  pointerMove(ev: ToolPointer): void { this.step(() => this.pointerMoveStep(ev)); }
  private pointerMoveStep(ev: ToolPointer): void {
    if (this.gizmoPointer("move", ev)) return;
    const s = ev;
    { const at = this.taps.pressAt(); if (at && this.taps.pressing()) this.pressPeak = Math.max(this.pressPeak, this.frame().distTo(s.x, s.y, at, this.fvp())); }
    this.lastPtr = { x: s.x, y: s.y };
    this.lastPtrType = ev.pointerType;
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
    const pass = this.toolPass();   // 工具边界的通行证（运行时发；工具只在包好的指针事件里被调，commitIn 的运行时检查兜底）
    const self = this;
    return {
      scene: () => this.scene,
      context: () => this.ctx,
      revision: () => this._revision,
      modeId: () => this.mode.id,
      get config() { return self.config; },   // getter：toolCtx 字段先于 config 字段初始化，直接取值会是 undefined（v0.13.11 vcb / scene 探针抓到）
      kernel: () => this.kernel,
      mesh: () => this.scene.mesh(this.activePool().def).kernel,
      axisLockDir: () => (this._axisLock ? normalize3(this.contextFrame()[this._axisLock]) : null),
      planeLockNormal: () => this._planeLockN,
      selection: () => this.selection,
      world: () => this.worldView(),
      live: () => this.liveWorld(),
      frame: () => this.frame(),
      vp: () => this.fvp(),
      eps: () => this.eps(),
      snapPx: () => this.snapPx(),
      pickFace: (sx, sy) => pickFace(this.liveWorld(), this.frame(), this.fvp(), sx, sy),
      pick: (sx, sy, opts) => this.pickAt(sx, sy, opts),
      pickStatic: (sx, sy) => pickEntity(this.worldView(), this.frame(), this.fvp(), sx, sy, this.hitPx(), this.meshPickOpts()),
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
      commitOp: (op) => this.toolCommit(op),
      opCount: () => this.opCount,
      hint: (t) => { if (this.mirrorDeferred) return; const n = this.mirrorNote; this.mirrorNote = ""; this.host.hint(t && n ? `${t} ｜ ${n}` : t); },   // 镜像想说的话接在后面；护栏挡下的那一下不报
      tip: (t) => { this.toolTip = t; },
      anchor: () => this.anchor3,
      setAnchor: (p) => { this.anchor3 = p; },
      setCursor: (p) => { this.cursor3 = p; },
      setSnap: (sn) => { this.snapInfo = sn; },
      recordLast: (L) => { this.last = L; this.offerLastAfterthought(this.toolPass()); },
      contextFrame: () => this.contextFrame(),
      axesBase: () => this.axesBase(),
      workflow: () => ({ eraseNonCoplanar: this.mode.workflow?.eraseNonCoplanar ?? "burst", autofold: this.mode.workflow?.autofold ?? "hard" }),
      orientFrame: () => this.orientFrame(),
      boxIn: (f) => this.boxIn(f),
      setAxes: (f) => this.setContextAxes(f),
      newPrimitive: (kind, x, y, size, spin, aspect) => this.addPrimitive(kind, { at: { x, y }, verb: "拉出", ...(size !== undefined ? { size } : {}), ...(spin ? { spin } : {}), ...(aspect !== undefined ? { aspect } : {}) }),
      previewPrimitive: (kind, x, y, size, m, spin, aspect) => this.previewPrimitive(kind, x, y, size, m, spin, aspect),
      primitiveFrameAt: (x, y) => { const f = this.primitiveFrameAt(x, y); return f ? { origin: f.o, x: f.x, y: f.y, z: f.z } : null; },
      primitiveDragSize: (x0, y0, x1, y1) => this.primitiveDragSize(x0, y0, x1, y1),
      typed: () => this.typedValue(),
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
      keyboardStart: (at) => ({ x: at.x, y: at.y, clientX: at.x, clientY: at.y, pointerType: this.lastPtrType, shiftKey: false, start: "keyboard" }),
      snapBase: () => SNAP_BASE[deviceOf(this.lastPtrType)] === "lock" && this.grid.on,   // 自由建模吸附的底：鼠标关、触屏跟右上角锁钮（F-128）
      currentSnap: () => this.snapInfo,
      setHoverFace: (f) => { this.hoverFace = f; },
      paintMaterialIndex: () => this.materialIndexForPick(this.toolPass()),
      paintFaces: (faces, sides) => this.paintFaces(faces, sides),
      pickMaterialOf: (f, side) => this.pickMaterialOf(f, side),
      grid: () => (this.gridEff === this._grid.on ? this._grid : { ...this._grid, on: this.gridEff }),   // 工具看到的是有效开关（按住 Shift 反过来）
      pickLocked: (p) => this.pickIsLocked(p),
      setLiveOverride: (o) => { this.liveOverride = o; },
      xformToLocal: (X) => this.xformToLocal(X),
      copyPayload: (XL, entities) => this.copyPayload(XL, entities),
      commitCopies: (copies, pools, at) => this.commitCopies(this.toolPass(), copies, pools, at),
      commitXform: (X, vids, pools) => this.commitXform(this.toolPass(), X, vids, pools),
      previewXform: (X, run, copy) => this.previewXform(X, run, copy),
      pivotOf: (m) => this.pivotOf(m),
      offerAfterthought: (title, fields, values, nOps, redo) => this.offerAfterthought(title, fields, values, nOps, redo),
      movablePoolPicks: (say) => this.movablePoolPicks(say),
      targetBounds: () => this.targetBounds(),
      marquee: (r) => this.host.marquee(r),
      lasso: (pts) => this.host.lasso?.(pts),
      softRing: (c) => this.host.softRing?.(c),
      selGrowBar: (at) => this.host.selGrowBar?.(at),
      hitInSelection: (h) => this.hitInSelection(h),
      marqueePick: (area) => marqueeScreen(this.liveWorld(), this.cam, this.vp(), area, { xray: this._xray, verts: this.mode.id === "freeform" }),
      emptyAt: (sx, sy) => this.emptyAt(sx, sy),
      emptiesIn: (area) => this.emptiesIn(area),
      replaceSelection: (sel, mode) => {
        if (mode === "replace") { this.clearSel(pass); }
        mergeSel(this.selection.verts, sel.verts ?? [], mode, true);
        mergeSel(this.selection.edges, sel.edges, mode, true);
        mergeSel(this.selection.faces, sel.faces, mode, true);
        if (this.selection.kind === "brep") mergeSel(this.selection.guides, sel.guides ?? [], mode, true);
        this.mergePools(sel.pools, mode);
      },
      selectGuide: (id, mode) => {
        if (mode === "replace") { this.clearSel(pass); }
        if (this.selection.kind === "brep") mergeSel(this.selection.guides, [id], mode);
        this.host.changed(); this.draw();
      },
      afterSelect: () => this.afterSelect(this.toolPass()),
      setSelection: (sel) => {
        if (this.mirrorDeferred) return;   // 护栏挡下的那一下：新几何还没有
        this.clearSel(pass);
        for (const v of sel.verts ?? []) this.selection.verts.add(v);
        for (const e of sel.edges ?? []) this.selection.edges.add(e);
        for (const f of sel.faces ?? []) this.selection.faces.add(f);
        this.pruneSelection(); this.afterSelect(pass);
      },
      selectExpand: (hit, stage, mode) => this.selectExpand(hit, stage, mode),
      selectLoop: (hit, mode) => this.selectLoop(hit, mode),
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
    { const at = this.taps.pressAt(), now = at ? this.frame().distTo(s.x, s.y, at, this.fvp()) : 0; this.taps.up(performance.now(), ev.travel ?? Math.max(now, this.pressPeak)); this.pressPeak = 0; }   // 点还是拖按「按下以后离开过多远」判，不按「松手离按下处多远」（拖出去又拖回来 = 拖；user「拖动面的时候有时候松开鼠标还在跟着走」）
    const isTap = (): boolean => !!this.downPoint && this.taps.clicks() > 0;   // 点 / 拖 = 点按族一处判（笔跟进的那一下偏向点）
    const settle = (): GestureSample | null => {
      if (this.justCommitted) return null;
      this.trackGesture(s);
      this.recordSample(s);
      return this.settledSample();
    };
    const H = this.handlers[this._tool];
    if (H?.tap && H.grammar === "steps" && !this.armed && isTap()) {   // 自由建模的取量工具：点一下 ≠ 进「再点一下落定」（user 10-27「当你单击空白的时候取消选择，只有在空白拖动的时候才是操作」「移动的时候有时候鼠标弹起来还是没有成功退出移动」）
      if (H.active()) H.cancel();
      this.endStepGesture();
      H.tap(this.toolCtx, ev);
      this.consumeCharges(); this.host.changed(); this.draw();
      return;
    }
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
        this.live = null; this.liveMesh = null;
      this.host.tip(null, 0, 0);
      this.host.hint(null);
      this.draw();
    }
  }

  /** 复制落地：每份 = absorb 载荷 + 子池 copyGroup / placeInstance（移动复制与阵列共用）。 */
  private commitCopies(pass: StepPass, copies: { payload: ReturnType<Editor["copyPayload"]>; XL: Xform }[], pools: readonly PoolPick[], at: PoolRef): void {
    const def = this.scene.defOfContext(this.ctx);
    for (const { payload, XL } of copies) {
      if (payload) this.commitIn(pass, { op: "absorb", at, faces: payload.faces, wires: payload.wires, edgeSegs: payload.edgeSegs, faceLayers: payload.faceLayers });
      for (const p of pools) {
        if (p.kind === "group") this.commitIn(pass, { op: "copyGroup", at, group: p.group, xform: XL });
        else { const inst = this.scene.instance(def, p.instance); this.commitIn(pass, { op: "placeInstance", at, definition: inst.def, xform: compose(XL, inst.xform) }); }
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
  private commitXform(pass: StepPass, X: Xform, vids: readonly VertexId[], pools: readonly PoolPick[]): void {
    const at = this.activePool(), k = this.kernel, XL = this.xformToLocal(X);
    if (vids.length) {
      const moves = vids.filter((id) => k.graph.hasVertex(id)).map((id) => ({ from: k.graph.pt(id), to: applyPt(XL, k.graph.pt(id)) }));
      this.commitIn(pass, { op: "move", at, moves, ...(det3(XL) < 0 ? { mirror: true } : {}) });   // 镜像挪点：两个表面跟着法向走（DT8）
    }
    const def = this.scene.defOfContext(this.ctx);
    for (const p of pools) {
      if (p.kind === "group") this.commitIn(pass, { op: "transformPool", at: { def, group: p.group }, xform: XL });
      else this.commitIn(pass, { op: "transformInstance", def, instance: p.instance, xform: XL });
    }
  }
}
