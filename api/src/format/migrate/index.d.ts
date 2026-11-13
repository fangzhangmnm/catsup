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
        readonly minor: 6;
        readonly patch: 0;
    };
    readonly CATSUP_references: {
        readonly major: 1;
        readonly minor: 0;
        readonly patch: 0;
    };
    /** 网格身体载荷（住在 CATSUP_definitions 的 mesh 项里，不是顶层扩展；mesh-payload.ts）：1.0.0 = 多边形形（2026-10-27 M3）。没拍子、没 faceStart 的 = 0.14 三角汤最小形（migrate/mesh.ts 读成每三角一面）。 */
    readonly CATSUP_mesh: {
        readonly major: 3;
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
        readonly minor: 3;
        readonly patch: 0;
    };
    readonly CATSUP_uvsets: {
        readonly major: 1;
        readonly minor: 0;
        readonly patch: 0;
    };
};
export type CatsupExtension = keyof typeof FORMAT;
export declare const CATSUP_EXTENSION_ORDER: readonly CatsupExtension[];
/** 不带贴图坐标的网格体照旧盖的拍子（「只写当前拍」的例外，见头注释 1-2½ 那一节）：和 2.0 之前写出来的逐字节一样。 */
export declare const MESH_STAMP_NO_UV: Stamp;
/** 贴图表里没有平铺的画（document.ts isTiledRow）照旧盖的拍子（施工单二十一第 3 刀，统筹审格式时定 A）：和 1.2 之前写出来的逐字节一样——
 *  文件里没有旧版本不认识的东西，旧版本就不该提示「这是更新版写的」（不然提示成了狼来了）。 */
export declare const TEXTURES_STAMP_NO_TILED: Stamp;
/** 贴图表里有平铺的画、没有挂在排法上的画（layout = { uvSet }）照旧盖的拍子（施工单十八，同一条「按内容盖」）。 */
export declare const TEXTURES_STAMP_TILED: Stamp;
/** 各子结构的 major（老名字，读写两端的 too-new 判定与 STEPS 索引都用它）。 */
export declare const EXTENSION_VERSIONS: Readonly<Record<CatsupExtension, number>>;
/** 写入器盖拍子：`version` 必写；`minor` / `patch` 是可选键（缺 = 0），为 0 时不写——省字节（§3.2「抠」），字节照样确定。 */
export declare const stampOf: (ext: CatsupExtension) => {
    version: number;
    minor?: number;
    patch?: number;
};
/** 一个拍子写进文件的样子（stampOf 的通用版：按内容盖例外拍子的地方用）。 */
export declare const stampFields: (f: Stamp) => {
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
    danglingShelfRefs?: number; /** 材质槽指着的材质不在材质表里（也不是内置背面）：这次打开那几格读成默认正面（槽缺）；存回去原来的值就没了（统筹 11-12，存盘忠实度清点 R1）。 */
    danglingMaterialSlots?: number; /** 组 / 实例的上一层指着不存在的组：这次打开放到所在定义的最外层；存回去原来的值就没了（同上 R2）。 */
    danglingParents?: number; /** 贴图表是更新版写的（major 比本版新）：原样带回、材质先按底色显示。 */
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
    /** 画挂的排法不在排法表里：这张贴图当孤儿留着（几张）。 */
    orphanPaintTextures?: number;
    /** 排法表（CATSUP_uvsets）里这一版读不了的行：不认（挂在上面的画按底色、指着它的列按没有）；再存盘会去掉。 */
    uvSetRowsDropped?: {
        guid: string | null;
        name: string;
        why: UvRowWhy;
    }[];
    /** 旧存法的画（施工单十八第五节：不做迁移）：贴图行的 layout 还是以前的 { definition, uvSet }（几张）。这一版不当画、按底色显示；行原样带回，存了不丢。 */
    oldPaintFormat?: number;
    /** 网格体载荷里还带着以前的 uvSets 键（几个网格体）：画在面上的位置，旧存法。读的门口不带回 = 保存之后不再保留（算会丢的）。
     *  和上一条分开记：存过一次再打开，网格体上已经没有它了，这时只剩上一条、再存什么都不丢。 */
    oldUvColumns?: number;
    /** 网格体的面 / 边那两个字节里带着这一版不认识的位（不猜是谁写的：更新版、别的软件、坏了都可能）：几张面、几条边。读的门口去掉了（mesh/mesh-doc.ts dropUnknownMarks）= 没读进来，保存之后不再保留（统筹 11-13，属性规程第九½节末：不拒开）。 */
    unknownMarks?: {
        faces: number;
        edges: number;
    };
}
/** 排法表的一行读不了的原因。 */
export type UvRowWhy = "not-a-list" | "not-an-object" | "bad-guid" | "bad-size" | "bad-density" | "bad-fit" | "duplicate-guid";
/** 角上的列坏了的一处（施工单十八：为什么 = 整个 columns 不是列表 / 这一列的身份号、种类、角上的数那一段不对 / 几列同一个身份号 / uv 列的号在排法表里没有 / 面的角一半有数一半没有、不是有限数、落在画布外面）。 */
export type UvDropWhy = "not-a-list" | "not-an-object" | "bad-guid" | "bad-kind" | "no-data" | "bad-length" | "duplicate-guid" | "no-row" | "partial-corners" | "non-finite-corners" | "off-canvas-corners" | "bad-sets" | "bad-face-set" | "face-set-mismatch" | "extra-channel";
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
