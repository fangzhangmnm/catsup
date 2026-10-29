export interface Stamp {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
}
/** 本版写出的拍子（SSoT）。 */
export declare const FORMAT: {
    readonly CATSUP_document: {
        readonly major: 3;
        readonly minor: 1;
        readonly patch: 0;
    };
    readonly CATSUP_brep: {
        readonly major: 4;
        readonly minor: 2;
        readonly patch: 0;
    };
    readonly CATSUP_definitions: {
        readonly major: 6;
        readonly minor: 4;
        readonly patch: 0;
    };
    readonly CATSUP_instance: {
        readonly major: 1;
        readonly minor: 0;
        readonly patch: 0;
    };
    readonly CATSUP_material: {
        readonly major: 1;
        readonly minor: 0;
        readonly patch: 0;
    };
    readonly CATSUP_desk: {
        readonly major: 1;
        readonly minor: 2;
        readonly patch: 0;
    };
    readonly CATSUP_references: {
        readonly major: 1;
        readonly minor: 0;
        readonly patch: 0;
    };
    /** 网格身体载荷（住在 CATSUP_definitions 的 mesh 项里，不是顶层扩展；mesh-payload.ts）：1.0.0 = 多边形形（2026-10-27 M3）。没拍子、没 faceStart 的 = 0.14 三角汤最小形（migrate/mesh.ts 读成每三角一面）。 */
    readonly CATSUP_mesh: {
        readonly major: 1;
        readonly minor: 2;
        readonly patch: 0;
    };
};
export type CatsupExtension = keyof typeof FORMAT;
export declare const CATSUP_EXTENSION_ORDER: readonly CatsupExtension[];
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
 *  referencesTooNew = 参考窗牌组 major 比本版新（原字节带回、参考窗先不显示）。 */
export interface FormatReadNotes {
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
    deskTooNew?: Stamp;
    referencesTooNew?: Stamp;
}
export declare const emptyReadNotes: () => FormatReadNotes;
export type MigrationStep = (json: Record<string, unknown>) => Record<string, unknown>;
export declare class FormatTooNewError extends Error {
    readonly extension: string;
    readonly fileVersion: number;
    readonly appVersion: number;
    constructor(extension: string, fileVersion: number, appVersion: number);
}
/** 把一个扩展的 JSON 从文件 major 链式升到当前版；缺 version 视为 1（首版）。同 major 下 minor / patch 比本版新 → 记进 notes（有的话），不改 JSON。 */
export declare function migrateExtension(ext: CatsupExtension, json: Record<string, unknown>, notes?: FormatReadNotes): Record<string, unknown>;
