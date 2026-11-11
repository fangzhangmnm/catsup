export declare function setOraLogReporter(fn: (msg: string) => void): void;
import type { Stamp } from "./format/migrate.ts";
import type { PaintingData } from "./workpiece/painting-workpiece.ts";
export interface EncodeLeaf {
    isGroup: false;
    id: number;
    name: string;
    visible: boolean;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    lockAlpha: boolean;
    bboxX: number;
    bboxY: number;
    bboxW: number;
    bboxH: number;
    getImageData(x: number, y: number, w: number, h: number): ImageData;
}
export interface EncodeGroup {
    isGroup: true;
    id: number;
    name: string;
    visible: boolean;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    children: EncodeNode[];
}
export type EncodeNode = EncodeLeaf | EncodeGroup;
type EncodeDoc = {
    width: number;
    height: number;
    layers: readonly EncodeNode[];
    activeId: number | null;
    referenceLayerId: number | null;
};
/** exportData 冻结快照 → encode 消费面（保存路径的 freezeDocForEncode 后继；bytes 已当场拷出，
 *  getImageData = 纯切片，无 canvas、无追写风险）。 */
export declare function paintingDataToEncodeDoc(data: PaintingData): EncodeDoc;
/** 参考目录的文件表：路径 → 字节（路径全在 REFERENCES_DIR 下）。 */
export type ReferenceFiles = Map<string, Uint8Array>;
export declare const WEEBPAINT_DIR = ".weebpaint/";
export declare const KNOWN_WEEBPAINT_ENTRIES: readonly string[];
export type ExtraEntries = Map<string, Uint8Array>;
interface EncodeOpts {
    wroteWith: string;
    mergedBytes?: {
        data: Uint8ClampedArray;
        w: number;
        h: number;
    } | null;
    /** 参考目录（format 3）：路径 → 字节，原样写入；路径必须在 .weebpaint/references/ 下（不透明，codec 不解释）。 */
    referenceFiles?: Map<string, Uint8Array | Blob>;
    /** desk.Serialize() → .weebpaint/editor-state.json（desk per-doc；不向后兼容旧轨 webpaint/state.json）。
     *  字节 = 原样带回（desk 的 major 比本版新：读不了也不许改，session-state 把文件里的原字节递回来）。 */
    desk?: object | Uint8Array;
    /** `.weebpaint/` 下本版不认识的 entry（decode 的 _extraEntries），原样写回。路径必须在 `.weebpaint/` 下且不是认识的那几个。 */
    extraEntries?: ExtraEntries;
    timelapse?: {
        json: string;
        mp4: Uint8Array;
    } | null;
}
export interface DecodedPainting {
    data: PaintingData;
    /** 参考目录原样（布局归一化之后的路径）；没有参考 → 空表。壳层交给 @internal/reference-window 解。 */
    _referenceFiles: ReferenceFiles;
    /** 读端做了哪些布局搬动（人话；空 = 文件本来就是当前布局）。壳层记日志用。 */
    _layoutMigrated: string[];
    _weebpaintState?: unknown;
    _editorState?: unknown;
    _editorStateBytes?: Uint8Array;
    /** `.weebpaint/` 下本版不认识的 entry（更新的 minor 加的），保存时原样写回。没有 → 空表。 */
    _extraEntries: ExtraEntries;
    _timelapseJson?: string;
    _timelapseMp4?: Uint8Array;
    _wroteWith: string | null;
    _formatVersion: number;
    _formatStamp: Stamp;
}
/** doc → Blob (.ora)
 *
 * ══ zip 布局契约（format 3，2026-09-29 持久化立宪；format 2 = 2026-08-30 user 拍板；动布局必须上报+附目录表 = CLAUDE.md 纪律）══
 * 终态目录表（写端唯一形状）：
 *   mimetype                              ← ORA spec 强制第一
 *   stack.xml                             ← 结构 + wrote-with / weebpaint:format
 *   mergedimage.png                       ← spec
 *   data/layer<id>.png × N                ← spec
 *   .weebpaint/timelapse.mp4 / .json      ← 录像（format 2 起 mp4 与 json 团圆）
 *   .weebpaint/references/manifest.json   ← 参考窗清单（format 3；契约归 @internal/reference-window）
 *   .weebpaint/references/r<i>.<ext>      ← 参考窗的每张卡（同上，本 codec 不解释）
 *   .weebpaint/editor-state.json          ← desk（format 3 起不再含 refPanels）
 *   Thumbnails/thumbnail.png              ← spec 强制，恒最后（byte-range 尾窗契约）
 * 心智模型：根目录 = ORA spec 领土；`.weebpaint/` = 全部 WP 私货（与云端 store `.weebpaint/` 同义）。
 * **非点 `weebpaint/` 已停写**（format 2）；读端兜底链见 decode 尾部路由表——只读不写、保存即自愈。
 * （旧轨 webpaint/state.json v0.8.21 停写——ADR-0008 §9；decode 读兼容保留存量。）
 */
export declare function encodeDocToOra(doc: EncodeDoc, opts: EncodeOpts): Promise<any>;
/** Blob (.ora 明文) → DecodedPainting（json 形 + 内联 tile 字节 + sidecar）。 */
export declare function decodeOraToPainting(blob: Blob): Promise<DecodedPainting>;
export declare function parseAppVersion(s: string | null | undefined): number | null;
export {};
