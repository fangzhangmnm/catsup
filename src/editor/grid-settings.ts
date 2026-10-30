// grid-settings.ts —— 绝对网格的设置（0.11 尺规纪元 ⑤，2026-10-24，Claude Fable 5.1）。纯数据 + 文档 settings 的换算；不 import editor.ts（测试直跑）。
import type { DocumentSettings } from "../format/document.ts";
import type { Frame } from "../scene/xform.ts";

/** 网格住哪个坐标面（user 2026-10-24「grid可以配置成xy yz xz，这样方便我吸附画立面」）：xy = 地面；yz / xz = 立面。 */
export type GridPlane = "xy" | "yz" | "xz";
export const GRID_PLANES: readonly { id: GridPlane; label: string }[] = [{ id: "xy", label: "XY 地面" }, { id: "yz", label: "YZ 立面" }, { id: "xz", label: "XZ 立面" }];

/** on = 格点 + 整数长度同一开关；step = 显示格距（米；**吸附没开也按它画**，user 2026-10-24「栅格吸附没开的时候栅格没有跟着单位动」）；subdiv = 吸附细分（吸附步 = step / subdiv）；
 *  preset = 栅格制式。存进文档 settings、不进 undo。 */
/** 吸附细分的几档（一格吸几下；2026-10-29 user「snapping的substep应该除了5 10 还有2 20 50 100」，账本 T120；文件里是 settings.gridSubdiv，CATSUP_document 3.2）。 */
export const GRID_SUBDIVS = [2, 5, 10, 20, 50, 100] as const;
export type GridSubdiv = (typeof GRID_SUBDIVS)[number];
export const isGridSubdiv = (x: unknown): x is GridSubdiv => (GRID_SUBDIVS as readonly unknown[]).includes(x);
export interface GridSettings { on: boolean; step: number; subdiv: GridSubdiv; plane: GridPlane; preset: GridPreset; }
/** 栅格制式 ≠ 长度单位（user 2026-10-24「dnd也不应该叫英尺英寸，那是一个独立的模式。英尺英寸不是sketchup的建筑模式吗，这两个分开来」）：
 *  si = 公制格距；architectural = SketchUp 建筑模板那套英尺英寸格距；dnd = D&D 格子（5 ft 一格，1/5 细分 = 1 ft）。显示 / 输入用哪种长度单位（vcbUnit）另一个旋钮，互不牵连。 */
export type GridPreset = "si" | "architectural" | "dnd";
export interface GridPresetDef { readonly id: GridPreset; readonly label: string; /** 格距标签用哪种单位念（制式自带的，不跟 vcbUnit）。 */ readonly unit: "m" | "ft"; readonly steps: readonly number[]; }
export const GRID_STEPS: readonly number[] = [5, 1, 0.5, 0.1, 0.05, 0.01];
export const GRID_PRESETS: readonly GridPresetDef[] = [
  { id: "si", label: "公制", unit: "m", steps: GRID_STEPS },
  { id: "architectural", label: "建筑英尺英寸", unit: "ft", steps: [3.048, 0.3048, 0.1524, 0.0254] },   // 10 ft / 1 ft / 6 in / 1 in（SketchUp Architectural 模板）
  { id: "dnd", label: "D&D 格子", unit: "ft", steps: [1.524, 3.048] },                                  // 5 ft 一格（1/5 = 1 ft）/ 10 ft（user 10-24「加一个5ft的单位制对标dnd……正好1/5是1ft」）
];
export const gridPreset = (id: GridPreset): GridPresetDef => GRID_PRESETS.find((p) => p.id === id) ?? GRID_PRESETS[0];
export const isGridPreset = (x: unknown): x is GridPreset => typeof x === "string" && GRID_PRESETS.some((p) => p.id === x);
export function gridStepsFor(preset: GridPreset): readonly number[] { return gridPreset(preset).steps; }
/** 换制式时把格距挪到新制里最近的一档。 */
export function nearestGridStep(step: number, preset: GridPreset): number { const list = gridStepsFor(preset); return list.includes(step) ? step : list.reduce((b, x) => (Math.abs(Math.log(x / step)) < Math.abs(Math.log(b / step)) ? x : b), list[0]); }
export const DEFAULT_GRID: GridSettings = { on: false, step: 1, subdiv: 5, plane: "xy", preset: "si" };
/** 新文档的栅格：吸附默认开（user 2026-10-25「以及默认snap开」）。读老文件时缺 absoluteGrid 键照旧按关（DEFAULT_GRID / DEFAULT_SETTINGS 不动 = 老文件语义不变）。 */
export const NEW_DOC_GRID: GridSettings = { ...DEFAULT_GRID, on: true };
/** 网格帧：把上下文帧的轴换到网格面上（右手系；网格画在帧的 XY、法向 = 帧的 Z）。xy = 原样；yz：x←y, y←z, z←x；xz：x←x, y←z, z←−y。 */
export function gridFrame(F: Frame, plane: GridPlane): Frame {
  if (plane === "yz") return { origin: F.origin, x: F.y, y: F.z, z: F.x };
  if (plane === "xz") return { origin: F.origin, x: F.x, y: F.z, z: { x: -F.y.x, y: -F.y.y, z: -F.y.z } };
  return F;
}

/** 文档 settings → 网格状态（缺 / 坏值回默认）。 */
export function gridFromSettings(s: DocumentSettings): GridSettings {
  const step = typeof s.gridStep === "number" && s.gridStep > 1e-6 ? s.gridStep : 1;
  // 制式：没写键的老文档按格距猜——落在英制档上的 = 建筑英尺英寸（v0.13.32 之前格距跟 vcbUnit 走，英制用户的文档存的是英制格距），否则公制
  const preset: GridPreset = isGridPreset(s.gridPreset) ? s.gridPreset : gridPreset("architectural").steps.includes(step) ? "architectural" : "si";
  return { on: !!s.absoluteGrid, step, subdiv: isGridSubdiv(s.gridSubdiv) ? s.gridSubdiv : 5, plane: s.gridPlane === "yz" || s.gridPlane === "xz" ? s.gridPlane : "xy", preset };
}
/** 网格状态 → 文档 settings 的那几格（snapIncrement 派生 = step / subdiv，契约里保留）。 */
export function settingsFromGrid(s: DocumentSettings, g: GridSettings): DocumentSettings {
  return { ...s, absoluteGrid: g.on, gridStep: g.step, gridSubdiv: g.subdiv, snapIncrement: g.step / g.subdiv, ...(g.plane !== "xy" ? { gridPlane: g.plane } : { gridPlane: undefined }), ...(g.preset !== "si" ? { gridPreset: g.preset } : { gridPreset: undefined }) };   // 公制不写键（默认文档字节不变）
}
