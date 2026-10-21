export declare const EXTENSION_VERSIONS: {
    readonly CATSUP_document: 1;
    readonly CATSUP_brep: 2;
    readonly CATSUP_definitions: 2;
    readonly CATSUP_instance: 1;
};
export type CatsupExtension = keyof typeof EXTENSION_VERSIONS;
export type MigrationStep = (json: Record<string, unknown>) => Record<string, unknown>;
export declare class FormatTooNewError extends Error {
    readonly extension: string;
    readonly fileVersion: number;
    readonly appVersion: number;
    constructor(extension: string, fileVersion: number, appVersion: number);
}
/** 把一个扩展的 JSON 从文件版本链式升到当前版；缺 version 视为 1（首版）。 */
export declare function migrateExtension(ext: CatsupExtension, json: Record<string, unknown>): Record<string, unknown>;
