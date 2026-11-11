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
  /** 自由的图：物理尺寸 米（两个数都 > 0）。和 layout 正好有一个。 */
  readonly sizeM?: readonly [number, number];
  /** 单品的画：{ definition, uvSet }（两个 GUID 字符串；形状不认识的原样带，当它不是画）。读它只经 paintIn。 */
  readonly layout?: unknown;
  /** 行里不认识的键（原样带回）。 */
  readonly extra?: CarriedJson;
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
  return t && t.content.kind === "image" && t.sizeM ? (t as ColorMap) : null;
}
/** 画：颜色那一槽指着的那张分层的贴图，和它铺在哪个定义的哪一套贴图坐标上（两个 GUID）。 */
export interface PaintRef { /** 那张分层的贴图（贴图表里那一行；字段不叫 texture：守卫 textures-table 不许「点 texture」这种读法，免得和旧的「材质里装着图」混）。 */ readonly textureDoc: TextureDoc; readonly definition: Guid; readonly uvSet: Guid }
/**
 * 「这个材质是不是画」全仓唯一的问法（贴图主线 1-3b；紧挨着 colorMapIn，两个加在一起是问「颜色那一槽是什么」的全部入口）：颜色那一槽的第一张，内容是分层的，
 * 而且 layout 是 { definition, uvSet } 两个 GUID 字符串 → 那张图和两个 GUID；别的情况 = null。layout 形状不认识的照旧原样带，当它不是画。
 * src/ 里读贴图的 layout 只有这里（守卫 test/paint-start-guard.test.ts；读写文件的 texture-table.ts 只是原样搬运）。
 */
export function paintIn(table: ReadonlyMap<Guid, TextureDoc>, m: { readonly channels?: Channels }): PaintRef | null {
  const g = m.channels?.[COLOR_CHANNEL]?.[0];
  const t = g === undefined ? undefined : table.get(g);
  if (!t || t.content.kind !== "layered") return null;
  const l = t.layout as { definition?: unknown; uvSet?: unknown } | null | undefined;
  if (!l || typeof l !== "object" || typeof l.definition !== "string" || typeof l.uvSet !== "string") return null;
  return { textureDoc: t, definition: l.definition, uvSet: l.uvSet };
}
/** 材质（= glTF core material）：颜色 sRGB 0..1 + channels（通道名 → 一摞贴图 GUID；这一版只用 color、一摞只放一张；不认识的名字原样带）。 */
export interface MaterialDoc { /** 身份（CATSUP_material 1.2）；名字只是显示、可重名。 */ guid: Guid; name: string; color: [number, number, number]; channels?: Channels; /** CATSUP_material 里本版不认识的键（更新版写的），连同它们引用的字节原样带回（2026-11-10 起，Fable 审 1-0½）。 */ extra?: CarriedJson; }
/** 层（Unity render layer 的管理用法；契约 §4）：文档级表，id 0 = 默认层永远存在；只管可见性，纯管理。 */
export interface LayerDoc { id: number; /** 身份（document 3.5）；`id` 是这张表的代号（实例上存的小整数），跨文件靠 guid 对。 */ guid: Guid; name: string; visible: boolean; color?: [number, number, number]; }
export const DEFAULT_LAYER: LayerDoc = { id: 0, guid: DEFAULT_LAYER_GUID, name: "默认", visible: true };
export const defaultLayers = (): LayerDoc[] => [{ ...DEFAULT_LAYER }];
/** 网格身体载荷（CATSUP_mesh 1.0.0，2026-10-27 M3）：多边形面是真相（三角形只是 bake 的派生物）。positions f64 xyz（米，定义坐标；顶点下标空间）；faceStart / faceLen / loopVert = 每面的顶点环；faceMat −1 = 默认槽；
 *  faceFlags bit0 = 隐藏；edgePairs（成对）+ edgeFlags 只列带标记的边（软 1 / 平滑 2 / 接缝 4 / 隐藏 8 / 裸线 16）。0.14 的三角汤最小形读时迁成这个形（migrate/mesh.ts）。 */
/** 一套贴图坐标（CATSUP_mesh 2.0；贴图主线 1-2½，契约 ai-docs/20261110-painting-data-contract.md 第五节）。loopUv = 每个角一对 32 位浮点（单位 = 格，画布左上角是原点），和 loopVert 同序、长度 = 2 × loopVert.length；这一套不管的面，它的角写 NaN（明着的「没有」）。 */
export interface UvSetDoc { guid: Guid; name: string; width: number; height: number; pxPerM: number; loopUv: Float32Array }
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
  extra: Record<string, unknown>; }
export const defaultDesk = (): DeskDoc => ({ menuTabs: {}, extra: {} });
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
