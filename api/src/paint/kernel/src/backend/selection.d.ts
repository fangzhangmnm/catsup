import { type TileHandle } from "./tiles/cpu-tile-pool.ts";
interface LayerLike {
    bboxX: number;
    bboxY: number;
    snapshotImageData(): LayerSnapLike;
    putImageData(docX: number, docY: number, img: ImageData): void;
    editRegionBytes(x0: number, y0: number, w: number, h: number, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void;
}
interface LayerSnapLike {
    bboxX: number;
    bboxY: number;
    bboxW: number;
    bboxH: number;
    imageData?: ImageData | null;
}
type ComposeMode = "new" | "union" | "subtract" | "intersect";
export declare class Selection {
    bboxX: number;
    bboxY: number;
    bboxW: number;
    bboxH: number;
    private _tiles;
    private _disposed;
    private _bboxMask;
    /** 内部构造：接管 tiles 里句柄的所有权。外部走工厂（full/fromGray8Region/fromLayerAlpha/compose…）。 */
    private constructor();
    /** 零拷贝别名副本（句柄 acquire）。存进快照/长期持有处用它，别裸存引用。 */
    clone(): Selection;
    /** 释放全部 tile 句柄。**被丢弃前必须调**；双 dispose 立刻 throw（所有权 bug 就地暴露）。 */
    dispose(): void;
    get disposed(): boolean;
    private _assertAlive;
    /** 只读句柄迭代（undo 配额估计用；别 release 这些）。 */
    tileHandles(): IterableIterator<TileHandle>;
    get tileCount(): number;
    /** 从 tiles 建；空 map → null（退化=没选区）。接管句柄所有权。 */
    private static _fromTiles;
    /**
     * 核心工厂：doc 矩形 (x0,y0,w,h) 的 gray8 数据（行优先，w 宽）→ 稀疏 tile。
     * 全零格不建 tile；整体全零 → null。data 只读（拷贝进 tile，不接管）。
     * 负坐标部分裁掉（选区恒在 doc 网格 ≥0 侧；v125 起所有入口 clip 到 doc）。
     */
    static fromGray8Region(x0: number, y0: number, w: number, h: number, data: Uint8Array | Uint8ClampedArray): Selection | null;
    /** 从图层 alpha 建（v0.7.38「从当前图层建选区」）。α≥128 → 255（恒二值不变量同上）；
     *  空层 → null（= 没选区）。像素走 tiles 直读口 getImageData（v0.6.39 唯一正确读法，零 canvas
     *  往返）；剪贴蒙版层按**原始** alpha（未被裁剪的），与 Procreate 一致。 */
    static fromLayerAlpha(layer: {
        bboxX: number;
        bboxY: number;
        bboxW: number;
        bboxH: number;
        getImageData(x: number, y: number, w: number, h: number): ImageData;
    }): Selection | null;
    /** 全白选区（select all / 反选-无选区 / 整层选区）。x/y 给 layer 偏移用。 */
    static full(docW: number, docH: number, x?: number, y?: number): Selection | null;
    /**
     * 把 newSel 按 mode 合并到 oldSel（两者皆 Selection|null）。退化（空）→ null。
     *   new → 替换；union → ∪；subtract → \；intersect → ∩
     * AA 公式对齐旧 Canvas2D 合成（union=src-over、subtract=dst-out、intersect=dst-in），偏差 ≤1/255。
     * 只读两个入参（不接管所有权；调用方自己管 dispose）。mode="new"/!oldSel 时**原样返回 newSel**、
     * !newSel 时原样返回 oldSel（与旧版同——调用方按“返回 === 入参”判断所有权是否转移）。
     */
    static compose(oldSel: Selection | null, newSel: Selection | null, mode: ComposeMode): Selection | null;
    /** 反选：docW×docH 内 255-v。返回新 Selection（全选的反 = null 由调用方语义兜——mask 全零时返 null）。 */
    invert(docW: number, docH: number): Selection | null;
    /**
     * 硬形态学 扩张(radius>0)/收缩(radius<0)：选区编辑 op。返回新 Selection（或 null=收没了）。
     *   - 二值化阈值 128（与蚂蚁线 outline 的 >128 一致——选区"在不在"按半透明分界）。
     *   - 8-连通（Chebyshev/方形增长），|radius| 轮，pixel-art 逻辑（硬边，不羽化）。
     *   - 膨胀时 bbox 每边外扩 radius 并 clamp 到 doc；收缩沿用原 bbox。
     *   白边场景：魔术棒停在线稿 AA 半透明处 → 对选区 expand 几 px 钻到线下 → 填色无白边。
     */
    morphed(radius: number, docW: number, docH: number): Selection | null;
    /** doc 矩形 → gray8 平面（缺 tile / bbox 外 = 0）。每次新分配（调用方可写）。 */
    materializeMaskRegion(x0: number, y0: number, w: number, h: number): Uint8Array;
    /** 单点采样（0..255；界外 0）。 */
    sampleAt(docX: number, docY: number): number;
    /** bbox 对齐 gray8 平面（懒缓存；**只读**，别写）。GL R8 直传 / 反复读者用。 */
    bboxMask(): {
        x: number;
        y: number;
        w: number;
        h: number;
        data: Uint8Array;
    };
    applyMaskPostStroke(layer: LayerLike, preSnap: LayerSnapLike | null): void;
    fillOnLayer(layer: LayerLike, color: string): void;
    clearOnLayer(layer: LayerLike): void;
    /** 裁剪：doc 原点平移 (dx,dy)，新画布 nw×nh。clamp 到画布内，全裁掉 → null。 */
    croppedTo(dx: number, dy: number, nw: number, nh: number): Selection | null;
    /** 水平翻转：mask 左右镜像，bbox 在 docW 内镜像。 */
    flippedHorizontal(docW: number): Selection | null;
    /**
     * 逆时针旋转 90°。docW = **旧** doc 宽。与 doc.rotate90CCW 一致：旧 (x,y) → 新 (y, W-1-x)。
     *   新 bbox：newX=bboxY, newY=docW-(bboxX+bboxW), newW=bboxH, newH=bboxW。
     */
    rotated90CCW(docW: number, _docH: number): Selection | null;
    /** 重采样：mask 同步缩放 (sx,sy)。v0.6.46 字节版：面积平均缩放 → ≥128 二值化（选区不变量：恒 0/255）。零 canvas。 */
    resampledTo(sx: number, sy: number): Selection | null;
    /** 偏移环绕：随 doc.offsetWrap 平移。dx,dy 已归一化到 [0,W)/[0,H)。整数平移，硬搬像素。 */
    offsetWrapped(dx: number, dy: number, docW: number, docH: number): Selection | null;
}
export declare function rasterizePolygonGray8(verts: Array<{
    x: number;
    y: number;
}>): {
    x0: number;
    y0: number;
    w: number;
    h: number;
    g: Uint8Array;
} | null;
export {};
