// document.ts —— CatsUp 文档的内存形状（契约 §5.3/5.4/5.6）：definitions（每个 = 根池 B-rep + 嵌套 group + 实例）+ 根 definition、
// 文档设置、桌面态（desk）、bake 模式、缩略图；未知 JSON 原样携带（round-trip 保真）。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21，group / component 纪元）：group = 自己的 B-rep 池 + 轴框 + 父 group；instance = definition 索引 + 3×4 变换 + 父 group。

import type { BrepSnapshot, Pt3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, WORLD_FRAME } from "../scene/xform.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
import { DEFAULT_LAYER_GUID, mintGuid, type Guid } from "./guid.ts";

export type BakeMode = "wysiwyg" | "engine";

export interface DocumentSettings {
  displayUnit: string;      // "m" | "cm" | "mm" | "ft-in"
  gridStep: number;         // 米
  snapIncrement: number;    // 米：吸附长度（3.4 起是主的；3.3 以前 = gridStep / gridSubdiv，写入时派生）
  /** 单位制（3.4，2026-10-30；可选键）：metric / imperial / dnd = 显示单位 + 网格进位 + 吸附档一起（editor/grid-settings.ts）。缺 = 按老键猜。 */
  unitSystem?: "metric" | "imperial" | "dnd";
  absoluteGrid: boolean;
  /** 网格面（0.13.14；可选键，缺省 xy）：yz / xz = 立面网格。 */
  gridPlane?: "xy" | "yz" | "xz";
  /** 3.4：网格和三色轴不画（栅格面「关」；缺 = 画）。只管画，吸附照旧归 absoluteGrid。 */
  gridHidden?: true;
  gridPreset?: "si" | "architectural" | "dnd";   // 栅格制式（0.13.33；缺 = 公制，或按格距猜英制）——可选键，不升版
  /** B43 尺度参考勾了哪几项（0.13.57 起多选；可选键，不升版）：没写 = 默认（室内 + 室外）、[] = 不显示、元素 = 物体尺寸梯子选单 id（认不出的原样带回）。 */
  scaleRefs?: string[];
  /** v0.13.52–56 单选时写的旧键（只读不写）："none" = 不显示、别的 = 一个选单 id。 */
  scaleRef?: string;
  gridSubdiv: number;       // 吸附细分（0.11 ⑤；user 2026-10-24「snap 比显示要细，1/5 还是 1/10 没想好」→ 5 默认、10 可选）
}

/** 带尺寸的图不许没尺寸、不许空（贴图导入、贴图表的「原图」都过它；契约 ai-docs/20261024-object-model-contract.md §3：**每张图必须带长度尺度**，user 2026-10-24）。 */
export const assertSizedImage = (img: { readonly mimeType?: string; readonly bytes: Uint8Array; readonly sizeM: readonly [number, number] }, what = "image"): void => { if (!(img.sizeM[0] > 0 && img.sizeM[1] > 0) || !Number.isFinite(img.sizeM[0]) || !Number.isFinite(img.sizeM[1])) throw new Error(`${what}: every image must carry a physical size (sizeM > 0)`); if (!(img.bytes instanceof Uint8Array) || !img.bytes.length) throw new Error(`${what}: empty image bytes`); };

// ---------- 贴图表（CATSUP_textures 1.0；2026-11-10 Claude Opus 5.5，贴图主线 1-0½，施工单 ai-docs/20261110-paint-workorders-2.md）----------
// 一张图 = 贴图表里的一行，有自己的 GUID；材质不装图，只用 channels 指它（通道名 → 一摞贴图 GUID）。以前（CATSUP_material ≤ 1.2）图嵌在材质里：读的时候搬进这张表（migrate/material.ts）。
/** 一段带二进制的 JSON（行里不认识的部分 / 不认识的 content）：json 里的 `{ bufferView: N }` 是读进来那份文件里的号，views 按这个号存着字节——
 *  自带字节，离开那份文件也完整（跨文件粘贴）；写盘时每个号换成新落的 bufferView（write.ts）。 */
export interface CarriedJson { readonly json: unknown; readonly views: ReadonlyMap<number, Uint8Array> }
/** 贴图的内容：原图 / 分层的画（ora 字节，这一层不解释，显示成灰色占位）/ 更新版写的种类（整段原样带回，显示成灰色占位）。 */
export type TextureContent =
  | { readonly kind: "image"; readonly mimeType: string; readonly bytes: Uint8Array }
  /** ora = null：新建的画、还没有编过码（编码靠画画内核、是异步的；第一次存盘时才有字节 = 1-8）。读文件读进来的永远有字节；写盘碰到 null = 抛（贴图主线 1-3b）。 */
  | { readonly kind: "layered"; readonly ora: Uint8Array | null }
  | { readonly kind: "other"; readonly raw: CarriedJson };
/** 贴图表的一行。表里的先后没有意思；条目不可变（改 = 换一个对象）。 */
export interface TextureDoc {
  readonly guid: Guid;
  readonly name: string;
  /** 这张图表示什么（开放的普通 JSON，原样带；这一版只写 { kind: "color" }）。 */
  readonly value: unknown;
  readonly content: TextureContent;
  /** 物理尺寸 米（两个数都 > 0）：原图 = 自由的图；分层的 = 平铺的画（1.2，tiledPaintIn）。和 layout 正好有一个。 */
  readonly sizeM?: readonly [number, number];
  /** 单品的画：{ definition, uvSet }（两个 GUID 字符串；形状不认识的原样带，当它不是画）。读它只经 paintIn。 */
  readonly layout?: unknown;
  /** 行里不认识的键（原样带回）。 */
  readonly extra?: CarriedJson;
  /**
   * 分层的画存盘时另存的合成图（CATSUP_textures 1.1，贴图主线 1-8b，统筹 11-11）：合成在材质的底色上、不透明、PNG；冷的画（没开画板）就显示它，不解开分层字节。
   * of = 照哪份分层字节做的（字节长度 + paintBytesSum）；base = 合成时的底色。和旁边的分层字节对不上、或者底色和材质现在的不一样 = 当它没有（compositeFits）。
   */
  readonly composite?: PaintComposite;
}
/** 画的合成图（见 TextureDoc.composite）。 */
export interface PaintComposite {
  readonly png: Uint8Array;
  readonly of: { readonly bytes: number; readonly sum: string };
  readonly base: readonly [number, number, number];
}
/** 分层字节的便宜校验和（FNV-1a 32 位，十六进制 8 位）：合成图的记号用，不防篡改，只防「对不上」。 */
export function paintBytesSum(b: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}
/** 合成图的底色和材质现在的颜色算不算一样（只吃颜色存进文件、读回来的浮点噪声；见 compositeFits）。 */
const BASE_EPS = 1e-6;
/** 这张合成图还算数吗：分层字节在、记号对得上、底色和 base 一样（差在 BASE_EPS 以内）。 */
export function compositeFits(t: TextureDoc, base: readonly number[]): boolean {
  const c = t.composite, ora = t.content.kind === "layered" ? t.content.ora : null;
  if (!c || !ora) return false;
  // 底色差在 BASE_EPS 以内算一样（2026-11-12 第 3 刀查出来的）：材质颜色存进文件要转成线性、读回来再转回去，1.0 回来是 0.9999999999999999——
  //   完全相等的话，凡是有一个通道是 1.0 的画每次打开都当「底色变了」、马上解开重合（冷的画不解开那条规矩就失效了）。
  //   BASE_EPS 只吃来回的噪声（实测：1.0 → 0.9999999999999999；0.04045 → 0.040449970408122，过了一遍 32 位浮点、1e-7 量级），比 8 位颜色的一档（1/255 ≈ 0.0039）小得多：真改过的底色照旧对不上。
  return c.of.bytes === ora.length && c.base.length === 3 && c.base.every((v, i) => Math.abs(v - (base[i] ?? NaN)) <= BASE_EPS) && c.of.sum === paintBytesSum(ora);
}
export const COLOR_VALUE: { readonly kind: "color" } = { kind: "color" };
/** 能直接贴到面上的图：原图 + 物理尺寸。 */
export type ColorMap = TextureDoc & { readonly content: { readonly kind: "image"; readonly mimeType: string; readonly bytes: Uint8Array }; readonly sizeM: readonly [number, number] };
export type Channels = Readonly<Record<string, readonly Guid[]>>;
/** 颜色那一槽的名字（这一版唯一会写的通道）。 */
export const COLOR_CHANNEL = "color";
/**
 * 「这个材质用哪张图」全仓唯一的问法（场景 Scene.colorMapOf、写盘烘焙、导出模型都经它）：颜色那一槽的第一张，而且它是带尺寸的原图；不是 = null（按底色画）。
 * table = GUID → 贴图（查表，不扫表：每张面都会问）。
 */
export function colorMapIn(table: ReadonlyMap<Guid, TextureDoc>, m: { readonly channels?: Channels }): ColorMap | null {
  const g = m.channels?.[COLOR_CHANNEL]?.[0];
  const t = g === undefined ? undefined : table.get(g);
  return t && t.content.kind === "image" && t.sizeM ? (t as ColorMap) : null;   // 两个键都有 / 都没有的行进不了场景（读文件拒开、Scene.addTexture 抛、写文件抛），这里不再问一遍（统筹 11-13 撤）
}
/** 画：颜色那一槽指着的那张分层的贴图，和它铺在哪个定义的哪一套贴图坐标上（两个 GUID）。 */
export interface PaintRef { /** 那张分层的贴图（贴图表里那一行；字段不叫 texture：守卫 textures-table 不许「点 texture」这种读法，免得和旧的「材质里装着图」混）。 */ readonly textureDoc: TextureDoc; readonly definition: Guid; readonly uvSet: Guid }
/**
 * 「这个材质是不是画」全仓唯一的问法（贴图主线 1-3b；紧挨着 colorMapIn，和 colorMapIn、tiledPaintIn 三个加在一起是问「颜色那一槽是什么」的全部入口）：颜色那一槽的第一张，内容是分层的，
 * 而且 layout 是 { definition, uvSet } 两个 GUID 字符串 → 那张图和两个 GUID；别的情况 = null。layout 形状不认识的照旧原样带，当它不是画。
 * src/ 里读贴图的 layout 只有这里（守卫 test/paint-start-guard.test.ts；读写文件的 texture-table.ts 只是原样搬运）。
 */
export function paintIn(table: ReadonlyMap<Guid, TextureDoc>, m: { readonly channels?: Channels }): PaintRef | null {
  const g = m.channels?.[COLOR_CHANNEL]?.[0];
  const t = g === undefined ? undefined : table.get(g);
  if (!t || t.content.kind !== "layered") return null;   // 两个键都有 / 都没有的行进不了场景（同 colorMapIn），这里不再问一遍
  const l = t.layout as { definition?: unknown; uvSet?: unknown } | null | undefined;
  if (!l || typeof l !== "object" || typeof l.definition !== "string" || typeof l.uvSet !== "string") return null;
  return { textureDoc: t, definition: l.definition, uvSet: l.uvSet };
}
/** 平铺的画：颜色那一槽指着的那张分层的贴图，和它在模型上多大（米）。 */
export interface TiledPaintRef { readonly textureDoc: TextureDoc; readonly sizeM: readonly [number, number] }
/**
 * 「这个材质是不是平铺的画」全仓唯一的问法（CATSUP_textures 1.2，施工单二十一第 3 刀；和 colorMapIn、paintIn 三个加在一起是问「颜色那一槽是什么」的全部入口，三个互斥）：
 * 颜色那一槽的第一张，内容是分层的、带 sizeM、没有 layout → 那张图和 sizeM；别的情况 = null。
 * 贴着它的面按 sizeM 平铺显示它的合成图（和自由的图同一种铺法）；只在画布小窗里画（一格对着模型上很多个地方，在模型上画没有意义）。
 * 1.1 的读者（v0.19.60 及以前）不认识这个组合：colorMapIn 要原图、paintIn 要 layout，两个都给 null = 按底色显示，行原样带回。
 */
export function tiledPaintIn(table: ReadonlyMap<Guid, TextureDoc>, m: { readonly channels?: Channels }): TiledPaintRef | null {
  const g = m.channels?.[COLOR_CHANNEL]?.[0];
  const t = g === undefined ? undefined : table.get(g);
  return t && isTiledRow(t) ? { textureDoc: t, sizeM: t.sizeM! } : null;
}
/**
 * 一行上 sizeM 和 layout 是不是正好一个（数据契约 sizeM 那一条；统筹审第 3 刀格式时定 B′）：不是 = 说是哪种（「两个都有」/「两个都没有」），是 = null。
 * 读文件的人拒这种行（整份文件打不开：这一版和 v0.19.60 及以前都一样），所以写的人一律不许写——场景入口（Scene.addTexture）和写文件（writeTextureRow）各拦一道。
 */
export function textureKeysProblem(t: { readonly sizeM?: unknown; readonly layout?: unknown }): "both sizeM and layout" | "neither sizeM nor layout" | null {
  const s = t.sizeM !== undefined, l = t.layout !== undefined;
  return s === l ? (s ? "both sizeM and layout" : "neither sizeM nor layout") : null;
}
/** 这一行是不是平铺的画（分层 + sizeM、没有 layout）：tiledPaintIn 和写盘按内容盖拍子（TEXTURES_STAMP_NO_TILED）共用这一个判断。 */
export const isTiledRow = (t: TextureDoc): boolean => t.content.kind === "layered" && !!t.sizeM && t.layout === undefined;
/** 材质（= glTF core material）：颜色 sRGB 0..1 + channels（通道名 → 一摞贴图 GUID；这一版只用 color、一摞只放一张；不认识的名字原样带）。 */
export interface MaterialDoc { /** 身份（CATSUP_material 1.2）；名字只是显示、可重名。 */ guid: Guid; name: string; color: [number, number, number]; channels?: Channels; /** CATSUP_material 里本版不认识的键（更新版写的），连同它们引用的字节原样带回（2026-11-10 起，Fable 审 1-0½）。 */ extra?: CarriedJson; }
/** 层（Unity render layer 的管理用法；契约 §4）：文档级表，id 0 = 默认层永远存在；只管可见性，纯管理。 */
export interface LayerDoc { id: number; /** 身份（document 3.5）；`id` 是这张表的代号（实例上存的小整数），跨文件靠 guid 对。 */ guid: Guid; name: string; visible: boolean; color?: [number, number, number]; }
export const DEFAULT_LAYER: LayerDoc = { id: 0, guid: DEFAULT_LAYER_GUID, name: "默认", visible: true };
export const defaultLayers = (): LayerDoc[] => [{ ...DEFAULT_LAYER }];
/** 网格身体载荷（CATSUP_mesh 1.0.0，2026-10-27 M3）：多边形面是真相（三角形只是 bake 的派生物）。positions f64 xyz（米，定义坐标；顶点下标空间）；faceStart / faceLen / loopVert = 每面的顶点环；faceMat −1 = 默认槽；
 *  faceFlags bit0 = 隐藏；edgePairs（成对）+ edgeFlags 只列带标记的边（软 1 / 平滑 2 / 接缝 4 / 隐藏 8 / 裸线 16）。0.14 的三角汤最小形读时迁成这个形（migrate/mesh.ts）。 */
/** 一套贴图坐标（CATSUP_mesh 2.0；贴图主线 1-2½，契约 ai-docs/20261110-painting-data-contract.md 第五节）。loopUv = 每个角一对 32 位浮点（单位 = 格，画布左上角是原点），和 loopVert 同序、长度 = 2 × loopVert.length；这一套不管的面，它的角写 NaN（明着的「没有」）。 */
export interface UvSetDoc { guid: Guid; name: string; width: number; height: number; pxPerM: number; loopUv: Float32Array;
  /** 开的时候定住的是什么（CATSUP_mesh 2.1；施工单十六第四节，user 11-11「如果是指定贴图大小的话，后面自动涨也不好」）：density = 按一格多大开的（加面放不下时画布照规矩长大）；
   *  缺 = size = 按总大小开的（画布不自己变大，加面只在现有宽高里找地方）。只写 density；读到别的值 = 当 size。 */
  fit?: "density" }
/** 一套贴图坐标除了角上的数之外的那几样（内存里 MeshBody.uvSets 的一行就是这个形状）。 */
export type UvSetMeta = Omit<UvSetDoc, "loopUv">;
/** 角上的数算「在画布里」的容差（读文件的收口和内存里的自检 scene/paint.ts paintIssues 用同一个数：读进来的一定过自检）。 */
export const UV_CANVAS_EPS = 1e-6;
export interface MeshDoc { positions: Float64Array; faceStart: Int32Array; faceLen: Int32Array; loopVert: Int32Array; faceMat: Int32Array; faceFlags: Uint8Array; edgePairs: Int32Array; edgeFlags: Uint8Array;  /** 明暗方式（CATSUP_mesh 1.1，2026-10-28 FM129）：缺 = 老文件 = flat（只看手标，和以前逐字一样）。 */ smoothDefault?: { mode: "angle" | "smooth" | "hard"; deg: number }; /** 对称（CATSUP_mesh 1.2，2026-10-28 UX 账本 FM134 / 镜像重做第二刀）：网格体的属性——镜像编辑 / 强行对称 + 镜像面（定义坐标 axis = 0 平面）；缺 = 关。编辑方式那一层，不进撤销。 */ mirror?: { mode: "edit" | "force"; axis: 0 | 1 | 2 }; /** 贴图坐标（CATSUP_mesh 2.0，1-2½）：有 = 这个网格体盖 2.0；缺 / 空 = 照旧盖 1.2（字节和以前一样）。列表顺序没有语义。 */ uvSets?: UvSetDoc[]; }
/** 参考几何（0.11 尺规纪元；definitions v4）：池本地坐标，id 线 / 点同一空间。 */
export interface GuidesDoc { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[]; /** 参考圆（definitions 6.3，圆规；缺 = 没有）。 */ circles?: { id: number; c: Pt3; n: Pt3; r: number }[]; /** 参考球（definitions 6.3，球规；缺 = 没有）。 */ spheres?: { id: number; c: Pt3; r: number }[] }
export const emptyGuidesDoc = (): GuidesDoc => ({ lines: [], points: [] });
export interface GroupDoc { guid: Guid; parent: Guid | null; axes: Frame; brep: BrepSnapshot; name?: string; guides: GuidesDoc; }   // 组不是物体（user 10-24）：无锁、无层；旧文件的 locked 读时丢弃（definitions v5）
export interface InstanceDoc { guid: Guid; /** 摆的是哪个定义（定义的 GUID）。 */ definition: Guid; parent: Guid | null; xform: Xform; name?: string; /** 锁定（A27）；只在 true 时写。 */ locked?: boolean; /** 层（契约 §4；缺 = 继承父上下文的有效层）。 */ layer?: number; /** 隐藏（DT49；definitions 6.1 起；只在 true 时写；glTF 节点同时带 KHR_node_visibility）。 */ hidden?: boolean; }
export interface DefinitionDoc { guid: Guid; name: string; /** 物体种类（0.13 门 1）；缺省 brep；文件里只在非 brep 时写。 */ kind?: BodyKind; /** kind = mesh 时的载荷（definitions v5）。 */ mesh?: MeshDoc; brep: BrepSnapshot; groups: GroupDoc[]; instances: InstanceDoc[]; /** 对照表：槽号 → 材质 GUID（面上存的小编号是它的代号）；null = 这一槽没有对应的材质（占位不压缩：面上的代号指着位置）。 */ materialSlots: (Guid | null)[]; guides: GuidesDoc; /** 进这个组件画图用的坐标架（definitions 6.2，DT86；定义坐标；缺 = 跟组件原点）。 */ drawFrame?: Frame; extras?: Record<string, unknown>; }

export interface CatsupDocument {
  settings: DocumentSettings;
  /** 绘图轴（0.11；document v2）：根上下文的推断原点与三轴，世界坐标；默认世界帧。 */
  axes: Frame;
  /** 层表（0.14；document v3）：缺 = 只有默认层。 */
  layers: LayerDoc[];
  /** 老定稿记录（v0.12.8–v0.16.52 的版本章，ai-docs/20261024-finalize.md）：**2026-10-29 起不再起作用**（定稿 → 演示锁，住 desk.locked）；老文件里有的照读照写、一字不动。可选键，不升版本。 */
  final?: { at: string; rev: number; app: string; fingerprint: string };
  /** 定稿过几次（改稿不减）。 */
  finalRev?: number;
  /** 桌面态（`CATSUP_desk`，2026-10-25）= WeebPaint `.weebpaint/editor-state.json` 在 glb 里的镜像：跟文件走、不是内容（定稿指纹不含）、不标脏、新建必 reset。 */
  desk: DeskDoc;
  /** 参考窗牌组（`CATSUP_references`，2026-10-25；契约 §5.8）：空 files = 没有（不写扩展）。 */
  references: ReferencesDoc;
  bakeMode: BakeMode;
  /** 全部 definition；root = definitions[rootIndex]（同一对象）。文件里 root 写 GUID；rootIndex 只是内存里的方便，列表顺序没有语义。 */
  definitions: DefinitionDoc[];
  rootIndex: number;
  root: DefinitionDoc;
  /** 文档材质表（glTF materials）。列表顺序没有语义；引用按 GUID。 */
  materials: MaterialDoc[];
  /** 贴图表（`CATSUP_textures` 1.0，2026-11-10）：空 = 不写这个扩展。列表顺序没有语义；材质按 GUID 指它。 */
  textures: TextureDoc[];
  /** 素材架（`CATSUP_shelf` 1.0，2026-11-04；计划书 §2.8）：缺 = 没有架子。架子上一格 = 引用，放的是 GUID。 */
  shelf?: ShelfDoc;
  thumbnail?: { mimeType: string; bytes: Uint8Array };
  /** round-trip 保真：读到的未知顶层键 / 未知扩展 / extras 原样带回；其中任何 `{ bufferView: N }` 引用的二进制也随 `views` 携带。 */
  carry: { topLevel: Record<string, unknown>; extensions: Record<string, unknown>; documentExtra: Record<string, unknown>; definitionsExtra: Record<string, unknown>; brepKeep?: Record<string, unknown>; /** CATSUP_textures 扩展层面不认识的键（行里的不在这里，跟着行走）。 */ texturesExtra?: Record<string, unknown>; views: Map<number, Uint8Array> };
  /** 读取时攒的拍子判决（不持久化；newDocument 没有）：哪些子结构比本版新一个 minor（宿主提示一次）、desk 是否太新。 */
  readNotes?: FormatReadNotes;
}

/** 桌面态子结构 `CATSUP_desk`（契约 §5.7；user 2026-10-25「不是应该跟文件吗，看一下weebpaint…」→ WeebPaint desk 同款，user 2026-08-27「editor 里的=per doc」）：
 *  menuTabs = 两个 ☰ 停在哪页 { main?: tab id, view?: tab id }（认不出的 tab 原样带回、打开时落回第一页）；lastView = 相机（原 CATSUP_document.lastView，
 *  契约 §7.2「保留读、停止写」搬来；本版 app 仍没写它）；extra = 本版不认识的顶层键（直通）。desk 的 major 比本版新 → 不拒开：原字节带回，这里是默认值。 */
export interface DeskDoc { menuTabs: Record<string, string>; lastView?: unknown; /** 参考窗开着没有 + 在哪（desk 1.1；开过窗才有）。 */ refPanel?: RefPanelDoc;
  /** 演示锁（desk 1.2，2026-10-29，v0.16.53；user 10-28「锁屏不是 commit」「还可以进去玩」）：true = 这份文件打开就是锁着的（改模型的一切都拒，看 / 玩照旧）。只写 true；不是内容、不标脏、不进撤销。 */
  locked?: boolean;
  /** 风格 / 屏幕跟文件走（desk 1.3，2026-10-29 Opus；Tron 账本 T86 user「风格跟着文件走」）：选过才写；本层不认识预设 id（不透明字符串，app 认不出 = 用默认）。 */
  style?: string; screen?: string;
  /** 导出表单上次的选择（desk 1.4，2026-11-04；user「导出的时候永远有个框……我建议文件workbench而不是workpiece记住」）：导出过才写；本层不解释键，app 认不出的键当默认。 */
  exportModel?: Record<string, string>;
  /** 画画工作台的笔（desk 1.5，2026-11-11；user「笔的设置记在哪 学weebpaint」= 跟文件走，设备上不记；1.6 起按笔记）：改过才写。见 PaintDeskDoc。 */
  paint?: PaintDeskDoc;
  extra: Record<string, unknown>; }
export const defaultDesk = (): DeskDoc => ({ menuTabs: {}, extra: {} });

/**
 * 画画工作台的笔（desk 1.5 起；1.6 = 2026-11-12 施工单二十 1b，笔的模型 ai-docs/20261111-brush-model.md 第五节）：
 *   { color?: "#rrggbb", brushes?: { <笔的 id>: { size?, opacity?, hardness? } }, active?: { <tool 的取值>: <笔的 id> } }。字段名照画画软件的 dial（size / opacity）。
 * - 笔的 id、tool 的取值本层都不解释（不透明字符串）：本版没有的笔、每支笔里不认识的键、paint 里不认识的键都原样带回（各自的 extra）。
 *   active 指着本版没有的笔 = app 用这种 tool 默认的那支，这里原样带回。
 * - 1.5 的 tools（{ <工具名>: { size?, opacity?, hardness? } }）保留读、停止写：paintPen 读成普通笔（pen）的旋钮、paintEraser 读成橡皮（eraser）的（LEGACY_PAINT_TOOLS）。
 *   只有 1.5 及更早的版本会写 tools，所以它在 = 这份文件最后是那种版本存的，它比 brushes 里同一支笔的新，以它为准——只盖它带着的那几个数，
 *   这支笔在 brushes 里原有的不认识的键留着（以后的版本给旋钮加了键 → 被 1.5 打开改了大小再存 → 回到新版本，那个键还在；统筹 11-12）。
 *   tools 里不认识的工具名原样带回（写回去的 tools 只剩它们）；tools 本身不是对象 = 原样带回。
 * - brushes / active 本身不是对象（数组、字符串……）：原样放进 extra 带回；这时候没有认识的条目，写回去的就是它。有认识的条目时以认识的为准。paint 本身不是对象 = 当没有。
 * - size 的含义和单位由笔自己定；这一版的几支笔 = 直径，屏幕上的 CSS 像素（user 11-10「笔的大小应该是屏幕大小，因为这个是你的语义」；不换国际单位）。
 *   以后按格的笔的 size 会是画布上的格数——这一层不替笔定单位。opacity = 浓度（0..1）；hardness = 笔尖边缘（0..1）。
 * - color 原样存（不在这一层规整大小写；app 比的时候不分大小写）。这一层收任何有限的数；夹到能用的范围是 app 套上的时候做的。
 * - 类型不对的已知键不当成值，原样放进 extra 带回（不悄悄改别人写的字节）。
 */
export interface PaintDeskDoc { color?: string; brushes: Record<string, PaintKnobsDesk>; active: Record<string, string>; extra: Record<string, unknown> }
/** 一支笔的旋钮。 */
export interface PaintKnobsDesk { size?: number; opacity?: number; hardness?: number; extra: Record<string, unknown> }
/** desk 1.5 的 tools 里的工具名 → 笔的 id（只读：1.6 起不写 tools）。 */
export const LEGACY_PAINT_TOOLS: Readonly<Record<string, string>> = { paintPen: "pen", paintEraser: "eraser" };
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const knobsOf = (t: Record<string, unknown>): PaintKnobsDesk => {
  const k: PaintKnobsDesk = { extra: {} };
  for (const [tk, tv] of Object.entries(t)) {
    if ((tk === "size" || tk === "opacity" || tk === "hardness") && finite(tv)) k[tk] = tv;
    else k.extra[tk] = tv;
  }
  return k;
};
const knobsJson = (k: PaintKnobsDesk): Record<string, unknown> => ({ ...k.extra, ...(k.size !== undefined ? { size: k.size } : {}), ...(k.opacity !== undefined ? { opacity: k.opacity } : {}), ...(k.hardness !== undefined ? { hardness: k.hardness } : {}) });
/** 文件里的 paint → PaintDeskDoc；不是对象 = 没有。 */
export function paintDeskOf(raw: unknown): PaintDeskDoc | undefined {
  if (!isRecord(raw)) return undefined;
  const out: PaintDeskDoc = { brushes: {}, active: {}, extra: {} };
  const carry = (key: string, name: string, v: unknown): void => { const c = (out.extra[key] ??= {}) as Record<string, unknown>; c[name] = v; };
  let legacy: unknown;
  for (const [k, v] of Object.entries(raw)) {
    if (k === "color" && typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) out.color = v;
    else if (k === "brushes" && isRecord(v)) { for (const [id, t] of Object.entries(v)) { if (isRecord(t)) out.brushes[id] = knobsOf(t); else carry("brushes", id, t); } }   // 一支笔的值不是对象：原样带回
    else if (k === "active" && isRecord(v)) { for (const [tool, id] of Object.entries(v)) { if (typeof id === "string") out.active[tool] = id; else carry("active", tool, id); } }
    else if (k === "tools" && isRecord(v)) legacy = v;   // 1.5：brushes 读完再套（它以 tools 为准）
    else out.extra[k] = v;
  }
  if (isRecord(legacy)) for (const [name, t] of Object.entries(legacy)) {
    const id = LEGACY_PAINT_TOOLS[name];
    if (id !== undefined && isRecord(t)) {   // 1.5 的工具 → 那支笔的旋钮（比 brushes 新）：只盖 tools 里有的那几个认识的数，这支笔在 brushes 里原有的不认识的键留着
      const k = knobsOf(t), b = out.brushes[id];
      if (!b) { out.brushes[id] = k; continue; }
      for (const n of ["size", "opacity", "hardness"] as const) if (k[n] !== undefined) b[n] = k[n];
      Object.assign(b.extra, k.extra);
    }
    else carry("tools", name, t);   // 不认识的工具名 / 值不是对象：原样带回
  }
  return out;
}
/** 带回的（extra 里）+ 认识的 → 写进文件的那个键；带回的不是对象、又没有认识的 = 原样；什么都没有 = 不写（undefined）。 */
const mergeOut = <T>(carried: unknown, known: Record<string, T>, toJson: (t: T) => unknown): unknown => {
  if (carried !== undefined && !isRecord(carried) && !Object.keys(known).length) return carried;
  const o: Record<string, unknown> = { ...(isRecord(carried) ? carried : {}) };
  for (const [k, v] of Object.entries(known)) o[k] = toJson(v);
  return Object.keys(o).length ? o : undefined;
};
/** PaintDeskDoc → 写进文件的样子（extra 先铺、已知键后铺；brushes / active 没有东西 = 不写；tools 只剩带回的那些——1.6 起不写认识的工具）。 */
export function paintDeskToJson(p: PaintDeskDoc): Record<string, unknown> {
  const { tools, brushes: xb, active: xa, ...rest } = p.extra;
  const brushes = mergeOut(xb, p.brushes, knobsJson), active = mergeOut(xa, p.active, (id) => id);
  return { ...rest, ...(p.color !== undefined ? { color: p.color } : {}), ...(brushes !== undefined ? { brushes } : {}), ...(active !== undefined ? { active } : {}), ...(tools !== undefined && (!isRecord(tools) || Object.keys(tools).length) ? { tools } : {}) };
}
/** 参考窗的窗（视图态，CSS px）：WeebPaint / MoonSinger 同形 { open, left, top, width, height }。 */
export interface RefPanelDoc { open: boolean; left: number; top: number; width: number; height: number; }
/** 文件里的 refPanel → 五个字段都对才收；坏形状 = 没有（落回「没开过」）。 */
export function refPanelOf(p: unknown): RefPanelDoc | undefined {
  if (!p || typeof p !== "object" || Array.isArray(p)) return undefined;
  const o = p as Record<string, unknown>;
  const n = (k: string): number | null => (typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : null);
  const left = n("left"), top = n("top"), width = n("width"), height = n("height");
  if (left === null || top === null || width === null || height === null || typeof o.open !== "boolean") return undefined;
  return { open: o.open, left, top, width, height };
}

/** 参考窗牌组（`CATSUP_references`，契约 §5.8）= @internal/reference-window 的目录 `.catsup/references/`（manifest.json + 每张卡的字节）原样搬进 glb：
 *  一个文件 = 一条 { path, mimeType, bytes }。**format 层不懂清单**（清单的形状 / 拍子 / 迁移归库；ORA 成员文件 ≡ 这里的一条）。extra = 本版不认识的顶层键（直通）。 */
export interface ReferencesDoc { files: RefFileDoc[]; extra: Record<string, unknown>; }
export interface RefFileDoc { path: string; mimeType: string; bytes: Uint8Array; }
export const emptyReferences = (): ReferencesDoc => ({ files: [], extra: {} });
/** 文件里的 menuTabs → 只收字符串值；坏形状 = 空。 */
export function menuTabsOf(m: unknown): Record<string, string> {
  if (!m || typeof m !== "object" || Array.isArray(m)) return {};
  return Object.fromEntries(Object.entries(m as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"));
}

/** 素材架。folders / items 顺序：items 有意义（user 摆的）。未知键直通（`extra` 是这一层的；条目自己的未知键跟着条目走）。 */
export interface ShelfFolder { guid: Guid; name: string; parent: Guid | null; [key: string]: unknown; }
/** kind 是开放集：本版只懂 definition / material，别的（更新的版本写的）照原样带回、不检查引用。 */
export interface ShelfItem { guid: Guid; kind: string; ref: Guid; folder: Guid | null; [key: string]: unknown; }
export interface ShelfDoc { folders: ShelfFolder[]; items: ShelfItem[]; extra: Record<string, unknown>; }
export const emptyShelf = (): ShelfDoc => ({ folders: [], items: [], extra: {} });
export const shelfIsEmpty = (s: ShelfDoc): boolean => !s.folders.length && !s.items.length && !Object.keys(s.extra).length;

export const DEFAULT_SETTINGS: DocumentSettings = { displayUnit: "m", gridStep: 1, snapIncrement: 0.2, absoluteGrid: false, gridSubdiv: 5 };

export function newDocument(brep: BrepSnapshot, name = "model"): CatsupDocument {
  const root: DefinitionDoc = { guid: mintGuid(), name, brep, groups: [], instances: [], materialSlots: [], guides: emptyGuidesDoc() };
  return {
    settings: { ...DEFAULT_SETTINGS },
    axes: { origin: { ...WORLD_FRAME.origin }, x: { ...WORLD_FRAME.x }, y: { ...WORLD_FRAME.y }, z: { ...WORLD_FRAME.z } },
    layers: defaultLayers(),
    desk: defaultDesk(),
    references: emptyReferences(),
    bakeMode: "wysiwyg",
    definitions: [root],
    rootIndex: 0,
    root,
    materials: [],
    textures: [],
    carry: { topLevel: {}, extensions: {}, documentExtra: {}, definitionsExtra: {}, views: new Map() },
  };
}
