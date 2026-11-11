import { Workpiece, type WorkpieceOpts } from "./workpiece.ts";
import { LayerTiles, type TilesHost, type Rect } from "./layer-tiles.ts";
import { LayerTree } from "./layer-tree.ts";
import { SelectionComponent } from "./selection-component.ts";
import { FloatLayerComponent } from "./float-component.ts";
import { PendingFill } from "./pending-fill.ts";
import { PerspComponent, type PerspHost } from "./persp-component.ts";
export interface PaintingDataLeaf {
    id?: number;
    name: string;
    visible: boolean;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    lockAlpha: boolean;
    pixels: {
        rect: Rect;
        bytes: Uint8ClampedArray;
    } | null;
}
export interface PaintingDataGroup {
    id?: number;
    name: string;
    visible: boolean;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    children: PaintingDataNode[];
}
export type PaintingDataNode = PaintingDataLeaf | PaintingDataGroup;
export interface PaintingData {
    width: number;
    height: number;
    activeId?: number | null;
    referenceLayerId?: number | null;
    nodes: PaintingDataNode[];
}
export declare class PaintingWorkpiece extends Workpiece {
    readonly layerTiles: LayerTiles;
    readonly layerTree: LayerTree | null;
    readonly selection: SelectionComponent;
    readonly floatLayer: FloatLayerComponent;
    readonly pendingFill: PendingFill;
    readonly persp: PerspComponent;
    constructor(opts: WorkpieceOpts & {
        host?: TilesHost;
        tree?: {
            width: number;
            height: number;
            maxLeaves?: () => number;
        };
        /** desk persp 配置的读写口（app 接 workbench-state；不传 = 内存 host，纯测试用）。 */
        persp?: PerspHost;
    });
    /** 装载（杀 docRaw/adoptState 的后继）：令牌灌入 → 清栈 → markSaved。 */
    load(data: PaintingData): void;
    /** 编码器读口：冻结快照（bytes 当场拷出；空叶 pixels=null）。 */
    exportData(): PaintingData;
    private _requireTree;
    private _buildNodes;
}
