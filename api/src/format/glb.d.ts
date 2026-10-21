export interface GlbParts {
    readonly json: unknown;
    readonly bin: Uint8Array;
    readonly version: number;
}
export declare function encodeGlb(json: unknown, bin: Uint8Array): Uint8Array;
/** 只看头 12 字节：是不是 GLB（validateAdopt / 头片 peek 用）。 */
export declare function isGlb(bytes: Uint8Array): boolean;
export declare function decodeGlb(bytes: Uint8Array): GlbParts;
