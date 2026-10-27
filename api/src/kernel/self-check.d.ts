import { type Pt3 } from "./geom.ts";
import type { Kernel } from "./kernel.ts";
export type ViolationKind = "edgeCross" | "vertexRidesEdge" | "faceOverlap" | "faceNotPlanar" | "ringBroken" | "faceLinkMismatch" | "duplicatePoint";
export interface Violation {
    readonly kind: ViolationKind;
    /** 牵涉的 id（边 / 顶点 / 膜，按 kind）。 */
    readonly ids: readonly number[];
    /** 出事的位置（有的话，世界坐标）。 */
    readonly at?: Pt3;
    /** 人话。 */
    readonly text: string;
}
export interface SelfCheckOptions {
    /** 只查这几条（缺 = 全部）。 */
    only?: readonly ViolationKind[];
    /** 最多报几条（缺 = 不限）。**只给界面省时间用**：报给人看时要说「≥ N」，不能把全量数藏起来（user 10-27「像切尔诺贝利一样……静默，就不好」：剂量计量程要够）。 */
    limit?: number;
}
/** 全图自检。O(E × 近边) + O(每平面膜数² 包围盒粗筛) + O(环边)。 */
export declare function selfCheck(k: Kernel, opts?: SelfCheckOptions): Violation[];
/** 一句人话汇总（修复面板 / 打开后提示用）。 */
export declare function describeViolations(vs: readonly Violation[]): string;
