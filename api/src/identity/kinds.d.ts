import type { Guid } from "./guid.ts";
export type EntryKind = string;
export interface Ref {
    readonly kind: EntryKind;
    readonly guid: Guid;
}
export declare const refKey: (r: Ref) => string;
export interface EntryKindDef<Doc = unknown> {
    readonly kind: EntryKind;
    /** 跟闭包走（拷贝 / 导入时带上）。 */
    readonly carry: boolean;
    /** 引用它会不会成环要管（只有定义；材质 / 层没有出边）。 */
    readonly structural: boolean;
    /** 合并时允许「更新」（层 = false：可见性是看法不是内容）。 */
    readonly overwrite: boolean;
    /** 每份文件固有的条目：永不搬、永不清、永不更新（默认层、内置正 / 背面）。 */
    readonly constants: readonly Guid[];
    guidOf(doc: Doc): Guid;
    nameOf(doc: Doc): string;
    /** 枚举引用（附属里的也算：定义里实例的定义 / 层、槽表的材质）。顺序 = 落地顺序：没有出边的排前面。 */
    refs(doc: Doc): readonly Ref[];
    /** 改写身份：自己的 GUID 和每条引用都过 map（断开 / 做成唯一）。附属的 GUID 归 remintOwned。 */
    rewrite(doc: Doc, map: (r: Ref) => Guid): Doc;
    /** 附属（实例 / 组）也铸新身份（文档内 GUID 唯一）。 */
    remintOwned(doc: Doc): Doc;
    /**
     * 规范形（比内容用，设计书 §7）：只对自己知道「存盘重开会乱序 / 只是代号」的部分做规范化，其余字段原样留着逐字比。
     * 所以以后加字段漏进来 = 判「不一样」、多问一次，不会静默判「一样」把拷来的改动吞掉。
     */
    canon(doc: Doc): unknown;
}
/** 登记表（种类 → 声明）；客户只读。 */
export declare const KINDS: ReadonlyMap<EntryKind, EntryKindDef>;
export declare function registerKind<Doc>(def: EntryKindDef<Doc>): void;
