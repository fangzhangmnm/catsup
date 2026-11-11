import { type MigrationCtx } from "./definitions.ts";
export interface Stamp {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
}
/** 本版写出的拍子（SSoT）。 */
export declare const FORMAT: {
    readonly CATSUP_document: {
        readonly major: 3;
        readonly minor: 5;
        readonly patch: 0;
    };
    readonly CATSUP_brep: {
        readonly major: 4;
        readonly minor: 2;
        readonly patch: 0;
    };
    readonly CATSUP_definitions: {
        readonly major: 7;
        readonly minor: 0;
        readonly patch: 0;
    };
    readonly CATSUP_instance: {
        readonly major: 2;
        readonly minor: 0;
        readonly patch: 0;
    };
    readonly CATSUP_material: {
        readonly major: 1;
        readonly minor: 3;
        readonly patch: 0;
    };
    readonly CATSUP_desk: {
        readonly major: 1;
        readonly minor: 4;
        readonly patch: 0;
    };
    readonly CATSUP_references: {
        readonly major: 1;
        readonly minor: 0;
        readonly patch: 0;
    };
    /** 网格身体载荷（住在 CATSUP_definitions 的 mesh 项里，不是顶层扩展；mesh-payload.ts）：1.0.0 = 多边形形（2026-10-27 M3）。没拍子、没 faceStart 的 = 0.14 三角汤最小形（migrate/mesh.ts 读成每三角一面）。 */
    readonly CATSUP_mesh: {
        readonly major: 2;
        readonly minor: 0;
        readonly patch: 0;
    };
    readonly CATSUP_shelf: {
        readonly major: 1;
        readonly minor: 0;
        readonly patch: 0;
    };
    readonly CATSUP_textures: {
        readonly major: 1;
        readonly minor: 1;
        readonly patch: 0;
    };
};
export type CatsupExtension = keyof typeof FORMAT;
export declare const CATSUP_EXTENSION_ORDER: readonly CatsupExtension[];
/** 不带贴图坐标的网格体照旧盖的拍子（「只写当前拍」的例外，见头注释 1-2½ 那一节）：和 2.0 之前写出来的逐字节一样。 */
export declare const MESH_STAMP_NO_UV: Stamp;
/** 各子结构的 major（老名字，读写两端的 too-new 判定与 STEPS 索引都用它）。 */
export declare const EXTENSION_VERSIONS: Readonly<Record<CatsupExtension, number>>;
/** 写入器盖拍子：`version` 必写；`minor` / `patch` 是可选键（缺 = 0），为 0 时不写——省字节（§3.2「抠」），字节照样确定。 */
export declare const stampOf: (ext: CatsupExtension) => {
    version: number;
    minor?: number;
    patch?: number;
};
export declare const fmtStamp: (s: Stamp) => string;
/** 全部拍子的签名（冻结样本目录名 `v<签名>`；任何一个拍子动了 = 新目录 = 新语料，机械执法）。 */
export declare const formatTag: (f?: Readonly<Record<CatsupExtension, Stamp>>) => string;
/** 文件里的拍子：缺 version = 1（首版），缺 minor / patch = 0；非整数当 0 / 1（不猜更多）。 */
export declare function readStamp(json: Record<string, unknown>): Stamp;
export type StampVerdict = "same" | "older" | "newer-minor" | "newer-patch";
/** 同 major 下文件拍子 vs 本版：minor 大 = newer-minor（提示一次），patch 大 = newer-patch（静默），其余 older / same。 */
export declare function compareStamp(file: Stamp, mine: Stamp): StampVerdict;
/** 读取时攒的判决（不持久化）：newerMinor = 哪些子结构比本版新一个 minor（宿主提示一次）；deskTooNew = 桌面态 major 比本版新（原字节带回、用默认）；
 *  referencesTooNew = 参考窗牌组 major 比本版新（原字节带回、参考窗先不显示）；shelfTooNew 同理；danglingShelfRefs = 架子上有几格指向的东西已经不在文件里（读时丢掉，不猜、不造）。 */
export interface FormatReadNotes {
    remintedGuids?: number;
    newerMinor: {
        ext: CatsupExtension;
        file: Stamp;
        mine: Stamp;
    }[];
    newerPatch: {
        ext: CatsupExtension;
        file: Stamp;
        mine: Stamp;
    }[];
    deskTooNew?: Stamp; /** 槽表里写了内置默认正面 GUID 的格数（默认正面的唯一表示是槽缺，读成没有；手改过的文件才有）。 */
    builtinFrontSlots?: number;
    referencesTooNew?: Stamp;
    shelfTooNew?: Stamp;
    danglingShelfRefs?: number; /** 贴图表是更新版写的（major 比本版新）：原样带回、材质先按底色显示。 */
    texturesTooNew?: Stamp; /** 材质的 channels 指着贴图表里没有的 GUID：那一格当空的（不猜、不造）。 */
    danglingTextureRefs?: number; /** 贴图表里有本版不认识的 content 种类（整行原样带回、显示成灰色占位）。 */
    unknownTextureKinds?: number;
    /** 贴图坐标坏了、这次打开按「没有」处理的地方（1-2½，契约第五节：贴图坐标是模型的附属数据，坏了模型照开）：哪个定义、哪一套（整套不认、连身份号都坏了 = null）、几张面、为什么。再存盘会把它们去掉。 */
    uvDropped?: UvDropNote[];
    /** 走画的面在那一套上没有位置（照材质的底色显示）：哪个定义、哪一套、几张面。 */
    paintUnplaced?: {
        def: {
            guid: string;
            name: string;
        };
        uvSet: {
            guid: string;
            name: string;
        };
        faces: number;
    }[];
    /** 接了单品的画的材质被别的定义的槽表引用：那一格这次当没有材质（几格）。再存盘会去掉这些引用。 */
    foreignPaintSlots?: number;
    /** 贴图的 layout 指向不存在的定义或那一套：这张贴图当孤儿留着（几张）。 */
    orphanPaintTextures?: number;
}
/** 贴图坐标坏了的一处（为什么：整个 uvSets 不是列表 / 这一套的身份号、宽高、密度、角上的数那一段不对 / 几套同一个身份号 / 面的角一半有数一半没有、不是有限数、落在画布外面）。 */
export type UvDropWhy = "not-a-list" | "not-an-object" | "bad-guid" | "bad-size" | "bad-density" | "no-loopUv" | "bad-length" | "duplicate-guid" | "partial-corners" | "non-finite-corners" | "off-canvas-corners";
export interface UvDropNote {
    readonly def: {
        readonly guid: string;
        readonly name: string;
    };
    readonly uvSet: {
        readonly guid: string;
        readonly name: string;
    } | null;
    readonly faces: number;
    readonly why: UvDropWhy;
}
export declare const emptyReadNotes: () => FormatReadNotes;
export type MigrationStep = (json: Record<string, unknown>, ctx?: MigrationCtx) => Record<string, unknown>;
export declare class FormatTooNewError extends Error {
    readonly extension: string;
    readonly fileVersion: number;
    readonly appVersion: number;
    constructor(extension: string, fileVersion: number, appVersion: number);
}
/** 把一个扩展的 JSON 从文件 major 链式升到当前版；缺 version 视为 1（首版）。同 major 下 minor / patch 比本版新 → 记进 notes（有的话），不改 JSON。ctx = 跨子结构的迁移要的东西（定义 6→7 要材质的 GUID）；没传就由需要它的那一步抛错，不许默认成空表（空表 = 老文件的材质槽静默清空）。 */
export declare function migrateExtension(ext: CatsupExtension, json: Record<string, unknown>, notes?: FormatReadNotes, ctx?: MigrationCtx): Record<string, unknown>;
