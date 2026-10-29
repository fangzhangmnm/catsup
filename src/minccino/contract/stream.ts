// minccino/contract/stream.ts —— 输入契约：**引擎拉、提供者吐**的一条流（骨架稿 v2 不变量 2：输入不是场景树，是按视锥带 + 预算吐出来的
// 带版本号的块；编辑器 = 「恰好全在手」的提供者，串流 / 过程生成以后是另一个实现）。created 2026-10-29 by Claude Fable 5.1
// 小学只用到：一带、预算只记不裁、complete 永远 true。留口（只留形状、不实现）：多带（superlod）、预算裁块、半成品池（T12）、笔画原语（T31）、惰性池（T30）。
// 步 3（v0.17.3）：块的形状按现状 render3「每池一份几何 + 每槽一个矩阵 + 只传改过的段」钉——属性表直接包提供者的大数组（零拷贝），
// `dirty` 说这次改了哪段；属性名过渡期沿用现状 shader 的名字（aColor / aColorB = 两侧的材质色，8 位 sRGB；选中 / 淡出不再烤顶点色——那是标记，刀 b / c）。
import type { Vec3, Xform12 } from "./geometry.ts";

/** 块的原语种类。开放集：以后加「笔画」（折线 + 每点宽度 / 压力，屏幕恒宽）= 多一个值，不改别的。 */
export type ChunkKind = "tris" | "lines" | "points";

/**
 * 对材质模块的引用：小学 = 文档里那个材质对象本身（和场景的 Material **同形**：颜色 + 可选贴图），引擎只读这几个字段——拿它当贴图缓存键，
 * 颜色过渡期还由提供者烤进顶点色（提供者自己按调色板算，不再问后端）；材质模块落地后换成槽表（material/）。
 */
export interface MaterialRef {
  readonly color: readonly number[];
  readonly texture?: { readonly mimeType: string; readonly bytes: Uint8Array; readonly sizeM: readonly number[] };
}
/** 贴图面画哪一侧（两个表面，DT8）：double = 两侧同一张贴图；front / back = 只画 +n / −n 那侧。 */
export type ChunkSide = "front" | "back" | "double";

export type ChunkArray = Float32Array | Int16Array | Int8Array | Uint8Array | Uint16Array | Uint32Array;

/** 一个顶点属性：数组（跨帧同一个 TypedArray = 零拷贝，`dirty` 说改了哪段）+ 每单位几个分量 + 整数数组是否按归一化读（−1…1）。 */
export interface ChunkAttr { readonly array: ChunkArray; readonly size: number; readonly normalized?: boolean }

/** 这个版本相对上一个版本改了哪段（单位 = 顶点 / 线段实例）；grown = 数组换过（整份重传）。 */
export interface ChunkDirty { readonly grown: boolean; readonly ranges: readonly (readonly [number, number])[] }

/**
 * 一块几何 = 一个池（内容身份）在某个版本下的一份顶点数据，池本地坐标。
 * `version` 全局单调（提供者的计数器）：没变 = 后端不碰显卡。同一个池吐多块（纯色面 / 每种贴图材质一块 / 线）。
 */
export interface Chunk {
  /** 唯一键（池身份 + 组），跨帧稳定。 */
  readonly id: string;
  /** 池身份（提供者定义），放置用它对上块。 */
  readonly pool: string;
  readonly version: number;
  readonly kind: ChunkKind;
  /** 属性表（名字 → 数组）。tris 至少有 position / normal；lines 看 `instanced`。 */
  readonly attributes: Readonly<Record<string, ChunkAttr>>;
  /** 有效单位数（顶点，或 instanced 时的线段实例数）；数组容量可以更大。 */
  readonly count: number;
  /** 线段按实例画（每实例一段、6 个分量一组的 seg 数组）还是按顶点（每两个顶点一段）。过渡期 = 现状粗线 / 像素线两条路。 */
  readonly instanced?: boolean;
  readonly dirty: ChunkDirty;
  readonly material?: MaterialRef;
  readonly side?: ChunkSide;
}

/** 一次放置 = 某个池的一份实例：用哪个池 + 世界变换 + 稳定的槽键。同一个池摆了三份 = 三个 Placement，块只有一份。 */
export interface Placement {
  readonly pool: string;
  readonly xform: Xform12;
  /** 槽键：叠加层 / 拾取用它对回编辑器那边。 */
  readonly slot: string;
  /** 槽序号（编辑器的 PoolSlot.index；过渡期叠加层按它找节点）。 */
  readonly index: number;
  /** 过渡期的现状旗（刀 g 改名 tier）：活动池（深度偏移档）、单面身体（剔背面）。淡出 = 视图侧的标记（FrameInput.marks，刀 c），不在流里。 */
  readonly active: boolean;
  readonly singleSided: boolean;
}

/** 视锥带：近 / 远（米）。小学只有一带、全驻留；superlod 时是数组（月亮永远在最远那带）。 */
export interface FrustumBand { readonly near: number; readonly far: number }

/** 拉的预算：小学只记不裁（提供者如实报超了多少）。 */
export interface PullBudget { readonly maxChunks?: number; readonly maxBytes?: number }

export interface StreamQuery {
  readonly view: string;
  readonly eye?: Vec3;
  readonly bands: readonly FrustumBand[];
  readonly budget: PullBudget;
}

/** 一帧的拉取结果。`complete = false` = 半成品（后台作业还在跑）照画，不等（T12）。 */
export interface StreamFrame {
  readonly chunks: readonly Chunk[];
  readonly placements: readonly Placement[];
  readonly complete: boolean;
}

export interface StreamProvider {
  pull(q: StreamQuery): StreamFrame;
  /** 内容的缓存键（可选）：没变 = 引擎这一帧不重新拉。编辑器 = 世界身份 + 版本 + 淡出集；不给 = 每帧都拉（串流提供者的常态）。 */
  contentKey?(): string;
  /** 场景包围球（可选，世界坐标）：远平面 / 正交深度窗口 / 无限长线画多远按它定（提供者才知道内容有多大）。不给或 null = 空场景。 */
  bounds?(): { readonly c: Vec3; readonly r: number } | null;
}
