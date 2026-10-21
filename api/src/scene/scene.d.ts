import { Kernel, type BrepSnapshot, type EdgeId, type FaceId, type Pt3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, WORLD_FRAME, frameAt, transformFrame } from "./xform.ts";
export type DefId = number;
export type GroupId = number;
export type InstId = number;
export interface Group {
    readonly id: GroupId;
    parent: GroupId | null;
    axes: Frame;
    kernel: Kernel;
    name?: string;
}
export interface Instance {
    readonly id: InstId;
    def: DefId;
    parent: GroupId | null;
    xform: Xform;
    name?: string;
}
export interface Definition {
    readonly id: DefId;
    name: string;
    kernel: Kernel;
    groups: Map<GroupId, Group>;
    instances: Map<InstId, Instance>;
    nextGroup: number;
    nextInst: number;
}
/** 几何池地址 = (definition, group | null)。 */
export interface PoolRef {
    def: DefId;
    group: GroupId | null;
}
export declare const poolKey: (p: PoolRef) => string;
export declare const samePool: (a: PoolRef, b: PoolRef) => boolean;
/** 编辑上下文：从根 definition 进了哪些实例（链）+ 当前在哪个 group 里。运行时态，不落盘、不进 op。 */
export interface EditContext {
    chain: readonly InstId[];
    group: GroupId | null;
}
export declare const ROOT_CONTEXT: EditContext;
export declare class Scene {
    readonly defs: Map<number, Definition>;
    readonly root: DefId;
    private nextDef;
    constructor(rootKernel?: Kernel);
    mintDef(name: string, kernel: Kernel): Definition;
    mintGroup(defId: DefId, parent: GroupId | null, kernel: Kernel, axes: Frame): Group;
    mintInstance(defId: DefId, parent: GroupId | null, target: DefId, xform: Xform): Instance;
    def(id: DefId): Definition;
    group(ref: {
        def: DefId;
        group: GroupId;
    }): Group;
    instance(defId: DefId, id: InstId): Instance;
    kernelOf(p: PoolRef): Kernel;
    hasPool(p: PoolRef): boolean;
    /** 上下文的 definition（链末实例的定义；空链 = 根）。 */
    defOfContext(ctx: EditContext): DefId;
    poolOfContext(ctx: EditContext): PoolRef;
    /** 上下文的世界变换（链上实例变换的乘积；group 不带变换）。 */
    xformOfContext(ctx: EditContext): Xform;
    /** group 的子 group / 子实例（同一 definition 内，按 parent 链）。 */
    childGroups(defId: DefId, parent: GroupId | null): Group[];
    childInstances(defId: DefId, parent: GroupId | null): Instance[];
    /** definition 是否（直接或间接）引用 target——防循环引用。 */
    references(defId: DefId, target: DefId, seen?: Set<number>): boolean;
    /** 某 definition 的实例总数（跨所有 definition）。 */
    instanceCount(target: DefId): number;
    /** 全场景的「池 + 世界变换」展开（渲染 / 拾取 / 吸附的输入；嵌套实例递归；深度上限防循环）。 */
    pools(ctx?: EditContext, opts?: {
        into?: EditContext;
    }): Generator<{
        pool: PoolRef;
        xform: Xform;
        chain: readonly InstId[];
        depth: number;
    }>;
    clone(): Scene;
}
/** 从池里抠出一份子快照：选中的膜（含其环边）+ 选中的边（含端点）。索引 = 本地顺序。 */
export declare function extractSnapshot(k: Kernel, faces: readonly FaceId[], edges: readonly EdgeId[]): BrepSnapshot;
/** 快照整体变换（坐标 + 平面）。 */
export declare function transformSnapshot(snap: BrepSnapshot, m: Xform): BrepSnapshot;
/** 把一份快照（经变换）并进池：膜当像（OR、新 id）、裸边当线段，走结算机（sticky）。炸开 / 粘贴用。 */
export declare function absorbSnapshot(k: Kernel, snap: BrepSnapshot, m?: Xform): void;
/** 轴框默认：选区包围盒的最小角（SU 把组件轴放在包围盒角）。 */
export declare function bboxMin(pts: readonly Pt3[]): Pt3;
export declare function poolBounds(k: Kernel, m?: Xform): {
    min: Pt3;
    max: Pt3;
} | null;
export { WORLD_FRAME, frameAt, transformFrame };
