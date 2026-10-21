import type { CatsupDocument } from "./document.ts";
/** 只看 JSON：是不是 CatsUp 文档（validateAdopt 用；外来 glb 不 adopt）。 */
export declare function isCatsupGltf(json: unknown): boolean;
export declare function readCatsup(bytes: Uint8Array): CatsupDocument;
