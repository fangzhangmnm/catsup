import { type EntryKind, type EntryKindDef, type Ref } from "./kinds.ts";
import type { EntryStore, Usage } from "./store.ts";
import { type Guid } from "./guid.ts";
/** 从 roots 沿引用够得着的全部条目（店里有的；自己算）。carryOnly = 只走「跟闭包走」的种类。常量店里有就算（默认层那一行是层代号对照表的一部分），搬不搬归 frontier。 */
export declare function closure(store: EntryStore, roots: readonly Ref[], opts?: {
    readonly carryOnly?: boolean;
}): Ref[];
/** 一次要搬进来的闭包 + 它从谁往下走。 */
export interface Bundle {
    readonly docs: readonly {
        readonly kind: EntryKind;
        readonly doc: unknown;
    }[];
    readonly roots: readonly Ref[];
}
/** 从店里取闭包成文件形状（拷贝 / 导入 / 上架共用）。店里说不出文件形状的（内置材质）不进包。 */
export declare function bundleOf(store: EntryStore, roots: readonly Ref[]): Bundle;
/** 包里的文件形状按 refKey 索引。 */
export declare const bundleIndex: (b: Bundle) => Map<string, unknown>;
export interface Census {
    /** 从根够得着（图上的活死）。 */
    isLive(r: Ref): boolean;
    /** 够不着的；不认识的种类不在这里（店里枚举不出来 = 永不清理）。 */
    readonly orphans: readonly Ref[];
    /** 反向索引：谁（直接）引用它。 */
    usedBy(r: Ref): readonly Ref[];
}
export declare function census(store: EntryStore): Census;
/** from 里哪一条够得着 to（只走 structural 的种类：材质 / 层成不了环）。 */
export declare function wouldCycle(edges: (r: Ref) => readonly Ref[], from: readonly Ref[], to: Ref): boolean;
/** 同一条目的两份文件形状内容一样吗。 */
export declare const canonEqual: (k: EntryKindDef, a: unknown, b: unknown) => boolean;
export interface FrontierDiff {
    readonly ref: Ref;
    readonly usage: Usage;
    readonly here: unknown;
    readonly incoming: unknown;
}
/** 包和这份模型对一遍。create = 这边没有；same = 这边有且内容一样（或永不更新 / 比不了）；differ = 这边有、内容不一样。visited = 走到的全部（前序）。 */
export interface Frontier {
    readonly create: readonly Ref[];
    readonly same: readonly Ref[];
    readonly differ: readonly FrontierDiff[];
    readonly visited: readonly Ref[];
}
/**
 * 一样的也要往下看：椅子没改、椅腿改过时，椅子的文件形状一字不差（它只记椅腿的 GUID），停在椅子就把椅腿的改动吞了。内容一样 = 引用也一样，往下走不会多建东西。
 * 比内容要序列化，只在要问的场合调（同一次打开里贴走 KEEP，不调）。
 */
export declare function frontier(store: EntryStore, bundle: Bundle): Frontier;
/** 一次搬运只一种处理（逐个选会造环，谈话第 4 条）。except = 这几种不跟（留这里的）：种类不会成环才能单独选（user 拍「材质跟，可开关」）。keep 不看 except。 */
export interface Decision {
    readonly entries: "update" | "keep" | "detach";
    readonly except?: readonly EntryKind[];
}
export declare const KEEP: Decision;
/** 决定落到每条条目上的结果（纯数据）。remint = 断开：旧 GUID → 新 GUID（这些条目也在 create 里，按旧 GUID 找文件形状）。kept = 用这边那条、可能和拷来的不一样的（留这里的：走到就停的那些；更新 / 断开：被 except 留下的）；比过内容一样的不算。 */
export interface MergePlan {
    readonly create: readonly Ref[];
    readonly update: readonly Ref[];
    readonly remint: ReadonlyMap<Guid, Guid>;
    readonly kept: readonly Ref[]; /** 这趟要走到的路（指令流留文件形状时看它，docsNeeded）。留这里的 = 就是 create。 */
    readonly path: readonly Ref[];
}
export declare function plan(store: EntryStore, bundle: Bundle, d: Decision): MergePlan;
/** 这个计划落地要包里的哪几条文件形状（指令流只带这些，同一个文件里贴一百次不攒一百份）：要建 / 要更新 / 要断开的 + 走到它们路上的上层（重放时还得走得到）。 */
export declare function docsNeeded(bundle: Bundle, p: MergePlan): Set<string>;
/**
 * 按落地之后的样子查环：把这个包贴进 into 会不会成环；要更新的条目换了身体之后会不会绕回自己。新建 / 更新 / 断开的看包里的文件形状，其余看店。
 * 断开的是新身份：into 自己被断开 = 新的那份不指它，碰不到。
 */
export declare function planWouldCycle(store: EntryStore, bundle: Bundle, p: MergePlan, into: Ref): boolean;
