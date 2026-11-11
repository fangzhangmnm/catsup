import type { History } from "./workpiece/history.ts";
import type { LayerTree } from "./workpiece/layer-tree.ts";
import type { LayerTiles, Rect } from "./workpiece/layer-tiles.ts";
import { type PaintingView, type ViewLeaf, type ViewNode } from "./workpiece/painting-view.ts";
import { type DocCompositorBytesFn } from "./doc-render.ts";
export type OpStatus = {
    ok: true;
} | {
    ok: false;
    msg?: string;
};
export interface TreeStatuses {
    undoStatus?: string;
    redoStatus?: string;
}
export interface RunOpts {
    checkpoint?: boolean;
    label?: string;
    statuses?: TreeStatuses;
}
export type AddLayerResult = {
    ok: true;
    layer: ViewLeaf;
} | {
    ok: false;
    msg?: string;
};
export type AddNodeResult = {
    ok: true;
    layer: ViewNode;
} | {
    ok: false;
    msg?: string;
};
export declare class LayersFace {
    private _history;
    private _tree;
    private _tiles;
    private _port;
    private _status;
    private _compositor;
    constructor(deps: {
        history: History;
        tree: LayerTree;
        tiles: LayerTiles;
        port: PaintingView;
        status?: (msg: string) => void;
        /** per-tenant 合成注入（C7）：多 backend 并存时各持己面；缺省回落 doc-render 全局接缝（壳单租户）。 */
        compositorBytes?: DocCompositorBytesFn;
    });
    /** o.statuses → step.hint（undo/redo 时报状态栏；非权威附注）。 */
    private _hint;
    private _point;
    /** 新建空层（active 同级之上 / active 是组则组内顶；active=新层）。失败：msg="maxLayers"。 */
    addLayer(name?: string, o?: RunOpts): AddLayerResult;
    /** 复制节点——叶或组（插源之上 + 设 active；叶 tileset 句柄共享零拷贝、组递归深拷）。
     *  msg="max"（叶数预算超上限）|"missing"。 */
    duplicateNode(id: number, o?: RunOpts): AddNodeResult;
    /** 删除叶层（keep-one 守卫：msg="keep-one guard"）。 */
    removeLayer(id: number, _layerName: string, o?: RunOpts): OpStatus;
    /** 删组（连带 children；删到 0 叶自动补一张空层）。 */
    deleteGroup(id: number, statuses: TreeStatuses, o?: RunOpts): OpStatus;
    /** 同级上移/下移（delta=+1 上 / -1 下）。 */
    moveLayer(id: number, delta: number, o?: RunOpts): OpStatus;
    /** 向下合并：合成字节在此烤（renderNodesToBytes，与 display 同一套混合数学——v0.6.39 拍板），
     *  verb 只收字节。msg = bottom | merge-into-group | clipping-under | empty-active | no-gl。 */
    mergeDown(id: number, o?: RunOpts): OpStatus;
    /** 层/组属性（rename/visible/opacity/mode/clippingMask/lockAlpha）。
     *  拖动期预览走 view 镜像（不碰 json），提交只在此记一账——旧 initialOld 舞蹈退役。 */
    setLayerProp(id: number, prop: string, value: unknown, o?: RunOpts): OpStatus;
    /** 参考层指定（doc 级 unique；null = 取消）。 */
    setReferenceLayer(id: number | null, o?: RunOpts): OpStatus;
    /** 清空叶层像素（保留图层/名字/属性）。 */
    clearLayer(id: number, o?: RunOpts): OpStatus;
    /** 焦点写（显式声明的不入 undo 写；undo/redo 的焦点还原由根快照天然给出）。 */
    setActive(id: number): boolean;
    /** 新建空组（恒插 active **同级**之上，与 addLayer 同规则；active=新组）。命名归调用方（UI 惯例「组 N」）。 */
    addGroup(name?: string, statuses?: TreeStatuses, o?: RunOpts): {
        ok: boolean;
        groupId?: number;
        msg?: string;
    };
    /** 解组：children 提到原位。 */
    ungroup(id: number, statuses: TreeStatuses, o?: RunOpts): OpStatus;
    /** 组烤成单叶同位替换（#25 collapse）；merged=null = 空组 → 空叶。 */
    collapseGroup(id: number, merged: {
        bytes: Uint8ClampedArray;
        rect: Rect;
    } | null, statuses: TreeStatuses, o?: RunOpts): OpStatus;
    /** 移入组（保持相对上下：原在组下方→组内底、在组上方→组内顶；跨级按树路径判，见 LayerTree.moveIntoGroup）。 */
    moveIntoGroup(id: number, gid: number, statuses: TreeStatuses, o?: RunOpts): OpStatus;
    /** 移出组（组同级；组内底→组下方、其余→组上方）。 */
    moveOutOfGroup(id: number, statuses: TreeStatuses, o?: RunOpts): OpStatus;
    /** 按颜色拆分（v0.7.9 explode）：叶同位替换成 n 张新叶。 */
    explodeLayer(id: number, parts: {
        data: Uint8ClampedArray;
        name: string;
    }[], rect: Rect, statuses: TreeStatuses, o?: RunOpts): OpStatus;
    /** 盖印全部可见层 → 新叶置顶 + 其余**根级节点**隐藏（组作为组藏，沿旧行为；一个整点）。
     *  merged=null = 空合成 → 空叶。 */
    stampAll(name: string, merged: {
        bytes: Uint8ClampedArray;
        rect: Rect;
    } | null, statuses?: TreeStatuses, o?: RunOpts): AddLayerResult;
}
