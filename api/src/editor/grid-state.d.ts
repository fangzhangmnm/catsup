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
/** 开关吸附之后提示行那一句（两个工作台的钮管的不是一回事，说法也分开）。 */
export declare const snapSwitchSay: (mode: ModeId, on: boolean) => string;
/**
 * 右上角吸附锁钮长什么样（按工作台；user 10-30「分清楚su模式和mesh模式。su模式没有吸附就没有意义了。管的是incremental？也许用不同的图标？」）：
 * 硬表面 = 格点钮——吸到点 / 边 / 面的推断永远开着，这颗钮和 Shift 只管格点 / 整格 / 15° 一档（user 10-24「然后move之类的的shift就是snap to incremental」、
 * 「还是其实右上应该只管grid snap」）；自由建模 = 磁铁——默认什么都不吸，钮管吸不吸到点 > 边 > 面（笔 / 手指认它，鼠标只认 Shift：stance.ts SNAP_BASE）。
 */
export declare function snapSwitchLook(mode: ModeId): {
    icon: string;
    title: string;
    subdiv: boolean;
};
