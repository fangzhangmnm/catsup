import { LayerPixels } from "../tiles/tile-layer.ts";
import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";
/** 层号 → 实例（verb / 读口 / computed 变换用）。T2 由 app 以 doc 树实现；T3 起归 LayerTree json。
 *  注意：undo 账**不**经这里解析身份（按 tileset id 直取注册表，见文件头）。 */
export interface TilesHost {
    getPixels(layerId: number): LayerPixels | null;
    eachLayer(cb: (layerId: number, lp: LayerPixels) => void): void;
    /** 换整个 tileset 实例（旧实例由 host 负责 dispose）。computed 变换 apply 用。 */
    replacePixels(layerId: number, np: LayerPixels): void;
}
/** applyMaskPostStroke 的 preSnap 形状（原 pixel-tx PreSnapImage；selection.ts LayerSnapLike 同构）。 */
export interface PreSnapImage {
    bboxX: number;
    bboxY: number;
    bboxW: number;
    bboxH: number;
    imageData: ImageData | null;
}
export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface TileEntry {
    tx: number;
    ty: number;
    contentId: number;
    bytes(): Uint8ClampedArray;
}
export declare class LayerTiles implements CollectorComponent {
    readonly kind = "layerTiles";
    private _wp;
    private _host;
    private _collected;
    private _computed;
    private _exchange;
    private _suspend;
    private _observerDispose;
    constructor(wp: Workpiece, host: TilesHost);
    /** 退租（WeebPaintBackend.dispose）：解除观察者注册。之后本实例不再收集（也不该再被写）。 */
    dispose(): void;
    /** 内部/装载协作面：自带记账的窗口挂起收集（exchange/computed verb 体内、load 灌入——收了=双记账）。 */
    _suspendCollect(on: boolean): void;
    private _tilesets;
    private _idOf;
    private _nextTilesetId;
    private _stampOwner;
    /** 有主实例离世（refs 归零/换血/record 驱逐）：先摘戳再 dispose——dispose 的逐格 notify
     *  发生在令牌外（record 驱逐/换文档清栈），摘了戳走「无主放行」路，不触发无令牌写硬化。 */
    private _disposeOwned;
    /** 新 tileset 入册，refs=1 归调用方（json 收养 +1 后调用方 release——净移交）。
     *  入册前在本令牌里被写过（explodeLeaf / collapseGroupToLeaf 都是先写新实例再入册）照常记账——账按 tileset id 记，
     *  seal 时经 _idOf 定身份，undo 时树账先后无关（文件头）。
     *  调用方只许传新建实例：带本 collector 所有权戳的实例（已入册 / 换血 / 交换过）拒收——同一实例两个 id = 注册表坏账。
     *  2026-10-13 Claude Fable 5.1。 */
    createTileset(lp: LayerPixels): number;
    /** 零拷贝复制（句柄共享快照）：duplicateLayer 用。refs=1 归调用方。 */
    duplicateTileset(id: number): number | null;
    acquireTileset(id: number): void;
    releaseTileset(id: number): void;
    tilesetPixels(id: number): LayerPixels | null;
    /** computed 变换换实例（tileset id 稳定，内容换血；旧实例还池）。 */
    swapTilesetPixels(id: number, np: LayerPixels): void;
    /** 实例交换**不 dispose**（swapTilesetPixels 的非销毁变体）：旧实例所有权交还调用方——
     *  DocResizeOp（crop/resample 的 undo 包持前一侧实例）用。T3b-2 补。 */
    exchangeTilesetPixels(id: number, np: LayerPixels): LayerPixels;
    /** 注册表观测（测试/泄漏审计）。 */
    tilesetCount(): number;
    tilesetRefs(id: number): number;
    version(layerId: number): number;
    tiles(layerId: number): IterableIterator<TileEntry>;
    contentBounds(layerId: number, tight?: boolean): Rect | null;
    getRegion(layerId: number, x: number, y: number, w: number, h: number): Uint8ClampedArray;
    putRegion(layerId: number, x: number, y: number, w: number, h: number, bytes: Uint8ClampedArray): void;
    editRegion(layerId: number, rect: Rect, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void;
    /** 整层替换（merge-down/滤镜 commit）：清空 + rect 整块写入（= 旧 replaceFromBytes 语义）。 */
    replaceLayer(layerId: number, bytes: Uint8ClampedArray, rect: Rect): void;
    clearLayer(layerId: number): void;
    flipHorizontalAll(): void;
    rotate90All(dir: 1 | -1): void;
    offsetWrapAll(dx: number, dy: number): void;
    /** 整 doc 几何 resize 的实例交换记账（crop/cropResample/resample；T5 收编 DocResizeOp）。
     *  逐叶 map 产新实例并交换装上；record = 旧实例集（undo 包 = 另一侧实例，swap 零拷贝互换）。
     *  map 期间收集挂起在**组件内**——新实例的 putRegion 若被写时扣押，seal 时已装上树会解析到
     *  layerId → 双记账 + across drift 炸 undo（T3b-2 施工时踩过的真雷，纪律收进 verb 不再靠调用方）。
     *  json 尺寸（width/height）由调用方另走 setTreeProp 进树 record，同 step 两账同向翻。 */
    resizeAllLeaves(map: (layerId: number, lp: LayerPixels) => LayerPixels): void;
    /** 本 token 是否真的动过该层（collector 有它的扣押）。 */
    tokenChanged(layerId: number): boolean;
    /** 令牌前该层内容的紧 bbox 物化（applyMaskPostStroke 的 preSnap）。
     *  = 现内容 + collector 扣押件盖回（未变 tile 现值即前值）。仅带选区 finalize 才付这份钱。 */
    tokenBeforeImage(layerId: number): PreSnapImage;
    sealRecord(): RecordData | null;
    swapRecord(data: RecordData): RecordData;
    recordBytes(data: RecordData): number;
    disposeRecord(data: RecordData): void;
    private _onTileSwap;
    private _write;
    private _computedVerb;
    private _applyComputed;
    private _invertComputed;
    private _applyAll;
    private _applyRot;
    private _collectedCount;
    private _disposeCollected;
}
