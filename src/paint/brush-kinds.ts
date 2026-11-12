// paint/brush-kinds.ts —— 三维这边对内置的笔的对照：每支笔归画画工作台的哪把工具、擦不擦、怎么叠、现在拿的是哪支。created 2026-11-11 by Claude Opus 5.5 · edited 2026-11-12 by Claude Opus 5.5（施工单二十 1a / 1b）
// 笔本身（记录、起笔用的笔、平滑、能不能用）在 brush-records.ts（不引用三维的东西，以后搬进画画内核）；这里是只有三维才有的那一半。
// 统筹 11-11：「以后每加一种笔……必须进这个探针，漏了 = 红」。1b 起按「路」算（笔的模型第七节第 2 条）：一条路 = tool、叠法、按不按格、大小的单位、混合模式这几样的组合；
//   只是手感的数不一样的两支笔（草稿笔和勾线笔都是 brush + wash）走同一条路。表里出现的每一条路都要在 probe-live-region 的 BRUSH_MATRIX 里有一组
//   （每一组都查「宿主报的格对不对」：增量出来的内核合成图 = 强制整张重合、显示图每一级 = 整张重拷，逐字节）。守卫 test/brush-kinds.test.ts。
// erase / accum 从记录的 tool、compositeMode 算，不另存（wash = 取最浓 = max；buildup = 越叠越浓 = over）。
//   compositeMode 在三维这条路上只决定 accum；内核那份 ResolvedBrush.compositeMode 只有内核的二维笔引擎（brush.ts）读，三维的一笔不经过它。
import type { Tool } from "../editor/tool-ids.ts";
import { BRUSHES, BRUSH_IDS, DEFAULT_BRUSH, isBrushId, pathKeyOf, type BrushId, type BrushRecord } from "./brush-records.ts";

export type BrushKind = BrushId;
export const BRUSH_KIND_IDS = BRUSH_IDS;

/** 记录的 tool → 画画工作台里拿着画的那把工具（吸管不是笔）。 */
const TOOL_OF: Readonly<Record<BrushRecord["tool"], Tool>> = { brush: "paintPen", eraser: "paintEraser" };

export interface BrushKindRow {
  readonly label: string;
  /** 画画工作台里拿着哪把工具画的是这支笔。 */
  readonly tool: Tool;
  readonly erase: boolean;
  readonly accum: "over" | "max";
  /** 走哪条路（brush-records.ts pathKeyOf）：探针按路一组。 */
  readonly path: string;
}
const rowOf = (k: BrushKind): BrushKindRow => {
  const r: BrushRecord = BRUSHES[k];
  return { label: r.name, tool: TOOL_OF[r.tool], erase: r.tool === "eraser", accum: r.compositeMode === "wash" ? "max" : "over", path: pathKeyOf(r) };
};
/** 种类表（从记录算出来的；探针 / 守卫照它跑）。 */
export const BRUSH_KINDS: Readonly<Record<BrushKind, BrushKindRow>> = Object.freeze(Object.fromEntries(BRUSH_KIND_IDS.map((k) => [k, rowOf(k)])) as Record<BrushKind, BrushKindRow>);
/** 表里出现的每一条路 → 走这条路的第一支笔（探针拿它画）。 */
export const BRUSH_PATHS: Readonly<Record<string, BrushKind>> = Object.freeze(Object.fromEntries([...BRUSH_KIND_IDS].reverse().map((k) => [BRUSH_KINDS[k].path, k])));

/** 这把工具上的笔记在桌面态 active 的哪一个键下（= 记录的 tool 取值）；不是画的工具 = null。 */
export function recordToolOf(t: string): BrushRecord["tool"] | null {
  for (const [rt, tool] of Object.entries(TOOL_OF) as [BrushRecord["tool"], Tool][]) if (tool === t) return rt;
  return null;
}
/** 这把工具上能挑的几支（下拉里的顺序 = 表里的顺序）。 */
export function brushKindsOfTool(t: string): BrushKind[] {
  const rt = recordToolOf(t);
  return rt ? BRUSH_KIND_IDS.filter((k) => BRUSHES[k].tool === rt) : [];
}
/**
 * 拿着这把工具画的是哪支笔：chosen 是这把工具上的笔 = 它；没挑过、挑的是这一版没有的笔、或者是别的工具上的笔 = 这把工具默认的那支（桌面态 active 的规矩）。
 * 不是画的工具（吸管等）= null。
 */
export function brushKindOfTool(t: string, chosen?: unknown): BrushKind | null {
  const rt = recordToolOf(t);
  if (!rt) return null;
  return isBrushId(chosen) && BRUSHES[chosen].tool === rt ? chosen : DEFAULT_BRUSH[rt];
}
/** 起笔时随种类定的那几项（SpacePaintOpts 里不随设置变的部分）。 */
export function strokeKindOpts(k: BrushKind): { readonly erase: boolean; readonly accum: "over" | "max" } {
  const r = BRUSH_KINDS[k];
  return { erase: r.erase, accum: r.accum };
}
