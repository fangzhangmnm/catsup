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
import { ringVidsTolerant } from "../kernel/face-lifecycle.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport, closestOnAxis, rayPlane } from "./camera.ts";
import type { PointerFrame } from "./pointer-frame.ts";
import { type AlignHand, type DrawPlane, type HitResult3, type Snap3, type SnapKind, GROUND, cameraPlane, drawPlaneAt, grazing, inferAxisByDirection, pickEntity, pickFace, rectFirstPlane, resolveRectPlane, snapPoint } from "./pick.ts";
import { SNAP_PX, frameEps } from "./solver.ts";
import { marqueeScreen } from "./marquee.ts";
import type { EpsSet } from "./pointer-frame.ts";
import { type Selection, circleSegmentsOnPlane, emptySelection, moveTargets, moveTargetsSelection, rectSegmentsOnPlane } from "./tools.ts";
import { offsetRing } from "./offset.ts";
import { type CatsUpToolConfig, TOOL_OPTIONS, ToolConfig } from "./tool-config.ts";
import { facesForPaint } from "./paint-flood.ts";
import { hasIntent, intentAllows1D, intentAllows3D } from "./intent.ts";
import { perf } from "./perf-stats.ts";
import { type LengthUnit, type VcbKind, arrayTranslations, fmtVcbLength, parseVcb, vcbPrompt } from "./vcb.ts";
import type { FaceKey } from "./ops.ts";
import { simplifyPath, sweepStations } from "../kernel/sweep.ts";
import { liftFromPlane, projectToPlane } from "../kernel/geom.ts";
import { Renderer3, type LineStyle, type ViewState } from "./render3.ts";
import { PRESETS } from "./presets.ts";
import { type Op, edgeKey, faceKey } from "./ops.ts";
import { History, OpApplyError } from "./history.ts";
import { add3, cross3, dot3, len3, normalize3, scale3, sub3 } from "../kernel/geom.ts";
import { type EditContext, type InstId, type PoolRef, ROOT_CONTEXT, Scene, extractSnapshot, poolBounds, samePool, snapshotLayerPayload, transformSnapshot } from "../scene/scene.ts";
import { type PoolSlot, WorldView, slotKey } from "../scene/world-view.ts";
import { type Xform, IDENTITY, applyDir, applyPt, compose, invert, rotationAbout, scalingAbout, translation } from "../scene/xform.ts";

export type Tool = "select" | "line" | "rect" | "circle" | "move" | "rotate" | "scale" | "pp" | "offset" | "followme" | "paint" | "erase" | "eraseFace";
export const TOOLS: readonly Tool[] = ["select", "line", "rect", "circle", "move", "rotate", "scale", "pp", "offset", "followme", "paint", "erase", "eraseFace"];

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
  /** 自落笔以来指针「走了多远」（本帧量纲：桌面 px）。缺省 = 屏距 downScreen。 */
  travel?: number;
}

/** 记账面包屑（调试日志；op 一行一条）。 */
export type EditorTrace =
  | { kind: "op"; op: Op; events: number; ms: number; position: number }
  | { kind: "undo" | "redo"; position: number; depth: number }
  | { kind: "load"; label: string }
  | { kind: "fail"; where: string; op: Op | null; message: string };

export interface EditorHost {
  hint(text: string | null): void;
  tip(text: string | null, clientX: number, clientY: number): void;
  trace?(entry: EditorTrace): void;
  marquee(r: { x: number; y: number; w: number; h: number } | null): void;
  changed(): void;
  error?(err: unknown, where: string): void;
}

function epsOfKindVR(e: EpsSet, kind: string): number {
  if (kind === "on-edge") return e.edge;
  if (kind === "edge-align" || kind === "align-combo") return e.combo;
  if (kind === "align" || kind.startsWith("axis-")) return e.line;
  return e.point;
}
const EPS_OF: Record<string, number> = {
  endpoint: 10, origin: 10, midpoint: 10, "on-edge": 7,
  "edge-align": 12, "align-combo": 12, align: 5, "axis-x": 5, "axis-y": 5, "axis-z": 5,
};
export const SNAP_LABELS: Record<string, string> = {
  endpoint: "端点", midpoint: "中点", "on-edge": "边上", origin: "原点",
  "axis-x": "X 轴", "axis-y": "Y 轴", "axis-z": "Z 轴",
  align: "共轴", "align-combo": "共轴角点", "edge-align": "边上·共轴", intersection: "交点", "cross-line": "交线",
  "h-stop": "高度咬合", "on-face": "面上",
};

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
/** 手势最小位移（世界单位=米，A10 纪律）：短于此的线/移动/推拉视为没动。 */
const MIN_GESTURE_LEN = 0.01;
/** 旋转的意图死区（弧度）：半度以内还看不出转向。 */
const ANGLE_DEAD = 0.5 * Math.PI / 180;
/** 圆的多边形段数（SU 默认 24）。 */
/** 圆的默认段数（SSoT 在 tool-config 表；这里只是给老调用方 / 测试的镜像）。 */
export const CIRCLE_SEGMENTS = TOOL_OPTIONS.circle.segments.def;
/** 量角器角度咬合：步长（度）与咬合半宽（度）。 */
const ANGLE_STEP_DEG = 15, ANGLE_SNAP_DEG = 1.5;
/** 缩放柄：角柄 8 个（等比）+ 面心柄 6 个（单轴）；拾取半径用本帧 hit 容差。 */
const SCALE_HANDLE_TYPES = ["corner", "face"] as const;

export function fmtLen(v: number, digits = 1): string {
  const cm = Math.abs(v) < 1;
  const val = cm ? v * 100 : v;
  const shown = Number(val.toFixed(digits));
  return (Math.abs(val - shown) > 1e-6 ? "~" : "") + shown.toFixed(digits) + (cm ? " cm" : " m");
}
const fmtDeg = (rad: number): string => `${(rad * 180 / Math.PI).toFixed(1)}°`;

/** 子池选区项（相对活动上下文的直接子项）。 */
export type PoolPick = { kind: "group"; group: number } | { kind: "instance"; instance: InstId };
interface ScaleHandle { kind: typeof SCALE_HANDLE_TYPES[number]; p: Pt3; anchor: Pt3; axis: Pt3 | null; }

/** 数值小窗（vcb.ts）作用的「刚做完的那一步」：撤销它（ops 个 op）、按精确值重做。坐标 = 世界系（froms = 活动池本地）。 */
type LastGesture =
  | { kind: "line"; ops: number; at: PoolRef; a: Pt3; b: Pt3 }
  | { kind: "rect"; ops: number; at: PoolRef; plane: DrawPlane; anchor: Pt3; corner: Pt3 }
  | { kind: "circle"; ops: number; at: PoolRef; plane: DrawPlane; center: Pt3; rim: Pt3; segments: number }
  | { kind: "pp"; ops: number; at: PoolRef; face: FaceKey; h: number; hl: number }
  | { kind: "offset"; ops: number; at: PoolRef; ring: Pt3[]; plane: DrawPlane; d: number }
  | { kind: "move"; ops: number; at: PoolRef; froms: Pt3[]; pools: PoolPick[]; delta: Pt3; copy: boolean; entities: { faces: FaceId[]; edges: EdgeId[] } }
  | { kind: "rotate"; ops: number; at: PoolRef; froms: Pt3[]; pools: PoolPick[]; center: Pt3; axis: Pt3; angle: number }
  | { kind: "scale"; ops: number; at: PoolRef; froms: Pt3[]; pools: PoolPick[]; anchor: Pt3; axis: Pt3 | null; f: Pt3 };

export class Editor {
  readonly cam = new OrbitCamera();
  private r3: Renderer3;
  private scene = new Scene();
  private ctx: EditContext = ROOT_CONTEXT;
  private history = new History();
  private _tool: Tool = "line";
  private _revision = 0;                  // 场景每次变（commit/undo/redo/load/进出上下文）+1；碰撞世界等消费方据此重建

  // ---- 瞬态 ----
  private anchor3: Pt3 | null = null;
  private gesturePlane: DrawPlane = GROUND;
  private rectFixed: DrawPlane | null = null;
  private cursor3: Pt3 | null = null;
  private snapInfo: Snap3 | null = null;
  private moveVids: VertexId[] = [];
  private movePools: PoolPick[] = [];
  private moveCopy = false;
  private moveEntities: { faces: FaceId[]; edges: EdgeId[] } = { faces: [], edges: [] };
  private ppFace: FaceId | null = null;
  private ppNormal: Pt3 | null = null;
  private ppH = 0;
  private ppShellVids: ReadonlySet<VertexId> = new Set();
  private ppStops: number[] = [];
  // 偏移（SU Offset）：面 + 按下点 + 按下时离外环最近的那条边的内法向（面内）；距离沿它量（正 = 向内）
  private offFace: FaceId | null = null;
  private offPlane: DrawPlane | null = null;
  private offInward: Pt3 | null = null;
  private offDist = 0;
  // 量角器：阶段 0 = 等圆心；1 = 圆心已定、等参考点；2 = 拖角度中
  private rotStage: 0 | 1 | 2 = 0;
  private rotCenter: Pt3 | null = null;
  private rotAxis: Pt3 | null = null;
  private rotRef: Pt3 | null = null;
  private rotAngle = 0;
  // 缩放柄
  private scaleHandles: ScaleHandle[] = [];
  private scaleActive: ScaleHandle | null = null;
  private scaleT0 = 1;
  private scaleFactor: Pt3 = { x: 1, y: 1, z: 1 };
  private samples: { t: number; sx: number; sy: number; cursor3: Pt3 | null; ppH: number; plane: DrawPlane; snap: Snap3 | null; angle: number; scale: Pt3; off: number }[] = [];
  private scrubAcc = new Set<EdgeId>();
  private scrubbing = false;
  private eraseMode: "erase" | "soften" | "harden" = "erase";
  private selection: Selection = emptySelection();
  private selectedPools = new Map<string, PoolPick>();
  private marqueeStart: { x: number; y: number } | null = null;
  private marqueeCur: { x: number; y: number } | null = null;
  private hoverEdge: EdgeId | null = null;
  private hoverFace: FaceId | null = null;
  private hoverPool: string | null = null;
  private live: Kernel | null = null;
  private liveOverride: { picks: PoolPick[]; xform: Xform; copy?: boolean } | null = null;
  private liveEvents: FaceEvent[] = [];
  private armed = false;
  private canArm = false;
  private downScreen: { x: number; y: number } | null = null;
  private justCommitted = false;
  private charged = new Map<string, Pt3>();
  private dwell: { key: string; since: number } | null = null;
  private lastSnap: Snap3 | null = null;
  private clickTrain: { t: number; x: number; y: number; n: number } | null = null;
  private paintPick: PaintPick = null;
  /** 工具选项（声明式表 `tool-config.ts`，SSoT）；UI 从它生成，工具从它读。 */
  readonly config: CatsUpToolConfig = new ToolConfig(TOOL_OPTIONS);
  /** 数值小窗：刚做完的那一步（null = 没有可改的）；opCount 给它数这一步占了几个 op。 */
  private last: LastGesture | null = null;
  private opCount = 0;
  /** 数值小窗的默认长度单位（文档级单位设置落地前 = 出厂 m；后缀可覆盖）。 */
  vcbUnit: LengthUnit = "m";
  private viewCache: { key: string; view: WorldView } | null = null;
  private kids = new WeakMap<object, number>();
  private nextKid = 1;

  constructor(private canvas: HTMLCanvasElement, private host: EditorHost) {
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
  hasSelection(): boolean { return this.selection.edges.size > 0 || this.selection.faces.size > 0 || this.selectedPools.size > 0; }
  hasGeometrySelection(): boolean { return this.selection.edges.size > 0 || this.selection.faces.size > 0; }
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
    if (override?.copy) override = null;   // 复制模式：原件不动（副本在 commit 时出现）
    const ovKey = override ? `${override.picks.map((p) => (p.kind === "group" ? `g${p.group}` : `i${p.instance}`)).join(",")}:${override.xform.map((v) => v.toFixed(9)).join(",")}` : "";
    const key = `${this._revision}|${live ? this.kid(live) : 0}|${this.ctxKey()}|${ovKey}`;
    if (this.viewCache?.key === key) return this.viewCache.view;
    const overrides = override ? this.overrideList(override) : undefined;
    const view = perf.time("worldView", () => new WorldView(this.scene, this.ctx, live, overrides));
    this.viewCache = { key, view };
    return view;
  }
  private overrideList(o: { picks: PoolPick[]; xform: Xform }): { match(pool: PoolRef, chain: readonly InstId[]): boolean; xform: Xform }[] {
    const def = this.scene.defOfContext(this.ctx), chainKey = this.ctx.chain.join("/");
    const groupDesc = (gid: number): Set<number> => {
      const out = new Set<number>([gid]);
      let grew = true;
      while (grew) { grew = false; for (const g of this.scene.def(def).groups.values()) if (g.parent !== null && out.has(g.parent) && !out.has(g.id)) { out.add(g.id); grew = true; } }
      return out;
    };
    return o.picks.map((p) => {
      if (p.kind === "group") {
        const desc = groupDesc(p.group);
        return { match: (pool: PoolRef, chain: readonly InstId[]) => {
          if (pool.def === def && chain.join("/") === chainKey && pool.group !== null && desc.has(pool.group)) return true;
          // 组里的实例（及其子树）也跟着走
          if (chain.length > this.ctx.chain.length && chain.slice(0, this.ctx.chain.length).join("/") === chainKey) {
            const inst = this.scene.def(def).instances.get(chain[this.ctx.chain.length]);
            return !!inst && inst.parent !== null && desc.has(inst.parent);
          }
          return false;
        }, xform: o.xform };
      }
      const prefix = [...this.ctx.chain, p.instance].join("/");
      return { match: (_pool: PoolRef, chain: readonly InstId[]) => chain.length > this.ctx.chain.length && chain.slice(0, this.ctx.chain.length + 1).join("/") === prefix, xform: o.xform };
    });
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
    this.last = null;
    this._tool = t;
    this.cancelGesture();
    if (t === "scale") this.rebuildScaleHandles();
    this.host.changed();
    this.draw();
  }

  cancel(): void {
    this.last = null;
    this.selection = emptySelection();
    this.selectedPools.clear();
    this.cancelGesture();
    this.scaleHandles = [];
    this.host.changed();
    this.draw();
  }

  private cancelGesture(): void {
    this.anchor3 = null;
    this.moveVids = [];
    this.movePools = [];
    this.moveCopy = false;
    this.moveEntities = { faces: [], edges: [] };
    this.ppFace = null;
    this.ppNormal = null;
    this.ppShellVids = new Set();
    this.ppStops = [];
    this.ppH = 0;
    this.offFace = null; this.offPlane = null; this.offInward = null; this.offDist = 0;
    this.rotStage = 0; this.rotCenter = null; this.rotAxis = null; this.rotRef = null; this.rotAngle = 0;
    this.scaleActive = null; this.scaleFactor = { x: 1, y: 1, z: 1 };
    this.samples = [];
    this.rectFixed = null;
    this.lastSnap = null;
    this.armed = false;
    this.canArm = false;
    this.downScreen = null;
    this.justCommitted = false;
    this.cursor3 = null;
    this.snapInfo = null;
    this.scrubAcc = new Set();
    this.scrubbing = false;
    this.marqueeStart = this.marqueeCur = null;
    this.hoverEdge = null;
    this.hoverFace = null;
    this.hoverPool = null;
    this.live = null;
    this.liveOverride = null;
    this.liveEvents = [];
    this.host.marquee(null);
    this.host.tip(null, 0, 0);
    this.host.hint(null);
  }

  // ---------- 记账 ----------
  /** 所有改场景的用户手势走这里：记账（op 日志，按坐标寻址）+ 应用。 */
  private commitOp(op: Op): FaceEvent[] {
    const t0 = performance.now();
    let r: ReturnType<History["commit"]>;
    try { r = perf.time("commit", () => this.history.commit(this.scene, op)); }
    catch (err) {
      const cause = err instanceof OpApplyError ? err.cause : err;
      if (err instanceof OpApplyError) { this.scene = err.restored; this.bump(); }
      this.host.trace?.({ kind: "fail", where: "commit", op, message: cause instanceof Error ? cause.message : String(cause) });
      this.fail("commit", cause);
      return [];
    }
    this.scene = r.scene;
    this.opCount++;
    this.bump();
    this.revalidateCharged();
    this.host.trace?.({ kind: "op", op, events: r.events.length, ms: performance.now() - t0, position: this.history.position() });
    this.host.changed();   // HUD（撤销钮 / 选项条 / 数值小窗）随每个 op 刷新
    this.host.changed();
    return r.events;
  }
  private bump(): void {
    this._revision++;
    // 上下文可能已不存在（undo 掉了建组）→ 回根
    try { this.scene.poolOfContext(this.ctx); this.scene.xformOfContext(this.ctx); } catch { this.ctx = ROOT_CONTEXT; }
    if (this.ctx.group !== null && !this.scene.def(this.scene.defOfContext(this.ctx)).groups.has(this.ctx.group)) this.ctx = { chain: this.ctx.chain, group: null };
    this.pruneSelection();
  }
  private pruneSelection(): void {
    const k = this.kernel;
    for (const e of [...this.selection.edges]) if (!k.graph.hasEdge(e)) this.selection.edges.delete(e);
    for (const f of [...this.selection.faces]) if (!k.face(f)) this.selection.faces.delete(f);
    const def = this.scene.defOfContext(this.ctx);
    for (const [key, p] of [...this.selectedPools]) {
      const ok = p.kind === "group" ? this.scene.def(def).groups.get(p.group)?.parent === this.ctx.group : this.scene.def(def).instances.get(p.instance)?.parent === this.ctx.group;
      if (!ok) this.selectedPools.delete(key);
    }
  }
  private fail(where: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    this.host.error?.(err, where);
    this.host.hint(`操作失败（${where === "commit" ? "提交" : "预演"}）：${msg}`);
  }

  undo(): void {
    this.last = null;
    if (this.gestureActive()) { this.cancelGesture(); this.host.hint(null); this.host.changed(); this.draw(); return; }
    const s2 = this.history.undo();
    if (!s2) return;
    this.scene = s2;
    this.bump();
    this.revalidateCharged();
    this.cancelGesture();
    this.selection = emptySelection(); this.selectedPools.clear();
    this.host.trace?.({ kind: "undo", position: this.history.position(), depth: this.history.depth() });
    this.host.changed();
    this.draw();
  }
  redo(): void {
    this.last = null;
    let r: ReturnType<History["redo"]>;
    try { r = this.history.redo(this.scene); }
    catch (err) {
      const cause = err instanceof OpApplyError ? err.cause : err;
      if (err instanceof OpApplyError) { this.scene = err.restored; this.bump(); }
      this.host.trace?.({ kind: "fail", where: "redo", op: null, message: cause instanceof Error ? cause.message : String(cause) });
      this.fail("commit", cause);
      return;
    }
    if (!r) return;
    this.scene = r.scene;
    this.bump();
    this.revalidateCharged();
    this.cancelGesture();
    this.selection = emptySelection(); this.selectedPools.clear();
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
    this.history = new History(s);
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
    return this.r3.captureRgba(this.worldView(), this.cam, { w, h }, this.cleanState());
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
   * 空命中 = 清选区（非加选）。hit 是 WorldView 的全局 id。
   */
  selectExpand(hit: HitResult3, stage: 0 | 1 | 2, additive = false): boolean {
    const view = this.liveWorld();
    const c = this.classify(view, hit);
    if (!additive) { this.selection = emptySelection(); this.selectedPools.clear(); }
    if (c.kind === "pool") { this.selectedPools.set(c.key, c.pick); this.afterSelect(); return true; }
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
      if (stage >= 1) for (const fid of k.graph.edge(h.edge).faceLinks) picked.faces.add(fid);
    } else if (h.face !== undefined && k.face(h.face)) {
      if (stage >= 1) addFaceRing(h.face); else picked.faces.add(h.face);
    } else if (h.vertex !== undefined && k.graph.hasVertex(h.vertex)) {
      for (const eid of k.graph.vertex(h.vertex).edges) picked.edges.add(eid);
    }
    if (stage >= 2 && (h.edge !== undefined || h.face !== undefined)) {
      const qE = [...picked.edges], qF = [...picked.faces];
      while (qE.length || qF.length) {
        const fid = qF.pop();
        if (fid !== undefined) {
          const f = k.face(fid);
          if (f) for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) if (!picked.edges.has(d.edge)) { picked.edges.add(d.edge); qE.push(d.edge); }
          continue;
        }
        const eid = qE.pop()!;
        if (!k.graph.hasEdge(eid)) continue;
        const e = k.graph.edge(eid);
        for (const f2 of e.faceLinks) if (!picked.faces.has(f2)) { picked.faces.add(f2); qF.push(f2); }
        for (const vid of [e.a, e.b]) for (const e2 of k.graph.vertex(vid).edges) if (!picked.edges.has(e2)) { picked.edges.add(e2); qE.push(e2); }
      }
    }
    for (const e of picked.edges) this.selection.edges.add(e);
    for (const f of picked.faces) this.selection.faces.add(f);
    this.afterSelect();
    return true;
  }
  private afterSelect(): void {
    if (this._tool === "scale") this.rebuildScaleHandles();
    this.host.changed();
    this.draw();
  }

  deleteSelection(): void {
    if (!this.hasSelection()) return;
    const k = this.kernel, at = this.activePool();
    if (this.selection.faces.size || this.selection.edges.size) {
      this.commitOp({ op: "eraseSelection", at, faces: [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f)), edges: [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e)) });
    }
    const def = this.scene.defOfContext(this.ctx);
    for (const p of [...this.selectedPools.values()]) {
      if (p.kind === "group") this.commitOp({ op: "eraseGroup", at, group: p.group });
      else this.commitOp({ op: "eraseInstance", def, instance: p.instance });
    }
    this.selection = emptySelection(); this.selectedPools.clear();
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
    if (!faces.length && !edges.length) return false;
    this.commitOp({ op: "makeGroup", at, faces, edges });
    this.selection = emptySelection(); this.selectedPools.clear();
    const def = this.scene.def(this.scene.defOfContext(this.ctx));
    const newest = [...def.groups.values()].filter((g) => g.parent === this.ctx.group).pop();
    if (newest) this.selectedPools.set(`g${newest.id}`, { kind: "group", group: newest.id });
    this.host.changed(); this.draw();
    return true;
  }
  /** 选区 → component（新 definition + 一个实例；轴 = 包围盒最小角）。 */
  makeComponent(name: string): boolean {
    if (!this.hasSelection()) return false;
    const at = this.activePool(), k = this.kernel;
    const faces = [...this.selection.faces].filter((f) => k.face(f)).map((f) => faceKey(k, f));
    const edges = [...this.selection.edges].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e));
    if (!faces.length && !edges.length) return false;
    this.commitOp({ op: "makeComponent", at, faces, edges, name });
    this.selection = emptySelection(); this.selectedPools.clear();
    const def = this.scene.def(this.scene.defOfContext(this.ctx));
    const newest = [...def.instances.values()].filter((i) => i.parent === this.ctx.group).pop();
    if (newest) this.selectedPools.set(`i${newest.id}`, { kind: "instance", instance: newest.id });
    this.host.changed(); this.draw();
    return true;
  }
  /** 炸开选中的子 group / 实例。 */
  explodeSelection(): boolean {
    if (!this.selectedPools.size) return false;
    const at = this.activePool();
    for (const p of [...this.selectedPools.values()]) this.commitOp(p.kind === "group" ? { op: "explode", at, group: p.group } : { op: "explode", at, instance: p.instance });
    this.selectedPools.clear();
    this.host.changed(); this.draw();
    return true;
  }
  /** 再放一份选中实例的定义（复制 = 同定义新实例，偏移 delta 世界向量）。 */
  copyInstance(delta: Pt3): boolean {
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
  /** 进入选中（或命中）的子 group / 实例编辑。 */
  enterPool(p: PoolPick): void {
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
  paintFaces(faces: readonly FaceId[]): void {
    const k = this.kernel;
    const keys = faces.filter((f) => k.face(f)).map((f) => faceKey(k, f));
    if (!keys.length) return;
    const material = this.materialIndexForPick();
    this.commitOp({ op: "paintFaces", at: this.activePool(), faces: keys, material });
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
    const hit = pool.filter((e) => { const a = k.dihedralDeg(e); return a !== null && a <= maxDeg + 1e-9 && a > 1e-9; });
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
    this.cam.fitPoints(this.worldView().vertices(), this.vp());
    this.draw();
  }
  // ---------- 数值小窗（vcb.ts；SU Measurements）：刚做完的那一步，撤销后按精确值重做 ----------
  /** 小窗当前状态：kind = 能改哪类（null = 没有）；prompt = 提示字；echo = 现值回显。 */
  vcbState(): { kind: VcbKind | null; prompt: string; echo: string } {
    const L = this.last;
    if (!L || this.vcbBlocked()) return { kind: null, prompt: "", echo: "" };
    const u = this.vcbUnit, fl = (m: number): string => fmtVcbLength(m, u);
    const echo = L.kind === "line" ? fl(dist(L.a, L.b)) : L.kind === "pp" ? fl(L.h) : L.kind === "offset" ? fl(L.d) : L.kind === "move" ? fl(len3(L.delta))
      : L.kind === "circle" ? `${fl(dist(L.center, L.rim))} · ${L.segments}s` : L.kind === "rotate" ? fmtDeg(L.angle) : L.kind === "scale" ? (L.axis ? `${(L.axis.x ? L.f.x : L.axis.y ? L.f.y : L.f.z).toFixed(3)}` : `${L.f.x.toFixed(3)}`)
      : L.kind === "rect" ? (() => { const d = sub3(L.corner, L.anchor), [bu, bv] = Editor.rectAxes(L.plane.basis); return `${fl(Math.abs(dot3(d, bu)))} , ${fl(Math.abs(dot3(d, bv)))}`; })() : "";
    return { kind: L.kind, prompt: vcbPrompt(L.kind), echo };
  }
  /** 矩形「宽,高」的两根轴：面基 (u, v) 里更贴近世界 X 的那根算「宽」（平手看 Y）——地面矩形 = (x, y)，立面 = (水平, 竖直)。 */
  private static rectAxes(basis: { u: Pt3; v: Pt3 }): [Pt3, Pt3] {
    const score = (a: Pt3): number => Math.abs(a.x) * 4 + Math.abs(a.y) * 2 + Math.abs(a.z);
    return score(basis.u) >= score(basis.v) ? [basis.u, basis.v] : [basis.v, basis.u];
  }
  /** 手势进行中不能输（例外：画线的连画态只是下一笔的锚点）。 */
  private vcbBlocked(): boolean { return this.gestureActive() && !(this._tool === "line" && this.armed && this.anchor3 !== null); }
  /** 应用一条输入：解析 → 撤销那一步的 op → 按精确值重做 → 更新 last（可以连着改）。 */
  applyVcb(text: string): { ok: true; message: string } | { ok: false; error: string } {
    const L = this.last;
    if (!L) return { ok: false, error: "先做一步（画 / 推拉 / 移动…），再输精确值" };
    if (this.vcbBlocked()) return { ok: false, error: "先松手落定，再输精确值" };
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
        if (this._tool === "line") { this.anchor3 = b; this.cursor3 = b; this.armed = true; }
        msg = `线长 ${fmtLen(Math.abs(v.m))}`;
        break;
      }
      case "rect": {
        if (v.kind !== "dims") break;
        const d = sub3(L.corner, L.anchor), [u, w] = Editor.rectAxes(L.plane.basis);
        const corner = add3(L.anchor, add3(scale3(u, sign(dot3(d, u)) * Math.abs(v.a)), scale3(w, sign(dot3(d, w)) * Math.abs(v.b))));
        const segs = rectSegmentsOnPlane(L.plane.plane, L.plane.basis, L.anchor, corner);
        if (segs.length) this.commitOp({ op: "addEdges", at, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]) });
        this.last = { ...L, ops: this.opCount - n0, corner };
        msg = `矩形 ${fmtLen(Math.abs(v.a))} × ${fmtLen(Math.abs(v.b))}`;
        break;
      }
      case "circle": {
        let rim = L.rim, segments = L.segments;
        if (v.kind === "length") rim = add3(L.center, scale3(normalize3(sub3(L.rim, L.center)), Math.abs(v.m)));
        else if (v.kind === "segments") { segments = v.n; this.config.set("circle", "segments", v.n); }
        else break;
        const segs = circleSegmentsOnPlane(L.plane.plane, L.plane.basis, L.center, rim, segments);
        if (segs.length) this.commitOp({ op: "addEdges", at, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]), curve: true });
        this.last = { ...L, ops: this.opCount - n0, rim, segments };
        msg = `圆 半径 ${fmtLen(dist(L.center, rim))} · ${segments} 段`;
        break;
      }
      case "pp": {
        if (v.kind !== "length") break;
        const h = sign(L.h) * v.m, hl = L.h !== 0 ? h * (L.hl / L.h) : h;
        this.commitOp({ op: "pushpull", at, face: L.face, dist: hl });
        this.last = { ...L, ops: this.opCount - n0, h, hl };
        msg = `推拉 ${fmtLen(h)}`;
        break;
      }
      case "offset": {
        if (v.kind !== "length") break;
        const d = sign(L.d) * v.m;
        const ring2 = L.ring.map((p) => projectToPlane(p, L.plane.basis));
        const r = offsetRing(ring2, -d);
        if (r.length >= 3) { const r3 = r.map((q) => liftFromPlane(q, L.plane.plane, L.plane.basis)); this.commitOp({ op: "addEdges", at, segs: r3.map((p, i) => [this.toLocal(p), this.toLocal(r3[(i + 1) % r3.length])]) }); }
        this.last = { ...L, ops: this.opCount - n0, d };
        msg = `偏移 ${d > 0 ? "向内" : "向外"} ${fmtLen(Math.abs(d))}`;
        break;
      }
      case "move": {
        if (v.kind === "array") {
          if (!L.copy) { this.redoXform(translation(L.delta), L.froms, L.pools, at); this.last = { ...L, ops: this.opCount - n0 }; return { ok: false, error: "先 Ctrl 拖复制一份，再输阵列（5x 向外 / /5 内分）" }; }
          const Xs = arrayTranslations(L.delta, v.mode, v.n);
          const copies = Xs.map((X) => { const XL = this.xformToLocal(X); return { payload: this.copyPayload(XL, L.entities), XL }; });   // 全部先从撤销后的内核算
          this.commitCopies(copies, L.pools, at);
          this.last = { ...L, ops: this.opCount - n0 };
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
        if (v.kind === "array") { this.redoXform(rotationAbout(L.center, L.axis, L.angle), L.froms, L.pools, at); this.last = { ...L, ops: this.opCount - n0 }; return { ok: false, error: "旋转阵列要先有复制模式（还没做）" }; }
        if (v.kind !== "angle") break;
        const angle = (v.deg * Math.PI) / 180;
        this.redoXform(rotationAbout(L.center, L.axis, angle), L.froms, L.pools, at);
        this.last = { ...L, ops: this.opCount - n0, angle };
        msg = `旋转 ${fmtDeg(angle)}`;
        break;
      }
      case "scale": {
        if (v.kind !== "factor") break;
        const f: Pt3 = v.f.length === 3 ? { x: v.f[0], y: v.f[1], z: v.f[2] } : L.axis ? { x: L.axis.x ? v.f[0] : 1, y: L.axis.y ? v.f[0] : 1, z: L.axis.z ? v.f[0] : 1 } : { x: v.f[0], y: v.f[0], z: v.f[0] };
        this.redoXform(scalingAbout(L.anchor, f), L.froms, L.pools, at);
        this.rebuildScaleHandles();
        this.last = { ...L, ops: this.opCount - n0, f };
        msg = `缩放 ${f.x.toFixed(3)} × ${f.y.toFixed(3)} × ${f.z.toFixed(3)}`;
        break;
      }
    }
    if (!msg) { this.last = null; this.host.changed(); this.draw(); return { ok: false, error: "这一步不收这种输入" }; }
    this.host.changed(); this.draw();
    return { ok: true, message: msg };
  }
  /** 撤销 n 个 op（数值小窗重做用；不清 last、不清选区之外的状态）。 */
  private undoN(n: number): void {
    for (let i = 0; i < n; i++) { const s2 = this.history.undo(); if (!s2) break; this.scene = s2; this.opCount--; }
    this.bump();
    this.revalidateCharged();
    this.selection = emptySelection(); this.selectedPools.clear();
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
  abortGesture(): void { this.cancelGesture(); this.host.marquee(null); this.host.hint(null); this.draw(); }
  /** 指针下的实体是否已在选区里（右键 = 不在就先选它，SU 同款）。 */
  hitInSelection(hit: HitResult3): boolean {
    const c = this.classify(this.liveWorld(), hit);
    if (c.kind === "pool") return this.selectedPools.has(c.key);
    if (c.kind !== "entity") return false;
    const h = c.local;
    return (h.face !== undefined && this.selection.faces.has(h.face)) || (h.edge !== undefined && this.selection.edges.has(h.edge)) || (h.vertex !== undefined && [...this.selection.edges].some((e) => { const ed = this.kernel.graph.edge(e); return ed.a === h.vertex || ed.b === h.vertex; }));
  }
  /** 把选区扩成连通体（SU「选择 → 所有相连」）。 */
  selectConnected(): boolean {
    const view = this.worldView();
    const seeds: HitResult3[] = [...[...this.selection.faces].map((f) => ({ face: view.global(f) })), ...[...this.selection.edges].map((e) => ({ edge: view.global(e) }))];
    if (!seeds.length) return false;
    for (const h of seeds) this.selectExpand(h, 2, true);
    return true;
  }

  /** 线稿风格：pixel（默认，原生 GL 线 1 设备像素）/ thick（屏幕像素宽粗线）。本版只活这一次会话（持久化要 user 同意）。 */
  get lineStyle(): LineStyle { return this.r3.getLineStyle(); }
  setLineStyle(s: LineStyle): void { this.r3.setLineStyle(s); this.host.changed(); this.draw(); }
  toggleProjection(): void {
    this.cam.projection = this.cam.projection === "persp" ? "ortho" : "persp";
    this.host.changed();
    this.draw();
  }

  // ---------- 充能制 ----------
  private alignSrcs(): Pt3[] { return [...this.charged.values()]; }
  private chargePt(p: Pt3): void {
    const key = `${p.x},${p.y},${p.z}`;
    this.charged.delete(key);
    this.charged.set(key, { ...p });
    while (this.charged.size > 3) this.charged.delete(this.charged.keys().next().value!);
  }
  private trackCharge(sn: Snap3 | null, dwellMs = 300): void {
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
  }
  private clearCharged(): void { this.charged.clear(); this.dwell = null; this.lastSnap = null; }
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
    return this.anchor3 !== null || this.moveVids.length > 0 || this.movePools.length > 0 || this.scrubbing || this.marqueeStart !== null || this.rotStage === 2 || this.scaleActive !== null || this.offFace !== null;
  }
  /** 手势中 = 影子副本（活动池）+ 整体变换预演；平时 = checkpoint。eraseFace 悬停预告不算手势现实。 */
  private liveWorld(): WorldView { return this.gestureActive() ? this.worldView(this.live, this.liveOverride) : this.worldView(); }
  /** 推拉的推断世界 = 按下那一刻的模型（文件头「例外」条）。 */
  private ppInferenceWorld(): WorldView { return this.worldView(); }
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
    if (this._tool === "line" || this._tool === "rect" || this._tool === "circle") {
      const born = new Set<FaceId>();
      for (const e of this.liveEvents) if (e.type === "BIRTH") born.add(e.face);
      hand.faces = (fid) => view.slotOf(fid) === active && born.has(view.local(fid).id);
    }
    return hand;
  }

  // ---------- live（影子副本预演） ----------
  private computeLive(): void {
    this.live = null;
    this.liveOverride = null;
    this.liveEvents = [];
    const run = (fn: (c: Kernel) => FaceEvent[]): void => {
      const c = this.kernel.clone();
      try { this.liveEvents = fn(c); }
      catch (err) { this.liveEvents = []; this.live = null; this.fail("preview", err); return; }
      this.live = c;
    };
    const tool = this._tool;
    let dims = "";
    if (tool === "line" && this.anchor3 && this.cursor3) {
      const a = this.anchor3, b = this.cursor3;
      dims = `长 ${fmtLen(dist(a, b))}`;
      if (dist(a, b) >= MIN_GESTURE_LEN) run((c) => c.addEdges([[this.toLocal(a), this.toLocal(b)]]));
    } else if (tool === "rect" && this.anchor3 && this.cursor3) {
      const { plane, basis } = this.gesturePlane;
      const segs = rectSegmentsOnPlane(plane, basis, this.anchor3, this.cursor3);
      const d = sub3(this.cursor3, this.anchor3);
      const du = d.x * basis.u.x + d.y * basis.u.y + d.z * basis.u.z;
      const dv = d.x * basis.v.x + d.y * basis.v.y + d.z * basis.v.z;
      dims = `矩形 ${fmtLen(Math.abs(du))} × ${fmtLen(Math.abs(dv))}`;
      if (segs.length) run((c) => c.addEdges(segs.map(([a, b]) => [this.toLocal(a), this.toLocal(b)])));
    } else if (tool === "circle" && this.anchor3 && this.cursor3) {
      const r = dist(this.anchor3, this.cursor3);
      dims = `圆 半径 ${fmtLen(r)}`;
      const segs = circleSegmentsOnPlane(this.gesturePlane.plane, this.gesturePlane.basis, this.anchor3, this.cursor3, this.config.get("circle", "segments"));
      if (segs.length && r >= MIN_GESTURE_LEN) run((c) => c.addEdges(segs.map(([a, b]) => [this.toLocal(a), this.toLocal(b)]), { curve: true }));
    } else if (tool === "move" && this.anchor3 && this.cursor3 && (this.moveVids.length || this.movePools.length)) {
      const delta = sub3(this.cursor3, this.anchor3);
      dims = `${this.moveCopy ? "复制" : "移动"} ${fmtLen(len3(delta))}`;
      if (len3(delta) >= MIN_GESTURE_LEN) {
        if (this.moveVids.length) {
          const vids = this.moveVids, dl = applyDir(invert(this.ctxXform()), delta);
          if (this.moveCopy) { const payload = this.copyPayload(translation(dl)); if (payload) run((c) => { const edgeSegs: Record<string, { a: Pt3; b: Pt3 }[]> = {}; for (const [n, segs] of Object.entries(payload.edgeSegs)) edgeSegs[n] = segs.map(([a, b]) => ({ a, b })); return c.absorb(payload.faces, payload.wires.map(([a, b]) => ({ a, b })), { edgeSegs, faceLayers: payload.faceLayers }); }); }
          else run((c) => c.moveVertices(vids.filter((id) => c.graph.hasVertex(id)).map((id) => ({ id, to: add3(c.graph.pt(id), dl) }))));
        }
        if (this.movePools.length) this.liveOverride = { picks: this.movePools, xform: translation(delta), copy: this.moveCopy };
      }
    } else if (tool === "rotate" && this.rotStage === 2 && this.rotCenter && this.rotAxis) {
      dims = `旋转 ${fmtDeg(this.rotAngle)}`;
      if (Math.abs(this.rotAngle) > 1e-6) {
        const X = rotationAbout(this.rotCenter, this.rotAxis, this.rotAngle);
        this.previewXform(X, run);
      }
    } else if (tool === "scale" && this.scaleActive) {
      const s = this.scaleFactor;
      dims = `缩放 ${s.x.toFixed(3)} × ${s.y.toFixed(3)} × ${s.z.toFixed(3)}`;
      const X = scalingAbout(this.scaleActive.anchor, s);
      this.previewXform(X, run);
    } else if (tool === "offset" && this.offFace !== null && Math.abs(this.offDist) >= MIN_GESTURE_LEN) {
      dims = `偏移 ${this.offDist > 0 ? "向内" : "向外"} ${fmtLen(Math.abs(this.offDist))}`;
      const segs = this.offsetSegs(this.offDist);
      if (segs.length) run((c) => c.addEdges(segs.map(([a, b]) => [this.toLocal(a), this.toLocal(b)])));
    } else if (tool === "pp" && this.ppFace !== null && Math.abs(this.ppH) >= MIN_GESTURE_LEN) {
      const fid = this.ppFace, h = this.ppLocalH(this.ppH);
      run((c) => c.pushPull(fid, h, { settleLanding: false }));
    } else if (tool === "eraseFace" && this.hoverFace !== null) {
      const id = this.hoverFace;
      run((c) => c.eraseFaces([id]));
    }
    if (this.live || this.liveOverride || dims) {
      const ev = this.live ? (this.liveEvents.length ? `预览：${this.liveEvents.map(describeEvent).join("；")}` : "预览：无膜变化") : "";
      this.host.hint([dims, ev].filter(Boolean).join(" ｜ "));
    }
  }
  /** 整体变换（世界系 X）的预演：选区顶点走影子副本、子池走叠加变换。 */
  private previewXform(X: Xform, run: (fn: (c: Kernel) => FaceEvent[]) => void): void {
    const vids = moveTargetsSelection(this.kernel, this.selection);
    if (vids.length) { const XL = this.xformToLocal(X); run((c) => c.moveVertices(vids.filter((id) => c.graph.hasVertex(id)).map((id) => ({ id, to: applyPt(XL, c.graph.pt(id)) })))); }
    const picks = this.selectedPoolPicks();
    if (picks.length) this.liveOverride = { picks, xform: X };
  }
  /** 偏移环（世界坐标线段）：活动池里 offFace 的外环投到面基 → offsetRing（SU 只外环）→ 抬回 3D。 */
  private offsetSegs(d: number): [Pt3, Pt3][] {
    if (this.offFace === null || !this.offPlane) return [];
    const k = this.kernel, f = k.face(this.offFace), rec = k.planeOf(this.offFace);
    if (!f || !rec) return [];
    const m = this.ctxXform();
    const outer3 = k.faceRings3(this.offFace)!.outer.map((p) => applyPt(m, p));
    const ring2 = outer3.map((p) => projectToPlane(p, this.offPlane!.basis));
    const r = offsetRing(ring2, -d);   // offsetRing 的 d>0 = 外扩；工具的 d>0 = 向内
    if (r.length < 3) return [];
    const r3 = r.map((q) => liftFromPlane(q, this.offPlane!.plane, this.offPlane!.basis));
    return r3.map((p, i) => [p, r3[(i + 1) % r3.length]] as [Pt3, Pt3]);
  }
  /** 世界系推拉高度 → 活动池本地（上下文有缩放时按法向换算）。 */
  private ppLocalH(h: number): number {
    const m = this.ctxXform();
    if (m === IDENTITY || !this.ppNormal) return h;
    return h * len3(applyDir(invert(m), this.ppNormal));
  }

  private basePlaneOfAnchor(): DrawPlane | undefined { return this.anchor3 && Math.abs(this.anchor3.z) < 1e-6 ? GROUND : undefined; }
  private lineSecondSnap(sx: number, sy: number): Snap3 {
    const w = this.liveWorld();
    const r = resolveRectPlane(w, this.frame(), this.fvp(), this.anchor3!, sx, sy, this.snapPx(), this.alignSrcs(), this.freshHand(w), this.basePlaneOfAnchor());
    if (r.snap.kind === null && this.snapInfo && grazing(r.plane, this.frame().ray(sx, sy, this.fvp()))) return this.snapInfo;
    this.gesturePlane = r.plane;
    return r.snap;
  }
  private rectPlaneSnap(sx: number, sy: number): Pt3 {
    const w = this.liveWorld();
    if (this.rectFixed) {
      this.snapInfo = snapPoint(w, this.frame(), this.fvp(), sx, sy, this.snapPx(), { plane: this.gesturePlane, alignSources: this.alignSrcs(), hand: this.freshHand(w) });
      return this.snapInfo.p;
    }
    const r = resolveRectPlane(w, this.frame(), this.fvp(), this.anchor3!, sx, sy, this.snapPx(), this.alignSrcs(), this.freshHand(w), this.basePlaneOfAnchor());
    if (r.snap.kind === null && this.snapInfo && grazing(r.plane, this.frame().ray(sx, sy, this.fvp()))) return this.snapInfo.p;
    this.gesturePlane = r.plane;
    this.snapInfo = r.snap;
    return r.snap.p;
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
    const selE = new Set<number>([...this.selection.edges].map(g)), selF = new Set<number>([...this.selection.faces].map(g));
    // 子池选区 / 悬停：整池的面与边高亮
    const slotHighlight = (picks: Iterable<PoolPick>): void => {
      for (const p of picks) for (const s of this.slotsOfPick(view, p)) {
        const o = s.index * (1 << 22);
        for (const f of s.kernel.faces()) selF.add(f.id + o);
        for (const e of s.kernel.edges()) selE.add(e.id + o);
      }
    };
    slotHighlight(this.selectedPools.values());
    const dimmed = (this.ctx.chain.length > 0 || this.ctx.group !== null) ? new Set(view.slots.filter((s) => !s.active).map((s) => s.index)) : null;
    this.r3.render(view, this.cam, this.vp(), {
      ...(this.viewExtras?.() ?? {}),
      selectionEdges: selE,
      selectionFaces: selF,
      scrubEdges: new Set([...this.scrubAcc].map(g)),
      hoverEdge: this.hoverEdge !== null ? g(this.hoverEdge) : null,
      hoverFace: this.hoverFace !== null ? g(this.hoverFace) : null,
      preview: null,
      snap: this.snapInfo,
      snapAnchor: this._tool === "rotate" ? this.rotCenter : this.anchor3,
      revision: this._revision,
      dimSlots: dimmed,
      // 缩放柄跟着预演实时动（user 2026-10-21「缩放的handle应该跟着实时动」）：拖动中按当前倍率把柄过一遍同一个变换
      handles: this._tool === "scale" ? (() => { const X = this.scaleActive ? scalingAbout(this.scaleActive.anchor, this.scaleFactor) : null; return this.scaleHandles.map((h) => ({ p: X ? applyPt(X, h.p) : h.p, active: h === this.scaleActive })); })() : null,
      protractor: this._tool === "rotate" && this.rotCenter && this.rotAxis ? { center: this.rotCenter, axis: this.rotAxis, ref: this.rotRef, angle: this.rotAngle } : null,
    });
  }
  resize(dpr: number): void { this.r3.resize(this.vp(), dpr); this.draw(); }
  private updateTip(clientX: number, clientY: number): void {
    this.host.tip(this.snapInfo?.kind ? SNAP_LABELS[this.snapInfo.kind] ?? this.snapInfo.kind : null, clientX, clientY);
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
  private rebuildScaleHandles(): void {
    this.scaleHandles = [];
    const b = this.targetBounds();
    if (!b) return;
    const { min, max } = b;
    const mid = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
    for (const sx of [0, 1]) for (const sy of [0, 1]) for (const sz of [0, 1]) {
      const p = { x: sx ? max.x : min.x, y: sy ? max.y : min.y, z: sz ? max.z : min.z };
      const anchor = { x: sx ? min.x : max.x, y: sy ? min.y : max.y, z: sz ? min.z : max.z };
      this.scaleHandles.push({ kind: "corner", p, anchor, axis: null });
    }
    const faces: [Pt3, Pt3, Pt3][] = [
      [{ x: max.x, y: mid.y, z: mid.z }, { x: min.x, y: mid.y, z: mid.z }, { x: 1, y: 0, z: 0 }], [{ x: min.x, y: mid.y, z: mid.z }, { x: max.x, y: mid.y, z: mid.z }, { x: -1, y: 0, z: 0 }],
      [{ x: mid.x, y: max.y, z: mid.z }, { x: mid.x, y: min.y, z: mid.z }, { x: 0, y: 1, z: 0 }], [{ x: mid.x, y: min.y, z: mid.z }, { x: mid.x, y: max.y, z: mid.z }, { x: 0, y: -1, z: 0 }],
      [{ x: mid.x, y: mid.y, z: max.z }, { x: mid.x, y: mid.y, z: min.z }, { x: 0, y: 0, z: 1 }], [{ x: mid.x, y: mid.y, z: min.z }, { x: mid.x, y: mid.y, z: max.z }, { x: 0, y: 0, z: -1 }],
    ];
    for (const [p, anchor, axis] of faces) if (dist(p, anchor) >= MIN_GESTURE_LEN) this.scaleHandles.push({ kind: "face", p, anchor, axis });
  }
  private pickScaleHandle(sx: number, sy: number): ScaleHandle | null {
    let best: ScaleHandle | null = null, bd = this.hitPx() * 1.5;
    for (const h of this.scaleHandles) { const d = this.frame().distTo(sx, sy, h.p, this.fvp()); if (d <= bd) { bd = d; best = h; } }
    return best;
  }

  // ---------- 输入：工具指针 ----------
  pointerDown(ev: ToolPointer): void {
    const s = ev;
    const view = this.liveWorld();
    switch (this._tool) {
      case "line":
      case "rect":
      case "circle": {
        if (this.armed && this.anchor3) {
          this.justCommitted = true;
          this.trackGesture(s);
          if (this._tool === "line") this.commitLine(this.currentSample());
          else if (this._tool === "rect") this.commitRect(this.currentSample());
          else this.commitCircle(this.currentSample());
          break;
        }
        if (this._tool === "rect" || this._tool === "circle") {
          const r = rectFirstPlane(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), this.alignSrcs());
          this.rectFixed = r.fixed;
          this.gesturePlane = r.plane;
          this.snapInfo = r.snap;
          if (this._tool === "circle" && !this.rectFixed) this.rectFixed = r.plane;   // 圆：首点定平面（没落在膜内就用解析出的平面）
        } else {
          const r0 = rectFirstPlane(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), this.alignSrcs());
          this.gesturePlane = r0.plane;
          this.snapInfo = r0.snap;
        }
        this.anchor3 = this.snapInfo!.p;
        this.cursor3 = this.anchor3;
        this.armed = false;
        this.canArm = !!ev.armable;
        this.downScreen = { x: s.x, y: s.y };
        break;
      }
      case "pp": {
        if (this.armed && this.ppFace !== null && this.anchor3) {
          this.justCommitted = true;
          this.trackGesture(s);
          this.commitPP(this.currentSample());
          break;
        }
        const gf = pickFace(view, this.frame(), this.fvp(), s.x, s.y);
        if (gf === undefined) break;
        const c = this.classify(view, { face: gf });
        if (c.kind === "pool") { this.host.hint("这张面在子 group / 组件里：双击进入后再推拉"); break; }
        if (c.kind !== "entity" || c.local.face === undefined) break;
        const k = this.kernel;
        const rec = k.planeOf(c.local.face)!;
        const wrec = view.planeOf(gf)!;
        this.ppFace = c.local.face;
        const fRec = k.face(c.local.face)!;
        this.ppShellVids = new Set([...ringVidsTolerant(k.graph, fRec.outer), ...fRec.holes.flatMap((hh) => ringVidsTolerant(k.graph, hh))]);
        this.ppNormal = wrec.plane.n;
        this.gesturePlane = { plane: wrec.plane, basis: wrec.basis };
        const ray0 = this.frame().ray(s.x, s.y, this.fvp());
        const grab = rayPlane(ray0.origin, ray0.dir, wrec.plane.n, wrec.plane.d);
        this.anchor3 = grab ?? view.faceRings3(gf)!.outer[0];
        {   // 高度通道停靠集：全场景静态顶点沿 n 的投影高度（含别的 group / 组件）
          const hs = new Set<number>([0]);
          for (const v of view.vertices()) hs.add(Math.round(dot3(sub3(v, this.anchor3), wrec.plane.n) * 1e6) / 1e6);
          this.ppStops = [...hs].sort((a, b) => a - b);
        }
        void rec;
        this.cursor3 = this.anchor3;
        this.ppH = 0;
        this.armed = false;
        this.canArm = !!ev.armable;
        this.downScreen = { x: s.x, y: s.y };
        this.host.hint("推拉中：沿法向拖或点两下落定（所见即所得；吸点线=取其高度）");
        break;
      }
      case "move": {
        if (this.armed && (this.moveVids.length || this.movePools.length) && this.anchor3) {
          this.justCommitted = true;
          this.trackGesture(s);
          this.commitMove(this.currentSample());
          break;
        }
        const hit = pickEntity(view, this.frame(), this.fvp(), s.x, s.y, this.hitPx());
        const c = this.classify(view, hit);
        this.moveCopy = !!ev.copy;
        if (this.hasSelection()) {
          this.moveVids = moveTargetsSelection(this.kernel, this.selection);
          this.movePools = this.selectedPoolPicks();
          this.moveEntities = { faces: [...this.selection.faces], edges: [...this.selection.edges] };
        } else if (c.kind === "entity") {
          this.moveVids = moveTargets(this.kernel, c.local); this.movePools = [];
          this.moveEntities = { faces: c.local.face !== undefined ? [c.local.face] : [], edges: c.local.edge !== undefined ? [c.local.edge] : [] };
        }
        else if (c.kind === "pool") { this.moveVids = []; this.movePools = [c.pick]; this.moveEntities = { faces: [], edges: [] }; }
        else { this.moveVids = []; this.movePools = []; }
        if (this.moveVids.length || this.movePools.length) {
          this.gesturePlane = drawPlaneAt(view, this.frame(), this.fvp(), s.x, s.y);
          this.anchor3 = hit.vertex !== undefined
            ? view.graph.pt(hit.vertex)
            : snapPoint(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), { plane: this.gesturePlane, alignSources: this.alignSrcs(), hand: this.freshHand(view) }).p;
          this.cursor3 = this.anchor3;
          this.gesturePlane = cameraPlane(this.frame(), this.anchor3);
          this.armed = false;
          this.canArm = !!ev.armable;
          this.downScreen = { x: s.x, y: s.y };
          this.host.hint((this.moveCopy ? "复制：" : "") + (this.movePools.length ? "移动 group / 组件：拖拽或点两下放置" : this.hasSelection() ? "移动选区：参考点已拾取，拖拽或点两下放置" : "移动中…拖拽或点两下放置（所见即所得；按住 Ctrl/Alt = 复制）"));
        }
        break;
      }
      case "rotate": {
        if (!this.hasSelection()) { this.host.hint("先选中要旋转的东西（选择工具），再用量角器"); break; }
        if (this.rotStage === 0) {
          // 圆心：落在膜上 → 转轴 = 膜法向；否则 → 画线平面（地面 / 面向的轴平面）
          const r = rectFirstPlane(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), this.alignSrcs());
          this.rotCenter = r.snap.p;
          this.rotAxis = r.plane.plane.n;
          this.gesturePlane = r.plane;
          this.snapInfo = r.snap;
          this.rotStage = 1;
          this.downScreen = { x: s.x, y: s.y };
          this.host.hint(`圆心已定（转轴 = ${r.fixed ? "这张面的法向" : "当前平面法向"}）：再按住一点当参考方向，拖出角度`);
          break;
        }
        if (this.rotStage === 1 && this.rotCenter) {
          const sn = snapPoint(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), { plane: this.gesturePlane, anchor: this.rotCenter, alignSources: this.alignSrcs(), hand: this.freshHand(view) });
          const q = this.projectToPlaneThrough(sn.p, this.rotCenter, this.rotAxis!);
          if (dist(q, this.rotCenter) < MIN_GESTURE_LEN) { this.host.hint("参考点离圆心太近"); break; }
          this.rotRef = q;
          this.rotAngle = 0;
          this.rotStage = 2;
          this.cursor3 = q;
          this.downScreen = { x: s.x, y: s.y };
          this.host.hint("拖出角度（15° 咬合）；松手落定");
        }
        break;
      }
      case "scale": {
        if (!this.hasSelection()) { this.host.hint("先选中要缩放的东西（选择工具），再拖包围盒上的柄"); break; }
        if (!this.scaleHandles.length) this.rebuildScaleHandles();
        const h = this.pickScaleHandle(s.x, s.y);
        if (!h) { this.host.hint("按住包围盒上的柄拖：角 = 等比，面心 = 单轴"); break; }
        this.scaleActive = h;
        this.scaleFactor = { x: 1, y: 1, z: 1 };
        const dir = normalize3(sub3(h.p, h.anchor));
        const ray = this.frame().ray(s.x, s.y, this.fvp());
        const q = closestOnAxis(h.anchor, dir, ray.origin, ray.dir);
        this.scaleT0 = q ? Math.max(dot3(sub3(q, h.anchor), dir), MIN_GESTURE_LEN) : dist(h.p, h.anchor);
        this.cursor3 = h.p;
        this.downScreen = { x: s.x, y: s.y };
        this.host.hint(h.kind === "corner" ? "等比缩放：沿对角拖" : "单轴缩放：沿轴拖");
        break;
      }
      case "erase": {
        this.scrubbing = true;
        this.scrubAcc = new Set();
        this.hoverEdge = null;
        this.eraseMode = ev.copy ? "soften" : ev.shiftKey ? "harden" : "erase";
        this.host.hint(this.eraseMode === "soften" ? "软化：刮过的边变软 + 平滑（Ctrl）" : this.eraseMode === "harden" ? "硬化：刮过的边变硬（Shift）" : null);
        const hit = pickEntity(view, this.frame(), this.fvp(), s.x, s.y, this.hitPx());
        const c = this.classify(view, hit);
        if (c.kind === "entity" && c.local.edge !== undefined) this.scrubAcc.add(c.local.edge);
        this.computeLive();
        break;
      }
      case "select":
        this.marqueeStart = { x: s.x, y: s.y };
        this.marqueeCur = { x: s.x, y: s.y };
        break;
      case "offset": {
        const gf = pickFace(view, this.frame(), this.fvp(), s.x, s.y);
        if (gf === undefined) break;
        const c = this.classify(view, { face: gf });
        if (c.kind === "pool") { this.host.hint("这张面在子 group / 组件里：双击进入后再偏移"); break; }
        if (c.kind !== "entity" || c.local.face === undefined) break;
        const wrec = view.planeOf(gf)!;
        const ray0 = this.frame().ray(s.x, s.y, this.fvp());
        const hit = rayPlane(ray0.origin, ray0.dir, wrec.plane.n, wrec.plane.d);
        if (!hit) break;
        // 离按下点最近的外环边 → 它的面内内法向（朝面心）；偏移距离沿它量
        const outer = view.faceRings3(gf)!.outer;
        let best = 0, bd = Infinity;
        for (let i = 0; i < outer.length; i++) {
          const a = outer[i], b = outer[(i + 1) % outer.length];
          const ab = sub3(b, a), l2 = dot3(ab, ab) || 1;
          const t = Math.max(0, Math.min(1, dot3(sub3(hit, a), ab) / l2));
          const dd = dist(hit, add3(a, scale3(ab, t)));
          if (dd < bd) { bd = dd; best = i; }
        }
        const a = outer[best], b = outer[(best + 1) % outer.length];
        const dir = normalize3(sub3(b, a));
        let inward = cross3(wrec.plane.n, dir);
        const cen = outer.reduce((acc, p) => add3(acc, scale3(p, 1 / outer.length)), { x: 0, y: 0, z: 0 });
        if (dot3(sub3(cen, a), inward) < 0) inward = scale3(inward, -1);
        this.offFace = c.local.face;
        this.offPlane = { plane: wrec.plane, basis: wrec.basis, face: gf };
        this.offInward = normalize3(inward);
        this.offDist = 0;
        this.anchor3 = hit;
        this.cursor3 = hit;
        this.downScreen = { x: s.x, y: s.y };
        this.host.hint("偏移：沿面拖——向里内缩、向外外扩（松手落定）");
        break;
      }
      case "followme": {
        const gf = pickFace(view, this.frame(), this.fvp(), s.x, s.y);
        if (gf === undefined) { this.host.hint("跟随：先用选择工具选好路径（一串边，或一张面 = 它的外环），再点轮廓面"); break; }
        const c = this.classify(view, { face: gf });
        if (c.kind === "pool") { this.host.hint("这张面在子 group / 组件里：双击进入后再跟随"); break; }
        if (c.kind !== "entity" || c.local.face === undefined) break;
        const r = this.followPath(c.local.face);
        if (typeof r === "string") { this.host.hint(`跟随：${r}`); break; }
        this.commitOp({ op: "followme", at: this.activePool(), face: faceKey(this.kernel, c.local.face), path: r.path, closed: r.closed, smoothJoints: r.smoothJoints });
        const nSeg = simplifyPath(r.path, r.closed).path.length - (r.closed ? 0 : 1);   // 共线关节不算拐角
        this.host.hint(`跟随：沿 ${nSeg} 段路径扫完${r.closed ? "（闭合）" : ""}`);
        break;
      }
      case "paint":
      case "eraseFace":
        break;
    }
    this.draw();
  }

  /**
   * 跟随的路径 = 当前选区：一串边（链，无分叉）；没选边就取选中的一张面（不是轮廓面本身）的外环 = 闭路径。
   * 取向：起点必须落在轮廓面的平面上，且首段不平行于它；闭路径候选起点多时取离轮廓最近的；两个方向都试，取 |n·d₀| 大的。
   * 关节平滑 = 两侧路径边都是曲线成员（圆 / 弧路径 → 旋转体侧面光滑）。
   */
  private followPath(profile: FaceId): { path: Pt3[]; closed: boolean; smoothJoints: boolean[] } | string {
    const k = this.kernel, g = k.graph;
    let edgeIds = [...this.selection.edges].filter((id) => g.hasEdge(id));
    if (!edgeIds.length) {
      const fs = [...this.selection.faces].filter((id) => id !== profile && k.face(id));
      if (fs.length !== 1) return "先用选择工具选好路径（一串边，或一张面 = 它的外环），再点轮廓面";
      edgeIds = k.face(fs[0])!.outer.edges.map((d) => d.edge);
    }
    const adj = new Map<VertexId, EdgeId[]>();
    const between = new Map<string, EdgeId>();
    for (const id of edgeIds) {
      const e = g.edge(id);
      for (const v of [e.a, e.b]) (adj.get(v) ?? adj.set(v, []).get(v)!).push(id);
      between.set(`${e.a}-${e.b}`, id); between.set(`${e.b}-${e.a}`, id);
    }
    for (const es of adj.values()) if (es.length > 2) return "路径有分叉：只能是一条链";
    const ends = [...adj.entries()].filter(([, es]) => es.length === 1).map(([v]) => v);
    if (ends.length !== 0 && ends.length !== 2) return "路径不连续：选中的边不是一条链";
    const closed = ends.length === 0;
    const start = closed ? g.edge(edgeIds[0]).a : ends[0];
    const vids: VertexId[] = [start];
    const seen = new Set<EdgeId>();
    let cur = start;
    for (;;) {
      const nextE = (adj.get(cur) ?? []).find((id) => !seen.has(id));
      if (nextE === undefined) break;
      seen.add(nextE);
      const e = g.edge(nextE);
      cur = e.a === cur ? e.b : e.a;
      if (closed && cur === start) break;
      vids.push(cur);
    }
    if (seen.size !== edgeIds.length) return "路径不连续：选中的边不是一条链";
    const rec = k.planeOf(profile)!;
    const n = rec.plane.n, pl = rec.plane;
    const onPlane = (v: VertexId): boolean => Math.abs(dot3(n, g.pt(v)) - pl.d) <= k.coplanarTol;
    const profPts = k.faceRings3(profile)!.outer;
    const nearProfile = (v: VertexId): number => Math.min(...profPts.map((p) => dist(p, g.pt(v))));
    // 候选起点：闭路径每个顶点两个方向；开路径两端。打分 = 起点在轮廓平面上（SU 要求）≫ 离轮廓近 ≫ 首段越垂直越好；首段平行于轮廓面的不要
    const candidates: VertexId[][] = [];
    if (closed) for (let i = 0; i < vids.length; i++) { const rot = [...vids.slice(i), ...vids.slice(0, i)]; candidates.push(rot, [rot[0], ...rot.slice(1).reverse()]); }
    else candidates.push(vids, [...vids].reverse());
    let best: VertexId[] | null = null, bestScore = -Infinity;
    for (const c of candidates) {
      const d0 = normalize3(sub3(g.pt(c[1]), g.pt(c[0])));
      const dn = Math.abs(dot3(n, d0));
      if (dn < 1e-6) continue;
      const score = (onPlane(c[0]) ? 1e6 : 0) - nearProfile(c[0]) + dn * 1e-3;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (!best) return "路径的首段不能平行于轮廓面";
    const path = best.map((v) => g.pt(v));
    const m = best.length;
    const edgeAt = (i: number): EdgeId => between.get(`${best![i % m]}-${best![(i + 1) % m]}`)!;
    const segs = closed ? m : m - 1;
    const smoothJoints = best.map((_, i) => {
      if (!closed && (i === 0 || i === m - 1)) return false;
      return k.isCurve(edgeAt((i - 1 + segs) % segs)) && k.isCurve(edgeAt(i % segs));
    });
    return { path, closed, smoothJoints };
  }

  pointerMove(ev: ToolPointer): void {
    const s = ev;
    if (!this.gestureActive()) {
      this.snapInfo = null;
      this.hoverEdge = null;
      this.hoverFace = null;
      this.hoverPool = null;
      const tool = this._tool;
      const view = this.liveWorld();
      if (tool === "line" || tool === "rect" || tool === "circle" || tool === "move" || (tool === "rotate" && this.rotStage === 0)) {
        const plane = drawPlaneAt(view, this.frame(), this.fvp(), s.x, s.y);
        this.snapInfo = this.applyHysteresis(snapPoint(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), { plane, alignSources: this.alignSrcs(), hand: this.freshHand(view) }), s.x, s.y);
        this.trackCharge(this.snapInfo);
      } else if (tool === "rotate" && this.rotStage === 1 && this.rotCenter) {
        this.snapInfo = this.applyHysteresis(snapPoint(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), { plane: this.gesturePlane, anchor: this.rotCenter, alignSources: this.alignSrcs(), hand: this.freshHand(view) }), s.x, s.y);
      } else if (tool === "erase") {
        const c = this.classify(view, pickEntity(view, this.frame(), this.fvp(), s.x, s.y, this.hitPx()));
        this.hoverEdge = c.kind === "entity" ? (c.local.edge ?? null) : null;
      } else if (tool === "eraseFace" || tool === "paint") {
        const gf = pickFace(view, this.frame(), this.fvp(), s.x, s.y);
        const c = gf !== undefined ? this.classify(view, { face: gf }) : { kind: "none" as const };
        this.hoverFace = c.kind === "entity" ? (c.local.face ?? null) : null;
        if (tool === "eraseFace") this.computeLive();
      } else if (tool === "select") {
        const c = this.classify(view, pickEntity(view, this.frame(), this.fvp(), s.x, s.y, this.hitPx()));
        this.hoverPool = c.kind === "pool" ? c.key : null;
      }
      this.updateTip(ev.clientX, ev.clientY);
      this.draw();
      return;
    }
    this.trackGesture(s, ev.travel);
    switch (this._tool) {
      case "erase": {
        const view = this.liveWorld();
        const c = this.classify(view, pickEntity(view, this.frame(), this.fvp(), s.x, s.y, this.hitPx()));
        if (c.kind === "entity" && c.local.edge !== undefined) this.scrubAcc.add(c.local.edge);
        break;
      }
      case "select":
        if (this.marqueeStart) {
          this.marqueeCur = { x: s.x, y: s.y };
          const minX = Math.min(this.marqueeStart.x, s.x), maxX = Math.max(this.marqueeStart.x, s.x);
          const minY = Math.min(this.marqueeStart.y, s.y), maxY = Math.max(this.marqueeStart.y, s.y);
          this.host.marquee({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
        }
        break;
      default: break;
    }
    this.recordSample(s);
    if (this._tool !== "select") this.computeLive();
    this.updateTip(ev.clientX, ev.clientY);
    this.draw();
  }

  /** 手势中的取点（line / rect / circle / pp / move / rotate / scale 的拖拽态；pointerMove 与松开帧共用）。 */
  private trackGesture(s: { x: number; y: number }, travel?: number): void {
    const view = this.liveWorld();
    switch (this._tool) {
      case "line":
        if (this.anchor3) {
          let sn = this.lineSecondSnap(s.x, s.y);
          // 意图门：候选在锚点另一侧（相机平面上与拖动方向点积 < 0）不合法
          const camL = cameraPlane(this.frame(), this.anchor3), rayL = this.frame().ray(s.x, s.y, this.fvp());
          const freeL = rayPlane(rayL.origin, rayL.dir, camL.plane.n, camL.plane.d);
          if (sn.kind !== null && freeL && this.intentOn(s, travel) && !intentAllows3D(sub3(freeL, this.anchor3), sub3(sn.p, this.anchor3), MIN_GESTURE_LEN)) { sn = { p: this.rectPlaneSnap(s.x, s.y), kind: null }; this.lastSnap = null; }
          this.snapInfo = this.applyHysteresis(sn, s.x, s.y);
          this.trackCharge(this.snapInfo, 120);
          this.cursor3 = this.snapInfo.p;
        }
        break;
      case "rect":
      case "circle":
        if (this.anchor3) this.cursor3 = this.rectPlaneSnap(s.x, s.y);
        break;
      case "pp":
        this.ppTrack(s.x, s.y, travel);
        break;
      case "offset":
        if (this.offFace !== null && this.offPlane && this.offInward && this.anchor3) {
          const sn = snapPoint(this.worldView(), this.frame(), this.fvp(), s.x, s.y, this.snapPx(), { plane: this.offPlane, anchor: this.anchor3, alignSources: this.alignSrcs(), hand: this.freshHand(view), lines: false });
          // 意图门：自由距离（指针落在面上的点沿内法向的距离）定内缩 / 外扩；反号的吸附不合法
          const rayO = this.frame().ray(s.x, s.y, this.fvp());
          const freeO = rayPlane(rayO.origin, rayO.dir, this.offPlane.plane.n, this.offPlane.plane.d);
          const dFree = freeO ? dot3(sub3(freeO, this.anchor3), this.offInward) : NaN;
          let q = this.projectToPlaneThrough(sn.p, this.anchor3, this.offPlane.plane.n);
          let kind = sn.kind;
          if (kind !== null && freeO && this.intentOn(s, travel) && !intentAllows1D(dFree, dot3(sub3(q, this.anchor3), this.offInward), MIN_GESTURE_LEN)) { q = freeO; kind = null; }
          this.offDist = dot3(sub3(q, this.anchor3), this.offInward);
          this.snapInfo = kind ? { ...sn, kind, p: q } : null;
          this.cursor3 = q;
        }
        break;
      case "move":
        if ((this.moveVids.length || this.movePools.length) && this.anchor3) {
          const mv = new Set(this.moveVids);
          this.gesturePlane = cameraPlane(this.frame(), this.anchor3);
          let sn = snapPoint(view, this.frame(), this.fvp(), s.x, s.y, this.snapPx(), { plane: this.gesturePlane, anchor: this.anchor3, alignSources: this.alignSrcs(), hand: this.freshHand(view, (vid) => mv.has(vid), false) });
          // 意图门：候选在锚点另一侧（相机平面上与拖动方向点积 < 0）不合法（抬笔那一下滑到反方向的点 = 本案）
          const rayM = this.frame().ray(s.x, s.y, this.fvp());
          const freeM = rayPlane(rayM.origin, rayM.dir, this.gesturePlane.plane.n, this.gesturePlane.plane.d);
          if (sn.kind !== null && freeM && this.intentOn(s, travel) && !intentAllows3D(sub3(freeM, this.anchor3), sub3(sn.p, this.anchor3), MIN_GESTURE_LEN)) { sn = { p: freeM, kind: null }; this.lastSnap = null; }
          if (sn.kind === null) {
            const ax = inferAxisByDirection(this.frame(), this.fvp(), this.anchor3, s.x, s.y);
            if (ax) sn = { p: ax.p, kind: `axis-${ax.axis}` as SnapKind };
            else if (this.cursor3 && grazing(this.gesturePlane, this.frame().ray(s.x, s.y, this.fvp()))) sn = { p: this.cursor3, kind: null };
          }
          this.snapInfo = this.applyHysteresis(sn, s.x, s.y);
          this.trackCharge(this.snapInfo, 120);
          this.cursor3 = this.snapInfo.p;
        }
        break;
      case "rotate":
        if (this.rotStage === 2 && this.rotCenter && this.rotAxis && this.rotRef) {
          const sn = snapPoint(this.worldView(), this.frame(), this.fvp(), s.x, s.y, this.snapPx(), { plane: this.gesturePlane, anchor: this.rotCenter, alignSources: this.alignSrcs(), hand: this.freshHand(view), lines: false });
          const a = sub3(this.rotRef, this.rotCenter);
          const angOf = (pt: Pt3): number => { const bb = sub3(pt, this.rotCenter!); return Math.atan2(dot3(cross3(a, bb), this.rotAxis!), dot3(a, bb)); };
          // 意图门：自由角（指针落在旋转平面上的点）的符号 = 转向；反向的点吸附不合法
          const rayR = this.frame().ray(s.x, s.y, this.fvp());
          const freeR = rayPlane(rayR.origin, rayR.dir, this.rotAxis, dot3(this.rotAxis, this.rotCenter));
          let q = this.projectToPlaneThrough(sn.p, this.rotCenter, this.rotAxis);
          let kind = sn.kind;
          if (kind !== null && freeR && len3(sub3(freeR, this.rotCenter)) >= MIN_GESTURE_LEN && this.intentOn(s, travel) && !intentAllows1D(angOf(freeR), angOf(q), ANGLE_DEAD)) { q = freeR; kind = null; }
          const b = sub3(q, this.rotCenter);
          if (len3(b) >= MIN_GESTURE_LEN) {
            let ang = angOf(q);
            const step = ANGLE_STEP_DEG * Math.PI / 180, near = Math.round(ang / step) * step;
            if (kind === null && Math.abs(ang - near) <= ANGLE_SNAP_DEG * Math.PI / 180) { ang = near; this.snapInfo = { p: q, kind: "h-stop" }; }
            else this.snapInfo = kind ? { ...sn, kind, p: q } : null;
            this.rotAngle = ang;
            this.cursor3 = q;
          }
        }
        break;
      case "scale":
        if (this.scaleActive) {
          const h = this.scaleActive;
          const dir = normalize3(sub3(h.p, h.anchor));
          const ray = this.frame().ray(s.x, s.y, this.fvp());
          const q = closestOnAxis(h.anchor, dir, ray.origin, ray.dir);
          if (q) {
            const t = dot3(sub3(q, h.anchor), dir);
            let f = t / this.scaleT0;
            if (Math.abs(f) < 1e-3) f = 1e-3;   // 不许缩到零（退化）
            // 意图门：倍率相对 1 的符号 = 放大 / 缩小；反向的咬合不合法（1 本身保留）
            const snapped = [0.5, 1, 1.5, 2, 3, 4].find((v) => Math.abs(f - v) < 0.02 && (!this.intentOn(s, travel) || intentAllows1D(f - 1, v - 1, 0.01)));
            if (snapped !== undefined) f = snapped;
            this.scaleFactor = h.kind === "corner" ? { x: f, y: f, z: f } : { x: h.axis!.x ? f : 1, y: h.axis!.y ? f : 1, z: h.axis!.z ? f : 1 };
            this.cursor3 = add3(h.anchor, scale3(dir, t));
            this.snapInfo = snapped !== undefined ? { p: this.cursor3, kind: "h-stop" } : null;
          }
        }
        break;
      default: break;
    }
  }
  private projectToPlaneThrough(p: Pt3, c: Pt3, n: Pt3): Pt3 { const d = dot3(sub3(p, c), n); return sub3(p, scale3(n, d)); }
  private currentSample(): { cursor3: Pt3 | null; ppH: number; plane: DrawPlane; snap: Snap3 | null; angle: number; scale: Pt3; off: number } {
    return { cursor3: this.cursor3, ppH: this.ppH, plane: this.gesturePlane, snap: this.snapInfo, angle: this.rotAngle, scale: this.scaleFactor, off: this.offDist };
  }
  private recordSample(s: { x: number; y: number }): void {
    if (!this.gestureActive()) return;
    const t = performance.now();
    this.samples.push({ t, sx: s.x, sy: s.y, cursor3: this.cursor3, ppH: this.ppH, plane: this.gesturePlane, snap: this.snapInfo, angle: this.rotAngle, scale: this.scaleFactor, off: this.offDist });
    while (this.samples.length > 256 || (this.samples.length && t - this.samples[0].t > 2000)) this.samples.shift();
  }
  /**
   * 抬笔结算（A21）——按物理过程判：样本按「同一处」（HOLD_PX 内）分成一段段停留。松开处停留 ≥ FINAL_HOLD_MS → 有意，用松开帧；
   * 否则回看 RELEASE_WINDOW_MS 内结束的停留，取最长的那段（≥ MIN_DWELL_MS 且比松开处停得久）= 用户对齐时停住的地方；都没有 → 松开帧。
   */
  private settledSample(): ReturnType<Editor["currentSample"]> | null {
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
    return dwell ? this.samples[dwell.lastIdx] : last;
  }

  /** pp 双通道吸附：光标通道（世界 = 按下时模型，源面原位不透明；不吸轴）+ 高度通道（h 对静态高度集咬合）。 */
  private ppTrack(sx: number, sy: number, travel?: number): void {
    if (this.ppFace === null || !this.anchor3 || !this.ppNormal) return;
    const anc = this.anchor3, n = this.ppNormal;
    const wk = this.ppInferenceWorld();
    const active = wk.activeSlot();
    const shell = this.ppShellVids;
    const hand: AlignHand = { has: (gid) => wk.slotOf(gid) === active && shell.has(wk.local(gid).id), opaque: true };
    const sn = this.applyHysteresis(
      snapPoint(wk, this.frame(), this.fvp(), sx, sy, this.snapPx(), { plane: this.gesturePlane, anchor: anc, lines: false, hand }),
      sx, sy);
    this.hoverFace = null;
    let ref = "";
    let ppStuck = false;
    const ppGlobal = wk.global(this.ppFace);
    // 意图门（intent.ts；user 2026-10-21 夜「如果是push的话所有snap到pull的应该都不合法」）：
    // 自由高度 = 不吸附时指针沿法向给出的高度，它的符号就是推 / 拉意图；点吸附 / 面高度 / 高度咬合三路候选反号一律不合法，零点保留。
    const ray1 = this.frame().ray(sx, sy, this.fvp());
    const qFree = closestOnAxis(anc, n, ray1.origin, ray1.dir);
    const hFree = qFree ? dot3(sub3(qFree, anc), n) : NaN;
    const moved = travel ?? (this.downScreen ? Math.hypot(sx - this.downScreen.x, sy - this.downScreen.y) : 0);
    const allowed = (h: number): boolean => !hasIntent(moved, this.eps().drag) || intentAllows1D(hFree, h, MIN_GESTURE_LEN);
    const hSnap = sn.kind !== null ? dot3(sub3(sn.p, anc), n) : NaN;
    if (sn.kind !== null && allowed(hSnap)) {
      this.snapInfo = sn;
      this.ppH = hSnap;
      ref = `｜取${SNAP_LABELS[sn.kind] ?? sn.kind}高度`;
    } else {
      this.snapInfo = null;
      if (sn.kind !== null) this.lastSnap = null;   // 被意图门否掉的吸附不许黏住（迟滞也不留）
      const hitF = pickEntity(wk, this.frame(), this.fvp(), sx, sy, 0.5).face;
      const hitRec = hitF !== undefined ? wk.planeOf(hitF) : undefined;
      let hFace: number | null = null;
      if (hitF !== undefined && hitF !== ppGlobal && hitRec && Math.abs(dot3(hitRec.plane.n, n)) > 0.05) {
        const q = rayPlane(ray1.origin, ray1.dir, hitRec.plane.n, hitRec.plane.d);
        if (q) hFace = dot3(sub3(q, anc), n);
      }
      if (hFace !== null && allowed(hFace)) { this.ppH = hFace; ref = "｜取面高度"; }
      else {
        if (qFree) this.ppH = hFree;
        else ppStuck = true;
        const pxPerUnit = Math.max(this.frame().distBetween(anc, add3(anc, n), this.fvp()), 0.5);
        const epsH = this.eps().edge / pxPerUnit;
        let best: number | null = null;
        for (const st of this.ppStops) if (allowed(st) && Math.abs(st - this.ppH) <= epsH && (best === null || Math.abs(st - this.ppH) < Math.abs(best - this.ppH))) best = st;
        if (best !== null) {
          this.ppH = best;
          ref = `｜高度咬合 ${fmtLen(best)}`;
          this.snapInfo = { p: add3(anc, scale3(n, this.ppH)), kind: "h-stop" };
        }
      }
    }
    this.cursor3 = add3(anc, scale3(n, this.ppH));
    const facing = Math.abs(dot3(n, this.frame().viewDir(anc)));
    if (moved > this.eps().drag && Math.abs(this.ppH) < MIN_GESTURE_LEN && (ppStuck || facing > 0.9)) {
      this.host.hint("推拉没动：正对着这张面看，法向和视线平行，拖不出高度——环绕一下换个角度再拉（Esc 取消）");
      return;
    }
    this.host.hint(`推拉 h = ${fmtLen(this.ppH)}${ref}（松手/再点落定；Esc 取消）`);
  }
  /** 意图门开关：屏上拖够 eps.drag 才有意图（intent.ts hasIntent）。 */
  private intentOn(s: { x: number; y: number }, travel?: number): boolean {
    const moved = travel ?? (this.downScreen ? Math.hypot(s.x - this.downScreen.x, s.y - this.downScreen.y) : 0);
    return hasIntent(moved, this.eps().drag);
  }

  pointerUp(ev: ToolPointer): void {
    const s = ev;
    const isTap = (): boolean => !!this.downScreen && (ev.travel ?? Math.hypot(s.x - this.downScreen.x, s.y - this.downScreen.y)) <= this.eps().tap;
    const settle = (): ReturnType<Editor["settledSample"]> => {
      if (this.justCommitted) return null;
      this.trackGesture(s);
      this.recordSample(s);
      return this.settledSample();
    };
    switch (this._tool) {
      case "line":
      case "rect":
      case "circle": {
        if (!this.anchor3) break;
        if (this.justCommitted) { this.justCommitted = false; break; }
        if (this.canArm && isTap()) { this.armed = true; this.host.hint("移动预览，再点一下落定；Esc 取消"); break; }
        const smp = settle();
        if (this._tool === "line") this.commitLine(smp); else if (this._tool === "rect") this.commitRect(smp); else this.commitCircle(smp);
        break;
      }
      case "pp": {
        if (this.ppFace === null || !this.anchor3) { this.cancelGesture(); break; }
        if (this.justCommitted) { this.justCommitted = false; break; }
        if (this.canArm && isTap()) { this.armed = true; this.host.hint("推拉中：移动定高度，再点一下落定；Esc 取消"); break; }
        this.commitPP(settle());
        break;
      }
      case "move": {
        if (!(this.moveVids.length || this.movePools.length) || !this.anchor3) { this.cancelGesture(); break; }
        if (this.justCommitted) { this.justCommitted = false; break; }
        if (this.canArm && isTap()) { this.armed = true; this.host.hint("移动中：所见即所得预览，再点一下放置；Esc 取消"); break; }
        this.commitMove(settle());
        break;
      }
      case "rotate": {
        if (this.rotStage === 2) { this.commitRotate(settle()); }
        break;
      }
      case "offset": {
        if (this.offFace === null) break;
        const smp = settle();
        const d = smp?.off ?? this.offDist;
        const segs = Math.abs(d) >= MIN_GESTURE_LEN ? this.offsetSegs(d) : [];
        const ring = this.offFace !== null && this.offPlane ? this.kernel.faceRings3(this.offFace)!.outer.map((p) => applyPt(this.ctxXform(), p)) : [];
        const plane = this.offPlane!, n0 = this.opCount, at0 = this.activePool();
        this.cancelGesture();
        if (segs.length) { this.commitOp({ op: "addEdges", at: at0, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]) }); this.last = { kind: "offset", ops: this.opCount - n0, at: at0, ring, plane, d }; }
        break;
      }
      case "scale": {
        if (this.scaleActive) this.commitScale(settle());
        break;
      }
      case "erase": {
        const ids = [...this.scrubAcc];
        const mode = this.eraseMode;
        this.cancelGesture();
        const k = this.kernel;
        if (mode !== "erase") { this.softenEdges(ids.filter((id) => k.graph.hasEdge(id) && k.graph.edge(id).faceLinks.length >= 2), mode === "soften"); break; }   // 橡皮 + Ctrl = 软化、+ Shift = 硬化（SU 同款修饰）
        const edges = ids.filter((id) => k.graph.hasEdge(id)).map((id) => edgeKey(k, id));
        if (edges.length) this.commitOp({ op: "eraseEdges", at: this.activePool(), edges });
        break;
      }
      case "select": {
        if (!this.marqueeStart || !this.marqueeCur) { this.cancelGesture(); break; }
        const additive = ev.shiftKey;
        const wasDrag = Math.hypot(this.marqueeCur.x - this.marqueeStart.x, this.marqueeCur.y - this.marqueeStart.y) > 4;
        const view = this.liveWorld();
        if (wasDrag) {
          const box = { minX: Math.min(this.marqueeStart.x, this.marqueeCur.x), maxX: Math.max(this.marqueeStart.x, this.marqueeCur.x), minY: Math.min(this.marqueeStart.y, this.marqueeCur.y), maxY: Math.max(this.marqueeStart.y, this.marqueeCur.y) };
          const picked = marqueeScreen(view, this.cam, this.vp(), box);
          if (!additive) { this.selection = emptySelection(); this.selectedPools.clear(); }
          for (const gid of picked.edges) { const c = this.classify(view, { edge: gid }); if (c.kind === "entity" && c.local.edge !== undefined) this.selection.edges.add(c.local.edge); else if (c.kind === "pool") this.selectedPools.set(c.key, c.pick); }
          for (const gid of picked.faces) { const c = this.classify(view, { face: gid }); if (c.kind === "entity" && c.local.face !== undefined) this.selection.faces.add(c.local.face); else if (c.kind === "pool") this.selectedPools.set(c.key, c.pick); }
          this.marqueeStart = this.marqueeCur = null;
          this.host.marquee(null);
          this.afterSelect();
          break;
        }
        const now = performance.now();
        const train = this.clickTrain && now - this.clickTrain.t < 350 && Math.hypot(s.x - this.clickTrain.x, s.y - this.clickTrain.y) <= 6 * (this.fvp().h / 800)
          ? { t: now, x: s.x, y: s.y, n: this.clickTrain.n + 1 } : { t: now, x: s.x, y: s.y, n: 1 };
        this.clickTrain = train;
        const hit = pickEntity(view, this.frame(), this.fvp(), s.x, s.y, this.hitPx());
        const c = this.classify(view, hit);
        this.marqueeStart = this.marqueeCur = null;
        this.host.marquee(null);
        if (c.kind === "pool" && train.n >= 2) { this.enterPool(c.pick); break; }   // 双击子 group / 组件 = 进入
        if (c.kind === "none" && !additive && (this.ctx.chain.length || this.ctx.group !== null) && train.n === 1 && !this.hasSelection()) { this.exitContext(); break; }   // 点空处 = 退出一层（SU 同款）
        this.selectExpand(hit, train.n >= 3 ? 2 : train.n === 2 ? 1 : 0, additive);
        break;
      }
      case "eraseFace": {
        const view = this.liveWorld();
        const gf = pickFace(view, this.frame(), this.fvp(), s.x, s.y);
        const c = gf !== undefined ? this.classify(view, { face: gf }) : { kind: "none" as const };
        this.cancelGesture();
        if (c.kind === "entity" && c.local.face !== undefined && this.kernel.face(c.local.face)) this.commitOp({ op: "eraseFaces", at: this.activePool(), faces: [faceKey(this.kernel, c.local.face)] });
        break;
      }
      case "paint": {
        // 油漆桶：模式来自工具选项（一张面 / 平滑组 / 到锐角为止 / 连通体 / 整个组或组件；Ctrl / Shift 按住 = 临时切模式，SU 同款）。
        // 一张面：有面选区且点在选区内 → 整个选区一起涂；点到子 group / 组件 → 只有「整个组 / 组件」模式能从外面涂，其余提示进入。
        const view = this.liveWorld();
        const gf = pickFace(view, this.frame(), this.fvp(), s.x, s.y);
        const c = gf !== undefined ? this.classify(view, { face: gf }) : { kind: "none" as const };
        this.hoverFace = null;
        const mode = this.config.effective("paint", "mode", { ctrl: !!ev.copy, shift: ev.shiftKey });
        const modeLabel = this.config.labelOf("paint", "mode", mode);
        if (c.kind === "pool") {
          if (mode !== "pool") { this.host.hint("这张面在子 group / 组件里：双击进入后再涂，或把模式换成「整个组 / 组件」"); break; }
          const def = this.scene.defOfContext(this.ctx);
          const ref: PoolRef = c.pick.kind === "group" ? { def, group: c.pick.group } : { def: this.scene.def(def).instances.get(c.pick.instance)!.def, group: null };
          const pk = this.scene.kernelOf(ref);
          const keys = pk.faces().map((f) => faceKey(pk, f.id));
          if (keys.length) this.commitOp({ op: "paintFaces", at: ref, faces: keys, material: this.materialIndexForPick() });
          this.host.hint(`涂了 ${keys.length} 张面（${modeLabel}${c.pick.kind === "instance" ? "：组件的全部实例一起变" : ""}）`);
          break;
        }
        if (c.kind !== "entity" || c.local.face === undefined) break;
        const fid = c.local.face;
        const faces = mode === "single" ? (this.selection.faces.has(fid) ? [...this.selection.faces] : [fid]) : facesForPaint(this.kernel, fid, mode, this.config.get("paint", "sharpDeg"));
        this.paintFaces(faces);
        this.host.hint(`涂了 ${faces.length} 张面（${modeLabel}）`);
        break;
      }
    }
    this.host.changed();   // 手势落定后再刷一次 HUD：数值小窗要看到刚记下的 last
    this.draw();
  }

  pointerLeave(): void {
    if (!this.gestureActive()) {
      this.snapInfo = null;
      this.hoverEdge = null;
      this.hoverFace = null;
      this.hoverPool = null;
      this.live = null;
      this.host.tip(null, 0, 0);
      this.host.hint(null);
      this.draw();
    }
  }

  // ---------- 落笔 ----------
  private commitLine(smp: { cursor3: Pt3 | null } | null): void {
    const a = this.anchor3!;
    const b = smp?.cursor3 ?? this.cursor3 ?? a;
    if (dist(a, b) < MIN_GESTURE_LEN) { this.cancelGesture(); return; }
    const n0 = this.opCount, at0 = this.activePool();
    const evs = this.commitOp({ op: "addEdges", at: at0, segs: [[this.toLocal(a), this.toLocal(b)]] });
    this.chargePt(a); this.chargePt(b);
    this.cancelGesture();
    this.last = { kind: "line", ops: this.opCount - n0, at: at0, a, b };
    if (evs.length > 0) return;
    this.anchor3 = b;
    this.cursor3 = b;
    this.armed = true;
    this.host.hint("连画中：点下一点；出膜自动停；Esc 收笔");
  }
  private commitRect(smp: { cursor3: Pt3 | null; plane: DrawPlane } | null): void {
    const plane = smp?.plane ?? this.gesturePlane;
    const b = smp?.cursor3 ?? this.cursor3 ?? this.anchor3!;
    const segs = rectSegmentsOnPlane(plane.plane, plane.basis, this.anchor3!, b);
    const anchor = this.anchor3!, n0 = this.opCount, at0 = this.activePool();
    this.cancelGesture();
    if (segs.length) { this.commitOp({ op: "addEdges", at: at0, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]) }); this.last = { kind: "rect", ops: this.opCount - n0, at: at0, plane, anchor, corner: b }; }
  }
  private commitCircle(smp: { cursor3: Pt3 | null; plane: DrawPlane } | null): void {
    const plane = smp?.plane ?? this.gesturePlane;
    const b = smp?.cursor3 ?? this.cursor3 ?? this.anchor3!;
    const segments = this.config.get("circle", "segments");
    const segs = dist(this.anchor3!, b) >= MIN_GESTURE_LEN ? circleSegmentsOnPlane(plane.plane, plane.basis, this.anchor3!, b, segments) : [];
    const center = this.anchor3!, n0 = this.opCount, at0 = this.activePool();
    this.cancelGesture();
    if (segs.length) { this.commitOp({ op: "addEdges", at: at0, segs: segs.map(([p, q]) => [this.toLocal(p), this.toLocal(q)]), curve: true }); this.last = { kind: "circle", ops: this.opCount - n0, at: at0, plane, center, rim: b, segments }; }
  }
  private commitPP(smp: { ppH: number } | null): void {
    const h = smp?.ppH ?? this.ppH;
    const fid = this.ppFace!;
    const hl = this.ppLocalH(h);
    this.cancelGesture();
    if (Math.abs(h) >= MIN_GESTURE_LEN && this.kernel.face(fid)) {
      const n0 = this.opCount, at0 = this.activePool(), face = faceKey(this.kernel, fid);
      this.commitOp({ op: "pushpull", at: at0, face, dist: hl });
      this.last = { kind: "pp", ops: this.opCount - n0, at: at0, face, h, hl };
    }
  }
  private commitMove(smp: { cursor3: Pt3 | null } | null): void {
    const target = smp?.cursor3 ?? this.cursor3 ?? this.anchor3!;
    const delta = sub3(target, this.anchor3!);
    const vids = this.moveVids, pools = this.movePools, copy = this.moveCopy, entities = { faces: [...this.moveEntities.faces], edges: [...this.moveEntities.edges] };
    const X = translation(delta);
    const k0 = this.kernel, froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    const n0 = this.opCount, at0 = this.activePool();
    if (copy) {
      const payload = this.copyPayload(this.xformToLocal(X), entities);
      this.cancelGesture();
      if (len3(delta) < MIN_GESTURE_LEN) return;
      this.commitCopies([{ payload, XL: this.xformToLocal(X) }], pools, at0);
      this.last = { kind: "move", ops: this.opCount - n0, at: at0, froms, pools, delta, copy: true, entities };
      return;
    }
    this.cancelGesture();
    if (len3(delta) < MIN_GESTURE_LEN) return;
    this.commitXform(X, vids, pools);
    this.last = { kind: "move", ops: this.opCount - n0, at: at0, froms, pools, delta, copy: false, entities };
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
  private copyPayload(XL: Xform, entities: { faces: readonly FaceId[]; edges: readonly EdgeId[] } = this.moveEntities): { faces: Pt3[][][]; wires: [Pt3, Pt3][]; edgeSegs: Record<string, [Pt3, Pt3][]>; faceLayers: (Record<string, number> | undefined)[] } | null {
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
  private commitRotate(smp: { angle: number } | null): void {
    const ang = smp?.angle ?? this.rotAngle;
    const c = this.rotCenter!, ax = this.rotAxis!;
    const vids = moveTargetsSelection(this.kernel, this.selection), pools = this.selectedPoolPicks();
    const k0 = this.kernel, froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    const n0 = this.opCount, at0 = this.activePool();
    this.cancelGesture();
    if (Math.abs(ang) < 1e-6) return;
    this.commitXform(rotationAbout(c, ax, ang), vids, pools);
    this.last = { kind: "rotate", ops: this.opCount - n0, at: at0, froms, pools, center: c, axis: ax, angle: ang };
  }
  private commitScale(smp: { scale: Pt3 } | null): void {
    const s = smp?.scale ?? this.scaleFactor;
    const anchor = this.scaleActive!.anchor, axis = this.scaleActive!.axis;
    const vids = moveTargetsSelection(this.kernel, this.selection), pools = this.selectedPoolPicks();
    const k0 = this.kernel, froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    const n0 = this.opCount, at0 = this.activePool();
    this.cancelGesture();
    if (Math.abs(s.x - 1) < 1e-9 && Math.abs(s.y - 1) < 1e-9 && Math.abs(s.z - 1) < 1e-9) return;
    this.commitXform(scalingAbout(anchor, s), vids, pools);
    this.rebuildScaleHandles();
    this.last = { kind: "scale", ops: this.opCount - n0, at: at0, froms, pools, anchor, axis, f: s };
  }
  /** 世界系变换 X 作用于：活动池顶点集（move op，本地坐标）+ 子池（transformPool / transformInstance，父空间变换）。 */
  private commitXform(X: Xform, vids: readonly VertexId[], pools: readonly PoolPick[]): void {
    const at = this.activePool(), k = this.kernel, XL = this.xformToLocal(X);
    if (vids.length) {
      const moves = vids.filter((id) => k.graph.hasVertex(id)).map((id) => ({ from: k.graph.pt(id), to: applyPt(XL, k.graph.pt(id)) }));
      this.commitOp({ op: "move", at, moves });
    }
    const def = this.scene.defOfContext(this.ctx);
    for (const p of pools) {
      if (p.kind === "group") this.commitOp({ op: "transformPool", at: { def, group: p.group }, xform: XL });
      else this.commitOp({ op: "transformInstance", def, instance: p.instance, xform: XL });
    }
  }
}
