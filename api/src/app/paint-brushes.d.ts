import type { CatsUpToolConfig } from "../editor/tool-config.ts";
import type { PaintDeskDoc, PaintKnobsDesk } from "../format/document.ts";
import { type BrushId } from "../paint/brush-records.ts";
export interface PaintBrushes {
    /** 这把工具现在拿的是哪支（不是画的工具 = null）。 */
    current(tool: string): BrushId | null;
    /** 大小滑条的上限 = 手上这支笔的 size.max。 */
    sizeMax(tool: string): number;
    /** 工具配置变了（main.ts 的订阅转进来）：笔换了 = 存回 / 套上；旋钮变了 = 报一声。 */
    onConfig(tool: string): void;
    /** 载入 / 新建：套上文件里记的（null = 都回出厂）。套的过程中不报。 */
    apply(p: PaintDeskDoc | null): void;
    /** 写回桌面态的 brushes / active：从上一份起步（本版没有的原样留着），盖上碰过的笔和每把工具现在拿的那支。 */
    toDesk(prev: PaintDeskDoc | null | undefined): {
        brushes: Record<string, PaintKnobsDesk>;
        active: Record<string, string>;
    };
}
export declare function createPaintBrushes(cfg: CatsUpToolConfig, changed: () => void): PaintBrushes;
