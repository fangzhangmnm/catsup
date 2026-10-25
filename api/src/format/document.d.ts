import type { BrepSnapshot, Pt3 } from "../kernel/kernel.ts";
import { type Frame, type Xform } from "../scene/xform.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
export type BakeMode = "wysiwyg" | "engine";
export interface DocumentSettings {
    displayUnit: string;
    gridStep: number;
    snapIncrement: number;
    absoluteGrid: boolean;
    /** 网格面（0.13.14；可选键，缺省 xy）：yz / xz = 立面网格。 */
    gridPlane?: "xy" | "yz" | "xz";
    gridPreset?: "si" | "architectural" | "dnd";
    /** B43 尺度参考勾了哪几项（0.13.57 起多选；可选键，不升版）：没写 = 默认（室内 + 室外）、[] = 不显示、元素 = 物体尺寸梯子选单 id（认不出的原样带回）。 */
    scaleRefs?: string[];
    /** v0.13.52–56 单选时写的旧键（只读不写）："none" = 不显示、别的 = 一个选单 id。 */
    scaleRef?: string;
    gridSubdiv: number;
}
/** 图片资产（贴图与参考卡片共用；契约 ai-docs/20261024-object-model-contract.md §3）：**每张图必须带长度尺度**（user 2026-10-24），sizeM 是真源，像素只是分辨率。 */
export interface ImageAsset {
    mimeType: string;
    bytes: Uint8Array;
    sizeM: [number, number];
}
export declare const assertImageAsset: (img: ImageAsset, what?: string) => void;
/** 材质（= glTF core material）：颜色 sRGB 0..1 + 可选贴图（原图字节 + 物理尺寸 米）。 */
export interface MaterialDoc {
    name: string;
    color: [number, number, number];
    texture?: ImageAsset;
}
/** 层（Unity render layer 的管理用法；契约 §4）：文档级表，id 0 = 默认层永远存在；只管可见性，纯管理。 */
export interface LayerDoc {
    id: number;
    name: string;
    visible: boolean;
    color?: [number, number, number];
}
export declare const DEFAULT_LAYER: LayerDoc;
export declare const defaultLayers: () => LayerDoc[];
/** 网格身体载荷（契约 §2；Blender 式三角网的最小形）：positions xyz（米，定义坐标）、indices 三角、可选法向 / uv / 每三角材质槽。 */
export interface MeshDoc {
    positions: Float32Array;
    indices: Uint32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    triMaterial?: Uint16Array;
}
/** 参考几何（0.11 尺规纪元；definitions v4）：池本地坐标，id 线 / 点同一空间。 */
export interface GuidesDoc {
    lines: {
        id: number;
        p: Pt3;
        dir: Pt3;
    }[];
    points: {
        id: number;
        p: Pt3;
    }[];
}
export declare const emptyGuidesDoc: () => GuidesDoc;
export interface GroupDoc {
    id: number;
    parent: number | null;
    axes: Frame;
    brep: BrepSnapshot;
    name?: string;
    guides: GuidesDoc;
}
export interface InstanceDoc {
    id: number;
    definition: number;
    parent: number | null;
    xform: Xform;
    name?: string; /** 锁定（A27）；只在 true 时写。 */
    locked?: boolean; /** 层（契约 §4；缺 = 继承父上下文的有效层）。 */
    layer?: number;
}
export interface DefinitionDoc {
    name: string; /** 物体种类（0.13 门 1）；缺省 brep；文件里只在非 brep 时写。 */
    kind?: BodyKind; /** kind = mesh 时的载荷（definitions v5）。 */
    mesh?: MeshDoc;
    brep: BrepSnapshot;
    groups: GroupDoc[];
    instances: InstanceDoc[]; /** 槽号 → materials 索引。 */
    materialSlots: number[];
    guides: GuidesDoc;
    extras?: Record<string, unknown>;
}
export interface CatsupDocument {
    settings: DocumentSettings;
    /** 绘图轴（0.11；document v2）：根上下文的推断原点与三轴，世界坐标；默认世界帧。 */
    axes: Frame;
    /** 层表（0.14；document v3）：缺 = 只有默认层。 */
    layers: LayerDoc[];
    /** 定稿记录（仿 MoonSinger；ai-docs/20261024-finalize.md）：在 = 锁着；读时指纹对不上 = 作废。可选键，不升版本。 */
    final?: {
        at: string;
        rev: number;
        app: string;
        fingerprint: string;
    };
    /** 定稿过几次（改稿不减）。 */
    finalRev?: number;
    /** 桌面态（`CATSUP_desk`，2026-10-25）= WeebPaint `.weebpaint/editor-state.json` 在 glb 里的镜像：跟文件走、不是内容（定稿指纹不含）、不标脏、新建必 reset。 */
    desk: DeskDoc;
    bakeMode: BakeMode;
    /** 全部 definition；root = definitions[rootIndex]（同一对象）。 */
    definitions: DefinitionDoc[];
    rootIndex: number;
    root: DefinitionDoc;
    /** 文档材质表（glTF materials；只增）。 */
    materials: MaterialDoc[];
    thumbnail?: {
        mimeType: string;
        bytes: Uint8Array;
    };
    /** round-trip 保真：读到的未知顶层键 / 未知扩展 / extras 原样带回；其中任何 `{ bufferView: N }` 引用的二进制也随 `views` 携带。 */
    carry: {
        topLevel: Record<string, unknown>;
        extensions: Record<string, unknown>;
        documentExtra: Record<string, unknown>;
        definitionsExtra: Record<string, unknown>;
        brepKeep?: Record<string, unknown>;
        views: Map<number, Uint8Array>;
    };
    /** 读取时攒的拍子判决（不持久化；newDocument 没有）：哪些子结构比本版新一个 minor（宿主提示一次）、desk 是否太新。 */
    readNotes?: FormatReadNotes;
}
/** 桌面态子结构 `CATSUP_desk`（契约 §5.7；user 2026-10-25「不是应该跟文件吗，看一下weebpaint…」→ WeebPaint desk 同款，user 2026-08-27「editor 里的=per doc」）：
 *  menuTabs = 两个 ☰ 停在哪页 { main?: tab id, view?: tab id }（认不出的 tab 原样带回、打开时落回第一页）；lastView = 相机（原 CATSUP_document.lastView，
 *  契约 §7.2「保留读、停止写」搬来；本版 app 仍没写它）；extra = 本版不认识的顶层键（直通）。desk 的 major 比本版新 → 不拒开：原字节带回，这里是默认值。 */
export interface DeskDoc {
    menuTabs: Record<string, string>;
    lastView?: unknown;
    extra: Record<string, unknown>;
}
export declare const defaultDesk: () => DeskDoc;
/** 文件里的 menuTabs → 只收字符串值；坏形状 = 空。 */
export declare function menuTabsOf(m: unknown): Record<string, string>;
export declare const DEFAULT_SETTINGS: DocumentSettings;
export declare function newDocument(brep: BrepSnapshot, name?: string): CatsupDocument;
