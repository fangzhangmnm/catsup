// document.ts —— CatsUp 文档的内存形状（契约 §5.3/5.4/5.6）：definitions（每个 = 根池 B-rep + 嵌套 group + 实例）+ 根 definition、
// 文档设置、lastView、bake 模式、缩略图；未知 JSON 原样携带（round-trip 保真）。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21，group / component 纪元）：group = 自己的 B-rep 池 + 轴框 + 父 group；instance = definition 索引 + 3×4 变换 + 父 group。

import type { BrepSnapshot, Pt3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, WORLD_FRAME } from "../scene/xform.ts";
import type { BodyKind } from "../scene/body-kind.ts";

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
/** 网格身体载荷（契约 §2；Blender 式三角网的最小形）：positions xyz（米，定义坐标）、indices 三角、可选法向 / uv / 每三角材质槽。 */
export interface MeshDoc { positions: Float32Array; indices: Uint32Array; normals?: Float32Array; uvs?: Float32Array; triMaterial?: Uint16Array; }
/** 参考几何（0.11 尺规纪元；definitions v4）：池本地坐标，id 线 / 点同一空间。 */
export interface GuidesDoc { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[] }
export const emptyGuidesDoc = (): GuidesDoc => ({ lines: [], points: [] });
export interface GroupDoc { id: number; parent: number | null; axes: Frame; brep: BrepSnapshot; name?: string; guides: GuidesDoc; }   // 组不是物体（user 10-24）：无锁、无层；旧文件的 locked 读时丢弃（definitions v5）
export interface InstanceDoc { id: number; definition: number; parent: number | null; xform: Xform; name?: string; /** 锁定（A27）；只在 true 时写。 */ locked?: boolean; /** 层（契约 §4；缺 = 继承父上下文的有效层）。 */ layer?: number; }
export interface DefinitionDoc { name: string; /** 物体种类（0.13 门 1）；缺省 brep；文件里只在非 brep 时写。 */ kind?: BodyKind; /** kind = mesh 时的载荷（definitions v5）。 */ mesh?: MeshDoc; brep: BrepSnapshot; groups: GroupDoc[]; instances: InstanceDoc[]; /** 槽号 → materials 索引。 */ materialSlots: number[]; guides: GuidesDoc; extras?: Record<string, unknown>; }

export interface CatsupDocument {
  settings: DocumentSettings;
  /** 绘图轴（0.11；document v2）：根上下文的推断原点与三轴，世界坐标；默认世界帧。 */
  axes: Frame;
  /** 层表（0.14；document v3）：缺 = 只有默认层。 */
  layers: LayerDoc[];
  /** 定稿记录（仿 MoonSinger；ai-docs/20261024-finalize.md）：在 = 锁着；读时指纹对不上 = 作废。可选键，不升版本。 */
  final?: { at: string; rev: number; app: string; fingerprint: string };
  /** 定稿过几次（改稿不减）。 */
  finalRev?: number;
  lastView?: unknown;                 // 软字段：相机状态，任何一端可覆盖
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
}

export const DEFAULT_SETTINGS: DocumentSettings = { displayUnit: "m", gridStep: 1, snapIncrement: 0.2, absoluteGrid: false, gridSubdiv: 5 };

export function newDocument(brep: BrepSnapshot, name = "model"): CatsupDocument {
  const root: DefinitionDoc = { name, brep, groups: [], instances: [], materialSlots: [], guides: emptyGuidesDoc() };
  return {
    settings: { ...DEFAULT_SETTINGS },
    axes: { origin: { ...WORLD_FRAME.origin }, x: { ...WORLD_FRAME.x }, y: { ...WORLD_FRAME.y }, z: { ...WORLD_FRAME.z } },
    layers: defaultLayers(),
    bakeMode: "wysiwyg",
    definitions: [root],
    rootIndex: 0,
    root,
    materials: [],
    carry: { topLevel: {}, extensions: {}, documentExtra: {}, definitionsExtra: {}, views: new Map() },
  };
}
