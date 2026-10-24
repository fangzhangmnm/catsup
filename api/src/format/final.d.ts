import type { CatsupDocument } from "./document.ts";
export interface FinalRecord {
    at: string;
    rev: number;
    app: string;
    fingerprint: string;
}
/** 内容指纹（sha256 hex）。同一内容任何写法 / 任何顶点顺序都一样（brep 规范序）；视图 / 设置 / 缩略图不进。 */
export declare function contentFingerprint(doc: CatsupDocument): Promise<string>;
/** 读进来的记录像不像样（坏的当没有）。 */
export declare function isFinalRecord(x: unknown): x is FinalRecord;
