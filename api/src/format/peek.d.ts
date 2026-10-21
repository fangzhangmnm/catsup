/** 解析 GLB 头 + JSON chunk + BIN 位置（bytes 可以只是文件头片：够到 JSON chunk 末即可）。 */
export declare function parseGlbHead(bytes: Uint8Array): {
    json: Record<string, unknown>;
    binOffset: number;
    binLength: number;
} | null;
export declare function isCatsupDocumentHead(bytes: Uint8Array): boolean;
/** 从字节（全量或足够长的头片）抠出缩略图；没有 = null。 */
export declare function extractThumbnail(bytes: Uint8Array): {
    mimeType: string;
    bytes: Uint8Array;
} | null;
/** 头片够不够抠缩略图（store `getHead` 分步拉的导航，2026-09-20 store 0.15.0）：返回「还要拉到的总长度」（> bytes.length）；
 *  null = 已定局（够了 / 不是 GLB / 没有缩略图）。调用方循环：need > head.length → 再 getHead(need)。最多三步：头 → JSON 全 → 缩略图末。 */
export declare function headBytesNeeded(bytes: Uint8Array): number | null;
