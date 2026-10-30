import { type GridSettings } from "./grid-settings.ts";
import type { ModeId } from "./mode.ts";
export declare class GridState {
    /** 文档的那一份（存盘 / 读盘只认它）。 */
    doc: GridSettings;
    private freeformOn;
    /** 这个工作台看到的设置（开关 = 它自己那一份）。 */
    view(mode: ModeId): Readonly<GridSettings>;
    /** 改设置：开关落在当前工作台那一份；fromDoc = 读盘 / 新建（整份照文档的换，自由建模那份不动）。 */
    set(mode: ModeId, patch: Partial<GridSettings>, fromDoc?: boolean): void;
}
/** 吸附开关的叫法（提示行用；按工作台分的事住这里，app 层不分叉——守卫 T102）：自由建模那份要说清楚是自己一份。 */
export declare const snapSwitchName: (mode: ModeId) => string;
