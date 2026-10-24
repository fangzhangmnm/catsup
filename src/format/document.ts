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
  gridSubdiv: number;       // 吸附细分（0.11 ⑤；user 2026-10-24「snap 比显示要细，1/5 还是 1/10 没想好」→ 5 默认、10 可选）
}

/** 材质（= glTF core material）：颜色 sRGB 0..1 + 可选贴图（原图字节 + 物理尺寸 米）。 */
export interface MaterialDoc { name: string; color: [number, number, number]; texture?: { mimeType: string; bytes: Uint8Array; sizeM: [number, number] }; }
/** 参考几何（0.11 尺规纪元；definitions v4）：池本地坐标，id 线 / 点同一空间。 */
export interface GuidesDoc { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[] }
export const emptyGuidesDoc = (): GuidesDoc => ({ lines: [], points: [] });
export interface GroupDoc { id: number; parent: number | null; axes: Frame; brep: BrepSnapshot; name?: string; guides: GuidesDoc; }
export interface InstanceDoc { id: number; definition: number; parent: number | null; xform: Xform; name?: string; }
export interface DefinitionDoc { name: string; /** 物体种类（0.13 门 1）；缺省 brep；文件里只在非 brep 时写。 */ kind?: BodyKind; brep: BrepSnapshot; groups: GroupDoc[]; instances: InstanceDoc[]; /** 槽号 → materials 索引。 */ materialSlots: number[]; guides: GuidesDoc; extras?: Record<string, unknown>; }

export interface CatsupDocument {
  settings: DocumentSettings;
  /** 绘图轴（0.11；document v2）：根上下文的推断原点与三轴，世界坐标；默认世界帧。 */
  axes: Frame;
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
    bakeMode: "wysiwyg",
    definitions: [root],
    rootIndex: 0,
    root,
    materials: [],
    carry: { topLevel: {}, extensions: {}, documentExtra: {}, definitionsExtra: {}, views: new Map() },
  };
}
