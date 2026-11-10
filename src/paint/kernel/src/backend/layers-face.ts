// layers-face —— 结构类写面门面（v0.8.1 S1 立；T3b-2 换心 v2 verbs；T5 迁出 workpiece/ 正名）。
// app 侧胶水：layers-panel/topbar/import/explode/blender-sync 的图层结构入口（ctx.layers）。
//
// 「写即记账」契约不变：每个公共方法 = 一个 withPoint 令牌整点（checkpoint:false = 留开聚合；
// import 单整点/stampAll 复合沿用）。方法体内直写 LayerTree/LayerTiles verbs，
// undo 包 = 组件 collector 的根/tile record。
//
// undo/redo 状态栏文案：经 o.statuses 由调用方传入（本门面不碰 i18n），落 step.hint
// （非权威附注——文案丢了不影响状态正确性，符合 hint 三纪律）。
// mergeDown 的合成字节在此烤（renderNodesToBytes 纯函数面）——v2 verb 收字节不碰 GL（T3a 定形）。

import type { History } from "./workpiece/history.ts";
import type { LayerTree, LayerPropKey } from "./workpiece/layer-tree.ts";
import type { LayerTiles, Rect } from "./workpiece/layer-tiles.ts";
import { type PaintingView, type ViewLeaf, type ViewGroup, type ViewNode } from "./workpiece/painting-view.ts";
import { renderNodesToBytes, type DocCompositorBytesFn } from "./doc-render.ts";

export type OpStatus = { ok: true } | { ok: false; msg?: string };
export interface TreeStatuses { undoStatus?: string; redoStatus?: string }
export interface RunOpts { checkpoint?: boolean; label?: string; statuses?: TreeStatuses }
export type AddLayerResult = { ok: true; layer: ViewLeaf } | { ok: false; msg?: string };
export type AddNodeResult = { ok: true; layer: ViewNode } | { ok: false; msg?: string };

export class LayersFace {
  private _history: History;
  private _tree: LayerTree;
  private _tiles: LayerTiles;
  private _port: PaintingView;
  private _status: (msg: string) => void;
  private _compositor: DocCompositorBytesFn;

  constructor(deps: {
    history: History; tree: LayerTree; tiles: LayerTiles; port: PaintingView; status?: (msg: string) => void;
    /** per-tenant 合成注入（C7）：多 backend 并存时各持己面；缺省回落 doc-render 全局接缝（壳单租户）。 */
    compositorBytes?: DocCompositorBytesFn;
  }) {
    this._history = deps.history;
    this._tree = deps.tree;
    this._tiles = deps.tiles;
    this._port = deps.port;
    this._status = deps.status ?? (() => {});
    this._compositor = deps.compositorBytes ?? renderNodesToBytes;
  }

  /** o.statuses → step.hint（undo/redo 时报状态栏；非权威附注）。 */
  private _hint(o?: RunOpts): ((dir: "undo" | "redo") => void) | undefined {
    const s = o?.statuses;
    if (!s || (!s.undoStatus && !s.redoStatus)) return undefined;
    const status = this._status;
    return (dir) => {
      const msg = dir === "undo" ? s.undoStatus : s.redoStatus;
      if (msg) status(msg);
    };
  }
  private _point<T>(label: string, o: RunOpts | undefined, fn: () => T): { ok: boolean; value?: T; msg?: string } {
    return this._history.withPoint(o?.label ?? label, { checkpoint: o?.checkpoint, hint: this._hint(o) }, fn);
  }

  /** 新建空层（active 同级之上 / active 是组则组内顶；active=新层）。失败：msg="maxLayers"。 */
  addLayer(name?: string, o?: RunOpts): AddLayerResult {
    const r = this._point("addLayer", o, () => this._tree.addLayer(name));
    if (!r.ok) return { ok: false, msg: r.msg };
    if (!r.value) return { ok: false, msg: "maxLayers" };
    return { ok: true, layer: this._port.findLayer(r.value.id) as ViewLeaf };
  }

  /** 复制节点——叶或组（插源之上 + 设 active；叶 tileset 句柄共享零拷贝、组递归深拷）。
   *  msg="max"（叶数预算超上限）|"missing"。 */
  duplicateNode(id: number, o?: RunOpts): AddNodeResult {
    if (!this._tree.nodeById(id)) return { ok: false, msg: "missing" };
    const r = this._point("duplicateNode", o, () => this._tree.duplicateNode(id));
    if (!r.ok) return { ok: false, msg: r.msg };
    if (!r.value) return { ok: false, msg: "max" };
    return { ok: true, layer: this._port.findLayer(r.value.id)! };
  }

  /** 删除叶层（keep-one 守卫：msg="keep-one guard"）。 */
  removeLayer(id: number, _layerName: string, o?: RunOpts): OpStatus {
    const r = this._point("removeLayer", o, () => this._tree.removeLayer(id));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "keep-one guard" };
  }

  /** 删组（连带 children；删到 0 叶自动补一张空层）。 */
  deleteGroup(id: number, statuses: TreeStatuses, o?: RunOpts): OpStatus {
    const r = this._point("deleteGroup", { ...o, statuses }, () => this._tree.removeGroupAndFillEmpty(id));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "not-group" };
  }

  /** 同级上移/下移（delta=+1 上 / -1 下）。 */
  moveLayer(id: number, delta: number, o?: RunOpts): OpStatus {
    const r = this._point("moveLayer", o, () => this._tree.moveLayer(id, delta));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "cannot move" };
  }

  /** 向下合并：合成字节在此烤（renderNodesToBytes，与 display 同一套混合数学——v0.6.39 拍板），
   *  verb 只收字节。msg = bottom | merge-into-group | clipping-under | empty-active | no-gl。 */
  mergeDown(id: number, o?: RunOpts): OpStatus {
    const port = this._port;
    const top = port.findLayer(id);
    if (!top || top.isGroup) return { ok: false, msg: "bottom" };
    const loc = port.locateNode(id);
    if (!loc || loc.index <= 0) return { ok: false, msg: "bottom" };
    const siblings: readonly ViewNode[] = loc.parentId == null
      ? port.layers
      : (port.findLayer(loc.parentId) as ViewGroup | null)?.children ?? [];
    const underNode = siblings[loc.index - 1];
    if (!underNode || underNode.isGroup) return { ok: false, msg: "merge-into-group" };
    const under = underNode;
    if (under.clippingMask && !top.clippingMask) return { ok: false, msg: "clipping-under" };
    const L = top as ViewLeaf;
    const aHasPx = L.bboxW > 0 && L.bboxH > 0;
    const uHasPx = under.bboxW > 0 && under.bboxH > 0;
    if (!aHasPx) return { ok: false, msg: "empty-active" };

    // 剪裁语义沿 v258/doc.mergeDownLayer：active 剪裁+under 基底 → dst-in 裁进；链内合并保持剪裁。
    const clipActiveToUnder = L.clippingMask && !under.clippingMask;
    const resultClipping = L.clippingMask && under.clippingMask;
    const x0 = uHasPx ? Math.min(under.bboxX, L.bboxX) : L.bboxX;
    const y0 = uHasPx ? Math.min(under.bboxY, L.bboxY) : L.bboxY;
    const x1 = uHasPx ? Math.max(under.bboxX + under.bboxW, L.bboxX + L.bboxW) : L.bboxX + L.bboxW;
    const y1 = uHasPx ? Math.max(under.bboxY + under.bboxH, L.bboxY + L.bboxH) : L.bboxY + L.bboxH;
    const newW = x1 - x0, newH = y1 - y0;
    const comp = this._compositor([
      { isGroup: false, id: under.id, opacity: under.opacity, mode: "source-over", clippingMask: false, visible: true, pixels: under.pixels },
      { isGroup: false, id: L.id, opacity: L.opacity, mode: L.mode || "source-over", clippingMask: clipActiveToUnder, visible: true, pixels: L.pixels },
    ], port.width, port.height) as { data: Uint8ClampedArray } | null;
    if (!comp) return { ok: false, msg: "no-gl" };
    const out = new Uint8ClampedArray(newW * newH * 4);
    for (let y = 0; y < newH; y++) {
      const srcOff = ((y0 + y) * port.width + x0) * 4;
      out.set(comp.data.subarray(srcOff, srcOff + newW * 4), y * newW * 4);
    }
    const r = this._point("mergeDown", o, () =>
      this._tree.mergeDown(id, { bytes: out, rect: { x: x0, y: y0, w: newW, h: newH }, resultClipping }));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "bottom" };
  }

  /** 层/组属性（rename/visible/opacity/mode/clippingMask/lockAlpha）。
   *  拖动期预览走 view 镜像（不碰 json），提交只在此记一账——旧 initialOld 舞蹈退役。 */
  setLayerProp(id: number, prop: string, value: unknown, o?: RunOpts): OpStatus {
    // 标签按「改的是什么」分开（2026-11-08 修改锁）：可见性是「看法」——锁着时也能动（壳的写门按标签放行，见 src/edit-lock.ts LOOK_LABELS），其余属性是作品内容。
    const r = this._point(prop === "visible" ? "layerVisible" : "layerProp", o, () => this._tree.setLayerProp(id, prop as LayerPropKey, value));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "node gone" };
  }

  /** 参考层指定（doc 级 unique；null = 取消）。 */
  setReferenceLayer(id: number | null, o?: RunOpts): OpStatus {
    const r = this._point("referenceLayer", o, () => { this._tree.setTreeProp("referenceLayerId", id); });
    return r.ok ? { ok: true } : { ok: false, msg: r.msg };
  }

  /** 清空叶层像素（保留图层/名字/属性）。 */
  clearLayer(id: number, o?: RunOpts): OpStatus {
    if (!this._tree.leafById(id)) return { ok: false, msg: "layer gone" };
    const r = this._point("clearLayer", o, () => this._tiles.clearLayer(id));
    return r.ok ? { ok: true } : { ok: false, msg: r.msg };
  }

  /** 焦点写（显式声明的不入 undo 写；undo/redo 的焦点还原由根快照天然给出）。 */
  setActive(id: number): boolean {
    return this._tree.setActive(id);
  }

  // ---- 结构组合动作（原 treeTx 住户，各归各名）----

  /** 新建空组（恒插 active **同级**之上，与 addLayer 同规则；active=新组）。命名归调用方（UI 惯例「组 N」）。 */
  addGroup(name?: string, statuses?: TreeStatuses, o?: RunOpts): { ok: boolean; groupId?: number; msg?: string } {
    const r = this._point("addGroup", { ...o, statuses }, () => this._tree.addGroup(name));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true, groupId: r.value.id } : { ok: false, msg: "failed" };
  }

  /** 解组：children 提到原位。 */
  ungroup(id: number, statuses: TreeStatuses, o?: RunOpts): OpStatus {
    const r = this._point("ungroup", { ...o, statuses }, () => this._tree.explodeGroupInPlace(id));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "not-group" };
  }

  /** 组烤成单叶同位替换（#25 collapse）；merged=null = 空组 → 空叶。 */
  collapseGroup(id: number, merged: { bytes: Uint8ClampedArray; rect: Rect } | null, statuses: TreeStatuses, o?: RunOpts): OpStatus {
    const r = this._point("collapseGroup", { ...o, statuses }, () => this._tree.collapseGroupToLeaf(id, merged));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "not-group" };
  }

  /** 移入组（保持相对上下：原在组下方→组内底、在组上方→组内顶；跨级按树路径判，见 LayerTree.moveIntoGroup）。 */
  moveIntoGroup(id: number, gid: number, statuses: TreeStatuses, o?: RunOpts): OpStatus {
    const r = this._point("moveIntoGroup", { ...o, statuses }, () => this._tree.moveIntoGroup(id, gid));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "cannot move" };
  }

  /** 移出组（组同级；组内底→组下方、其余→组上方）。 */
  moveOutOfGroup(id: number, statuses: TreeStatuses, o?: RunOpts): OpStatus {
    const r = this._point("moveOutOfGroup", { ...o, statuses }, () => this._tree.moveOutOfGroup(id));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "cannot move" };
  }

  /** 按颜色拆分（v0.7.9 explode）：叶同位替换成 n 张新叶。 */
  explodeLayer(id: number, parts: { data: Uint8ClampedArray; name: string }[], rect: Rect, statuses: TreeStatuses, o?: RunOpts): OpStatus {
    const r = this._point("explodeLayer", { ...o, statuses }, () => this._tree.explodeLeaf(id, parts, rect));
    if (!r.ok) return { ok: false, msg: r.msg };
    return r.value ? { ok: true } : { ok: false, msg: "maxLayers" };
  }

  /** 盖印全部可见层 → 新叶置顶 + 其余**根级节点**隐藏（组作为组藏，沿旧行为；一个整点）。
   *  merged=null = 空合成 → 空叶。 */
  stampAll(name: string, merged: { bytes: Uint8ClampedArray; rect: Rect } | null, statuses?: TreeStatuses, o?: RunOpts): AddLayerResult {
    const r = this._point("stampAll", { ...o, statuses }, () => {
      const leaf = this._tree.addLayerTop(name);
      if (!leaf) return null;
      if (merged && merged.rect.w > 0 && merged.rect.h > 0) {
        this._tiles.replaceLayer(leaf.id, merged.bytes, merged.rect);
      }
      for (const n of this._port.layers) {
        if (n.id !== leaf.id && n.visible) this._tree.setLayerProp(n.id, "visible", false);
      }
      return leaf;
    });
    if (!r.ok) return { ok: false, msg: r.msg };
    if (!r.value) return { ok: false, msg: "maxLayers" };
    return { ok: true, layer: this._port.findLayer(r.value.id) as ViewLeaf };
  }
}
