import type { Selection } from "../selection.ts";
import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";
export declare function estimateSelectionBytes(sel: Selection | null | undefined): number;
export declare class SelectionComponent implements CollectorComponent {
    readonly kind = "selection";
    private _wp;
    private _cur;
    private _origin;
    constructor(wp: Workpiece);
    view(): Selection | null;
    /** 预览直写（不记账不收集）。dispose 责任在调用方（沿旧 doc.selection setter 契约）。 */
    _rawWrite(v: Selection | null): void;
    /** 记账写：组件自己换手（调用方未 pre-applied 时用；替换值所有权交入 collector/即弃）。 */
    set(next: Selection | null): void;
    /** 记账写（pre-applied）：调用方已把 after 直写上台，before 所有权交入。 */
    commitPreApplied(before: Selection | null): void;
    /** 换文档收尾（跨 session 不沿用选区；旧 adoptState 语义）。无 token——load 流，栈随后清。 */
    clearOnLoad(): void;
    /** 预览 tx 窗口（T5 收编自 selection-face）：origin 保管、write 换预览、commit/abort 收口。
     *  纯组件逻辑不碰 history——commit 返回 {changed, before}，**记账归调用方**
     *  （history.withPoint(() => sel.commitPreApplied(before))）。toolbar 扩缩预览住户。 */
    beginPreview(): SelectionPreviewTx;
    sealRecord(): RecordData | null;
    swapRecord(data: RecordData): RecordData;
    recordBytes(data: RecordData): number;
    disposeRecord(data: RecordData): void;
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
export declare class SelectionPreviewTx {
    private _sel;
    private _origin;
    private _open;
    constructor(sel: SelectionPreviewPort);
    origin(): Selection | null;
    private _assertOpen;
    /** 换预览：上一个预览产物无人接手 → 就地 dispose（origin 与新值本体除外）。write(origin) 合法（= 预览回到原选区）。 */
    write(next: Selection | null): void;
    /** 收口：current ≠ origin → {changed:true, before:origin}（调用方负责记账）；无变化 → changed:false。 */
    commit(): {
        changed: boolean;
        before: Selection | null;
    };
    /** 无痕还原 origin，预览产物就地 dispose。 */
    abort(): void;
}
