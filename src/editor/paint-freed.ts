// editor/paint-freed.ts —— 每一步的收尾：记空出来的地方（施工单十八第 2 刀；判法和清单在 paint/freed.ts）。created 2026-11-13 by Claude Opus 5.5
// 一步开始时记基线（历史走到哪一条 + 每个网格体改动日志的号）；一步的最后（编辑器 step 的最外层收口之前）拿这一步之前那份（History.meshBefore：撤销记录里的影子 / 快照，
//   只读）和现在比，要记的框补一条 setFreed 进同一步（撤销一起回去）。不靠每个操作各自报：删面、定义没了、并面对不上、转硬表面、面换画布、合并点塌掉的面、整列删掉都在这一处判。
// 花的时间：只随这一步动过的面涨（改动日志给的）；定义没了 / 那两列加了删了 / 日志说不知道 = 那个定义的全部面（整片的另说，统筹 11-13 深夜同意）。
import type { Guid } from "../format/guid.ts";
import type { Scene } from "../scene/scene.ts";
import type { History } from "./history.ts";
import type { Op } from "./ops.ts";
import { candidatesFor, heldAll, lostPlaces, mergeFreed, RectIndex, type MeshSide, type Rect } from "../paint/freed.ts";

/** 一步开始时记的。 */
export interface FreedBase { readonly at: number; readonly seqs: ReadonlyMap<number, number> }
export function freedBaseline(s: Scene, h: History): FreedBase {
  const seqs = new Map<number, number>();
  for (const d of s.defs.values()) if (d.body.kind === "mesh") seqs.set(d.id, d.body.kernel.changes.seq);
  return { at: h.position(), seqs };
}
/** 这一行的 freed 这一版认不认得（行里带着不认识的 freed = 更新版写的，原样带回、不碰；施工单十八 3.1）。 */
const freedKnown = (extra: unknown): boolean => !(extra && typeof extra === "object" && "json" in extra && (extra as { json: unknown }).json !== null && typeof (extra as { json: unknown }).json === "object" && "freed" in ((extra as { json: object }).json));

/** 这一步要补的 setFreed（没有要改的 = null）。 */
export function freedOp(s: Scene, h: History, base: FreedBase): Op | null {
  const lost = new Map<Guid, Rect[]>(), held = new Map<Guid, Rect[]>(), push = (m: Map<Guid, Rect[]>, g: Guid, rs: readonly Rect[]): void => { if (rs.length) m.set(g, [...(m.get(g) ?? []), ...rs]); };
  for (const [def, seq] of base.seqs) {
    const b = h.meshBefore(def, base.at);
    if (b.kind !== "mesh") continue;
    const d = s.defs.get(def), now: MeshSide | null = d && d.body.kind === "mesh" ? { k: d.body.kernel, slots: d.body.uvSetSlots } : null;
    const before: MeshSide = { k: b.kernel, slots: b.slots ?? now?.slots ?? [] };
    for (const [g, e] of lostPlaces(before, now, candidatesFor(before, now, now ? seq : null))) { push(lost, g, e.lost); push(held, g, e.held); }
  }
  for (const d of s.defs.values()) {   // 这一步新出现的定义：它的面全算进现在占着的（统筹预审第 3 条；现在还没有操作会带着位置搬进新定义——第 3 刀放开搬家时补测试）
    if (base.seqs.has(d.id) || d.body.kind !== "mesh") continue;
    for (const [g, rs] of heldAll({ k: d.body.kernel, slots: d.body.uvSetSlots })) push(held, g, rs);
  }
  const rows: { uvSet: Guid; freed: number[] }[] = [];
  for (const g of [...new Set([...lost.keys(), ...held.keys()])].sort()) {
    const row = s.uvSets.get(g);
    if (!row || !freedKnown(row.extra)) continue;
    const hs = held.get(g) ?? [], idx = hs.length ? new RectIndex(hs) : null;
    const add = (lost.get(g) ?? []).filter((r) => !idx || !idx.covers(r));   // 整个被这一步动过的面现在占着的格盖住 = 不记
    const next = mergeFreed(row.freed, add, hs);
    if (next) rows.push({ uvSet: g, freed: next });
  }
  return rows.length ? { op: "setFreed", rows } : null;
}
