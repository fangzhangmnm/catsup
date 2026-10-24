import type { DocumentSettings } from "../format/document.ts";
/** on = 格点 + 整数长度同一开关；step = 显示格距（米）；subdiv = 吸附细分（吸附步 = step / subdiv）。存进文档 settings、不进 undo。 */
export interface GridSettings {
    on: boolean;
    step: number;
    subdiv: 5 | 10;
}
export declare const GRID_STEPS: readonly number[];
export declare const DEFAULT_GRID: GridSettings;
/** 文档 settings → 网格状态（缺 / 坏值回默认）。 */
export declare function gridFromSettings(s: DocumentSettings): GridSettings;
/** 网格状态 → 文档 settings 的那几格（snapIncrement 派生 = step / subdiv，契约里保留）。 */
export declare function settingsFromGrid(s: DocumentSettings, g: GridSettings): DocumentSettings;
