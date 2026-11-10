// persp-component —— workpiece v2 的透视配置组件（ADR-0008 §3 升格；T4d）。
// substrate = desk 的 persp 配置（desk.persp——持久化仍进 desk 文件：**存哪个文件与
// undo 归属正交**，ADR-0008）；组件经注入 host 读写，零 desk 内部知识。
//
// 记账范围（v0.8.29 扩到全量，user 2026-08-10「persp也全量进undo吧，拖一次可以undo一次」）：
//   - remapForDocTransform（裁剪/翻转/旋转/偏移/重采样的 VP 重映射，ADR-0006）——doc 几何
//     undo 时透视随同 step 还原（旧 docTransform persp 信封退役）。
//   - commitPreApplied（VP 编辑器 persp-edit）：拖动期间 desk transient 直写当预览，
//     pointerup 持 before 快照收口一步——每次拖动/重置/锁切换 = 一步，ctrl-z 逐拖回退。
//     旧「VP 编辑不进栈」收窄（曾引 persp-edit _finish 注）随此 supersede；ADR-0006 的
//     「取消=回快照」同被 supersede（快照回滚从未实现，census §7 分歧#2 的裁决）。
//
// record = { v: 整包深拷贝快照 }；swap = 快照互换自反。undo docTransform 会把 remap 之后的
// desk 直写一并盖回（与旧信封 wholesale restore 行为一致）。

import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";

export interface PerspPt { x: number; y: number }
export interface PerspHost {
  /** 深拷贝 JSON 快照（workbench-state.snapshotShapePersp）。 */
  snapshot(): unknown;
  /** 整包还原（workbench-state.restoreShapePersp）。 */
  restore(snap: unknown): void;
  /** VP/box 坐标重映射（workbench-state.remapShapePersp）。 */
  remap(f: (p: PerspPt) => PerspPt, opts?: { unlockHorizon?: boolean }): void;
}

interface PerspRecord { v: unknown }

export class PerspComponent implements CollectorComponent {
  readonly kind = "persp";
  private _wp: Workpiece;
  private _host: PerspHost;
  private _origin: PerspRecord | null = null;   // collector：本 token 的令牌前快照（首捕获赢）

  constructor(wp: Workpiece, host: PerspHost) {
    this._wp = wp;
    this._host = host;
  }

  view(): unknown { return this._host.snapshot(); }

  /** doc 几何变换的 VP 重映射（token 写；doc-ops runDocTransform 的 compound 内调）。 */
  remapForDocTransform(f: (p: PerspPt) => PerspPt, opts?: { unlockHorizon?: boolean }): void {
    this._wp._componentWrite(this);
    if (!this._origin) this._origin = { v: this._host.snapshot() };
    this._host.remap(f, opts);
  }

  /** 整包换配置（token 写；载入/程序化换配置用——persp-edit 交互走 commitPreApplied）。 */
  set(cfg: unknown): void {
    this._wp._componentWrite(this);
    if (!this._origin) this._origin = { v: this._host.snapshot() };
    this._host.restore(cfg);
  }

  /** 记账写（pre-applied）：VP 编辑器一次拖动收口——desk 已被 transient 直写到位，
   *  before = 拖动起点快照（persp-edit pointerdown 拍）。净变化为零由 sealRecord 兜（不占步）。 */
  commitPreApplied(before: unknown): void {
    this._wp._componentWrite(this);
    if (!this._origin) this._origin = { v: before };
  }

  // ── CollectorComponent ──

  sealRecord(): RecordData | null {
    const o = this._origin;
    this._origin = null;
    if (!o) return null;
    // 净变化为零（无 VP 时 remap 是 no-op）→ 不占 entry（JSON 比对，包 KB 级低频）
    if (JSON.stringify(o.v) === JSON.stringify(this._host.snapshot())) return null;
    return o;
  }

  swapRecord(data: RecordData): RecordData {
    const r = data as PerspRecord;
    const cur = this._host.snapshot();
    this._host.restore(r.v);
    return { v: cur };
  }

  recordBytes(data: RecordData): number {
    return 128 + JSON.stringify((data as PerspRecord).v ?? null).length * 2;
  }

  disposeRecord(): void { /* 纯 json，无资源 */ }
}
