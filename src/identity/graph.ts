// identity/graph.ts —— 引用图上的通用算法（全部纯函数，只认店和种类声明）。设计书 §4–§5。created 2026-11-04 by Claude Opus 5.5（ID-4a）
// 客户只看到 frontier → plan → applyPlan（format/scene-store.ts）三步和 census。边是单向的「我需要谁」：闭包只顺这个方向走（user 11-04 问「那不是六度定理就是全世界吗」）；「谁在用它」= census 的反向索引。
import { KINDS, refKey, type EntryKind, type EntryKindDef, type Ref } from "./kinds.ts";
import type { EntryStore, Usage } from "./store.ts";
import { mintGuid, type Guid } from "./guid.ts";

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

/** 规范形结构相等：对象按键（值是 undefined 算没有）、数组 / TypedArray 按元素、数字按值（NaN 等于 NaN）。设计书写的「确定性序列化逐字比」的不分配版（贴图字节不用先变成字符串）。 */
function sameShape(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return a !== a && b !== b;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) || ArrayBuffer.isView(a)) {
    if (Array.isArray(a) !== Array.isArray(b) || ArrayBuffer.isView(a) !== ArrayBuffer.isView(b)) return false;
    const x = a as unknown as ArrayLike<unknown>, y = b as unknown as ArrayLike<unknown>;
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (!sameShape(x[i], y[i])) return false;
    return true;
  }
  if (Array.isArray(b) || ArrayBuffer.isView(b)) return false;
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  for (const k of Object.keys(x)) if (x[k] !== undefined && !sameShape(x[k], y[k])) return false;
  for (const k of Object.keys(y)) if (y[k] !== undefined && x[k] === undefined) return false;
  return true;
}
/** 同一条目的两份文件形状内容一样吗。 */
export const canonEqual = (k: EntryKindDef, a: unknown, b: unknown): boolean => sameShape(k.canon(a), k.canon(b));

export interface FrontierDiff { readonly ref: Ref; readonly usage: Usage; readonly here: unknown; readonly incoming: unknown }
/** 包和这份模型对一遍。create = 这边没有；same = 这边有且内容一样（或永不更新 / 比不了）；differ = 这边有、内容不一样。visited = 走到的全部（前序）。 */
export interface Frontier { readonly create: readonly Ref[]; readonly same: readonly Ref[]; readonly differ: readonly FrontierDiff[]; readonly visited: readonly Ref[] }
/**
 * 一样的也要往下看：椅子没改、椅腿改过时，椅子的文件形状一字不差（它只记椅腿的 GUID），停在椅子就把椅腿的改动吞了。内容一样 = 引用也一样，往下走不会多建东西。
 * 比内容要序列化，只在要问的场合调（同一次打开里贴走 KEEP，不调）。
 */
export function frontier(store: EntryStore, bundle: Bundle): Frontier {
  const docs = bundleIndex(bundle), create: Ref[] = [], same: Ref[] = [], differ: FrontierDiff[] = [], visited: Ref[] = [], root = store.modelRoot && refKey(store.modelRoot);
  walk(bundle.roots, (r) => {
    const k = KINDS.get(r.kind);
    if (!k || k.constants.includes(r.guid)) return [];   // 常量两边本来都有
    const incoming = docs.get(refKey(r));
    if (!store.has(r)) {
      if (incoming === undefined) return [];   // 两边都没有：落地时这条引用悬空（和读文件一样）
      create.push(r); visited.push(r);
      return k.refs(incoming);
    }
    visited.push(r);
    if (incoming === undefined || !k.overwrite || refKey(r) === root) { same.push(r); return []; }   // 比不了（包里没带它）/ 永不更新（层）/ 模型根
    const here = store.docOf(r);
    if (canonEqual(k, here, incoming)) same.push(r); else differ.push({ ref: r, usage: store.usage(r), here, incoming });
    return k.refs(incoming);
  });
  return { create, same, differ, visited };
}

/** 一次搬运只一种处理（逐个选会造环，谈话第 4 条）。except = 这几种不跟（留这里的）：种类不会成环才能单独选（user 拍「材质跟，可开关」）。keep 不看 except。 */
export interface Decision { readonly entries: "update" | "keep" | "detach"; readonly except?: readonly EntryKind[] }
export const KEEP: Decision = { entries: "keep" };
/** 决定落到每条条目上的结果（纯数据）。remint = 断开：旧 GUID → 新 GUID（这些条目也在 create 里，按旧 GUID 找文件形状）。kept = 用这边那条、可能和拷来的不一样的（留这里的：走到就停的那些；更新 / 断开：被 except 留下的）；比过内容一样的不算。 */
export interface MergePlan { readonly create: readonly Ref[]; readonly update: readonly Ref[]; readonly remint: ReadonlyMap<Guid, Guid>; readonly kept: readonly Ref[]; /** 这趟要走到的路（指令流留文件形状时看它，docsNeeded）。留这里的 = 就是 create。 */ readonly path: readonly Ref[] }

/** 留这边的：走到这边有的就停（它下面的不看，不然这边的旧版用不上的子组件会被建出来当孤儿，计划书 §15.1-B）。不比内容。 */
function keepPlan(store: EntryStore, bundle: Bundle): MergePlan {
  const docs = bundleIndex(bundle), create: Ref[] = [], kept: Ref[] = [];
  walk(bundle.roots, (r) => {
    const k = KINDS.get(r.kind);
    if (!k || k.constants.includes(r.guid)) return [];
    if (store.has(r)) { kept.push(r); return []; }
    const incoming = docs.get(refKey(r));
    if (incoming === undefined) return [];
    create.push(r);
    return k.refs(incoming);
  });
  return { create, update: [], remint: new Map(), kept, path: create };
}
/** 走到 nodes 里的条目，哪些（传递地）引用着 seeds（自己算）。 */
function above(nodes: readonly Ref[], seeds: readonly Ref[], edges: (r: Ref) => readonly Ref[]): Set<string> {
  const memo = new Map<string, boolean>(seeds.map((r) => [refKey(r), true]));
  const up = (r: Ref): boolean => {
    const key = refKey(r), known = memo.get(key);
    if (known !== undefined) return known;
    memo.set(key, false);   // 手改文件的环：走回来算没有
    const hit = edges(r).some(up);
    memo.set(key, hit);
    return hit;
  };
  for (const r of nodes) up(r);
  return new Set([...memo].filter(([, v]) => v).map(([k]) => k));
}
const edgesInBundle = (docs: ReadonlyMap<string, unknown>) => (r: Ref): readonly Ref[] => { const d = docs.get(refKey(r)); return d === undefined ? [] : (KINDS.get(r.kind)?.refs(d) ?? []); };

export function plan(store: EntryStore, bundle: Bundle, d: Decision): MergePlan {
  if (d.entries === "keep") return keepPlan(store, bundle);
  const f = frontier(store, bundle), skip = new Set(d.except ?? []), changed = f.differ.map((x) => x.ref).filter((r) => !skip.has(r.kind)), left = f.differ.map((x) => x.ref).filter((r) => skip.has(r.kind));
  if (d.entries === "update") return { create: f.create, update: changed, remint: new Map(), kept: left, path: f.visited };
  // 断开：内容不一样的 + 包里（传递地）指着它们的上层都铸新（不然上层还指着旧的）；一样的子组件继续共用。沿边走，不分种类（材质不一样 → 用它的组件也铸新）
  const up = above(f.visited, changed, edgesInBundle(bundleIndex(bundle))), remint = new Map<Guid, Guid>(), create: Ref[] = [], fresh = new Set(f.create.map(refKey));
  for (const r of f.visited) { const hit = up.has(refKey(r)); if (hit) remint.set(r.guid, mintGuid()); if (hit || fresh.has(refKey(r))) create.push(r); }
  return { create, update: [], remint, kept: left, path: f.visited };
}
/** 这个计划落地要包里的哪几条文件形状（指令流只带这些，同一个文件里贴一百次不攒一百份）：要建 / 要更新 / 要断开的 + 走到它们路上的上层（重放时还得走得到）。 */
export function docsNeeded(bundle: Bundle, p: MergePlan): Set<string> {
  const seeds = [...p.create, ...p.update];
  return seeds.length ? above(p.path, seeds, edgesInBundle(bundleIndex(bundle))) : new Set();
}
/**
 * 按落地之后的样子查环：把这个包贴进 into 会不会成环；要更新的条目换了身体之后会不会绕回自己。新建 / 更新 / 断开的看包里的文件形状，其余看店。
 * 断开的是新身份：into 自己被断开 = 新的那份不指它，碰不到。
 */
export function planWouldCycle(store: EntryStore, bundle: Bundle, p: MergePlan, into: Ref): boolean {
  const docs = bundleIndex(bundle), incoming = new Set([...p.create, ...p.update].map(refKey));
  const edges = (r: Ref): readonly Ref[] => (incoming.has(refKey(r)) ? (KINDS.get(r.kind)?.refs(docs.get(refKey(r))) ?? []) : store.refsOf(r));
  if (!p.remint.has(into.guid) && wouldCycle(edges, bundle.roots, into)) return true;
  return p.update.some((u) => wouldCycle(edges, edges(u), u));
}
