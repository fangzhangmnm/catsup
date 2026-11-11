import type { Background, ScreenGridBg } from "./gl-compositor.ts";
import type { DocNode } from "./gl-doc-bridge.ts";
import type { GlRoom, FloatInput, OverlayInput, SurrogateInput } from "./gl-room.ts";
export declare class RenderTree {
    private _room;
    private _segCache;
    private _display;
    private _displaySig;
    private _dirty;
    private _lastDocW;
    private _lastDocH;
    private _lastPlan;
    readonly frameStats: {
        segBuilds: number;
        segHits: number;
        cachingDegraded: boolean;
    };
    constructor(room: GlRoom);
    markDirty(): void;
    handleContextRestored(): void;
    renderFrame(nodes: DocNode[], docW: number, docH: number, bg: Background | undefined, affine6: number[], canvasW: number, canvasH: number, scale: number, voidRgb: [number, number, number], floats: FloatInput[], stampOverlays: readonly OverlayInput[], surrogates: readonly SurrogateInput[], liveSyncLeafId: number | null, screenGrid?: ScreenGridBg | null): void;
    private _planSig;
    private _segValid;
    private _invalidateSegs;
    private _buildSeg;
    private _present;
}
