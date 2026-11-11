import type { BrushEngine } from "./brush.ts";
import type { ViewLeaf, ViewLeafSnap } from "./workpiece/painting-view.ts";
import type { WriteToken } from "./workpiece/workpiece.ts";
import type { Selection } from "./selection.ts";
import { LayerPixels } from "./tiles/tile-layer.ts";
import type { RegionStroke } from "./gl/region-stroke.ts";
export type StampCollect = NonNullable<ReturnType<BrushEngine["collectStamps"]>>;
export interface StrokeEngine {
    extendStroke(x: number, y: number, pressure: number, t?: number | null): void;
    endStroke(): StampCollect | null | void;
    cancelStroke(): void;
    flushDirty(): [number, number, number, number] | null;
    collectStamps?(): StampCollect | null;
}
/** 预览宿（census §3.4；见文件头）。 */
export type StrokePreview = "overlay" | "livesync" | "shadow" | "region";
export interface StrokeSessionDeps {
    /** wp2.begin —— 单令牌墙的开口（第二个 begin → throw） */
    begin(historyType: string): WriteToken;
    /** LayerTiles.tokenChanged —— 本令牌内该层是否真动过（finalize 谓词，防白付物化钱） */
    tokenChanged(layerId: number): boolean;
    /** LayerTiles.tokenBeforeImage —— 笔前像素现算（finalize 的 pre 图；只在真动过时才调） */
    tokenBeforeImage(layerId: number): Parameters<Selection["applyMaskPostStroke"]>[1];
    /** doc.selection 读面（finalize 兜底用；无选区 → null） */
    getSelection(): Selection | null;
    /** board.commitBrushStroke —— GPU merge（live 同一 shader）。true = 选区已在 shader 裁 */
    commitStamps(cs: StampCollect): boolean;
    /** board.invalidateAll —— 落层/回滚后的重渲通知 */
    invalidate(): void;
    /** board.setStrokeShadows —— shadow 预览宿的显示注入（surrogate 影子变体；空数组 = 关）。
     *  组液化一次挂 N 个替身（一叶一个），board 侧按 layerId 换源。 */
    setShadows(entries: readonly {
        layerId: number;
        pixels: LayerPixels;
    }[]): void;
    /** 2026-09-18 区域程序（GPU 驻留写靶）：board.openRegionStroke —— 造一笔的 RegionStroke（caps 守卫 / 显存不够 / 无 GL → throw） */
    openRegion(leaf: ViewLeaf, opts: {
        snapshot: boolean;
    }): RegionStroke;
    /** board.setStrokeRegions —— 描边期每帧各 W 当 overlay（replace；组液化 N 叶 N 张）；[] = 关 */
    setRegions(regions: readonly RegionStroke[]): void;
    /** board.commitRegionStroke —— = bakeStamps 写回链（GPU merge→readPixels→applyRegionDiff→收养），在令牌内；false = 没落层 */
    commitRegion(region: RegionStroke): boolean;
}
export interface StrokeSessionSpec {
    /** 令牌事务标签（wp2.begin(label)） */
    historyType: string;
    /** 抬笔是否按选区 applyMaskPostStroke（filterBrush 在 begin 已吃 selection → false） */
    finalize: boolean;
    /** preview="region" 时要不要起笔快照 W₀（wash 类 filter 声明 strokeSnapshot） */
    regionSnapshot?: boolean;
}
export declare class StrokeShadow {
    readonly pixels: LayerPixels;
    readonly id: number;
    readonly isGroup: false;
    readonly lockAlpha: boolean;
    readonly docW: number;
    readonly docH: number;
    private _bounds;
    constructor(layer: ViewLeaf);
    private _contentBounds;
    get bboxX(): number;
    get bboxY(): number;
    get bboxW(): number;
    get bboxH(): number;
    editRegionBytes(x0: number, y0: number, w: number, h: number, fn: (buf: Uint8ClampedArray, ox: number, oy: number) => void): void;
    getImageData(docX: number, docY: number, w: number, h: number): ImageData;
    putImageData(docX: number, docY: number, img: ImageData): void;
    sampleAt(docX: number, docY: number): [number, number, number, number];
    snapshot(): ViewLeafSnap;
    restoreFromSnapshot(snap: ViewLeafSnap): void;
    snapshotImageData(): {
        bboxX: number;
        bboxY: number;
        bboxW: number;
        bboxH: number;
        imageData: ImageData | null;
    };
    commitTo(layer: ViewLeaf): void;
    dispose(): void;
}
export declare class StrokeSession {
    readonly engine: StrokeEngine;
    /** 本笔触写的真叶（恒 ≥1；组液化 = 组内全部叶，其余笔类恒 1 叶） */
    readonly layers: readonly ViewLeaf[];
    /** 描边中原地写真层（draw/erase pixelMode）——board live-sync 判据 */
    readonly inPlace: boolean;
    /** 引擎写靶（与 layers 同序同长）：shadow 模式 = 替身叶（真叶描边期零写），否则真叶。
     *  引擎 beginStroke 必须喂它。 */
    readonly targets: readonly ViewLeaf[];
    private readonly finalize;
    private readonly token;
    private readonly deps;
    private _shadows;
    private _regions;
    private _open;
    constructor(deps: StrokeSessionDeps, engine: StrokeEngine, layers: readonly ViewLeaf[], spec: StrokeSessionSpec, preview: StrokePreview);
    get open(): boolean;
    /** 投喂一个输入事件（x,y 为 doc 坐标；t = 事件 timeStamp，手感数学的唯一时钟） */
    extend(x: number, y: number, pressure: number, t?: number | null): void;
    /** ADR-0013 像素链尺：整数像素按序落点（引擎 stampPixels，每像素恰好一次，绕过 spacing 走步 / 弦）。引擎没有 stampPixels → no-op。 */
    stampPixels(pts: Array<{
        x: number;
        y: number;
    }>, pressure: number): void;
    /** 引擎累积的 dirty bbox（board.markDocDirty 用）；无 → null */
    flushDirty(): [number, number, number, number] | null;
    /** GPU stamp overlay 拉取（brush/形状笔有；liquify/filterBrush 无 → null，走 shadow/live-sync） */
    collectStamps(): StampCollect | null;
    end(): void;
    private _disposeShadows;
    cancel(): void;
}
