import type { Guides } from "../scene/guides.ts";
import { type SelMode } from "./tools.ts";
export declare class GuideSelection {
    private readonly ids;
    get size(): number;
    /** 只读视图（画高亮、删除时取 id）。 */
    get view(): ReadonlySet<number>;
    merge(ids: Iterable<number>, mode: SelMode, perItem?: boolean): void;
    clear(): void;
    /** 只留 g 里还在的 id（g = 活动池的参考几何；网格体没有参考几何 = 全清）。 */
    prune(g: Guides): void;
    snapshot(): number[];
    restore(ids: readonly number[]): void;
}
