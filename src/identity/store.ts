// identity/store.ts —— 一份模型在身份层眼里的样子（「店」）：场景和纯文档各实现一份。设计书 §4。created 2026-11-04 by Claude Opus 5.5（ID-4a）
// refsOf 单独一个方法：场景店不序列化几何就能答（普查不许随模型几何涨）；文件形状的店按种类声明答（tableStore）。
import { KINDS, refKey, type EntryKind, type Ref } from "./kinds.ts";
import type { Guid } from "./guid.ts";

/** 弹窗和面板要摆的事实。faces / orphanFaces 只有材质有；locked 只有定义有；placed = 被活着的东西引用了几次（定义 = 摆了几份，贴图 = 几个材质指着它；2026-11-10）。 */
export interface Usage {
  /** 被引用了几次：定义 = 活着的组件里摆了几份；贴图 = 几个材质指着它（不管那个材质自己有没有面在用）。 */
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
export const NO_USAGE: Usage = Object.freeze({ placed: 0, faces: 0, orphanFaces: 0, locked: 0, shelved: false });

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
export function tableStore(docs: readonly { readonly kind: EntryKind; readonly doc: unknown }[], roots: readonly Ref[], usage: (r: Ref) => Usage = () => NO_USAGE, modelRoot?: Ref): EntryStore {
  const byKey = new Map<string, unknown>();
  for (const { kind, doc } of docs) { const k = KINDS.get(kind); if (k) byKey.set(refKey({ kind, guid: k.guidOf(doc) }), doc); }
  return {
    has: (r) => byKey.has(refKey(r)),
    docOf: (r) => byKey.get(refKey(r)),
    all: (kind) => docs.filter((e) => e.kind === kind).map((e) => KINDS.get(kind)!.guidOf(e.doc)),
    roots: () => roots,
    refsOf: (r) => { const doc = byKey.get(refKey(r)); return doc === undefined ? [] : (KINDS.get(r.kind)?.refs(doc) ?? []); },
    usage,
    ...(modelRoot ? { modelRoot } : {}),
  };
}
