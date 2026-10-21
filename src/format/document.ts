// document.ts —— CatsUp 文档的内存形状（契约 §5.3/5.4/5.6）：definitions（每个 = 根池 B-rep + 嵌套 group + 实例）+ 根 definition、
// 文档设置、lastView、bake 模式、缩略图；未知 JSON 原样携带（round-trip 保真）。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21，group / component 纪元）：group = 自己的 B-rep 池 + 轴框 + 父 group；instance = definition 索引 + 3×4 变换 + 父 group。

import type { BrepSnapshot } from "../kernel/kernel.ts";
import type { Frame, Xform } from "../scene/xform.ts";

export type BakeMode = "wysiwyg" | "engine";

export interface DocumentSettings {
  displayUnit: string;      // "m" | "cm" | "mm" | "ft-in"
  gridStep: number;         // 米
  snapIncrement: number;    // 米
  absoluteGrid: boolean;
}

export interface GroupDoc { id: number; parent: number | null; axes: Frame; brep: BrepSnapshot; name?: string; }
export interface InstanceDoc { id: number; definition: number; parent: number | null; xform: Xform; name?: string; }
export interface DefinitionDoc { name: string; brep: BrepSnapshot; groups: GroupDoc[]; instances: InstanceDoc[]; extras?: Record<string, unknown>; }

export interface CatsupDocument {
  settings: DocumentSettings;
  lastView?: unknown;                 // 软字段：相机状态，任何一端可覆盖
  bakeMode: BakeMode;
  /** 全部 definition；root = definitions[rootIndex]（同一对象）。 */
  definitions: DefinitionDoc[];
  rootIndex: number;
  root: DefinitionDoc;
  thumbnail?: { mimeType: string; bytes: Uint8Array };
  /** round-trip 保真：读到的未知顶层键 / 未知扩展 / extras 原样带回；其中任何 `{ bufferView: N }` 引用的二进制也随 `views` 携带。 */
  carry: { topLevel: Record<string, unknown>; extensions: Record<string, unknown>; documentExtra: Record<string, unknown>; definitionsExtra: Record<string, unknown>; brepKeep?: Record<string, unknown>; views: Map<number, Uint8Array> };
}

export const DEFAULT_SETTINGS: DocumentSettings = { displayUnit: "m", gridStep: 1, snapIncrement: 0.1, absoluteGrid: false };

export function newDocument(brep: BrepSnapshot, name = "model"): CatsupDocument {
  const root: DefinitionDoc = { name, brep, groups: [], instances: [] };
  return {
    settings: { ...DEFAULT_SETTINGS },
    bakeMode: "wysiwyg",
    definitions: [root],
    rootIndex: 0,
    root,
    carry: { topLevel: {}, extensions: {}, documentExtra: {}, definitionsExtra: {}, views: new Map() },
  };
}
