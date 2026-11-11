import { GpuTilePool, IndexTexture } from "./gpu-tile-pool.ts";
import { CpuGpuTileBridge } from "./tile-bridge.ts";
import { GLCompositor } from "./gl-compositor.ts";
import type { Acc, OverlayDesc, FloatDesc } from "./gl-compositor.ts";
import type { DocNode, DocLeaf } from "./gl-doc-bridge.ts";
import { LayerPixels } from "../tiles/tile-layer.ts";
import { GLStampRasterizer } from "./gl-stamp.ts";
import type { Stamp, StrokeShape } from "./gl-stamp.ts";
import type { PlanNode, PlanStep, SegBuild } from "./render-plan.ts";
import type { PooledFBO, FBOPrec, Gl2Port, Gl2TexSource, Gl2TileArena } from "../../common/gl2-port.ts";
import type { RegionOverlayInput } from "./region-stroke.ts";
export interface SurrogatePlaneInput {
    layerId: number;
    bytes: {
        data: Uint8ClampedArray;
        w: number;
        h: number;
    };
    bx: number;
    by: number;
    w: number;
    h: number;
}
export interface SurrogateShadowInput {
    layerId: number;
    pixels: LayerPixels;
}
export type SurrogateInput = SurrogatePlaneInput | SurrogateShadowInput;
export interface FloatInput {
    layerId: number;
    srcW: number;
    srcH: number;
    hinv: number[];
    mode: number;
    splinePlane?: {
        data: Float32Array;
        w: number;
        h: number;
    } | null;
    u8Plane?: {
        data: Uint8ClampedArray;
        w: number;
        h: number;
    } | null;
}
export interface StampOverlayInput {
    stamps: Stamp[];
    shape: StrokeShape;
    bx: number;
    by: number;
    bw: number;
    bh: number;
    layerId: number;
    opacity: number;
    erase: boolean;
    blendMode: string;
    lockAlpha: boolean;
    selMask: {
        data: Uint8Array;
        ox: number;
        oy: number;
        ow: number;
        oh: number;
    } | null;
}
export interface FillOverlayInput {
    kind: "fill";
    color: [number, number, number];
    bx: number;
    by: number;
    bw: number;
    bh: number;
    layerId: number;
    lockAlpha: boolean;
    selMask: {
        data: Uint8Array;
        ox: number;
        oy: number;
        ow: number;
        oh: number;
    };
}
export type OverlayInput = StampOverlayInput | FillOverlayInput | RegionOverlayInput;
export declare function overlayEmpty(ov: OverlayInput): boolean;
export interface LeafRec {
    index: IndexTexture;
    byKey: Map<number, number>;
    src: LayerPixels | null;
    cpuVersion: number;
    gen: number;
}
export declare class GlRoom {
    readonly glctx: Gl2Port;
    readonly arena: Gl2TileArena;
    readonly pool: GpuTilePool;
    readonly bridge: CpuGpuTileBridge;
    readonly comp: GLCompositor;
    readonly rasterizer: GLStampRasterizer;
    readonly leaves: Map<number, LeafRec>;
    private _overlays;
    private _overlayOwnedFBOs;
    private _selTex;
    private _selTexSrc;
    private _fillTex;
    private _fillTexColor;
    private _floatTex;
    private _floats;
    private _liveMergedClips;
    private _invalidateListeners;
    constructor(glctx: Gl2Port, maxSlices: number, accumPrec?: FBOPrec);
    get memory(): {
        usedTiles: number;
        capacity: number;
        usedBytes: number;
        committedBytes: number;
        quotaBytes: number;
    };
    get stats(): {
        passes: number;
        floatPasses: number;
    };
    get fboPoolStats(): {
        count: number;
        bytes: number;
    };
    onInvalidate(cb: () => void): void;
    invalidateTree(): void;
    dispose(): void;
    handleContextRestored(): void;
    readonly syncStats: {
        drops: number;
    };
    /** false = 池连驱逐后都塞不下（内容超显存 quota）：该层保持陈旧/部分显示。 */
    syncLeafSafe(leafId: number, pixels: LayerPixels, docW: number, docH: number): boolean;
    private _syncPixels;
    syncSurrogate(s: SurrogatePlaneInput, docW: number, docH: number): void;
    recAlive(rec: {
        byKey: Map<number, number>;
    }): boolean;
    cpuAlive(): (id: number) => boolean;
    toPlanNodes(nodes: DocNode[], updated: Set<number>, overlayLeafIds: ReadonlySet<number>, leafById: Map<number, DocLeaf>): PlanNode[];
    composeSteps(steps: PlanStep[], acc: Acc, docW: number, docH: number, transient: Map<string, PooledFBO>, segLookup: ((key: string) => IndexTexture | undefined) | null): void;
    composeSegTransient(b: SegBuild, docW: number, docH: number, bg: Parameters<GLCompositor["newAcc"]>[2], transient?: Map<string, PooledFBO>, segLookup?: ((key: string) => IndexTexture | undefined) | null): PooledFBO;
    liveClipTexFor(clipBaseId: number | null, docW: number, docH: number): Gl2TexSource | null;
    releaseLiveClip(): void;
    get hasOverlay(): boolean;
    get overlayLayerId(): number | null;
    /** 任一 overlay（bakeStamps 单 overlay 场景用）；多 overlay 时 = 第一个。 */
    overlayDesc(): OverlayDesc | null;
    /** 某叶的 overlay（合成 leaf pass / clip 基底用）；没有 = null。 */
    overlayDescFor(layerId: number): OverlayDesc | null;
    private _descOf;
    clearOverlay(): void;
    releaseOverlayFBO(): void;
    /** 单 overlay 便利口（bakeStamps / 旧调用点）= setStampOverlays([ov])。 */
    setStampOverlay(ov: OverlayInput, docW: number, docH: number): void;
    /** 装一帧的全部 overlay（每叶最多一个；空的跳过）。上一帧 stamp 分支借的 FBO 在此归还（与旧单槽「换新时还旧」同序）。 */
    setStampOverlays(list: readonly OverlayInput[], docW: number, docH: number): void;
    private _addOverlay;
    private _uploadSelMask;
    get floats(): ReadonlyMap<number, FloatDesc>;
    setFloats(floats: FloatInput[]): void;
}
export declare function poolCapacityForBudget(budgetBytes: number): number;
