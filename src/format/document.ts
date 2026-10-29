// document.ts —— CatsUp 文档的内存形状（契约 §5.3/5.4/5.6）：definitions（每个 = 根池 B-rep + 嵌套 group + 实例）+ 根 definition、
// 文档设置、桌面态（desk）、bake 模式、缩略图；未知 JSON 原样携带（round-trip 保真）。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21，group / component 纪元）：group = 自己的 B-rep 池 + 轴框 + 父 group；instance = definition 索引 + 3×4 变换 + 父 group。

import type { BrepSnapshot, Pt3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, WORLD_FRAME } from "../scene/xform.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import type { FormatReadNotes } from "./migrate/index.ts";

export type BakeMode = "wysiwyg" | "engine";

export interface DocumentSettings {
  displayUnit: string;      // "m" | "cm" | "mm" | "ft-in"
  gridStep: number;         // 米
  snapIncrement: number;    // 米（= gridStep / gridSubdiv，写入时派生；契约里保留）
  absoluteGrid: boolean;
  /** 网格面（0.13.14；可选键，缺省 xy）：yz / xz = 立面网格。 */
  gridPlane?: "xy" | "yz" | "xz";
  gridPreset?: "si" | "architectural" | "dnd";   // 栅格制式（0.13.33；缺 = 公制，或按格距猜英制）——可选键，不升版
  /** B43 尺度参考勾了哪几项（0.13.57 起多选；可选键，不升版）：没写 = 默认（室内 + 室外）、[] = 不显示、元素 = 物体尺寸梯子选单 id（认不出的原样带回）。 */
  scaleRefs?: string[];
  /** v0.13.52–56 单选时写的旧键（只读不写）："none" = 不显示、别的 = 一个选单 id。 */
  scaleRef?: string;
  gridSubdiv: number;       // 吸附细分（0.11 ⑤；user 2026-10-24「snap 比显示要细，1/5 还是 1/10 没想好」→ 5 默认、10 可选）
}

/** 图片资产（贴图与参考卡片共用；契约 ai-docs/20261024-object-model-contract.md §3）：**每张图必须带长度尺度**（user 2026-10-24），sizeM 是真源，像素只是分辨率。 */
export interface ImageAsset { mimeType: string; bytes: Uint8Array; sizeM: [number, number]; }
export const assertImageAsset = (img: ImageAsset, what = "image"): void => { if (!(img.sizeM[0] > 0 && img.sizeM[1] > 0) || !Number.isFinite(img.sizeM[0]) || !Number.isFinite(img.sizeM[1])) throw new Error(`${what}: every image must carry a physical size (sizeM > 0)`); if (!(img.bytes instanceof Uint8Array) || !img.bytes.length) throw new Error(`${what}: empty image bytes`); };
/** 材质（= glTF core material）：颜色 sRGB 0..1 + 可选贴图（原图字节 + 物理尺寸 米）。 */
export interface MaterialDoc { name: string; color: [number, number, number]; texture?: ImageAsset; }
/** 层（Unity render layer 的管理用法；契约 §4）：文档级表，id 0 = 默认层永远存在；只管可见性，纯管理。 */
export interface LayerDoc { id: number; name: string; visible: boolean; color?: [number, number, number]; }
export const DEFAULT_LAYER: LayerDoc = { id: 0, name: "默认", visible: true };
export const defaultLayers = (): LayerDoc[] => [{ ...DEFAULT_LAYER }];
/** 网格身体载荷（CATSUP_mesh 1.0.0，2026-10-27 M3）：多边形面是真相（三角形只是 bake 的派生物）。positions f64 xyz（米，定义坐标；顶点下标空间）；faceStart / faceLen / loopVert = 每面的顶点环；faceMat −1 = 默认槽；
 *  faceFlags bit0 = 隐藏；edgePairs（成对）+ edgeFlags 只列带标记的边（软 1 / 平滑 2 / 接缝 4 / 隐藏 8 / 裸线 16）。0.14 的三角汤最小形读时迁成这个形（migrate/mesh.ts）。 */
export interface MeshDoc { positions: Float64Array; faceStart: Int32Array; faceLen: Int32Array; loopVert: Int32Array; faceMat: Int32Array; faceFlags: Uint8Array; edgePairs: Int32Array; edgeFlags: Uint8Array;  /** 明暗方式（CATSUP_mesh 1.1，2026-10-28 FM129）：缺 = 老文件 = flat（只看手标，和以前逐字一样）。 */ smoothDefault?: { mode: "angle" | "smooth" | "hard"; deg: number }; /** 对称（CATSUP_mesh 1.2，2026-10-28 UX 账本 FM134 / 镜像重做第二刀）：网格体的属性——镜像编辑 / 强行对称 + 镜像面（定义坐标 axis = 0 平面）；缺 = 关。编辑方式那一层，不进撤销。 */ mirror?: { mode: "edit" | "force"; axis: 0 | 1 | 2 }; }
/** 参考几何（0.11 尺规纪元；definitions v4）：池本地坐标，id 线 / 点同一空间。 */
export interface GuidesDoc { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[]; /** 参考圆（definitions 6.3，圆规；缺 = 没有）。 */ circles?: { id: number; c: Pt3; n: Pt3; r: number }[]; /** 参考球（definitions 6.3，球规；缺 = 没有）。 */ spheres?: { id: number; c: Pt3; r: number }[] }
export const emptyGuidesDoc = (): GuidesDoc => ({ lines: [], points: [] });
export interface GroupDoc { id: number; parent: number | null; axes: Frame; brep: BrepSnapshot; name?: string; guides: GuidesDoc; }   // 组不是物体（user 10-24）：无锁、无层；旧文件的 locked 读时丢弃（definitions v5）
export interface InstanceDoc { id: number; definition: number; parent: number | null; xform: Xform; name?: string; /** 锁定（A27）；只在 true 时写。 */ locked?: boolean; /** 层（契约 §4；缺 = 继承父上下文的有效层）。 */ layer?: number; /** 隐藏（DT49；definitions 6.1 起；只在 true 时写；glTF 节点同时带 KHR_node_visibility）。 */ hidden?: boolean; }
export interface DefinitionDoc { name: string; /** 物体种类（0.13 门 1）；缺省 brep；文件里只在非 brep 时写。 */ kind?: BodyKind; /** kind = mesh 时的载荷（definitions v5）。 */ mesh?: MeshDoc; brep: BrepSnapshot; groups: GroupDoc[]; instances: InstanceDoc[]; /** 槽号 → materials 索引。 */ materialSlots: number[]; guides: GuidesDoc; /** 进这个组件画图用的坐标架（definitions 6.2，DT86；定义坐标；缺 = 跟组件原点）。 */ drawFrame?: Frame; extras?: Record<string, unknown>; }

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
  /** 全部 definition；root = definitions[rootIndex]（同一对象）。 */
  definitions: DefinitionDoc[];
  rootIndex: number;
  root: DefinitionDoc;
  /** 文档材质表（glTF materials；只增）。 */
  materials: MaterialDoc[];
  thumbnail?: { mimeType: string; bytes: Uint8Array };
  /** round-trip 保真：读到的未知顶层键 / 未知扩展 / extras 原样带回；其中任何 `{ bufferView: N }` 引用的二进制也随 `views` 携带。 */
  carry: { topLevel: Record<string, unknown>; extensions: Record<string, unknown>; documentExtra: Record<string, unknown>; definitionsExtra: Record<string, unknown>; brepKeep?: Record<string, unknown>; views: Map<number, Uint8Array> };
  /** 读取时攒的拍子判决（不持久化；newDocument 没有）：哪些子结构比本版新一个 minor（宿主提示一次）、desk 是否太新。 */
  readNotes?: FormatReadNotes;
}

/** 桌面态子结构 `CATSUP_desk`（契约 §5.7；user 2026-10-25「不是应该跟文件吗，看一下weebpaint…」→ WeebPaint desk 同款，user 2026-08-27「editor 里的=per doc」）：
 *  menuTabs = 两个 ☰ 停在哪页 { main?: tab id, view?: tab id }（认不出的 tab 原样带回、打开时落回第一页）；lastView = 相机（原 CATSUP_document.lastView，
 *  契约 §7.2「保留读、停止写」搬来；本版 app 仍没写它）；extra = 本版不认识的顶层键（直通）。desk 的 major 比本版新 → 不拒开：原字节带回，这里是默认值。 */
export interface DeskDoc { menuTabs: Record<string, string>; lastView?: unknown; /** 参考窗开着没有 + 在哪（desk 1.1；开过窗才有）。 */ refPanel?: RefPanelDoc;
  /** 演示锁（desk 1.2，2026-10-29，v0.16.53；user 10-28「锁屏不是 commit」「还可以进去玩」）：true = 这份文件打开就是锁着的（改模型的一切都拒，看 / 玩照旧）。只写 true；不是内容、不标脏、不进撤销。 */
  locked?: boolean; extra: Record<string, unknown>; }
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

export const DEFAULT_SETTINGS: DocumentSettings = { displayUnit: "m", gridStep: 1, snapIncrement: 0.2, absoluteGrid: false, gridSubdiv: 5 };

export function newDocument(brep: BrepSnapshot, name = "model"): CatsupDocument {
  const root: DefinitionDoc = { name, brep, groups: [], instances: [], materialSlots: [], guides: emptyGuidesDoc() };
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
    carry: { topLevel: {}, extensions: {}, documentExtra: {}, definitionsExtra: {}, views: new Map() },
  };
}
