import { LayerPixels, type PixelsSnapshot } from "../tiles/tile-layer.ts";
import type { PaintingWorkpiece } from "./painting-workpiece.ts";
import type { LayerTiles } from "./layer-tiles.ts";
import type { Selection } from "../selection.ts";
export declare const LAYER_HARD_CEIL = 64;
export declare function setDeviceMemoryGB(gb: number): void;
export declare function layerByteBudget(): number;
export declare function computeMaxLayers(currentLeafCount: number, residentBytes: number, budgetBytes?: number): number;
export interface ViewLeafSnap {
    pixels: PixelsSnapshot;
}
export declare function disposeViewSnap(snap: ViewLeafSnap | null | undefined): void;
/** 叶 view：旧 Layer 的读写面，像素 = tileset 注册表里的活 LayerPixels。 */
export declare class ViewLeaf {
    readonly isGroup: false;
    readonly id: number;
    name: string;
    visible: boolean;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    lockAlpha: boolean;
    docW: number;
    docH: number;
    /** @internal 属性回灌（端口 resync 用）。 */
    _pixelsRef: number;
    private _tiles;
    private _bounds;
    constructor(tiles: LayerTiles, id: number);
    /** 活像素（tileset 注册表解析；叶已被删时端口不再发出本对象，getter 假定 ref 有效）。 */
    get pixels(): LayerPixels;
    /** 内容版本（全局单调不复用；flat-coloring-oracle 等 (id,rev) 缓存键）。 */
    get contentRev(): number;
    private _contentBounds;
    residentBytes(): number;
    get bboxX(): number;
    get bboxY(): number;
    get bboxW(): number;
    get bboxH(): number;
    get width(): number;
    get height(): number;
    editRegionBytes(x0: number, y0: number, w: number, h: number, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void;
    replaceFromBytes(data: Uint8ClampedArray, ox: number, oy: number, w: number, h: number): void;
    clearAll(): void;
    sampleAt(docX: number, docY: number): [number, number, number, number];
    getImageData(docX: number, docY: number, w: number, h: number): ImageData;
    putImageData(docX: number, docY: number, img: ImageData): void;
    applyRegionDiff(docX: number, docY: number, w: number, h: number, src: Uint8ClampedArray): {
        tx: number;
        ty: number;
    }[];
    snapshot(): ViewLeafSnap;
    restoreFromSnapshot(snap: ViewLeafSnap): void;
    /** CPU 算法读者的只读物化（液化 startSnap/选区 preSnap）；空层 imageData:null。 */
    snapshotImageData(): {
        bboxX: number;
        bboxY: number;
        bboxW: number;
        bboxH: number;
        imageData: ImageData | null;
    };
}
/** 组 view：纯结构镜像（每次 resync 重建，children 里叶按 id 复用）。 */
export declare class ViewGroup {
    readonly isGroup: true;
    readonly id: number;
    name: string;
    visible: boolean;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    children: ViewNode[];
    constructor(id: number);
}
export type ViewNode = ViewLeaf | ViewGroup;
export declare function eachViewLeaf(nodes: readonly ViewNode[], fn: (leaf: ViewLeaf) => void): void;
export declare function flattenViewLeaves(nodes: readonly ViewNode[]): ViewLeaf[];
export declare function findViewNodeById(nodes: readonly ViewNode[], id: number | null): ViewNode | null;
export declare function countViewLeaves(nodes: readonly ViewNode[]): number;
/** app 的文档读写端口（旧 ctx.doc = DocView 的后继；单例，跨换文档稳定）。 */
export declare class PaintingView {
    private _wp;
    private _nodes;
    private _leafCache;
    private _lastRoot;
    private _memBudgetBytes;
    constructor(wp: PaintingWorkpiece);
    private get _tree();
    /** 根引用身份同步：LayerTree 每写换新根 → 引用变了才重建镜像（叶按 id 复用）。 */
    private _sync;
    private _syncLeaf;
    get width(): number;
    get height(): number;
    get activeId(): number | null;
    get referenceLayerId(): number | null;
    get layers(): ViewNode[];
    get activeLayer(): ViewNode | null;
    findLayer(id: number): ViewNode | null;
    /** 扁平叶序 index 兼容 getter（session-state 持久化用）。 */
    get activeIndex(): number;
    /** 节点同级位置（面板按钮态用）。 */
    locateNode(id: number): {
        parentId: number | null;
        index: number;
    } | null;
    canMoveLayer(id: number, toward: number): boolean;
    /** 「能否在当前 active 写像素」单谓词（语义沿旧 PaintDoc.activeEditableLeaf）。 */
    activeEditableLeaf({ allowHidden }?: {
        allowHidden?: boolean;
    }): {
        leaf: ViewLeaf | null;
        reason: string | null;
    };
    /**
     * 像素笔的**写靶叶列表** = activeEditableLeaf 的复数推广（2026-08-28，液化对图层组）。
     * - `allowGroup=false`（缺省）→ 与 activeEditableLeaf 逐字同义：组硬拒 / 隐藏软拒 / 单叶放行。
     * - `allowGroup=true`（filter 声明了 supportsLayerGroup，唯一户 = 液化）→ 组 = 组内**全部叶**，
     *   **含隐藏叶**（对齐 floating-transform.lift(group) 的「整组一起动」）；组自身或祖先隐藏仍按
     *   hidden 软拒（盲改护栏）；空组按 "group" 拒（没叶可写，提示照旧「请选择一个图层」）。
     */
    activeStrokeLeaves({ allowGroup, allowHidden }?: {
        allowGroup?: boolean;
        allowHidden?: boolean;
    }): {
        leaves: ViewLeaf[];
        reason: string | null;
    };
    /** active 自身或任一祖先组隐藏？（变换类操作的盲改软拒。） */
    activeNodeHidden(): boolean;
    getReferenceLayer(): ViewNode | null;
    /** 魔棒/油漆桶 source：reference 优先，否则 active（组不可作源 → null）。 */
    getFloodSourceLayer(): ViewLeaf | null;
    get selection(): Selection | null;
    set selection(v: Selection | null);
    /** 换文档收尾（跨 session 不沿用选区——旧 adoptState 语义）。 */
    clearSelectionOnLoad(): void;
    configureMemory(budgetBytes: number): void;
    get maxLayers(): number;
}
