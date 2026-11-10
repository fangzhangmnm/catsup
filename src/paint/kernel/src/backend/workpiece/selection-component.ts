// selection-component —— workpiece v2 的选区组件（ADR-0008 §3；T4a）。
// substrate = Selection | null（不持久化，跨 session 清——load 后 clearOnLoad）。
// 写纪律双轨（沿 T2 像素组件的分工形态）：
//   - 预览直写 = _rawWrite：lasso 引擎/预览 tx/浮层 lift 的 pre-applied 换手容身处，
//     不收集不记账（Selection 不可变对象、换手=纯引用交换，观察者无处挂——直写口是显式声明态）。
//   - 记账写 = set / commitPreApplied（token 写）：collector 首捕获令牌前原件，
//     同 token 的中间产物就地 dispose（Krita memento 语义，与 LayerTiles 首捕获赢同款）。
// record = { v: Selection | null }（另一侧的选区，所有权归 record）；swap 纯引用交换自反。
// 配额规则沿旧栈：selection tile 压缩前记 0（走共享 raw 池配额）、压缩后 compressedBytes/refCount。

import type { Selection } from "../selection.ts";
import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";

export function estimateSelectionBytes(sel: Selection | null | undefined): number {
  if (!sel || sel.disposed) return 0;
  let sum = 0;
  for (const h of sel.tileHandles()) {
    if (h.released) continue;
    if (h.isCompressed()) sum += Math.ceil(h.compressedByteLength() / Math.max(1, h.refCount()));
  }
  return sum;
}

interface SelRecord { v: Selection | null }

export class SelectionComponent implements CollectorComponent {
  readonly kind = "selection";
  private _wp: Workpiece;
  private _cur: Selection | null = null;
  private _origin: SelRecord | null = null;   // collector：本 token 的令牌前原件（首捕获赢）

  constructor(wp: Workpiece) { this._wp = wp; }

  view(): Selection | null { return this._cur; }

  /** 预览直写（不记账不收集）。dispose 责任在调用方（沿旧 doc.selection setter 契约）。 */
  _rawWrite(v: Selection | null): void { this._cur = v; }

  /** 记账写：组件自己换手（调用方未 pre-applied 时用；替换值所有权交入 collector/即弃）。 */
  set(next: Selection | null): void {
    this._wp._componentWrite(this);
    const prev = this._cur;
    this._cur = next;
    if (!this._origin) { this._origin = { v: prev }; return; }
    if (prev && prev !== this._origin.v && prev !== next && !prev.disposed) prev.dispose();
  }

  /** 记账写（pre-applied）：调用方已把 after 直写上台，before 所有权交入。 */
  commitPreApplied(before: Selection | null): void {
    this._wp._componentWrite(this);
    if (!this._origin) { this._origin = { v: before }; return; }
    if (before && before !== this._origin.v && before !== this._cur && !before.disposed) before.dispose();
  }

  /** 换文档收尾（跨 session 不沿用选区；旧 adoptState 语义）。无 token——load 流，栈随后清。 */
  clearOnLoad(): void {
    if (this._cur && !this._cur.disposed) this._cur.dispose();
    this._cur = null;
  }

  /** 预览 tx 窗口（T5 收编自 selection-face）：origin 保管、write 换预览、commit/abort 收口。
   *  纯组件逻辑不碰 history——commit 返回 {changed, before}，**记账归调用方**
   *  （history.withPoint(() => sel.commitPreApplied(before))）。toolbar 扩缩预览住户。 */
  beginPreview(): SelectionPreviewTx {
    return new SelectionPreviewTx(this);
  }

  // ── CollectorComponent ──

  sealRecord(): RecordData | null {
    const o = this._origin;
    this._origin = null;
    if (!o) return null;
    if (o.v === this._cur) return null;   // 净变化为零 → 不占 undo 步（同对象引用，无可释放）
    return o;
  }

  swapRecord(data: RecordData): RecordData {
    const r = data as SelRecord;
    const cur = this._cur;
    this._cur = r.v;
    return { v: cur };
  }

  recordBytes(data: RecordData): number { return 256 + estimateSelectionBytes((data as SelRecord).v); }

  disposeRecord(data: RecordData): void {
    const r = data as SelRecord;
    if (r.v && !r.v.disposed) r.v.dispose();
    r.v = null;
  }
}

/** 预览 tx 的最小选区口：SelectionComponent 本体，或 doc 端口适配
 *  （C6 户3：lasso 魔棒拖选经 `{view: () => doc.selection, _rawWrite: v => doc.selection = v}`
 *  适配——同一套托管纪律，node 直测的假 doc 也不必长出组件）。 */
export interface SelectionPreviewPort {
  view(): Selection | null;
  _rawWrite(v: Selection | null): void;
}

/** 预览 tx（值语义沿 selection-face 的 SelectionPreviewTx；T5 起记账在调用方）。
 *  origin = 进入时的选区。所有权：commit 后 before(=origin) 交调用方递给 commitPreApplied；
 *  abort 还原 origin、预览产物就地 dispose。 */
export class SelectionPreviewTx {
  private _sel: SelectionPreviewPort;
  private _origin: Selection | null;
  private _open = true;

  constructor(sel: SelectionPreviewPort) {
    this._sel = sel;
    this._origin = sel.view();
  }

  origin(): Selection | null { return this._origin; }
  private _assertOpen(): void {
    if (!this._open) throw new Error("SelectionPreviewTx: already closed (unusable after commit/abort)");
  }

  /** 换预览：上一个预览产物无人接手 → 就地 dispose（origin 与新值本体除外）。write(origin) 合法（= 预览回到原选区）。 */
  write(next: Selection | null): void {
    this._assertOpen();
    const prev = this._sel.view();
    if (prev === next) return;
    this._sel._rawWrite(next);
    if (prev && prev !== this._origin && !prev.disposed) prev.dispose();
  }

  /** 收口：current ≠ origin → {changed:true, before:origin}（调用方负责记账）；无变化 → changed:false。 */
  commit(): { changed: boolean; before: Selection | null } {
    this._assertOpen();
    this._open = false;
    const cur = this._sel.view();
    if (cur === this._origin) return { changed: false, before: null };
    return { changed: true, before: this._origin };
  }

  /** 无痕还原 origin，预览产物就地 dispose。 */
  abort(): void {
    this._assertOpen();
    this._open = false;
    const cur = this._sel.view();
    if (cur !== this._origin) {
      if (cur && !cur.disposed) cur.dispose();
      this._sel._rawWrite(this._origin);
    }
  }
}
