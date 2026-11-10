// float-component —— workpiece v2 的浮层组件（ADR-0008 §3；T4b）。
// substrate = FloatState | null（不持久化，退出前 settle）。float 类型族从 v1 workpiece.ts 迁此。
//
// 组件 = 状态机 verbs（install/setTransform/drop，各查令牌）；lift/commit/reject 的**编排**留在
// FloatingTransform 引擎（GPU bake/采样缓存/gizmo 数学都在那边——组件只管状态所有权与记账）。
// 像素纯函数（extract/挖洞/写回）在 float-ops.ts，node 全测。
//
// record 两形（同 LayerTiles 的 tiles/computed 双轨）：
//   { t:"state", fs: FloatState|null }   —— lift/drop：整包在 substrate ↔ record 之间移交
//     （挖洞/烤层像素由 LayerTiles 写时扣押同 step 记账；选区由 SelectionComponent 同 step 记账
//     —— 旧 LiftFloatOp 的 leafSnaps/selection 三元组在 v2 下由各组件分账，undo 倒序天然对齐）。
//   { t:"meta", meta }                   —— 拖动/切模式：只换 transform（纯数值，无句柄）。
// 同 token 首捕获赢：meta 先捕、随后 drop → 升格成 state 包（transform 复位到令牌前原件）。
// 所有权：FloatState 同一时刻只有一个 owner（substrate / collector / record）；漏 dispose 池 FR 点名。

import { LayerPixels } from "../tiles/tile-layer.ts";
import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";

// ---- 浮层类型族（v1 workpiece.ts 迁入；T4b）----
export interface FloatRect { x: number; y: number; w: number; h: number }
export type FloatMesh = { x: number; y: number }[][];   // 2×2：[[TL,TR],[BL,BR]]（doc 坐标）
export interface WorkpieceFloat {
  id: number;
  sourceLayerId: number;
  /** lift 时像素的 identity 位置（doc 坐标；内容紧 bbox）；reject 按此写回，不走 warp 采样器。
   *  v0.9.2 起**允许越出画布**（x/y 可负、w/h 可 > doc）——导入「保持原尺寸」的浮层比画布大。 */
  rect: FloatRect;
  /** 浮层**本地坐标**的稀疏 tile：网格尺寸 = rect.w×rect.h，内容存在本地 (0,0)，
   *  落位由 rect 单独描述（池驻留、可压缩；不可变——变换只动 transform metadata）。
   *  v0.9.2 前是 doc 坐标 + doc 尺寸网格，因而**物理上装不下画布外的像素**（导入原大小丢外圈）。
   *  知情者只有三个：extractFloatPixels/makeFloatFromBytes 建、floatBytes 读、composeRigidWriteback 读。 */
  pixels: LayerPixels;
}
/** 参考 frame（v0.6.21 有向化，Procreate 方手柄语义）：p(u,v)=origin+u·ux+v·uy，u,v∈[0,1]。 */
export interface FloatPt { x: number; y: number }
export interface FloatFrame { origin: FloatPt; ux: FloatPt; uy: FloatPt }
/** 像素变换用过的最高自由度类（模式切换记账制，v0.6.34）：只升不降、随 undo 整点回退。 */
export type TransformClass = "similarity" | "affine" | "projective";
/** 共享 gizmo 的变换元数据（组 lift 多 float 共用一份；per-float dest quad 由 rect×单应性派生）。 */
export interface FloatTransformMeta {
  gizmoFrame: FloatFrame;
  mesh: FloatMesh;
  meshN: number;
  mode: "free" | "uniform" | "distort" | null;
  uniformAspect: number;
  usedClass?: TransformClass;   // 缺省视为 "similarity"（pristine lift / 旧测试播种）
}
export interface FloatState {
  floats: WorkpieceFloat[];
  transform: FloatTransformMeta;
}

export function cloneFloatMeta(t: FloatTransformMeta): FloatTransformMeta {
  return {
    gizmoFrame: { origin: { ...t.gizmoFrame.origin }, ux: { ...t.gizmoFrame.ux }, uy: { ...t.gizmoFrame.uy } },
    mesh: t.mesh.map((row) => row.map((p) => ({ x: p.x, y: p.y }))),
    meshN: t.meshN,
    mode: t.mode,
    uniformAspect: t.uniformAspect,
    usedClass: t.usedClass ?? "similarity",
  };
}

// 配额估计（规矩沿旧栈）：raw 记 0 走共享池配额，压缩后 = compressedBytes/refCount。
export function estimateFloatStateBytes(fs: FloatState | null): number {
  if (!fs) return 0;
  let sum = 0;
  for (const f of fs.floats) {
    for (const h of f.pixels.handles()) {
      if (h.released) continue;
      if (h.isCompressed()) sum += Math.ceil(h.compressedByteLength() / Math.max(1, h.refCount()));
    }
  }
  return sum;
}

type FloatRecord = { t: "state"; fs: FloatState | null } | { t: "meta"; meta: FloatTransformMeta };

export class FloatLayerComponent implements CollectorComponent {
  readonly kind = "floatLayer";
  private _wp: Workpiece;
  private _fs: FloatState | null = null;
  private _pending: FloatRecord | null = null;   // collector：本 token 的令牌前原件（首捕获赢）

  constructor(wp: Workpiece) { this._wp = wp; }

  view(): Readonly<FloatState> | null { return this._fs; }

  /** lift 收尾（token 写）：FloatState 所有权交入 substrate。已有浮层 → throw（引擎先查 view）。 */
  install(fs: FloatState): void {
    this._wp._componentWrite(this);
    if (this._fs) throw new Error("FloatLayerComponent: float already active");
    if (!this._pending) this._pending = { t: "state", fs: null };
    this._fs = fs;
  }

  /** 变换整点（token 写）：只换 transform metadata（入参克隆，caller 的 live 网格不被引用）。 */
  setTransform(meta: FloatTransformMeta): void {
    this._wp._componentWrite(this);
    if (!this._fs) throw new Error("FloatLayerComponent: setTransform with no floating layer");
    if (!this._pending) this._pending = { t: "meta", meta: cloneFloatMeta(this._fs.transform) };
    this._fs.transform = cloneFloatMeta(meta);
  }

  /** 收摊（token 写；accept/reject 的收尾微步——像素落层由同 token 的 LayerTiles 扣押记账）。 */
  drop(): void {
    this._wp._componentWrite(this);
    if (!this._fs) throw new Error("FloatLayerComponent: drop with no floating layer");
    const fs = this._fs;
    this._fs = null;
    if (!this._pending) { this._pending = { t: "state", fs }; return; }
    if (this._pending.t === "meta") {
      fs.transform = this._pending.meta;   // 令牌前 transform 原件随整包回收（before 侧一致性）
      this._pending = { t: "state", fs };
      return;
    }
    // pending 已是 state（同 token install→drop）：中间产物即弃
    if (fs !== this._pending.fs) for (const f of fs.floats) f.pixels.dispose();
  }

  /** 换文档 escape hatch（clearHistory 流；栈随后清，不走 undo——旧 dropFloats 语义）。 */
  dropForLoad(): void {
    if (!this._fs) return;
    for (const f of this._fs.floats) f.pixels.dispose();
    this._fs = null;
  }

  // ── CollectorComponent ──

  sealRecord(): RecordData | null {
    const p = this._pending;
    this._pending = null;
    return p;
  }

  swapRecord(data: RecordData): RecordData {
    const r = data as FloatRecord;
    if (r.t === "meta") {
      if (!this._fs) throw new Error("FloatLayerComponent: meta swap with no floating layer (stack-order bug)");
      const cur = this._fs.transform;
      this._fs.transform = cloneFloatMeta(r.meta);
      return { t: "meta", meta: cur };
    }
    const cur = this._fs;
    this._fs = r.fs;
    return { t: "state", fs: cur };
  }

  recordBytes(data: RecordData): number {
    const r = data as FloatRecord;
    return r.t === "state" ? 512 + estimateFloatStateBytes(r.fs) : 256;
  }

  disposeRecord(data: RecordData): void {
    const r = data as FloatRecord;
    if (r.t === "state" && r.fs) {
      for (const f of r.fs.floats) f.pixels.dispose();
      r.fs = null;
    }
  }
}
