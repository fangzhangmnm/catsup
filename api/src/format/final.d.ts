export interface FinalRecord {
    at: string;
    rev: number;
    app: string;
    fingerprint: string;
}
/** 读进来的老记录像不像样（坏的当没有）。 */
export declare function isFinalRecord(x: unknown): x is FinalRecord;
