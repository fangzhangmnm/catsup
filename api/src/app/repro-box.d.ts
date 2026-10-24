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
export declare function toJson(): string;
