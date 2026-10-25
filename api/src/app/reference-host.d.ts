import "@internal/reference-window";
import type { WpReferenceWindow, RefPanelRect, RefImportQuestion, RefImportChoice } from "@internal/reference-window";
import type { RefFileDoc, RefPanelDoc, ReferencesDoc } from "../format/document.ts";
export declare const ASK_ABOVE: number;
export interface ReferenceHostDeps {
    info(text: string): void;
    error(text: string): void;
    /** 浮窗不往上越过的线。 */
    topFloor(): number;
    /** 这个文件里第一次开窗放哪（没开过窗的文件；库的缺省在左上，会压住 CatsUp 的左柱工具）。 */
    defaultRect(): RefPanelRect;
    /** 超过 4 MB：问 存进模型 / 只放内存 / 算了（应用内 sheet，不用系统对话框）。 */
    askImport(q: RefImportQuestion): Promise<RefImportChoice>;
    /** 卡片变了、字节已经编好（files() / rev() 已是新的）：Session 标脏、记一笔编辑时间。 */
    onCards(): void;
    /** 关窗 / Esc 之后焦点还给画布。 */
    focusCanvas(): void;
}
export declare function createReferenceHost(d: ReferenceHostDeps): {
    /** 现在要存的目录（编码还在跑的话先 await settled()）。 */
    files: () => RefFileDoc[];
    /** 卡片改动的修订号。 */
    rev: () => number;
    /** 载入 / 编码还在跑的话等它（存之前调，免得刚加的卡没赶上）。 */
    settled: () => Promise<void>;
    /** 开一个文件（新建 = 空目录 + 没有窗）：目录交给库读；tooNew = CatsUp 那层太新（原样带着，这边不显示）。 */
    apply(refs: ReferencesDoc, panel: RefPanelDoc | null, opts?: {
        tooNew?: boolean;
    }): void;
    /** 视图态：开过窗才有（存进 desk.refPanel）。 */
    panel(): RefPanelDoc | null;
    /** 视图 ☰ 入口：开 = 顺手给焦点（开窗 → Ctrl+V 一步到位）；关 = 焦点回画布。 */
    toggle(): void;
    isOpen: () => boolean;
    hasFocus: () => boolean;
    count: () => number;
    carried: () => boolean;
    relayout: () => void;
    /** 测试 / 探针用：导入（同菜单那条路）。 */
    importFiles: (files: File[]) => Promise<void>;
    el: WpReferenceWindow;
};
export type ReferenceHost = ReturnType<typeof createReferenceHost>;
