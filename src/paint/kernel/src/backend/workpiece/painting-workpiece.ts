// painting-workpiece —— PaintingWorkpiece（ADR-0008 §3；T2 起步、T3b 长出树模式）。
// 目标终态（提案 .h）：layerTree/layerTiles/selection/floatLayer/pendingFill/persp (recorded)
// + referenceGallery/palette (silent) + load()/exportData()。
//
// 两种形态（迁移期并存，cutover 后只剩树模式）：
//   - host 模式（T2 app 现状）：tile substrate 经外部 TilesHost 解析（doc 树查找）；layerTree = null。
//   - 树模式（T3b）：opts.tree 给出出生尺寸 → 内建 LayerTree + 树背 host（pixelsRef → tileset 注册表）；
//     出生 = 单空叶 doc；内容经 load(data) 令牌灌入。
//
// load = 令牌写（ADR-0008 §3）：解码器产 plain data（PaintingData：json 形 + 内联 tile 字节）→
//   挂起 tile 收集（树根记录已携带全部所有权信息）→ loadRoot 换整根 → commit → 清栈 + markSaved。
//   旧 doc 的 tileset 随被清掉的 record（旧根）释放——换文档零手工 dispose。
// exportData = 编码器读口：冻结快照语义（bytes 当场拷出，后续编辑不追写——freezeDocForEncode 的 v2 形）。

import { Workpiece, type WorkpieceOpts, type CollectorComponent } from "./workpiece.ts";
import { LayerTiles, type TilesHost, type Rect } from "./layer-tiles.ts";
import { LayerTree, isGroupNode, type TreeJson, type TreeNode, type TreeLeaf } from "./layer-tree.ts";
import { SelectionComponent } from "./selection-component.ts";
import { FloatLayerComponent } from "./float-component.ts";
import { PendingFill } from "./pending-fill.ts";
import { PerspComponent, type PerspHost } from "./persp-component.ts";
import { LayerPixels } from "../tiles/tile-layer.ts";

// ---- 装载/导出的 plain data（解码器/编码器的唯一交换形；判别同 TreeNode："children" in n）----
export interface PaintingDataLeaf {
  id?: number; name: string; visible: boolean; opacity: number; mode: string;
  clippingMask: boolean; lockAlpha: boolean;
  pixels: { rect: Rect; bytes: Uint8ClampedArray } | null;
}
export interface PaintingDataGroup {
  id?: number; name: string; visible: boolean; opacity: number; mode: string;
  clippingMask: boolean; children: PaintingDataNode[];
}
export type PaintingDataNode = PaintingDataLeaf | PaintingDataGroup;
export interface PaintingData {
  width: number; height: number;
  activeId?: number | null;
  referenceLayerId?: number | null;
  nodes: PaintingDataNode[];
}

/** 无 app（node 测试）时的内存 persp host：只承接快照互换，无 remap 数学。 */
function memoryPerspHost(): PerspHost {
  let data: unknown = null;
  const cp = (v: unknown) => (v == null ? null : JSON.parse(JSON.stringify(v)));
  return { snapshot: () => cp(data), restore: (s) => { data = cp(s); }, remap: () => {} };
}

export class PaintingWorkpiece extends Workpiece {
  readonly layerTiles: LayerTiles;
  readonly layerTree: LayerTree | null;
  readonly selection: SelectionComponent;   // recorded（不持久化，跨 session 清——T4a）
  readonly floatLayer: FloatLayerComponent; // recorded（不持久化，退出前 settle——T4b）
  readonly pendingFill: PendingFill;        // recorded（不持久化；fill 工具期非 null——T4c）
  readonly persp: PerspComponent;           // recorded（持久化去向=desk 文件；记账面=doc 变换 remap——T4d）

  constructor(opts: WorkpieceOpts & {
    host?: TilesHost;
    tree?: { width: number; height: number; maxLeaves?: () => number };
    /** desk persp 配置的读写口（app 接 workbench-state；不传 = 内存 host，纯测试用）。 */
    persp?: PerspHost;
  }) {
    super(opts);
    if (opts.tree) {
      // 树模式：host = pixelsRef 解析（经 layerTree json → tileset 注册表）
      const treeHost: TilesHost = {
        getPixels: (layerId) => {
          const leaf = this.layerTree?.leafById(layerId);
          return leaf ? this.layerTiles.tilesetPixels(leaf.pixelsRef) : null;
        },
        eachLayer: (cb) => {
          this.layerTree?.eachLeaf((leaf) => {
            const lp = this.layerTiles.tilesetPixels(leaf.pixelsRef);
            if (lp) cb(leaf.id, lp);
          });
        },
        replacePixels: (layerId, np) => {
          const leaf = this.layerTree?.leafById(layerId);
          if (leaf) this.layerTiles.swapTilesetPixels(leaf.pixelsRef, np);
        },
      };
      this.layerTiles = new LayerTiles(this, treeHost);
      const ref0 = this.layerTiles.createTileset(new LayerPixels(opts.tree.width, opts.tree.height));
      this.layerTree = new LayerTree({
        wp: this, tiles: this.layerTiles, maxLeaves: opts.tree.maxLeaves,
        initial: {
          nodes: [{ id: 1, name: "Layer 1", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixelsRef: ref0 }],
          activeId: 1, referenceLayerId: null,
          width: opts.tree.width, height: opts.tree.height,
        },
      });
      this.layerTiles.releaseTileset(ref0);   // json 已收养——净移交
      this.register(this.layerTiles, { undo: "recorded" });
      this.register(this.layerTree, { undo: "recorded" });
    } else {
      if (!opts.host) throw new Error("PaintingWorkpiece: host mode needs opts.host (or pass opts.tree for tree mode)");
      this.layerTiles = new LayerTiles(this, opts.host);
      this.layerTree = null;
      this.register(this.layerTiles, { undo: "recorded" });
    }
    this.selection = new SelectionComponent(this);
    this.register(this.selection, { undo: "recorded" });
    this.floatLayer = new FloatLayerComponent(this);
    this.register(this.floatLayer, { undo: "recorded" });
    this.pendingFill = new PendingFill(this);
    this.register(this.pendingFill, { undo: "recorded" });
    this.persp = new PerspComponent(this, opts.persp ?? memoryPerspHost());
    this.register(this.persp, { undo: "recorded" });
  }

  /** 装载（杀 docRaw/adoptState 的后继）：令牌灌入 → 清栈 → markSaved。 */
  load(data: PaintingData): void {
    const tree = this._requireTree();
    const token = this.begin("load");
    this.layerTiles._suspendCollect(true);   // 树根记录携带全部所有权；tile diff 白收（马上清栈）
    let created: number[] = [];
    try {
      const built = this._buildNodes(data.nodes, data.width, data.height);
      created = built.refs;
      const firstLeaf = (ns: TreeNode[]): number | null => {
        for (const n of ns) {
          if (!isGroupNode(n)) return n.id;
          const r = firstLeaf(n.children); if (r !== null) return r;
        }
        return null;
      };
      tree.loadRoot({
        nodes: built.nodes,
        activeId: data.activeId ?? firstLeaf(built.nodes),
        referenceLayerId: data.referenceLayerId ?? null,
        width: data.width, height: data.height,
      });
    } finally {
      for (const r of created) this.layerTiles.releaseTileset(r);   // 新根已收养——净移交
      this.layerTiles._suspendCollect(false);
    }
    token.commit();
    this.undoStack?.clear();   // 旧 doc 根 record 驱逐 → 旧 tileset 全释放（换文档零手工 dispose）
    this.markSaved();
  }

  /** 编码器读口：冻结快照（bytes 当场拷出；空叶 pixels=null）。 */
  exportData(): PaintingData {
    const tree = this._requireTree();
    const v = tree.view();
    const walk = (ns: readonly TreeNode[]): PaintingDataNode[] => ns.map((n) => {
      if (isGroupNode(n)) {
        return { id: n.id, name: n.name, visible: n.visible, opacity: n.opacity, mode: n.mode, clippingMask: n.clippingMask, children: walk(n.children) };
      }
      const b = this.layerTiles.contentBounds(n.id, true);
      return {
        id: n.id, name: n.name, visible: n.visible, opacity: n.opacity, mode: n.mode,
        clippingMask: n.clippingMask, lockAlpha: n.lockAlpha,
        pixels: b ? { rect: b, bytes: this.layerTiles.getRegion(n.id, b.x, b.y, b.w, b.h) } : null,
      };
    });
    return {
      width: v.width, height: v.height,
      activeId: v.activeId, referenceLayerId: v.referenceLayerId,
      nodes: walk(v.nodes),
    };
  }

  // ---- 内部 ----

  private _requireTree(): LayerTree {
    if (!this.layerTree) throw new Error("PaintingWorkpiece: host mode has no layerTree (load/export is a tree-mode capability)");
    return this.layerTree;
  }

  private _buildNodes(nodes: PaintingDataNode[], docW: number, docH: number): { nodes: TreeNode[]; refs: number[] } {
    const refs: number[] = [];
    let auto = 1;
    const usedIds = new Set<number>();
    const collectIds = (ns: PaintingDataNode[]) => {
      for (const n of ns) { if (n.id !== undefined) usedIds.add(n.id); if ("children" in n) collectIds(n.children); }
    };
    collectIds(nodes);
    const nextAuto = () => { while (usedIds.has(auto)) auto++; usedIds.add(auto); return auto; };
    const walk = (ns: PaintingDataNode[]): TreeNode[] => ns.map((n): TreeNode => {
      const id = n.id ?? nextAuto();
      if ("children" in n) {
        return { id, name: n.name, visible: n.visible, opacity: n.opacity, mode: n.mode, clippingMask: n.clippingMask, children: walk(n.children) };
      }
      const lp = new LayerPixels(docW, docH);
      if (n.pixels) lp.putRegion(n.pixels.rect.x, n.pixels.rect.y, n.pixels.rect.w, n.pixels.rect.h, n.pixels.bytes);
      const ref = this.layerTiles.createTileset(lp);
      refs.push(ref);
      return { id, name: n.name, visible: n.visible, opacity: n.opacity, mode: n.mode, clippingMask: n.clippingMask, lockAlpha: n.lockAlpha, pixelsRef: ref } satisfies TreeLeaf;
    });
    return { nodes: walk(nodes), refs };
  }
}
