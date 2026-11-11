import { type PaintTarget, type TargetGeo } from "./space-target.ts";
import { type FaceTables } from "./space-layer.ts";
import type { SpaceData, SpaceGpu } from "./space-gpu.ts";
/** 落笔时准备还没好（还没建 / 刚改过模型、还没重建完）：这一笔不开始，提示行说 say。 */
export declare class PrepPendingError extends Error {
    readonly say = "\u753B\u5E03\u7684\u8868\u8FD8\u5728\u51C6\u5907\uFF08\u521A\u624D\u6539\u4E86\u6A21\u578B\uFF09\uFF0C\u7B49\u4E00\u4E0B\u518D\u753B";
    constructor();
}
export declare class SpacePrep {
    private readonly gpu;
    private readonly entries;
    /** 一共建过几项（测试 / 探针看缓存有没有被用上）。 */
    builds: number;
    private readonly epoch;
    private epochSeen;
    /** epoch = 现在的文档号（换文件就变；不给 = 永远是 0）。 */
    constructor(gpu: () => SpaceGpu | null, epoch?: () => number);
    /** 文档号变了（换了文件）= 全部放掉。宿主每帧开画前调一次；problem / ensure / take 也先调。 */
    checkEpoch(): void;
    /** 一项目标的键（见文件头）。 */
    static keyOf(t: PaintTarget): string;
    /** 落笔前问：null = 都现成、能直接用；"pending" = 有的还没建 / 过期了（要 ensure）；别的 = 建过、建不了的那个错（PaintLimitError 带人话）。 */
    problem(targets: readonly PaintTarget[]): null | "pending" | unknown;
    /** 建缺的、过期的（同步）；只留这次给的这些目标，别的放掉。建不了的记下错、不抛。没有显卡 = 什么都不建。返回这次花了多少毫秒。 */
    ensure(targets: readonly PaintTarget[]): number;
    /** 现成的那一份：整份几何（目标换成这次传进来的那份）+ 每格的表 + 面表 / 三角形表（都借给这一笔，不许放）。不现成 = 抛（先问 problem）。 */
    take(t: PaintTarget): {
        readonly geo: TargetGeo;
        readonly cells: SpaceData;
        readonly tables: FaceTables;
    };
    /** 全部放掉（离开画画工作台、换文件）。 */
    release(): void;
    /** 现在占着的：几项、显卡上每格的表多少字节、上一次各项建了多少毫秒（探针 / 记录）。 */
    stats(): {
        readonly entries: number;
        readonly gpuBytes: number;
        readonly builds: number;
        readonly items: readonly {
            readonly id: string;
            readonly geoMs: number;
            readonly cellMs: number;
            readonly tableMs: number;
            readonly ok: boolean;
        }[];
    };
    private drop;
}
