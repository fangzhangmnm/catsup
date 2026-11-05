// identity/kinds.ts —— 条目种类的声明（开放集）。设计书 ai-docs/20261104-identity-layer-design.md §3–§4。created 2026-11-04 by Claude Opus 5.5（ID-4a）
// 条目 = 有 GUID、能被别的条目引用、能共享、能上架、能成孤儿的东西（组件定义、材质、层，以后贴图 ……）。所有种类在同一张引用图上；种类只管政策 / 存储分区 / 声明。
// 加一种 = 加一份声明（registerKind），不改既有的（user 11-04「贴图成条目，以后还有别的，能不能开放条目类型」）。
// 引用怎么告诉模块 = 每种两个小函数，不是路径表（user 11-04「算法就是数据结构，ai时代更是这样。小函数」）。
// 本目录只 import 自己（守卫 test/identity-layer.test.ts）：不认识 kernel / mesh / scene / format；真正的三种声明在 format/entry-kinds.ts。
import type { Guid } from "./guid.ts";

export type EntryKind = string;
export interface Ref { readonly kind: EntryKind; readonly guid: Guid }
export const refKey = (r: Ref): string => `${r.kind}:${r.guid}`;

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
}

const registry = new Map<EntryKind, EntryKindDef>();
/** 登记表（种类 → 声明）；客户只读。 */
export const KINDS: ReadonlyMap<EntryKind, EntryKindDef> = registry;
export function registerKind<Doc>(def: EntryKindDef<Doc>): void {
  if (registry.has(def.kind)) throw new Error(`entry kind "${def.kind}" registered twice`);
  registry.set(def.kind, def as unknown as EntryKindDef);
}
