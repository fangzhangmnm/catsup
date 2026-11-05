import { type EntryKind, type Ref } from "./kinds.ts";
import type { Guid } from "./guid.ts";
/** 弹窗和面板要摆的事实。faces / orphanFaces 只有材质有；placed / locked 只有定义有。 */
export interface Usage {
    /** 活着的组件里摆了几份。 */
    readonly placed: number;
    /** 活着的组件里几张面在用（一面一侧算一次）。 */
    readonly faces: number;
    /** 只躺在孤儿组件里的面。 */
    readonly orphanFaces: number;
    /** 摆着的份数里几份锁着。 */
    readonly locked: number;
    /** 素材架收着。 */
    readonly shelved: boolean;
}
export declare const NO_USAGE: Usage;
export interface EntryStore {
    has(r: Ref): boolean;
    /** 文件形状（搬运 / 比较用；场景店这一步要序列化，别在普查里调）。 */
    docOf(r: Ref): unknown | undefined;
    all(kind: EntryKind): readonly Guid[];
    /** 活着的起点：模型根 + 素材架 + 固有常量。不认识的种类也列（店里没有就走不下去，普查永远不把它算孤儿）。 */
    roots(): readonly Ref[];
    refsOf(r: Ref): readonly Ref[];
    usage(r: Ref): Usage;
    /** 这份模型的根（永不被更新、永不被断开；手改过的文件可能拿它当别人的组件）。 */
    readonly modelRoot?: Ref;
}
/** 一张表的店（纯文档 / 测试）：引用按种类声明答。 */
export declare function tableStore(docs: readonly {
    readonly kind: EntryKind;
    readonly doc: unknown;
}[], roots: readonly Ref[], usage?: (r: Ref) => Usage, modelRoot?: Ref): EntryStore;
