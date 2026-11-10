// doc 图层树的结构化节点类型（DocLeaf/DocNode）+ safeMode。
// 用**结构化类型**接 doc 节点（不 import doc.ts）→ gl/ 保持独立深模块；board 传结构兼容的真节点即可。
// （S9：docTreeToComp 随树递归执行器归档进 test/gl-smoke/reference-gl-compositor.ts——
//   生产翻译面 = gl-room 的 toPlanNodes。）

import { BLEND_MODES } from "./blend-glsl.ts";
import type { BlendMode } from "./blend-glsl.ts";
import type { LayerPixels } from "../tiles/tile-layer.ts";

// 结构化 doc 节点（与 doc.ts Layer/LayerGroup 字段兼容）。
// pixels = 该层稀疏 tile SoT（GL 直读上传；canvas/bbox 是派生视图，GL 路径不再需要）。
export interface DocLeaf {
  isGroup: false; id: number;
  opacity: number; mode: string; clippingMask: boolean; visible: boolean;
  pixels: LayerPixels;
}
export interface DocGroup {
  isGroup: true; id: number;
  opacity: number; mode: string; clippingMask: boolean; visible: boolean; children: DocNode[];
}
export type DocNode = DocLeaf | DocGroup;

// 安全 blend：doc.mode 是字符串；非 12 可分离的回退 source-over（与现 2D 行为一致——
//   layer-composite.ts:136 把未知 mode 当 source-over）。组的 "pass-through" 单独保留。
const MODE_SET = new Set<string>(BLEND_MODES);
export function safeMode(mode: string): BlendMode {
  return MODE_SET.has(mode) ? (mode as BlendMode) : "source-over";
}

