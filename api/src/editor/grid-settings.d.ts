import type { DocumentSettings } from "../format/document.ts";
import type { Frame } from "../scene/xform.ts";
/** 网格住哪个坐标面（user 2026-10-24「grid可以配置成xy yz xz，这样方便我吸附画立面」）：xy = 地面；yz / xz = 立面。 */
export type GridPlane = "xy" | "yz" | "xz";
export declare const GRID_PLANES: readonly {
    id: GridPlane;
    label: string;
}[];
/** on = 格点 + 整数长度同一开关；step = 显示格距（米；**吸附没开也按它画**，user 2026-10-24「栅格吸附没开的时候栅格没有跟着单位动」）；subdiv = 吸附细分（吸附步 = step / subdiv）；
 *  preset = 栅格制式。存进文档 settings、不进 undo。 */
export interface GridSettings {
    on: boolean;
    step: number;
    subdiv: 5 | 10;
    plane: GridPlane;
    preset: GridPreset;
}
/** 栅格制式 ≠ 长度单位（user 2026-10-24「dnd也不应该叫英尺英寸，那是一个独立的模式。英尺英寸不是sketchup的建筑模式吗，这两个分开来」）：
 *  si = 公制格距；architectural = SketchUp 建筑模板那套英尺英寸格距；dnd = D&D 格子（5 ft 一格，1/5 细分 = 1 ft）。显示 / 输入用哪种长度单位（vcbUnit）另一个旋钮，互不牵连。 */
export type GridPreset = "si" | "architectural" | "dnd";
export interface GridPresetDef {
    readonly id: GridPreset;
    readonly label: string; /** 格距标签用哪种单位念（制式自带的，不跟 vcbUnit）。 */
    readonly unit: "m" | "ft";
    readonly steps: readonly number[];
}
export declare const GRID_STEPS: readonly number[];
export declare const GRID_PRESETS: readonly GridPresetDef[];
export declare const gridPreset: (id: GridPreset) => GridPresetDef;
export declare const isGridPreset: (x: unknown) => x is GridPreset;
export declare function gridStepsFor(preset: GridPreset): readonly number[];
/** 换制式时把格距挪到新制里最近的一档。 */
export declare function nearestGridStep(step: number, preset: GridPreset): number;
export declare const DEFAULT_GRID: GridSettings;
/** 新文档的栅格：吸附默认开（user 2026-10-25「以及默认snap开」）。读老文件时缺 absoluteGrid 键照旧按关（DEFAULT_GRID / DEFAULT_SETTINGS 不动 = 老文件语义不变）。 */
export declare const NEW_DOC_GRID: GridSettings;
/** 网格帧：把上下文帧的轴换到网格面上（右手系；网格画在帧的 XY、法向 = 帧的 Z）。xy = 原样；yz：x←y, y←z, z←x；xz：x←x, y←z, z←−y。 */
export declare function gridFrame(F: Frame, plane: GridPlane): Frame;
/** 文档 settings → 网格状态（缺 / 坏值回默认）。 */
export declare function gridFromSettings(s: DocumentSettings): GridSettings;
/** 网格状态 → 文档 settings 的那几格（snapIncrement 派生 = step / subdiv，契约里保留）。 */
export declare function settingsFromGrid(s: DocumentSettings, g: GridSettings): DocumentSettings;
