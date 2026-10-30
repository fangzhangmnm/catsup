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

/** 吸附开关的叫法（提示行用；按工作台分的事住这里，app 层不分叉——守卫 T102）：自由建模那份要说清楚是自己一份。 */
export const snapSwitchName = (mode: ModeId): string => (mode === "freeform" ? "自由建模的吸附（和硬表面分开记、默认关）" : "格点吸附");
/** 开关吸附之后提示行那一句（两个工作台的钮管的不是一回事，说法也分开）。 */
export const snapSwitchSay = (mode: ModeId, on: boolean): string => `${snapSwitchName(mode)}：` + (mode === "freeform"
  ? (on ? "开（吸到点 > 边 > 面；笔 / 手指按它算，按住 Shift 临时关；鼠标只认 Shift）" : "关（按住 Shift 临时吸到点 > 边 > 面）")
  : (on ? "开（格点 · 整格长度 · 15°；吸到点 / 边 / 面一直开着；按住 Shift 临时关）" : "关（按住 Shift 临时开；吸到点 / 边 / 面照常）"));
/**
 * 右上角吸附锁钮长什么样（按工作台；user 10-30「分清楚su模式和mesh模式。su模式没有吸附就没有意义了。管的是incremental？也许用不同的图标？」）：
 * 硬表面 = 格点钮——吸到点 / 边 / 面的推断永远开着，这颗钮和 Shift 只管格点 / 整格 / 15° 一档（user 10-24「然后move之类的的shift就是snap to incremental」、
 * 「还是其实右上应该只管grid snap」）；自由建模 = 磁铁——默认什么都不吸，钮管吸不吸到点 > 边 > 面（笔 / 手指认它，鼠标只认 Shift：stance.ts SNAP_BASE）。
 */
export function snapSwitchLook(mode: ModeId): { icon: string; title: string } {
  return mode === "freeform"
    ? { icon: "snap-element", title: "吸附：吸到点 > 边 > 面（自由建模自己一份、默认关；笔 / 手指按它算，Shift = 临时反过来；鼠标不看它、按住 Shift 才吸）。右键或长按 = 方向锁 / 面锁、栅格设置" }
    : { icon: "snap-grid", title: "格点吸附：只管格点 / 整格 / 15° 一档（吸到点、边、面一直开着），Shift = 临时反过来。点一下开 / 关；右键或长按 = 方向锁 / 面锁、栅格设置" };
}
