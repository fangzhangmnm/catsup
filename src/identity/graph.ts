// identity/graph.ts —— 引用图上的通用算法（全部纯函数，只认店和种类声明）。设计书 §4–§5。created 2026-11-04 by Claude Opus 5.5（ID-4a）
// 客户只看到 frontier → plan → applyPlan（format/scene-store.ts）三步和 census。边是单向的「我需要谁」：闭包只顺这个方向走（user 11-04 问「那不是六度定理就是全世界吗」）；「谁在用它」= census 的反向索引。
import { KINDS, refKey, type EntryKind, type Ref } from "./kinds.ts";
import type { EntryStore } from "./store.ts";
import type { Guid } from "./guid.ts";

/** 深度优先前序（栈，不递归：链再长不爆栈）。step 回答这一条往下还走谁。 */
function walk(roots: readonly Ref[], step: (r: Ref) => readonly Ref[]): void {
  const seen = new Set<string>(), stack = [...roots].reverse();
  while (stack.length) {
    const r = stack.pop()!, key = refKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    const next = step(r);
    for (let i = next.length - 1; i >= 0; i--) stack.push(next[i]);
  }
}

/** 从 roots 沿引用够得着的全部条目（店里有的；自己算）。carryOnly = 只走「跟闭包走」的种类。常量店里有就算（默认层那一行是层代号对照表的一部分），搬不搬归 frontier。 */
export function closure(store: EntryStore, roots: readonly Ref[], opts: { readonly carryOnly?: boolean } = {}): Ref[] {
  const out: Ref[] = [];
  walk(roots, (r) => {
    if (!store.has(r) || (opts.carryOnly && !KINDS.get(r.kind)?.carry)) return [];
    out.push(r);
    return store.refsOf(r);
  });
  return out;
}

/** 一次要搬进来的闭包 + 它从谁往下走。 */
export interface Bundle { readonly docs: readonly { readonly kind: EntryKind; readonly doc: unknown }[]; readonly roots: readonly Ref[] }
/** 从店里取闭包成文件形状（拷贝 / 导入 / 上架共用）。店里说不出文件形状的（内置材质）不进包。 */
export function bundleOf(store: EntryStore, roots: readonly Ref[]): Bundle {
  const docs: { kind: EntryKind; doc: unknown }[] = [];
  for (const r of closure(store, roots, { carryOnly: true })) { const doc = store.docOf(r); if (doc !== undefined) docs.push({ kind: r.kind, doc }); }
  return { docs, roots };
}
/** 包里的文件形状按 refKey 索引。 */
export const bundleIndex = (b: Bundle): Map<string, unknown> => { const m = new Map<string, unknown>(); for (const { kind, doc } of b.docs) { const k = KINDS.get(kind); if (k) m.set(refKey({ kind, guid: k.guidOf(doc) }), doc); } return m; };

export interface Census {
  /** 从根够得着（图上的活死）。 */
  isLive(r: Ref): boolean;
  /** 够不着的；不认识的种类不在这里（店里枚举不出来 = 永不清理）。 */
  readonly orphans: readonly Ref[];
  /** 反向索引：谁（直接）引用它。 */
  usedBy(r: Ref): readonly Ref[];
}
export function census(store: EntryStore): Census {
  const live = new Set(closure(store, store.roots()).map(refKey)), orphans: Ref[] = [], users = new Map<string, Ref[]>();
  for (const kind of KINDS.keys()) for (const guid of store.all(kind)) {
    const me: Ref = { kind, guid };
    if (!live.has(refKey(me))) orphans.push(me);
    for (const r of store.refsOf(me)) { const key = refKey(r), u = users.get(key); if (u) u.push(me); else users.set(key, [me]); }
  }
  return { isLive: (r) => live.has(refKey(r)), orphans, usedBy: (r) => users.get(refKey(r)) ?? [] };
}

/** from 里哪一条够得着 to（只走 structural 的种类：材质 / 层成不了环）。 */
export function wouldCycle(edges: (r: Ref) => readonly Ref[], from: readonly Ref[], to: Ref): boolean {
  const target = refKey(to), structural = (r: Ref): boolean => !!KINDS.get(r.kind)?.structural;
  let hit = false;
  walk(from.filter(structural), (r) => {
    if (hit || refKey(r) === target) { hit = true; return []; }
    return edges(r).filter(structural);
  });
  return hit;
}

/** 包和这份模型对一遍。create = 这边没有；same = 这边有（它下面不再看）。differ 是 ID-4b 的。 */
export interface Frontier { readonly create: readonly Ref[]; readonly same: readonly Ref[] }
export function frontier(store: EntryStore, bundle: Bundle): Frontier {
  const docs = bundleIndex(bundle), create: Ref[] = [], same: Ref[] = [];
  walk(bundle.roots, (r) => {
    const k = KINDS.get(r.kind);
    if (!k || k.constants.includes(r.guid)) return [];   // 常量两边本来都有
    if (store.has(r)) { same.push(r); return []; }
    const incoming = docs.get(refKey(r));
    if (incoming === undefined) return [];   // 两边都没有：落地时这条引用悬空（和读文件一样）
    create.push(r);
    return k.refs(incoming);
  });
  return { create, same };
}

/** 一次搬运只一种处理（逐个选会造环，谈话第 4 条）。ID-4a 只有 keep。 */
export type Decision = { readonly entries: "keep" };
export const KEEP: Decision = { entries: "keep" };
/** 决定落到每条条目上的结果（纯数据）。 */
export interface MergePlan { readonly create: readonly Ref[]; readonly update: readonly Ref[]; readonly remint: ReadonlyMap<Guid, Guid> }
export function plan(store: EntryStore, bundle: Bundle, _d: Decision): MergePlan {
  return { create: frontier(store, bundle).create, update: [], remint: new Map() };
}
/** 按落地之后的样子查：from 这个包贴进 into 会不会成环。新建 / 更新的看包里的文件形状，其余看店。 */
export function planWouldCycle(store: EntryStore, bundle: Bundle, p: MergePlan, into: Ref): boolean {
  const docs = bundleIndex(bundle), incoming = new Set([...p.create, ...p.update].map(refKey));
  const edges = (r: Ref): readonly Ref[] => (incoming.has(refKey(r)) ? (KINDS.get(r.kind)?.refs(docs.get(refKey(r))) ?? []) : store.refsOf(r));
  return wouldCycle(edges, bundle.roots, into);
}
