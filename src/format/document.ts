// document.ts —— CatsUp 文档的内存形状（契约 §5.3/5.4/5.6 的 v1 子集）：一个 root definition（肥皂膜 B-rep），
// 文档设置、lastView、bake 模式、缩略图；未知 JSON 原样携带（round-trip 保真）。created 2026-09-20 by Claude Fable 5.1

import type { BrepSnapshot } from "../kernel/kernel.ts";

export type BakeMode = "wysiwyg" | "engine";

export interface DocumentSettings {
  displayUnit: string;      // "m" | "cm" | "mm" | "ft-in"
  gridStep: number;         // 米
  snapIncrement: number;    // 米
  absoluteGrid: boolean;
}

export interface CatsupDocument {
  settings: DocumentSettings;
  lastView?: unknown;                 // 软字段：相机状态，任何一端可覆盖
  bakeMode: BakeMode;
  root: { name: string; brep: BrepSnapshot; extras?: Record<string, unknown> };
  thumbnail?: { mimeType: string; bytes: Uint8Array };
  /** round-trip 保真：读到的未知顶层键 / 未知扩展 / extras，写回时原样带上（v1 限 JSON；未知扩展的二进制不带——总账 A18 待办）。 */
  carry: { topLevel: Record<string, unknown>; extensions: Record<string, unknown>; documentExtra: Record<string, unknown>; definitionsExtra: Record<string, unknown>; brepKeep?: Record<string, unknown> };
}

export const DEFAULT_SETTINGS: DocumentSettings = { displayUnit: "m", gridStep: 1, snapIncrement: 0.1, absoluteGrid: false };

export function newDocument(brep: BrepSnapshot, name = "model"): CatsupDocument {
  return {
    settings: { ...DEFAULT_SETTINGS },
    bakeMode: "wysiwyg",
    root: { name, brep },
    carry: { topLevel: {}, extensions: {}, documentExtra: {}, definitionsExtra: {} },
  };
}
