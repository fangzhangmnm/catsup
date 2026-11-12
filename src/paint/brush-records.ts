// paint/brush-records.ts —— 内置的笔（一张表，每一行是笔的模型 ai-docs/20261111-brush-model.md 第二节的那条记录）+ 起笔用的笔和平滑 + 一支笔在这个宿主里能不能用（第四节）。
// created 2026-11-12 by Claude Opus 5.5（施工单二十 1b：记录从 brush-kinds.ts 搬过来，多了草稿笔、勾线笔两行）
//
// 这一个文件**不引用三维自己的东西**，只引用画画内核（守卫 test/brush-kinds.test.ts）：笔的模型第七节第 3 条——它以后要搬进画画内核、两个 app 用同一份；搬的时候是改内核对外的接口，发统筹。
// 三维那边的对照（哪支笔归画画工作台的哪把工具、擦不擦、怎么叠、现在拿的是哪支）在 brush-kinds.ts。
//
// 加一支笔 = BRUSHES 一行；它走的路（pathKeyOf）是新的 = probe-live-region 的 BRUSH_MATRIX 加一组（守卫逼着加）。
// 只是手感的数不一样的两支笔走同一条路（第七节第 2 条）。
import { resolveBrush, type ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
import { resolveSmooth } from "./kernel/src/common/smooth-defaults.ts";

/** 一支笔的记录（键 = 画画软件笔架条目的键；本地写类型，不从内核多拿名字）。大小、浓度、硬度是旋钮（笔的模型第五节），不在记录里定死：size.base / shape.hardness 只是第一次拿起这支笔时的值。 */
export interface BrushRecord {
  readonly id: string;
  readonly name: string;
  /** 对像素做什么（笔的模型的 tool 轴）：brush 上色、eraser 擦。 */
  readonly tool: "brush" | "eraser";
  readonly shape: { readonly kind: "round"; readonly aspect: number; readonly rotation: number; readonly hardness: number };
  /** 大小：base = 第一次拿起来时的值、max = 滑条的上限（画画软件的 args.size / sizeBaseMax）；unit 缺 = 宿主自己的习惯（三维 = 屏幕上的 CSS 像素，第三节第 2 条）。 */
  readonly size: { readonly base: number; readonly max: number; readonly unit?: "cell" };
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

/**
 * 内置的笔。id 定了不改、不重用（施工单二十第三节第 1 条）。
 * - pen（界面上叫「平涂」，id 不动）：v0.19.69 起照画画软件的 default-brush-fill「平涂」原样抄（统筹 11-12 裁定、user「没问题」：和画画软件同名、默认 50、上限 800、
 *   鼠标不特殊处理——鼠标 / 手指按满压算（controller/stroke-clock.ts），起笔收尖照样有）。之前（1a 到 v0.19.68）是和 v0.19.54 一模一样的数（12 像素、压感不管、buildup、间距 0.1）。
 *   大小是旋钮、跟文件存：存过这支笔旋钮的老文件照旧是它自己的数，只有没存过的从 50 起。
 * - eraser：1a 时和 v0.19.54 一模一样的数（压感系数 0、不收尖、不跟手、间距 0.1；24 像素、硬度 0.8，max = 一直以来滑条的上限 400）。
 * - sketch / ink：照画画软件内置笔的数据原样抄（WeebPaint builtin-brushes.json，v0.14.86 那一版）：草稿笔 = default-brush-pencil「铅笔」、勾线笔 = default-brush-ink「勾线」；pen 同理抄 default-brush-fill。
 *   args 的键 → 这里：size → size.base、sizeBaseMax → size.max、hardness → shape.hardness、spacingValue → spacing、taperIn / taperOut → taper、streamline / stabilization → smooth，其余同名。
 *   画画软件里那两支没写 taperFloor = 内核 resolveBrush 的缺省 0.4，这里写明。size 原样是数：画画软件里是画布像素、这里是屏幕像素（统筹 11-12：数据照抄；像不像归 user 判断，不自己调）。
 */
export const BRUSHES = {
  pen: {
    id: "pen", name: "平涂", tool: "brush",
    shape: { kind: "round", aspect: 1, rotation: 0, hardness: 0.9 }, size: { base: 50, max: 800 }, spacing: 0.06, compositeMode: "wash", blendMode: "source-over", pixelMode: false,
    sizeCoeff: 1, opaCoeff: 0, flowCoeff: 0, pressureGamma: 1.2, pressureLPF: 50, taper: { in: 0.5, out: 0 }, taperFloor: 0.4, smooth: { streamline: 0.1, stabilization: 0.2 },
  },
  eraser: {
    id: "eraser", name: "橡皮", tool: "eraser",
    shape: { kind: "round", aspect: 1, rotation: 0, hardness: 0.8 }, size: { base: 24, max: 400 }, spacing: 0.1, compositeMode: "buildup", blendMode: "source-over", pixelMode: false,
    sizeCoeff: 0, opaCoeff: 0, flowCoeff: 0, pressureGamma: 1, pressureLPF: 0, taper: { in: 0, out: 0 }, taperFloor: 0.4, smooth: { streamline: 0, stabilization: 0 },
  },
  sketch: {   // ← WeebPaint builtin-brushes.json default-brush-pencil「铅笔」
    id: "sketch", name: "草稿笔", tool: "brush",
    shape: { kind: "round", aspect: 1, rotation: 0, hardness: 0.75 }, size: { base: 6, max: 80 }, spacing: 0.06, compositeMode: "wash", blendMode: "source-over", pixelMode: false,
    sizeCoeff: 0.5, opaCoeff: 0.35, flowCoeff: 0.3, pressureGamma: 1, pressureLPF: 50, taper: { in: 0, out: 0 }, taperFloor: 0.4, smooth: { streamline: 0.1, stabilization: 0.15 },
  },
  ink: {   // ← WeebPaint builtin-brushes.json default-brush-ink「勾线」
    id: "ink", name: "勾线笔", tool: "brush",
    shape: { kind: "round", aspect: 1, rotation: 0, hardness: 0.5 }, size: { base: 8, max: 60 }, spacing: 0.06, compositeMode: "wash", blendMode: "source-over", pixelMode: false,
    sizeCoeff: 0.95, opaCoeff: 0, flowCoeff: 0, pressureGamma: 0.5, pressureLPF: 50, taper: { in: 0.5, out: 0 }, taperFloor: 0.4, smooth: { streamline: 0.5, stabilization: 0.5 },
  },
} as const satisfies Readonly<Record<string, BrushRecord>>;
export type BrushId = keyof typeof BRUSHES;
export const BRUSH_IDS = Object.keys(BRUSHES) as BrushId[];
export const isBrushId = (s: unknown): s is BrushId => typeof s === "string" && Object.prototype.hasOwnProperty.call(BRUSHES, s);
export const brushRecord = (id: BrushId): BrushRecord => BRUSHES[id];
/** 每种 tool 默认的那支（桌面态 active 指着这一版没有的笔 / 没记 = 用它）。 */
export const DEFAULT_BRUSH: Readonly<Record<BrushRecord["tool"], BrushId>> = { brush: "pen", eraser: "eraser" };
/** 这种 tool 有哪几支（表里的顺序 = 下拉里的顺序）。 */
export const brushesOfTool = (tool: BrushRecord["tool"]): BrushId[] => BRUSH_IDS.filter((id) => BRUSHES[id].tool === tool);

/**
 * 起笔用的笔：这一行记录 + 旋钮（大小 = 屏幕像素、浓度、硬度）→ 内核的 ResolvedBrush（resolveBrush，和画画软件同一个解析）。
 * 颜色不走这里（一笔的颜色是宿主自己递的），这里固定 #000000。
 */
export function resolvedBrushOf(id: BrushId, knobs: { readonly size: number; readonly opacity: number; readonly hardness: number }): ResolvedBrush {
  const r: BrushRecord = BRUSHES[id];
  return resolveBrush({ preset: { ...r, shape: { ...r.shape, hardness: knobs.hardness } }, size: knobs.size, opacity: knobs.opacity, color: "#000000" });
}
/**
 * 这支笔的平滑：跟手、防抖都是 0（或一格一格的笔）= 不平滑（undefined，起笔不递 = 和以前一模一样）；否则 = 内核的 resolveSmooth（平滑只有这一个函数，统筹 11-12）。
 * scale = 1：三维的轨迹在屏幕上、死区本来就是屏幕像素。
 */
export function strokeSmoothOf(b: ResolvedBrush): { tau: number; deadzone: number; tailBow: number } | undefined {
  if (b.pixelMode || (!b.streamline && !b.stabilization)) return undefined;
  return resolveSmooth(b.streamline, b.stabilization, 1);
}

/** 一支笔走的路（笔的模型第七节第 2 条）：这几样的组合不一样 = 出来的像素走不一样的代码，探针里各要一组。geo.by 这一版还没有。 */
export const pathKeyOf = (r: BrushRecord): string => [r.tool, r.compositeMode, r.pixelMode ? "pixel" : "smooth", r.size.unit ?? "host", r.blendMode].join("/");

/** 宿主认得什么（笔的模型第四节）：一支笔的每一样取值都在这张单子里 = 这里能用。 */
export interface HostCaps {
  readonly name: string;
  readonly tools: readonly BrushRecord["tool"][];
  readonly compositeModes: readonly BrushRecord["compositeMode"][];
  readonly blendModes: readonly BrushRecord["blendMode"][];
  readonly shapes: readonly BrushRecord["shape"]["kind"][];
  /** size.unit 缺 = 宿主自己的习惯，永远认得；这里列认得的显式单位。 */
  readonly sizeUnits: readonly NonNullable<BrushRecord["size"]["unit"]>[];
  readonly pixelMode: boolean;
}
/** 三维模型上的画（有表面的宿主）。这一张里所有的笔都能用（施工单二十第三节第 7 条）。按格的笔（第 2 刀）来了再把 "cell" 和 pixelMode 加上。 */
export const SURFACE_HOST: HostCaps = { name: "模型上", tools: ["brush", "eraser"], compositeModes: ["wash", "buildup"], blendModes: ["source-over"], shapes: ["round"], sizeUnits: [], pixelMode: false };
/** 画布上（画布小窗里画，施工单二十一第 2 刀）：大小按画布像素（只有画布的宿主的习惯）。这一张里的笔都能用；按格的笔来了把 "cell" 和 pixelMode 加上。 */
export const CANVAS_HOST: HostCaps = { name: "画布上", tools: ["brush", "eraser"], compositeModes: ["wash", "buildup"], blendModes: ["source-over"], shapes: ["round"], sizeUnits: [], pixelMode: false };
/** 这支笔在这个宿主里能不能用：能 = null；不能 = 一句说清哪一样不认得（家规：不静默——带着不认得的取值的笔是灰的、说原因，记录原样带着）。 */
export function brushUnusableWhy(r: BrushRecord, host: HostCaps): string | null {
  if (!host.tools.includes(r.tool)) return `${host.name}不认得「${r.tool}」这种笔`;
  if (!host.compositeModes.includes(r.compositeMode)) return `${host.name}不认得叠法「${r.compositeMode}」`;
  if (!host.blendModes.includes(r.blendMode)) return `${host.name}不认得混合模式「${r.blendMode}」`;
  if (!host.shapes.includes(r.shape.kind)) return `${host.name}不认得笔尖「${r.shape.kind}」`;
  if (r.size.unit !== undefined && !host.sizeUnits.includes(r.size.unit)) return `${host.name}不认得大小的单位「${r.size.unit}」`;
  if (r.pixelMode && !host.pixelMode) return `${host.name}还不能画一格一格的笔`;
  return null;
}
