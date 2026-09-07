// editor.ts —— 工具手势状态机（无 DOM 依赖：只认 canvas 尺寸与屏幕坐标，UI 经 EditorHost 回调）。
// created 2026-09-06 by Claude Fable 5.1 —— 从 src/lab/main.ts（Claude Fable 5，2026-09-01～09-03）原样搬入：
// 语义层一字不动（点两下/充能制/磁滞/WYSIWYG 预演/pp 双通道/连画出膜停），只剥掉 DOM 接线与 lab 面板。
// 相机手势（环绕/平移/缩放）不在这里：那是 app 层手势路由（src/app/gestures.ts）的事，本类只吃「工具指针」。
//
// 对齐引擎唯一世界源（user 2026-09-03 立法：**旧 snapshot 禁入对齐引擎**——push 到一半的才是真相，WYSIWYG；
// checkpoint 只是 commit 基底/cancel 归宿）。手势中=live（中间态真相）；平时=checkpoint。build lint 把门（scripts/build.sh）。

import { Kernel } from "../kernel/kernel.ts";
import { ringVidsTolerant } from "../kernel/face-lifecycle.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport, closestOnAxis, rayPlane } from "./camera.ts";
import { type AlignHand, type DrawPlane, type Snap3, GROUND, drawPlaneAt, marqueeScreen, pickEntity, pickFace, rectFirstPlane, resolveRectPlane, snapPoint } from "./pick.ts";
import { epsScale } from "./solver.ts";
import { type Selection, emptySelection, moveTargets, moveTargetsSelection, rectSegmentsOnPlane, translateMoves } from "./tools.ts";
import { Renderer3 } from "./render3.ts";
import { PRESETS } from "./presets.ts";
import { type LabOp, Journal } from "./journal.ts";
import { add3, dot3, scale3, sub3 } from "../kernel/geom.ts";

export type Tool = "select" | "line" | "rect" | "move" | "pp" | "erase" | "eraseFace";
export const TOOLS: readonly Tool[] = ["select", "line", "rect", "move", "pp", "erase", "eraseFace"];

/** 工具指针事件（canvas 本地坐标 + 定位提示用的 client 坐标）。 */
export interface ToolPointer {
  x: number; y: number;
  clientX: number; clientY: number;
  pointerType: string;
  shiftKey: boolean;
}

export interface EditorHost {
  /** 状态行文案；null = 回默认提示。 */
  hint(text: string | null): void;
  /** 光标旁吸附标签；null = 隐藏。 */
  tip(text: string | null, clientX: number, clientY: number): void;
  /** 膜事件（实验台日志用）。 */
  events(evs: FaceEvent[]): void;
  separator(text: string): void;
  /** 框选矩形（canvas 本地 px）；null = 隐藏。 */
  marquee(r: { x: number; y: number; w: number; h: number } | null): void;
  /** 工具/撤销栈/选区变了 → UI 刷新。 */
  changed(): void;
}

// px 常量按 800px 高视口标定；运行时 × epsScale(vp)（= 视口高度分数 ≡ 角度分数，见 solver.ts）
const SNAP = 8;
const HIT = 6;
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

/** 长度显示（SU 同款「~」）：截到 1 位小数；截掉的部分超过格点量子 → 前缀 ~ 告诉用户「不是 exactly」
 *  （user 2026-09-07：「带小数点的优雅一点，多 truncate 几位，但是让用户知道不是 exactly」）。 */
export function fmtLen(v: number, digits = 1): string {
  const shown = Number(v.toFixed(digits));
  return (Math.abs(v - shown) > 1e-6 ? "~" : "") + shown.toFixed(digits);
}

export class Editor {
  readonly cam = new OrbitCamera();
  private r3: Renderer3;
  private checkpoint = new Kernel();
  private journal = new Journal();
  private _tool: Tool = "line";

  // ---- 瞬态 ----
  private anchor3: Pt3 | null = null;
  private gesturePlane: DrawPlane = GROUND;
  private rectFixed: DrawPlane | null = null;   // 矩形首点在面上 → 与面平行锁死；否则动态（看第二点）
  private cursor3: Pt3 | null = null;
  private snapInfo: Snap3 | null = null;
  private moveVids: VertexId[] = [];
  private ppFace: FaceId | null = null;
  private ppNormal: Pt3 | null = null;
  private ppH = 0;
  private ppShellVids: ReadonlySet<VertexId> = new Set();
  private ppKnownVids: ReadonlySet<VertexId> = new Set();   // 落笔时旧核全体 vid（新生判定基准）
  private ppStops: number[] = [];
  private scrubAcc = new Set<EdgeId>();
  private scrubbing = false;
  private selection: Selection = emptySelection();
  private marqueeStart: { x: number; y: number } | null = null;
  private marqueeCur: { x: number; y: number } | null = null;
  private hoverEdge: EdgeId | null = null;
  private hoverFace: FaceId | null = null;
  private live: Kernel | null = null;
  private liveEvents: FaceEvent[] = [];
  private armed = false;                  // 点两下模式：第一击已落 anchor，等第二击
  private canArm = false;                 // 只有鼠标解锁点两下（数位笔/手指 tap 误触发意外连线）
  private downScreen: { x: number; y: number } | null = null;
  private justCommitted = false;          // 第二击 down 已落笔，紧随的 up 不再处理
  // 充能制（from-point 源点登记）：hover 端点/中点停留 ≥300ms 充能，LRU 3；紫点反馈
  private charged = new Map<string, Pt3>();
  private dwell: { key: string; since: number } | null = null;
  private lastSnap: Snap3 | null = null;

  constructor(private canvas: HTMLCanvasElement, private host: EditorHost) {
    this.r3 = new Renderer3(canvas);
    // 默认三维（user 2026-09-02 拍板）——SU 式舒适初始 3/4 视角；俯角 35° 避开兜底阈值边界（30° 曾撞 sin=0.4999 翻车）
    this.cam.pitch = 0.61;
    this.cam.halfH = 220;
    this.cam.projection = "persp";   // 2026-09-06 user：做 perspective camera
  }

  // ---------- 只读 ----------
  get tool(): Tool { return this._tool; }
  get kernel(): Kernel { return this.checkpoint; }
  canUndo(): boolean { return this.journal.canUndo(); }
  canRedo(): boolean { return this.journal.canRedo(); }
  hasSelection(): boolean { return this.selection.edges.size > 0 || this.selection.faces.size > 0; }
  isGestureActive(): boolean { return this.gestureActive(); }
  vp(): Viewport { return { w: this.canvas.clientWidth, h: this.canvas.clientHeight }; }
  private snapPx(): number { return SNAP * epsScale(this.vp()); }
  private hitPx(): number { return HIT * epsScale(this.vp()); }

  // ---------- 工具 ----------
  setTool(t: Tool): void {
    this._tool = t;
    this.cancelGesture();
    this.host.changed();
    this.draw();
  }

  cancel(): void {
    this.selection = emptySelection();
    this.cancelGesture();
    this.host.changed();
    this.draw();
  }

  private cancelGesture(): void {
    this.anchor3 = null;
    this.moveVids = [];
    this.ppFace = null;
    this.ppNormal = null;
    this.ppShellVids = new Set();
    this.ppKnownVids = new Set();
    this.ppStops = [];
    this.ppH = 0;
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
    this.live = null;
    this.liveEvents = [];
    this.host.marquee(null);
    this.host.tip(null, 0, 0);
    this.host.hint(null);
  }

  // ---------- 记账 ----------
  /** 所有改内核的用户手势走这里：记账（undo 日志）+ 应用。 */
  private commitOp(op: LabOp): FaceEvent[] {
    const r = this.journal.commit(this.checkpoint, op);
    this.checkpoint = r.kernel;
    this.revalidateCharged();
    this.host.changed();
    return r.events;
  }
  private emit(evs: FaceEvent[]): void { if (evs.length) this.host.events(evs); }

  undo(): void {
    const k2 = this.journal.undo();
    if (!k2) return;
    this.checkpoint = k2;
    this.revalidateCharged();
    this.cancelGesture();
    this.selection = emptySelection();
    this.host.separator("撤销");
    this.host.changed();
    this.draw();
  }
  redo(): void {
    const r = this.journal.redo(this.checkpoint);
    if (!r) return;
    this.checkpoint = r.kernel;
    this.revalidateCharged();
    this.cancelGesture();
    this.selection = emptySelection();
    this.host.separator("重做");
    this.emit(r.events);
    this.host.changed();
    this.draw();
  }
  clearAll(): void {
    this.cancelGesture();
    this.selection = emptySelection();
    this.clearCharged();   // 充能点随世界一起清（2026-09-02 修：清空后紫点残留）
    this.host.separator("清空");
    this.commitOp({ op: "clear" });
    this.draw();
  }
  applyPreset(name: string): boolean {
    const preset = PRESETS.find((p) => p.name === name);
    if (!preset) return false;
    this.cancelGesture();
    this.selection = emptySelection();
    this.clearCharged();   // 预置=换世界，旧充能源作废
    this.host.separator(`预置：${preset.name}（${preset.note}）`);
    this.emit(this.commitOp({ op: "preset", name }));
    this.draw();
    return true;
  }
  /** 外部喂线段（OBJ 导入等）：一次 addEdges = 一个手势。 */
  addSegments(segs: [PtIn, PtIn][], label: string): FaceEvent[] {
    this.cancelGesture();
    this.selection = emptySelection();
    this.host.separator(label);
    const evs = this.commitOp({ op: "addEdges", segs });
    this.emit(evs);
    this.draw();
    return evs;
  }
  deleteSelection(): void {
    if (!this.hasSelection()) return;
    this.emit(this.commitOp({ op: "eraseSelection", faces: [...this.selection.faces], edges: [...this.selection.edges] }));
    this.selection = emptySelection();
    this.host.changed();
    this.draw();
  }

  // ---------- 相机 ----------
  setView(name: Parameters<OrbitCamera["setView"]>[0]): void { this.cam.setView(name); this.draw(); }
  zoomExtents(): void {
    this.cam.fitPoints(this.checkpoint.vertices(), this.vp());
    this.draw();
  }
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
  /** dwellMs：hover=300ms；拖动中=120ms（user 2026-09-01 拍板：无悬停设备靠手势中路过充能兜底）。 */
  private trackCharge(sn: Snap3 | null, dwellMs = 300): void {
    if (!sn || (sn.kind !== "endpoint" && sn.kind !== "midpoint")) { this.dwell = null; return; }
    const key = `${sn.p.x},${sn.p.y},${sn.p.z}`;
    if (this.charged.has(key)) { this.dwell = null; return; }
    const now = performance.now();
    if (!this.dwell || this.dwell.key !== key) { this.dwell = { key, since: now }; return; }
    if (now - this.dwell.since >= dwellMs) {
      this.chargePt(sn.p);
      this.dwell = null;
    }
  }
  /** 结算后重验充能点：锚定几何（顶点/边中点）已被搬走/消灭的幽灵源自动消（2026-09-02）。 */
  private revalidateCharged(): void {
    if (!this.charged.size) return;
    const live = new Set<string>();
    for (const v of this.checkpoint.vertices()) live.add(`${v.x},${v.y},${v.z}`);
    for (const e of this.checkpoint.edges()) {
      const a = this.checkpoint.graph.pt(e.a), b = this.checkpoint.graph.pt(e.b);
      live.add(`${(a.x + b.x) / 2},${(a.y + b.y) / 2},${(a.z + b.z) / 2}`);
    }
    for (const key of [...this.charged.keys()]) if (!live.has(key)) this.charged.delete(key);
  }
  private clearCharged(): void {
    this.charged.clear();
    this.dwell = null;
    this.lastSnap = null;
  }
  // 磁滞（防边界闪烁）：已吸住的目标，光标在其 1.5×ε 圈内不放手（只防脱出，不裁竞争切换）
  private applyHysteresis(sn: Snap3, sx: number, sy: number): Snap3 {
    if (sn.kind !== null) { this.lastSnap = sn; return sn; }
    if (this.lastSnap?.kind) {
      const sp = this.cam.worldToScreen(this.lastSnap.p, this.vp());
      if (Math.hypot(sx - sp.x, sy - sp.y) <= (EPS_OF[this.lastSnap.kind] ?? 8) * 1.5 * epsScale(this.vp())) return this.lastSnap;
    }
    this.lastSnap = null;
    return sn;
  }

  // ---------- 世界源 ----------
  private gestureActive(): boolean {
    return this.anchor3 !== null || this.moveVids.length > 0 || this.scrubbing || this.marqueeStart !== null;
  }
  /** 悬停预告（eraseFace hover 的 live）不算手势现实——预告吃掉自己=拾取振荡，故以 gestureActive 为界。 */
  private liveWorld(): Kernel { return this.gestureActive() ? (this.live ?? this.checkpoint) : this.checkpoint; }
  /** 基线手：checkpoint 之外的新生 vid（wip 线端/planarize 切点——追光标者）+ 工具自报的移动集。 */
  private freshHand(extra?: (vid: VertexId) => boolean, opaque = false): AlignHand {
    const known = new Set(this.checkpoint.vertices().map((v) => v.id));
    const hand: AlignHand = { has: (vid) => !known.has(vid) || (extra?.(vid) ?? false), opaque };
    // draw 类手势：只有预演里 BIRTH 出来的膜才「在手里」（追光标的新膜）；DIVIDE 子膜与母膜同影柱，
    // 照常遮挡——否则矩形一落在正面上，正面就透明、背后的底边露出来被吸（2026-09-06 user 案）。
    if (this._tool === "line" || this._tool === "rect") {
      const born = new Set<FaceId>();
      for (const e of this.liveEvents) if (e.type === "BIRTH") born.add(e.face);
      hand.faces = (fid) => born.has(fid);
    }
    return hand;
  }

  // ---------- live（影子副本预演） ----------
  private computeLive(): void {
    this.live = null;
    this.liveEvents = [];
    const run = (fn: (c: Kernel) => FaceEvent[]): void => {
      const c = this.checkpoint.clone();
      this.liveEvents = fn(c);
      this.live = c;
    };
    const tool = this._tool;
    let dims = "";   // 拖拽中的尺寸读数（user 2026-09-07「推拉矩形的时候要显示长度」；推拉的 h 在 ppTrack 里）
    if (tool === "line" && this.anchor3 && this.cursor3) {
      const a = this.anchor3, b = this.cursor3;
      dims = `长 ${fmtLen(dist(a, b))}`;
      if (dist(a, b) >= 1) run((c) => c.addEdges([[a, b]]));
    } else if (tool === "rect" && this.anchor3 && this.cursor3) {
      const { plane, basis } = this.gesturePlane;
      const segs = rectSegmentsOnPlane(plane, basis, this.anchor3, this.cursor3);
      const d = sub3(this.cursor3, this.anchor3);
      const du = d.x * basis.u.x + d.y * basis.u.y + d.z * basis.u.z;
      const dv = d.x * basis.v.x + d.y * basis.v.y + d.z * basis.v.z;
      dims = `矩形 ${fmtLen(Math.abs(du))} × ${fmtLen(Math.abs(dv))}`;
      if (segs.length) run((c) => c.addEdges(segs));
    } else if (tool === "move" && this.moveVids.length && this.anchor3 && this.cursor3) {
      const delta = sub3(this.cursor3, this.anchor3);
      const vids = this.moveVids;
      if (Math.hypot(delta.x, delta.y, delta.z) >= 0.3) run((c) => c.moveVertices(translateMoves(this.checkpoint, vids, delta)));
    } else if (tool === "pp" && this.ppFace !== null && Math.abs(this.ppH) >= 0.3) {
      const fid = this.ppFace;
      // 落地=commit 事件 ⇒ 预演取 h 的**开区间样本**（差 2 量子，视觉不可见）：恰咬合停靠点时
      // 不触发共面重合（planarize 合并+OR 打架=合并/破膜垃圾态，user 截图 2026-09-03）；commit 用精确 h 全 XOR。
      const h = this.ppH - Math.sign(this.ppH) * 2e-6;
      run((c) => c.pushPull(fid, h, { settleLanding: false }));
    } else if (tool === "erase" && this.scrubbing && this.scrubAcc.size) {
      const ids = [...this.scrubAcc];
      run((c) => c.eraseEdges(ids));
    } else if (tool === "eraseFace" && this.hoverFace !== null) {
      const id = this.hoverFace;
      run((c) => c.eraseFaces([id]));
    }
    if (this.live || dims) {
      const ev = this.live ? (this.liveEvents.length ? `预览：${this.liveEvents.map(describeEvent).join("；")}` : "预览：无膜变化") : "";
      this.host.hint([dims, ev].filter(Boolean).join(" ｜ "));
    }
  }

  /** 线的第二点：学矩形（user 2026-09-01 裁决「线的空落点兜底=学矩形」）——含光标的膜 > 过锚点轴平面 > 轴系；
   *  平面随第二点动态解析并写回 gesturePlane（2026-09-06 修：此前锁死首点平面，从共享边画进侧面时端点落到地面）。 */
  private lineSecondSnap(sx: number, sy: number): Snap3 {
    const r = resolveRectPlane(this.liveWorld(), this.cam, this.vp(), this.anchor3!, sx, sy, this.snapPx(), this.alignSrcs(), this.freshHand());
    this.gesturePlane = r.plane;
    return r.snap;
  }

  /** 矩形第二点：固定面 → 面内吸附；动态 → 平面被第二点拉动（resolveRectPlane）。 */
  private rectPlaneSnap(sx: number, sy: number): Pt3 {
    if (this.rectFixed) {
      this.snapInfo = snapPoint(this.liveWorld(), this.cam, this.vp(), sx, sy, this.snapPx(), { plane: this.gesturePlane, alignSources: this.alignSrcs(), hand: this.freshHand() });
      return this.snapInfo.p;
    }
    const r = resolveRectPlane(this.liveWorld(), this.cam, this.vp(), this.anchor3!, sx, sy, this.snapPx(), this.alignSrcs(), this.freshHand());
    this.gesturePlane = r.plane;
    this.snapInfo = r.snap;
    return r.snap.p;
  }

  // ---------- 渲染 ----------
  draw(): void {
    this.r3.render(this.checkpoint, this.cam, this.vp(), {
      selectionEdges: this.selection.edges,
      selectionFaces: this.selection.faces,
      scrubEdges: this.scrubAcc,
      hoverEdge: this.hoverEdge,
      hoverFace: this.hoverFace,
      preview: this.live,
      snap: this.snapInfo,
      snapAnchor: this.anchor3,
      charged: this.alignSrcs(),
    });
  }
  resize(dpr: number): void {
    this.r3.resize(this.vp(), dpr);
    this.draw();
  }
  private updateTip(clientX: number, clientY: number): void {
    this.host.tip(this.snapInfo?.kind ? SNAP_LABELS[this.snapInfo.kind] ?? this.snapInfo.kind : null, clientX, clientY);
  }

  // ---------- 输入：工具指针 ----------
  pointerDown(ev: ToolPointer): void {
    const s = ev;
    switch (this._tool) {
      case "line":
      case "rect": {
        if (this.armed && this.anchor3) {
          // 点两下模式第二击 = 落笔（SU 同款；线工具链式连画）
          this.justCommitted = true;
          if (this._tool === "line") this.commitLineTo(s.x, s.y);
          else this.commitRectTo(s.x, s.y);
          break;
        }
        if (this._tool === "rect") {
          // 元逻辑：首点被低维吸附赢走（角/边/轴）→ 平面延迟给第二点；裸落面内才锁面平行
          const r = rectFirstPlane(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.snapPx(), this.alignSrcs());
          this.rectFixed = r.fixed;
          this.gesturePlane = r.plane;
          this.snapInfo = r.snap;
        } else {
          // 线的空落点兜底=学矩形（user 2026-09-01 裁决）：面上锁面；空处=摄像机挑最面向的轴平面
          const r0 = rectFirstPlane(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.snapPx(), this.alignSrcs());
          this.gesturePlane = r0.plane;
          this.snapInfo = r0.snap;
        }
        this.anchor3 = this.snapInfo!.p;
        this.cursor3 = this.anchor3;
        this.armed = false;
        this.canArm = ev.pointerType === "mouse";
        this.downScreen = { x: s.x, y: s.y };
        break;
      }
      case "pp": {
        if (this.armed && this.ppFace !== null && this.anchor3) {
          this.justCommitted = true;
          this.commitPP();
          break;
        }
        // 面动词只认面（细面上任何位置都在边的 HIT 圈内，走 pickEntity 边永远赢；user 2026-09-07）
        const hit = { face: pickFace(this.liveWorld(), this.cam, this.vp(), s.x, s.y) };
        if (hit.face !== undefined) {
          const k = this.checkpoint;
          const rec = k.planeOf(hit.face)!;
          this.ppFace = hit.face;
          const fRec = k.face(hit.face)!;
          // 手中集=帽环本身（2026-09-03 user：底面四条边应可吸 On Edge=SU 同款；穿体吸远角由 opaque 手中膜遮挡接管）
          this.ppShellVids = new Set([
            ...ringVidsTolerant(k.graph, fRec.outer),
            ...fRec.holes.flatMap((hh) => ringVidsTolerant(k.graph, hh)),
          ]);
          this.ppKnownVids = new Set(k.vertices().map((v) => v.id));
          this.ppNormal = rec.plane.n;
          this.gesturePlane = { plane: rec.plane, basis: rec.basis };
          const ray0 = this.cam.screenRay(s.x, s.y, this.vp());
          const grab = rayPlane(ray0.origin, ray0.dir, rec.plane.n, rec.plane.d);
          this.anchor3 = grab ?? k.faceRings3(hit.face)!.outer[0];
          {   // 高度通道停靠集：全场景静态顶点沿 n 的投影高度（含底环/邻面高/0；user 拍板 A 案）
            const hs = new Set<number>();
            hs.add(0);
            for (const v of k.vertices()) hs.add(Math.round(dot3(sub3(v, this.anchor3), rec.plane.n) * 1e6) / 1e6);
            this.ppStops = [...hs].sort((a, b) => a - b);
          }
          this.cursor3 = this.anchor3;
          this.ppH = 0;
          this.armed = false;
          this.canArm = ev.pointerType === "mouse";
          this.downScreen = { x: s.x, y: s.y };
          this.host.hint("推拉中：沿法向拖或点两下落定（所见即所得；吸点线=取其高度）");
        }
        break;
      }
      case "move": {
        if (this.armed && this.moveVids.length && this.anchor3) {
          // 点两下模式第二击 = 放置（SU move 就是点起-移动-点放）
          this.justCommitted = true;
          this.commitMoveTo(s.x, s.y);
          break;
        }
        const hit = pickEntity(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.hitPx());
        const hasSel = this.hasSelection();
        // SU 语义（user 2026-09-01）：有选区时 move 作用于选区，拾取点可以点任何地方当参考点
        this.moveVids = hasSel ? moveTargetsSelection(this.checkpoint, this.selection) : moveTargets(this.checkpoint, hit);
        if (this.moveVids.length) {
          this.gesturePlane = drawPlaneAt(this.liveWorld(), this.cam, this.vp(), s.x, s.y);
          this.anchor3 = hit.vertex !== undefined
            ? this.checkpoint.graph.pt(hit.vertex)
            : snapPoint(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.snapPx(), { plane: this.gesturePlane, alignSources: this.alignSrcs(), hand: this.freshHand() }).p;
          this.cursor3 = this.anchor3;
          this.armed = false;
          this.canArm = ev.pointerType === "mouse";
          this.downScreen = { x: s.x, y: s.y };
          this.host.hint(hasSel ? "移动选区：参考点已拾取，拖拽或点两下放置" : "移动中…拖拽或点两下放置（所见即所得）");
        }
        break;
      }
      case "erase": {
        this.scrubbing = true;
        this.scrubAcc = new Set();
        this.hoverEdge = null;
        const hit = pickEntity(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.hitPx());
        if (hit.edge !== undefined) this.scrubAcc.add(hit.edge);
        this.computeLive();
        break;
      }
      case "select":
        this.marqueeStart = { x: s.x, y: s.y };
        this.marqueeCur = { x: s.x, y: s.y };
        break;
      case "eraseFace":
        break;
    }
    this.draw();
  }

  pointerMove(ev: ToolPointer): void {
    const s = ev;
    if (!this.gestureActive()) {
      this.snapInfo = null;
      this.hoverEdge = null;
      this.hoverFace = null;
      const tool = this._tool;
      if (tool === "line" || tool === "rect" || tool === "move") {
        const plane = drawPlaneAt(this.liveWorld(), this.cam, this.vp(), s.x, s.y);
        this.snapInfo = this.applyHysteresis(snapPoint(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.snapPx(), { plane, alignSources: this.alignSrcs(), hand: this.freshHand() }), s.x, s.y);
        this.trackCharge(this.snapInfo);
      } else if (tool === "erase") {
        this.hoverEdge = pickEntity(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.hitPx()).edge ?? null;
      } else if (tool === "eraseFace") {
        this.hoverFace = pickFace(this.liveWorld(), this.cam, this.vp(), s.x, s.y) ?? null;
        this.computeLive();
      }
      this.updateTip(ev.clientX, ev.clientY);
      this.draw();
      return;
    }
    switch (this._tool) {
      case "line":
        if (this.anchor3) {
          this.snapInfo = this.applyHysteresis(this.lineSecondSnap(s.x, s.y), s.x, s.y);
          this.trackCharge(this.snapInfo, 120);
          this.cursor3 = this.snapInfo.p;
        }
        break;
      case "rect":
        if (this.anchor3) this.cursor3 = this.rectPlaneSnap(s.x, s.y);
        break;
      case "pp":
        this.ppTrack(s.x, s.y);
        break;
      case "move":
        if (this.moveVids.length && this.anchor3) {
          const mv = new Set(this.moveVids);
          this.snapInfo = this.applyHysteresis(snapPoint(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.snapPx(), { plane: this.gesturePlane, anchor: this.anchor3, alignSources: this.alignSrcs(), hand: this.freshHand((vid) => mv.has(vid)) }), s.x, s.y);
          this.trackCharge(this.snapInfo, 120);
          this.cursor3 = this.snapInfo.p;
        }
        break;
      case "erase": {
        const hit = pickEntity(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.hitPx());
        if (hit.edge !== undefined) this.scrubAcc.add(hit.edge);
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
      case "eraseFace":
        break;
    }
    if (this._tool !== "select") this.computeLive();
    this.updateTip(ev.clientX, ev.clientY);
    this.draw();
  }

  /**
   * pp 双通道吸附（2026-09-03 user 拍板终形，对齐 SU）：
   * - 光标通道：世界=**中间态**（WYSIWYG 无鬼），排除=落笔壳集（帽环）∪ 贴移动帽平面的新生点；不吸轴/共轴。
   * - 高度通道：h 标量对静态高度集吸附（落笔取全场景顶点沿 n 投影；杀不死→无回路）。
   * 铁律：吸附世界不得是 h 的函数（snap-model SSoT 不动点定理）。
   */
  private ppTrack(sx: number, sy: number): void {
    if (this.ppFace === null || !this.anchor3 || !this.ppNormal) return;
    const anc = this.anchor3, n = this.ppNormal;
    const wk = this.liveWorld();
    const hNow = this.ppH;   // live 由它而建 → 谓词与世界同代
    const hand: AlignHand = {
      has: (vid) => this.ppShellVids.has(vid) ||
        (!this.ppKnownVids.has(vid) && Math.abs(dot3(sub3(wk.graph.pt(vid), anc), n) - hNow) < 0.01),
      opaque: true,
    };
    const sn = this.applyHysteresis(
      snapPoint(wk, this.cam, this.vp(), sx, sy, this.snapPx(), { plane: this.gesturePlane, anchor: anc, lines: false, hand }),
      sx, sy);
    this.hoverFace = null;
    let ref = "";
    if (sn.kind !== null) {
      this.snapInfo = sn;
      this.ppH = dot3(sub3(sn.p, anc), n);   // 光标目标 → 投影法向取高
      ref = `｜取${SNAP_LABELS[sn.kind] ?? sn.kind}高度`;
    } else {
      this.snapInfo = null;
      const ray1 = this.cam.screenRay(sx, sy, this.vp());
      // 取面高度也查现实 SSoT（user 2026-09-03「遮挡必须用现实的 SSoT，不要用旧鬼」）：
      // 现实世界拾取 + 手中膜跳过 + ∥推向的面拒收（其"高度"随光标漂=垃圾）
      const hitF = pickEntity(wk, this.cam, this.vp(), sx, sy, 0.5).face;
      const hitRec = hitF !== undefined ? wk.planeOf(hitF) : undefined;
      const hitHand = hitF !== undefined && (() => {
        const f = wk.face(hitF);
        if (!f) return true;
        return [...ringVidsTolerant(wk.graph, f.outer), ...f.holes.flatMap((hh) => ringVidsTolerant(wk.graph, hh))].some(hand.has);
      })();
      if (hitF !== undefined && hitF !== this.ppFace && !hitHand && hitRec && Math.abs(dot3(hitRec.plane.n, n)) > 0.05) {
        const q = rayPlane(ray1.origin, ray1.dir, hitRec.plane.n, hitRec.plane.d);
        if (q) {
          this.ppH = dot3(sub3(q, anc), n);
          this.hoverFace = hitF;
          ref = "｜取面#" + hitF + " 高度";
        }
      } else {
        const q = closestOnAxis(anc, n, ray1.origin, ray1.dir);
        if (q) this.ppH = dot3(sub3(q, anc), n);
        // 高度通道：h 标量对静态高度集咬合（ε=7px 折算世界单位；底面/邻面/0 全在停靠集里）
        const sc0 = this.cam.worldToScreen(anc, this.vp());
        const sc1 = this.cam.worldToScreen(add3(anc, n), this.vp());
        const pxPerUnit = Math.max(Math.hypot(sc1.x - sc0.x, sc1.y - sc0.y), 0.5);
        const epsH = (7 * epsScale(this.vp())) / pxPerUnit;
        let best: number | null = null;
        for (const st of this.ppStops) if (Math.abs(st - this.ppH) <= epsH && (best === null || Math.abs(st - this.ppH) < Math.abs(best - this.ppH))) best = st;
        if (best !== null) {
          this.ppH = best;
          ref = `｜高度咬合 ${fmtLen(best)}`;
          this.snapInfo = { p: add3(anc, scale3(n, this.ppH)), kind: "h-stop" };
        }
      }
    }
    this.cursor3 = add3(anc, scale3(n, this.ppH));
    this.host.hint(`推拉 h = ${fmtLen(this.ppH)}${ref}（松手/再点落定；Esc 取消）`);
  }

  pointerUp(ev: ToolPointer): void {
    const s = ev;
    const isTap = (): boolean => !!this.downScreen && Math.hypot(s.x - this.downScreen.x, s.y - this.downScreen.y) <= 4;
    switch (this._tool) {
      case "line": {
        if (!this.anchor3) break;
        if (this.justCommitted) { this.justCommitted = false; break; }
        if (this.canArm && isTap()) {
          this.armed = true;   // 第一击是点击不是拖 → 进点两下模式
          this.host.hint("移动预览，再点一下落笔；Esc 取消");
          break;
        }
        this.commitLineTo(s.x, s.y);
        break;
      }
      case "rect": {
        if (!this.anchor3) break;
        if (this.justCommitted) { this.justCommitted = false; break; }
        if (this.canArm && isTap()) {
          this.armed = true;
          this.host.hint("移动预览，再点一下落矩形；Esc 取消");
          break;
        }
        this.commitRectTo(s.x, s.y);
        break;
      }
      case "pp": {
        if (this.ppFace === null || !this.anchor3) { this.cancelGesture(); break; }
        if (this.justCommitted) { this.justCommitted = false; break; }
        if (this.canArm && isTap()) {
          this.armed = true;
          this.host.hint("推拉中：移动定高度，再点一下落定；Esc 取消");
          break;
        }
        this.commitPP();
        break;
      }
      case "move": {
        if (!this.moveVids.length || !this.anchor3) { this.cancelGesture(); break; }
        if (this.justCommitted) { this.justCommitted = false; break; }
        if (this.canArm && isTap()) {
          this.armed = true;   // 点起 → 移动预览 → 再点放置
          this.host.hint("移动中：所见即所得预览，再点一下放置；Esc 取消");
          break;
        }
        this.commitMoveTo(s.x, s.y);
        break;
      }
      case "erase": {
        const ids = [...this.scrubAcc];
        this.cancelGesture();
        if (ids.length) this.emit(this.commitOp({ op: "eraseEdges", ids }));
        break;
      }
      case "select": {
        if (!this.marqueeStart || !this.marqueeCur) { this.cancelGesture(); break; }
        const additive = ev.shiftKey;
        const wasDrag = Math.hypot(this.marqueeCur.x - this.marqueeStart.x, this.marqueeCur.y - this.marqueeStart.y) > 4;
        let picked: Selection;
        if (wasDrag) {
          picked = marqueeScreen(this.checkpoint, this.cam, this.vp(), {
            minX: Math.min(this.marqueeStart.x, this.marqueeCur.x), maxX: Math.max(this.marqueeStart.x, this.marqueeCur.x),
            minY: Math.min(this.marqueeStart.y, this.marqueeCur.y), maxY: Math.max(this.marqueeStart.y, this.marqueeCur.y),
          });
        } else {
          picked = emptySelection();
          const hit = pickEntity(this.liveWorld(), this.cam, this.vp(), s.x, s.y, this.hitPx());
          if (hit.edge !== undefined) picked.edges.add(hit.edge);
          else if (hit.face !== undefined) picked.faces.add(hit.face);
        }
        if (additive) {
          for (const e of picked.edges) this.selection.edges.add(e);
          for (const f of picked.faces) this.selection.faces.add(f);
        } else {
          this.selection = picked;
        }
        this.marqueeStart = this.marqueeCur = null;
        this.host.marquee(null);
        this.host.changed();
        break;
      }
      case "eraseFace": {
        const hit = { face: pickFace(this.liveWorld(), this.cam, this.vp(), s.x, s.y) };
        this.cancelGesture();
        if (hit.face !== undefined) this.emit(this.commitOp({ op: "eraseFaces", ids: [hit.face] }));
        break;
      }
    }
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

  // ---------- 落笔 ----------
  /** 连画+出膜停（user 终裁回 SU 方案）：出膜事件=铅笔自动抬起；逃生=Esc/原地点击。 */
  private commitLineTo(sx: number, sy: number): void {
    const a = this.anchor3!;
    const b = this.lineSecondSnap(sx, sy).p;
    if (dist(a, b) < 1) { this.cancelGesture(); return; }
    const evs = this.commitOp({ op: "addEdges", segs: [[a, b]] });
    this.emit(evs);
    this.chargePt(a); this.chargePt(b);   // 落笔点自动充能（通用兜底）
    this.cancelGesture();
    if (evs.length > 0) return;
    this.anchor3 = b;
    this.cursor3 = b;
    this.armed = true;
    this.host.hint("连画中：点下一点；出膜自动停；Esc 收笔");
  }
  private commitRectTo(sx: number, sy: number): void {
    const b = this.rectPlaneSnap(sx, sy);
    const segs = rectSegmentsOnPlane(this.gesturePlane.plane, this.gesturePlane.basis, this.anchor3!, b);
    this.cancelGesture();
    if (segs.length) this.emit(this.commitOp({ op: "addEdges", segs }));
  }
  private commitPP(): void {
    const h = this.ppH;
    const fid = this.ppFace!;
    this.cancelGesture();
    if (Math.abs(h) >= 0.3) this.emit(this.commitOp({ op: "pushpull", face: fid, dist: h }));
  }
  private commitMoveTo(sx: number, sy: number): void {
    const mv = new Set(this.moveVids);
    const target = snapPoint(this.liveWorld(), this.cam, this.vp(), sx, sy, this.snapPx(), { plane: this.gesturePlane, anchor: this.anchor3!, alignSources: this.alignSrcs(), hand: this.freshHand((vid) => mv.has(vid)) }).p;
    const delta = sub3(target, this.anchor3!);
    const vids = this.moveVids;
    const d = Math.hypot(delta.x, delta.y, delta.z);
    this.cancelGesture();
    if (d >= 0.3) this.emit(this.commitOp({ op: "move", moves: translateMoves(this.checkpoint, vids, delta) }));
  }
}
