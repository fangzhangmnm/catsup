import type { BrepSnapshot, Pt3 } from "../kernel/kernel.ts";
import { type Frame, type Xform } from "../scene/xform.ts";
import type { BodyKind } from "../scene/body-kind.ts";
export type BakeMode = "wysiwyg" | "engine";
export interface DocumentSettings {
    displayUnit: string;
    gridStep: number;
    snapIncrement: number;
    absoluteGrid: boolean;
    gridSubdiv: number;
}
/** 材质（= glTF core material）：颜色 sRGB 0..1 + 可选贴图（原图字节 + 物理尺寸 米）。 */
export interface MaterialDoc {
    name: string;
    color: [number, number, number];
    texture?: {
        mimeType: string;
        bytes: Uint8Array;
        sizeM: [number, number];
    };
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
    guides: GuidesDoc; /** 锁定（A27）；只在 true 时写。 */
    locked?: boolean;
}
export interface InstanceDoc {
    id: number;
    definition: number;
    parent: number | null;
    xform: Xform;
    name?: string; /** 锁定（A27）；只在 true 时写。 */
    locked?: boolean;
}
export interface DefinitionDoc {
    name: string; /** 物体种类（0.13 门 1）；缺省 brep；文件里只在非 brep 时写。 */
    kind?: BodyKind;
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
    /** 定稿记录（仿 MoonSinger；ai-docs/20261024-finalize.md）：在 = 锁着；读时指纹对不上 = 作废。可选键，不升版本。 */
    final?: {
        at: string;
        rev: number;
        app: string;
        fingerprint: string;
    };
    /** 定稿过几次（改稿不减）。 */
    finalRev?: number;
    lastView?: unknown;
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
}
export declare const DEFAULT_SETTINGS: DocumentSettings;
export declare function newDocument(brep: BrepSnapshot, name?: string): CatsupDocument;
