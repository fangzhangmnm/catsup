import { History } from "./workpiece/history.ts";
import { PaintingWorkpiece, type PaintingData, type PaintingDataNode } from "./workpiece/painting-workpiece.ts";
import { PaintingView } from "./workpiece/painting-view.ts";
import type { PerspHost } from "./workpiece/persp-component.ts";
import { LayersFace } from "./layers-face.ts";
import type { Gl2Port } from "../common/gl2-port.ts";
import { type DocCompositorBytesFn } from "./doc-render.ts";
import { type RgbaPlane } from "./png-codec.ts";
import type { WeebPaintBackendInterface, BackendLayerNode, BackendDocInfo, BackendChangeEvent, BackendOpResult, BackendAddResult, ResolvedBrushSnapshot, StrokeId, FilterSessionId } from "./weebpaint-backend-interface.ts";
/** 壳侧编排钩子（进程内壳专用；headless 缺省 no-op。MCP/embedding 面走 onChange 事件——
 *  序列化墙那侧不存在这组细粒度钩子，它们是浏览器壳「同步刷新面板/画面」的过渡协作面）。 */
export interface BackendShellHooks {
    /** 栈形状变化（push/undo/redo/clear/evict）。壳接 wp:histchange 派发。 */
    onHistChange?: (canUndo: boolean, canRedo: boolean) => void;
    /** 某步被应用（undo/redo，按 step entries 逐组件报）。壳接面板/画面刷新。 */
    onApplied?: (info: {
        kind: string;
        dir: "undo" | "redo";
    }) => void;
    /** 不可恢复失败（栈已被弃）。壳接 error banner + 全量重绘；headless 经 onChange 广播。 */
    onUnrecoverable?: (e: unknown) => void;
    /** LayersFace statuses hint（undo/redo 状态栏文案；非权威附注）。 */
    status?: (msg: string) => void;
    /** 写门的否决口（2026-11-08）：返回原因 = 此刻不许改这幅画（锁着）。壳接 edit-lock；headless / MCP 不传 = 不拦。 */
    writeGate?: (label?: string) => string | null;
}
export interface BackendInject {
    appVersion?: string;
    jpgEncoder?: (plane: RgbaPlane) => Promise<Uint8Array>;
    imageDecoder?: (bytes: Uint8Array) => Promise<RgbaPlane>;
    /** 栅格域 Port（C8 档口）：stroke 档的 bake/merge 走它。缺省懒建 SoftGl2Port（提案 §3 注入清单
     *  ——headless/MCP 无参即跑）；壳/embedding 可注入 BrowserGl2Port 共享真 GPU。 */
    gl?: Gl2Port;
    /** desk persp 配置读写口（壳接 workbench-state；缺省内存 host——headless/测试）。 */
    persp?: PerspHost;
    /** per-tenant 合成注入（C7）：本 backend 的 merged 合成面（encodeOra/exportImage/mergeDown）。
     *  缺省回落 doc-render 全局接缝（壳单租户期语义不变）；多 backend 并存各持己面不串。 */
    compositorBytes?: DocCompositorBytesFn;
    hooks?: BackendShellHooks;
}
export interface BackendOpenResult {
    backend: WeebPaintBackend;
    /** open 解出的壳 sidecar（backend 不解释，原样交壳）。整份递回 encodeOra 的同名字段 = 无损往返（MCP 存盘就这么做）。 */
    sidecar: {
        editorState?: unknown;
        legacyState?: unknown;
        referenceFiles: {
            path: string;
            bytes: Uint8Array;
        }[];
        wroteWith: string | null;
        /** desk / 录像 / `.weebpaint/` 下不认识的 entry 的原字节（格式版本纪律：读不懂的也原样带回）。 */
        editorStateBytes?: Uint8Array;
        timelapse?: {
            json: string;
            mp4: Uint8Array;
        } | null;
        extraEntries?: {
            path: string;
            bytes: Uint8Array;
        }[];
    };
}
export declare class WeebPaintBackend implements WeebPaintBackendInterface {
    private _history;
    private _wp2;
    private _view;
    private _layers;
    private _inject;
    private _compositor;
    private _disposed;
    private _listeners;
    private _room;
    private _raster;
    private _stroke;
    private _strokeSeq;
    private _filter;
    private _filterSeq;
    private _histRev;
    /** 进程内协作面（壳迁移期/测试直取引擎；embedding/MCP 只走接口方法——序列化墙那侧不存在这些）。 */
    get wp2(): PaintingWorkpiece;
    get view(): PaintingView;
    get layersFace(): LayersFace;
    get history(): History;
    private constructor();
    static blank(meta: {
        width: number;
        height: number;
    }, inject?: BackendInject): WeebPaintBackend;
    /** 魔数嗅探：zip→ora、8BPS→psd（后棒）、png→UPNG 单图成层、其余→注入解码器单图成层。 */
    static open(bytes: Uint8Array, inject?: BackendInject): Promise<BackendOpenResult>;
    get disposed(): boolean;
    dispose(): void;
    private _guard;
    encodeOra(opts?: {
        editorSidecar?: object | Uint8Array;
        referenceFiles?: {
            path: string;
            bytes: Uint8Array;
        }[];
        timelapse?: {
            json: string;
            mp4: Uint8Array;
        } | null;
        extraEntries?: {
            path: string;
            bytes: Uint8Array;
        }[];
    }): Promise<Uint8Array>;
    exportImage(fmt: "png" | "jpg"): Promise<Uint8Array>;
    docInfo(): BackendDocInfo;
    layerTree(): BackendLayerNode[];
    isDirty(): boolean;
    markSaved(): void;
    layerAdd(name?: string): BackendAddResult;
    layerDuplicate(id: number): BackendAddResult;
    layerRemove(id: number): BackendOpResult;
    layerMove(id: number, delta: number): BackendOpResult;
    layerMergeDown(id: number): BackendOpResult;
    layerSetProp(id: number, prop: "name" | "visible" | "opacity" | "mode" | "clippingMask" | "lockAlpha", value: string | number | boolean): BackendOpResult;
    layerSetActive(id: number): boolean;
    layerClear(id: number): BackendOpResult;
    setReferenceLayer(id: number | null): BackendOpResult;
    crop(x: number, y: number, w: number, h: number): BackendOpResult;
    private _txGuard;
    undo(): boolean;
    redo(): boolean;
    canUndo(): boolean;
    canRedo(): boolean;
    private _ensureRaster;
    private _strokeSessionDeps;
    private _regionLayers;
    private _openRegion;
    private _commitRegion;
    private _commitStamps;
    private _requireStroke;
    strokeBegin(leafId: number, brush: ResolvedBrushSnapshot): StrokeId;
    strokeAppend(id: StrokeId, points: Float32Array): void;
    strokeEnd(id: StrokeId): boolean;
    strokeCancel(id: StrokeId): void;
    private _requireFilter;
    filterBegin(leafId: number, filterId: string): FilterSessionId;
    filterSetParams(id: FilterSessionId, params: Record<string, unknown>): void;
    filterCommit(id: FilterSessionId): boolean;
    filterCancel(id: FilterSessionId): void;
    onChange(cb: (ev: BackendChangeEvent) => void): () => void;
    private _emit;
}
export type { PaintingData, PaintingDataNode };
