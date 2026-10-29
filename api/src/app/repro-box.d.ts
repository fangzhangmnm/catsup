import type { BrepSnapshot } from "../kernel/kernel.ts";
export interface ReproEntry {
    t: string;
    version: string;
    where: string;
    message: string;
    op?: unknown;
    preview?: unknown;
    brep: BrepSnapshot;
    pool?: {
        def: number;
        group: number | null;
    };
}
export declare function capture(e: Omit<ReproEntry, "t" | "version">): void;
export declare function entries(): readonly ReproEntry[];
export declare function count(): number;
export declare function clear(): void;
/** 导出：一个 JSON 文件（entries 数组；brep 是纯数组对象，Kernel.fromBrep 直接吃）。 */
export declare function toJson(list?: readonly ReproEntry[]): string;
/** 「上一步」条目（user 2026-10-24「错误之后的小胶囊好像没有给下载上一步的包和操作的选项」）：成功但错的那一步也要能寄——op + 那一步之前的活动池，形状同失败条目，replay 同一条路。 */
export declare function lastStepEntry(step: {
    op: unknown;
    brep: BrepSnapshot;
    pool: {
        def: number;
        group: number | null;
    };
}): ReproEntry;
/** 交一个 .json：触屏分享、电脑下载（share-or-download.ts；user「windows的分享就是个流氓软件」）；say = 状态行回执。 */
export declare function exportJson(json: string, stem: string, say: (text: string) => void): Promise<void>;
