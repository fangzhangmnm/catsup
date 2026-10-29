export interface PassDecl {
    readonly id: string;
    /** 读哪些资源（别的 pass 写出来的，或外部给的输入）。 */
    readonly reads?: readonly string[];
    /** 写哪些资源（从头产出）。一个资源只准有一个写者（两个 = 声明错了，直接抛）。 */
    readonly writes?: readonly string[];
    /** 往哪些已有资源上**追加画**（不清空）：排在那个资源的写者和声明顺序在前的追加者之后。要那个资源 = 写者 + 全部追加者都跑。 */
    readonly appends?: readonly string[];
}
export interface FramePlan {
    /** 要跑的 pass，依赖在前。 */
    readonly order: readonly string[];
    /** 声明了但这帧没人要的 pass（剪掉的）。 */
    readonly pruned: readonly string[];
}
/**
 * 从「这帧要哪些产物」反推要跑的 pass 并拓扑排序。
 * - 不在任何 pass 的 writes 里的资源 = 外部输入（流、视图、编辑器状态），读它不需要跑谁；往外部输入上追加也可以（目标 = 画布）。
 * - 环 = 抛（声明错了，不静默）。
 */
export declare function planFrame(passes: readonly PassDecl[], wanted: readonly string[]): FramePlan;
