// editor/grid-state.ts —— 网格设置 + 各工作台自己的吸附开关。created 2026-10-29 by Claude Opus 5.5
// user 10-29「mesh模式默认不开snapping，和brep单独记账」：格距 / 细分 / 制式 / 平面是文档的（存进 settings），吸附开关按工作台分——
// 硬表面（和别的工作台）= 文档那一份（absoluteGrid，跟着文件走）；自由建模 = 自己一份，默认关、只住这次会话（不进文件、不标脏）。
import { NEW_DOC_GRID, type GridSettings } from "./grid-settings.ts";
import type { ModeId } from "./mode.ts";

export class GridState {
  /** 文档的那一份（存盘 / 读盘只认它）。 */
  doc: GridSettings = { ...NEW_DOC_GRID };
  private freeformOn = false;
  /** 这个工作台看到的设置（开关 = 它自己那一份）。 */
  view(mode: ModeId): Readonly<GridSettings> { return mode === "freeform" && this.doc.on !== this.freeformOn ? { ...this.doc, on: this.freeformOn } : this.doc; }
  /** 改设置：开关落在当前工作台那一份；fromDoc = 读盘 / 新建（整份照文档的换，自由建模那份不动）。 */
  set(mode: ModeId, patch: Partial<GridSettings>, fromDoc = false): void {
    if (!fromDoc && mode === "freeform" && patch.on !== undefined) { this.freeformOn = patch.on; const { on: _on, ...rest } = patch; patch = rest; }
    this.doc = { ...this.doc, ...patch };
  }
}
