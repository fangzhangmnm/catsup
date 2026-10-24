// grid-settings.ts —— 绝对网格的设置（0.11 尺规纪元 ⑤，2026-10-24，Claude Fable 5.1）。纯数据 + 文档 settings 的换算；不 import editor.ts（测试直跑）。
import type { DocumentSettings } from "../format/document.ts";
import type { Frame } from "../scene/xform.ts";

/** 网格住哪个坐标面（user 2026-10-24「grid可以配置成xy yz xz，这样方便我吸附画立面」）：xy = 地面；yz / xz = 立面。 */
export type GridPlane = "xy" | "yz" | "xz";
export const GRID_PLANES: readonly { id: GridPlane; label: string }[] = [{ id: "xy", label: "XY 地面" }, { id: "yz", label: "YZ 立面" }, { id: "xz", label: "XZ 立面" }];

/** on = 格点 + 整数长度同一开关；step = 显示格距（米）；subdiv = 吸附细分（吸附步 = step / subdiv）。存进文档 settings、不进 undo。 */
export interface GridSettings { on: boolean; step: number; subdiv: 5 | 10; plane: GridPlane; }
export const GRID_STEPS: readonly number[] = [5, 1, 0.5, 0.1, 0.05, 0.01];
export const DEFAULT_GRID: GridSettings = { on: false, step: 1, subdiv: 5, plane: "xy" };
/** 网格帧：把上下文帧的轴换到网格面上（右手系；网格画在帧的 XY、法向 = 帧的 Z）。xy = 原样；yz：x←y, y←z, z←x；xz：x←x, y←z, z←−y。 */
export function gridFrame(F: Frame, plane: GridPlane): Frame {
  if (plane === "yz") return { origin: F.origin, x: F.y, y: F.z, z: F.x };
  if (plane === "xz") return { origin: F.origin, x: F.x, y: F.z, z: { x: -F.y.x, y: -F.y.y, z: -F.y.z } };
  return F;
}

/** 文档 settings → 网格状态（缺 / 坏值回默认）。 */
export function gridFromSettings(s: DocumentSettings): GridSettings {
  const step = typeof s.gridStep === "number" && s.gridStep > 1e-6 ? s.gridStep : 1;
  return { on: !!s.absoluteGrid, step, subdiv: s.gridSubdiv === 10 ? 10 : 5, plane: s.gridPlane === "yz" || s.gridPlane === "xz" ? s.gridPlane : "xy" };
}
/** 网格状态 → 文档 settings 的那几格（snapIncrement 派生 = step / subdiv，契约里保留）。 */
export function settingsFromGrid(s: DocumentSettings, g: GridSettings): DocumentSettings {
  return { ...s, absoluteGrid: g.on, gridStep: g.step, gridSubdiv: g.subdiv, snapIncrement: g.step / g.subdiv, ...(g.plane !== "xy" ? { gridPlane: g.plane } : { gridPlane: undefined }) };
}
