// paint/brush-kinds.ts —— 内置的笔：一张表，每一行是笔的模型（ai-docs/20261111-brush-model.md 第二节）里的那条记录。created 2026-11-11 by Claude Opus 5.5 · edited 2026-11-12 by Claude Opus 5.5（施工单二十 1a）
// 统筹 11-11：「以后每加一种笔……必须进这个探针，漏了 = 红」。一种笔 = 落到薄层上的样子不一样（笔尖怎么画、怎么叠、擦不擦）；只是参数（大小 / 硬度 / 浓度）不同的不算新种类。
// 加一种笔（像素笔、渍洗、干扫、真喷枪、流挂……）= 这里一行 + 工具 / 手感那边接上 + probe-live-region 的 BRUSH_MATRIX 里一组（每一组都查「宿主报的格对不对」：
//   增量出来的内核合成图 = 强制整张重合、显示图每一级 = 整张重拷，逐字节）。守卫 test/brush-kinds.test.ts：表里每一种都要在探针里出现；画画工作台起笔只经 strokeKindOpts、笔只经 resolvedBrushOf。
// 施工单二十 1a（2026-11-12）：记录的键照画画软件笔架条目（内核 resolveBrush 认的那些），起笔时 resolvedBrushOf 解出内核的 ResolvedBrush，取代以前的 hookBrush（调试钩子那支）。
//   这一版只有普通笔和橡皮两行，数和 v0.19.54 一模一样：压感系数 0、不收尖、不跟手、间距 0.1（门 = 同样几笔画出来逐字节相同）。普通笔要不要吃压感是手感，归 user，不在这里改。
//   erase / accum 从记录的 tool、compositeMode 算，不另存（wash = 取最浓 = max；buildup = 越叠越浓 = over）。
//   compositeMode 在三维这条路上只决定 accum；内核那份 ResolvedBrush.compositeMode 只有内核的二维笔引擎（brush.ts）读，三维的一笔不经过它。
import type { Tool } from "../editor/tool-ids.ts";
import { resolveBrush, type ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";

/** 一支笔的记录（键 = 画画软件笔架条目的键；本地写类型，不从内核多拿名字）。大小、浓度、硬度是旋钮（笔的模型第五节），不在记录里定死：shape.hardness 只是缺省。 */
export interface BrushRecord {
  readonly id: string;
  readonly name: string;
  /** 对像素做什么（笔的模型的 tool 轴）：brush 上色、eraser 擦。 */
  readonly tool: "brush" | "eraser";
  readonly shape: { readonly kind: "round"; readonly aspect: number; readonly rotation: number; readonly hardness: number };
  readonly spacing: number;
  /** 一笔里自己叠自己：wash = 取最浓（自己叠自己不变深）、buildup = 越叠越浓。 */
  readonly compositeMode: "wash" | "buildup";
  readonly blendMode: "source-over";
  readonly pixelMode: boolean;
  // 手感
  readonly sizeCoeff: number; readonly opaCoeff: number; readonly flowCoeff: number;
  readonly pressureGamma: number; readonly pressureLPF: number;
  readonly taper: { readonly in: number; readonly out: number }; readonly taperFloor: number;
  readonly smooth: { readonly streamline: number; readonly stabilization: number };
}

/** 内置的笔。1a：两行，数和 v0.19.54（hookBrush + 种类表）一模一样。 */
export const BRUSHES = {
  pen: {
    id: "pen", name: "笔", tool: "brush",
    shape: { kind: "round", aspect: 1, rotation: 0, hardness: 0.5 }, spacing: 0.1, compositeMode: "buildup", blendMode: "source-over", pixelMode: false,
    sizeCoeff: 0, opaCoeff: 0, flowCoeff: 0, pressureGamma: 1, pressureLPF: 0, taper: { in: 0, out: 0 }, taperFloor: 0.4, smooth: { streamline: 0, stabilization: 0 },
  },
  eraser: {
    id: "eraser", name: "橡皮", tool: "eraser",
    shape: { kind: "round", aspect: 1, rotation: 0, hardness: 0.5 }, spacing: 0.1, compositeMode: "buildup", blendMode: "source-over", pixelMode: false,
    sizeCoeff: 0, opaCoeff: 0, flowCoeff: 0, pressureGamma: 1, pressureLPF: 0, taper: { in: 0, out: 0 }, taperFloor: 0.4, smooth: { streamline: 0, stabilization: 0 },
  },
} as const satisfies Readonly<Record<string, BrushRecord>>;
export type BrushKind = keyof typeof BRUSHES;
export const BRUSH_KIND_IDS = Object.keys(BRUSHES) as BrushKind[];

/** 画画工作台里拿着哪把工具画的是哪支笔（编辑器的工具名；吸管不是笔）。 */
const TOOL_OF: Readonly<Record<BrushKind, Tool>> = { pen: "paintPen", eraser: "paintEraser" };

export interface BrushKindRow {
  readonly label: string;
  /** 画画工作台里拿着哪把工具画的是这种笔。 */
  readonly tool: Tool;
  readonly erase: boolean;
  readonly accum: "over" | "max";
}
const rowOf = (k: BrushKind): BrushKindRow => {
  const r: BrushRecord = BRUSHES[k];
  return { label: r.name, tool: TOOL_OF[k], erase: r.tool === "eraser", accum: r.compositeMode === "wash" ? "max" : "over" };
};
/** 种类表（从记录算出来的；探针 / 守卫照它跑）。 */
export const BRUSH_KINDS: Readonly<Record<BrushKind, BrushKindRow>> = Object.freeze(Object.fromEntries(BRUSH_KIND_IDS.map((k) => [k, rowOf(k)])) as Record<BrushKind, BrushKindRow>);

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
/**
 * 起笔用的笔：这一行记录 + 旋钮（大小 = 屏幕像素、浓度、硬度）→ 内核的 ResolvedBrush（resolveBrush，和画画软件同一个解析）。
 * 颜色不走这里（一笔的颜色是 SpacePaintOpts.color），这里固定 #000000（和以前的 hookBrush 一样）。
 */
export function resolvedBrushOf(k: BrushKind, knobs: { readonly size: number; readonly opacity: number; readonly hardness: number }): ResolvedBrush {
  const r: BrushRecord = BRUSHES[k];
  return resolveBrush({ preset: { ...r, shape: { ...r.shape, hardness: knobs.hardness } }, size: knobs.size, opacity: knobs.opacity, color: "#000000" });
}
