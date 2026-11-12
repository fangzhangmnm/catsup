// minccino/contract/stream.ts —— 输入契约：**引擎拉、提供者吐**的一条流（骨架稿 v2 不变量 2：输入不是场景树，是按视锥带 + 预算吐出来的
// 带版本号的块；编辑器 = 「恰好全在手」的提供者，串流 / 过程生成以后是另一个实现）。created 2026-10-29 by Claude Fable 5.1
// 小学只用到：一带、预算只记不裁、complete 永远 true。留口（只留形状、不实现）：多带（superlod）、预算裁块、半成品池（T12）、笔画原语（T31）、惰性池（T30）。
// 步 3（v0.17.3）：块的形状按现状 render3「每池一份几何 + 每槽一个矩阵 + 只传改过的段」钉——属性表直接包提供者的大数组（零拷贝），
// `dirty` 说这次改了哪段；属性名过渡期沿用现状 shader 的名字（aColor / aColorB = 两侧的材质色，8 位 sRGB；选中 / 淡出不再烤顶点色——那是标记，刀 b / c）。
import type { Vec3, Xform12 } from "./geometry.ts";

/** 块的原语种类。开放集：以后加「笔画」（折线 + 每点宽度 / 压力，屏幕恒宽）= 多一个值，不改别的。 */
export type ChunkKind = "tris" | "lines" | "points";

/** 一张图（原图字节 + 物理尺寸 米）：引擎拿**这个对象**当解码缓存键——两个材质用同一张图 = 同一个对象 = 只解一次（2026-11-10 贴图主线 1-0½）。 */
export interface TextureRef {
  readonly mimeType: string; readonly bytes: Uint8Array; readonly sizeM: readonly number[];
  /**
   * 这张图是画的合成图（贴图主线 1-8b，统筹 11-11）：缺 = 普通贴图（平铺、跟画风换过滤、按导入的习惯上下翻）；有 = 和活的图同一种取样
   * （夹边、放大最近邻、缩小三线性、有缩小图、不跟画风换过滤；第 0 行 = 画布第 0 行，不翻），冷的画显示的就是它、和热起来之后显示的逐像素相同。
   * base = 这个材质的底色（sRGB 0..1）：图还在解的那几帧，占位用它（不用导入贴图那个灰色占位：打开文件时画过的面不许先闪一下灰）。
   */
  readonly paint?: { readonly base: readonly number[]; /** 平铺的画（施工单二十一第 3 刀）：显示图重复平铺、过滤跟画风（和自由的图一样）；缺 = 夹边、过滤固定。 */ readonly tile?: boolean };
}
/**
 * 一张活的图（贴图主线 1-3c）：别人（画画内核）已经放在同一个显卡画面里的图。渲染器每帧开画之前问一遍 `current()`（要重新合成的在这时候合成），
 * 问完统一作废一次自己的显卡状态缓存；`version` 变了就把 `gpuImage`（那张图的显卡句柄）拷进渲染器自己的专用显示图（带多级缩小图、放大最近邻、夹边）。
 * 那张图归别人：不许改采样设置、不许长期拿着。宽高 = 现在的实际大小（会变）。null = 现在没有（画面丢了）。和 TextureRef 一样按对象当缓存键。
 */
export interface LiveImage {
  readonly kind: "live"; readonly width: number; readonly height: number;
  /** 平铺的画（施工单二十一第 3 刀）：显示图重复平铺、过滤跟画风（和自由的图一样）；缺 = 夹边、放大最近邻 / 缩小三线性。同一张图一辈子不变（建的时候就定）。 */
  readonly tile?: boolean;
  current(): { readonly gpuImage: unknown; readonly version: number } | null;
  /**
   * 从版本 since 到现在变了哪些格（说不清 = "all"）。不给这个口 = 每次整张（1-4d 第 6 条：渲染器的显示图只拷变了的那些格、缩小图逐级只重做受影响的那些格）。
   * 给的人自己负责说真话：只在确切知道「别的地方一个像素都没变」时给格子（画画这边由变化史回答，见 paint/board.ts changedSince）。
   */
  changedSince?(since: number): ChangedCells | "all";
  /**
   * 渲染器手里没有这张的拷贝（第一次、显卡画面丢过、回收过、换了缩小图做法）而 current() 是空的：叫一声，给的人下一帧交一版（施工单十九第 3 刀）。
   * 画画这边睡着的画板 current() 是空的（合成目标随睡还池），渲染器接着显示自己那份拷贝；手里没有拷贝才叫它。不给这个口 = 不叫。
   */
  want?(): void;
}
/**
 * 一张图上变了的那些格（画画这边 = 内核的脏格子位图 DirtyCells，结构上满足；引擎不 import 它）：runs = 每行连着的脏格并成的段，两两不相交；
 * half = 下一级缩小图（宽高各减半）上的同一回事（2×2 格或起来，不会漏）。
 */
export interface ChangedCells {
  readonly w: number; readonly h: number;
  readonly empty: boolean;
  runs(): readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[];
  half(): ChangedCells;
}
/**
 * 对材质模块的引用：提供者从场景的材质 + 「这个材质用哪张图」那个口拼出来、按对象记住（同一个材质每次给同一个对象）；引擎拿它当着色器缓存键、拿 map 当解码缓存键。
 * 渲染器不认识场景（不知道贴图表、GUID）。颜色过渡期还由提供者烤进顶点色（提供者自己按调色板算，不再问后端）；材质模块落地后换成槽表（material/）。
 */
export interface MaterialRef {
  readonly color: readonly number[];
  /** 原图（要解码的字节）或活的图（画；1-3c）。 */
  readonly map?: TextureRef | LiveImage;
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
  /** 深度优先级档：1 = 共面时赢（提交方正在改的那一层；引擎只认识「谁赢」这个数，不认识「活动池」）；0 = 普通。 */
  readonly tier: 0 | 1;
  /** 单面身体（剔背面）。淡出 / 选中 = 视图侧的标记（FrameInput.marks），不在流里。 */
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
  /**
   * 内容此刻还持有的图和材质引用（可选；施工单十九第 1 刀：缓存的命跟着内容里的条目）。可见不可见都算（藏起来的再露出来不用重解）。
   * 引擎的解码缓存、贴图材质、风格材质只留这里面的，别的放掉（撤销掉的图、换掉的文件；以后要用再建——都是能重算的东西）。不给 = 引擎不按内容回收。
   */
  retained?(): { readonly images: ReadonlySet<object>; readonly materials: ReadonlySet<object> };
}
