// 【S9 归档】GL 规范树递归合成器 —— smoke 的对拍参照执行器（生产走 render-plan + RenderTree）。
// 原居：gl-compositor.ts 的 composite()/_composeFresh/_applyNodes + gl-compose-plan.ts 的
// CompNode/clip 判定 + gl-doc-bridge.ts 的 docTreeToComp。生产零调用后集中归档在 test 域
// （「别删对拍能力」= handoff 琐碎第 6 条）。语义与 reference-2d.ts（旧 2D 规范合成器）逐条对齐。

import type { GLCompositor, Background, Acc } from "../../src/backend/gl/gl-compositor.ts";
import type { OverlayDesc, FloatDesc } from "../../src/backend/gl/gl-compositor.ts";
import type { PooledFBO, Gl2TileArena } from "../../src/common/gl2-port.ts";
import type { IndexTexture } from "../../src/backend/gl/gpu-tile-pool.ts";
import type { BlendMode } from "../../src/backend/gl/blend-glsl.ts";
import { safeMode } from "../../src/backend/gl/gl-doc-bridge.ts";
import type { DocLeaf, DocNode } from "../../src/backend/gl/gl-doc-bridge.ts";

// ---- CompNode 树（合成器输入节点）----
export interface CompLeaf {
  kind: "leaf";
  srcIndex: IndexTexture;
  opacity: number;
  mode: BlendMode;
  clip: boolean;
  visible: boolean;
  hasContent: boolean;
  overlay?: OverlayDesc | null;
  float?: FloatDesc | null;
}
export interface CompGroup {
  kind: "group";
  children: CompNode[];
  opacity: number;
  mode: BlendMode | "pass-through";
  clip: boolean;
  visible: boolean;
}
export type CompNode = CompLeaf | CompGroup;

// clip 基底解析（与 reference-2d computeClipBaseForNodes 逐行对齐）：
//   clip 节点 → 同级下方最近的「非clip、可见、有内容」节点；连续 clip 链共基底；浮层叶算有内容。
export function resolveClipBases(nodes: CompNode[]): (CompNode | null)[] {
  const out: (CompNode | null)[] = new Array(nodes.length).fill(null);
  let base: CompNode | null = null;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.clip && base) {
      out[i] = base;
    } else {
      out[i] = null;
      const hasContent = n.kind === "group" ? n.visible : (n.visible && (n.hasContent || !!n.float));
      if (!n.clip && hasContent) base = n;
    }
  }
  return out;
}

// 组是否需要隔离（pass-through 是唯一非隔离态）。
export function needsIsolation(g: CompGroup): boolean {
  return g.mode !== "pass-through" || g.opacity < 1 || g.clip;
}

// 隔离组整体混时的有效 blend（穿透被逼隔离 → source-over）。
export function groupUnitMode(g: CompGroup): BlendMode {
  return g.mode === "pass-through" ? "source-over" : g.mode;
}

// ---- doc 节点树 → CompNode 树（纯翻译）----
export function docTreeToComp(
  nodes: DocNode[],
  resourceFor: (leaf: DocLeaf) => { index: IndexTexture; hasContent: boolean },
  overlayFor?: (leaf: DocLeaf) => OverlayDesc | null,
  floatFor?: (leaf: DocLeaf) => FloatDesc | null,
): CompNode[] {
  return nodes.map((n) => docNodeToComp(n, resourceFor, overlayFor, floatFor));
}
function docNodeToComp(
  n: DocNode,
  resourceFor: (leaf: DocLeaf) => { index: IndexTexture; hasContent: boolean },
  overlayFor?: (leaf: DocLeaf) => OverlayDesc | null,
  floatFor?: (leaf: DocLeaf) => FloatDesc | null,
): CompNode {
  if (!n.isGroup) {
    const r = resourceFor(n);
    return { kind: "leaf", srcIndex: r.index, opacity: n.opacity, mode: safeMode(n.mode), clip: !!n.clippingMask, visible: !!n.visible, hasContent: r.hasContent, overlay: overlayFor ? overlayFor(n) : null, float: floatFor ? floatFor(n) : null };
  }
  return {
    kind: "group",
    children: n.children.map((c) => docNodeToComp(c, resourceFor, overlayFor, floatFor)),
    opacity: n.opacity,
    mode: n.mode === "pass-through" ? "pass-through" : safeMode(n.mode),
    clip: !!n.clippingMask,
    visible: !!n.visible,
  };
}

// ---- 树递归执行器（原 GLCompositor.composite；驱动 begin/newAcc/pass/floatPass/finishAcc/end 原语）----
export function compositeTree(comp: GLCompositor, arena: Gl2TileArena, nodes: CompNode[], docW: number, docH: number, bg?: Background): PooledFBO {
  comp.begin(docW, docH, true);
  const result = composeFresh(comp, arena, nodes, docW, docH, bg);
  comp.end();
  return result;
}

function composeFresh(comp: GLCompositor, arena: Gl2TileArena, nodes: CompNode[], docW: number, docH: number, bg?: Background): PooledFBO {
  const acc: Acc = comp.newAcc(docW, docH, bg);
  applyNodes(comp, arena, nodes, acc, docW, docH);
  return comp.finishAcc(acc);
}

function applyNodes(comp: GLCompositor, arena: Gl2TileArena, nodes: CompNode[], acc: Acc, docW: number, docH: number): void {
  const bases = resolveClipBases(nodes);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node.visible) continue;
    const base = bases[i];
    // clip 无基底 → 层本身不渲染，但浮层仍要显（对齐 reference-2d float 独立于 clip）。
    const clipNoBase = node.clip && !base;
    const clipIndex = base && base.kind === "leaf" ? base.srcIndex : null;

    if (node.kind === "leaf") {
      if (!clipNoBase) {
        const srcKind = node.overlay ? "overlay" : "tiled";
        comp.pass(arena, srcKind, node.srcIndex, null, node.mode, node.opacity, clipIndex, acc, docW, docH, node.overlay ?? null);
      }
      if (node.float) comp.floatPass(node.float, acc, docW, docH, (node.clip && base && base.kind === "leaf") ? base.float ?? null : null);
    } else if (clipNoBase) {
      continue;
    } else if (needsIsolation(node)) {
      const sub = composeFresh(comp, arena, node.children, docW, docH);
      comp.pass(arena, "group", null, sub, groupUnitMode(node), node.opacity, clipIndex, acc, docW, docH);
      comp.returnFBO(sub);
    } else {
      applyNodes(comp, arena, node.children, acc, docW, docH);
    }
  }
}
