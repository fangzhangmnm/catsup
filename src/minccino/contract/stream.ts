// minccino/contract/stream.ts —— 输入契约：**引擎拉、提供者吐**的一条流（骨架稿 v2 不变量 2：输入不是场景树，是按视锥带 + 预算吐出来的
// 带版本号的块；编辑器 = 「恰好全在手」的提供者，串流 / 过程生成以后是另一个实现）。created 2026-10-29 by Claude Fable 5.1
// 小学只用到：一带、预算只记不裁、complete 永远 true。留口（只留形状、不实现）：多带（superlod）、预算裁块、半成品池（T12）、笔画原语（T31）、惰性池（T30）。
import type { Vec3, Xform12 } from "./geometry.ts";

/** 块的原语种类。开放集：以后加「笔画」（折线 + 每点宽度 / 压力，屏幕恒宽）= 多一个值，不改别的。 */
export type ChunkKind = "tris" | "lines" | "points";

/** 对材质模块的引用：小学 = 文档里那个材质对象本身（不透明，引擎只拿它当缓存键和翻译入口）。 */
export type MaterialRef = object;

/**
 * 一块几何 = 一个池（内容身份）在某个版本下的一份顶点数据，池本地坐标。
 * `version` 没变 = 引擎不重传（提供者按 Kernel.rev / mesh rev 填）。同一个池可以吐多块（按原语种类 / 材质分）。
 */
export interface Chunk {
  /** 唯一键（池键 + 种类 + 材质分组），跨帧稳定。 */
  readonly id: string;
  /** 池键（内容身份），用来把块和放置对上。 */
  readonly pool: string;
  readonly version: number;
  readonly kind: ChunkKind;
  /** xyz 交错，池本地坐标。 */
  readonly positions: Float32Array;
  readonly indices?: Uint32Array | Uint16Array;
  readonly normals?: Float32Array | Int16Array;
  /** 每顶点颜色（现状 render3 把材质色 / 选中 / 悬停都烤在这里；叠加层搬出去（步 6）后只剩材质色）。 */
  readonly colors?: Float32Array | Int8Array;
  readonly uvs?: Float32Array;
  readonly material?: MaterialRef;
  readonly side?: "front" | "back" | "double";
}

/** 一次放置 = 某个池的一份实例：用哪个池 + 世界变换。同一个池摆了三份 = 三个 Placement，块只有一份。 */
export interface Placement {
  readonly pool: string;
  readonly xform: Xform12;
  /** 稳定的放置键（槽键）：叠加层 / 拾取用它对回编辑器那边。 */
  readonly slot: string;
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
}
