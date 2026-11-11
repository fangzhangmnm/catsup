export type EntryMap = Record<string, Uint8Array>;
export declare const REFERENCES_DIR = ".weebpaint/references";
export declare const REFERENCES_MANIFEST = ".weebpaint/references/manifest.json";
export interface NormalizedLayout {
    files: EntryMap;
    /** 做了哪些搬动（人话，给日志）。空 = 文件本来就是当前布局。 */
    migrated: string[];
}
export declare function normalizeLayout(input: EntryMap): NormalizedLayout;
