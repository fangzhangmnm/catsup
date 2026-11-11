// paint/brush-kinds.ts —— 笔的种类（统筹 11-11：「以后每加一种笔……必须进这个探针，漏了 = 红」）。created 2026-11-11 by Claude Opus 5.5
// 一种笔 = 落到薄层上的样子不一样（笔尖怎么画、怎么叠、擦不擦）；只是参数（大小 / 硬度 / 浓度）不同的不算新种类。
// 加一种笔（像素笔、渍洗、干扫、真喷枪、流挂……）= 这里一行 + 工具 / 手感那边接上 + probe-live-region 的 BRUSH_MATRIX 里一组（每一组都查「宿主报的格对不对」：
//   增量出来的内核合成图 = 强制整张重合、显示图每一级 = 整张重拷，逐字节）。守卫 test/brush-kinds.test.ts：表里每一种都要在探针里出现；画画工作台起笔只经 strokeKindOpts。
import type { Tool } from "../editor/tool-ids.ts";

export interface BrushKindRow {
  readonly label: string;
  /** 画画工作台里拿着哪把工具画的是这种笔。 */
  readonly tool: Tool;
  readonly erase: boolean;
  readonly accum: "over" | "max";
}
export const BRUSH_KINDS = {
  pen: { label: "笔", tool: "paintPen", erase: false, accum: "over" },
  eraser: { label: "橡皮", tool: "paintEraser", erase: true, accum: "over" },
} as const satisfies Readonly<Record<string, BrushKindRow>>;
export type BrushKind = keyof typeof BRUSH_KINDS;
export const BRUSH_KIND_IDS = Object.keys(BRUSH_KINDS) as BrushKind[];

/** 这把工具画的是哪种笔（不是画的工具 = null）。 */
export function brushKindOfTool(t: string): BrushKind | null {
  for (const k of BRUSH_KIND_IDS) if (BRUSH_KINDS[k].tool === t) return k;
  return null;
}
/** 起笔时随种类定的那几项（SpacePaintOpts 里不随设置变的部分）。 */
export function strokeKindOpts(k: BrushKind): { readonly erase: boolean; readonly accum: "over" | "max" } {
  const r = BRUSH_KINDS[k];
  return { erase: r.erase, accum: r.accum };
}
