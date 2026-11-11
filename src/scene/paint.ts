// scene/paint.ts —— 画在场景这一层的问法（贴图主线 1-3b，施工单 ai-docs/20261110-paint-workorders-8.md）。created 2026-11-10 by Claude Opus 5.5
// 哪些面走画（Scene.facePaint 是那一个问法，这里是它的批量用法）、规矩自检、哪些走画的面还没有位置、「带着画的面现在还搬不了」那个唯一的拒绝判断。
// 不认识编辑器、不改场景：改场景的只有三条指令（editor/paint-ops.ts）。
import type { DefId, Material, Scene } from "./scene.ts";
import { paintIn, type TextureDoc } from "../format/document.ts";
import type { Guid } from "../format/guid.ts";

/** 第六节那几种动作碰到走画的面时的原因（拒绝之后场景一个字节不变）。 */
export const PAINT_CANT_MOVE = "带着画的面现在还搬不了（画跟着面搬家是后面的一张工单）";

/** 这张面走哪一套贴图坐标（走画 = 那一套的 GUID；不走 = null）。 */
export function paintUvOf(s: Scene, def: DefId, f: number): Guid | null {
  const b = s.defs.get(def)?.body;
  if (!b || b.kind !== "mesh" || !b.uvSets.size || !b.kernel.hasF(f)) return null;
  return s.facePaint(def, b.kernel.faceMat[f])?.uvSet.guid ?? null;
}

/**
 * 规矩（进场景的自检，和 MeshKernel.check() 一起跑；1-3b 第一节）：uvSets 表里每一行，内核里有同 GUID、每角两个数的列；这一列上有值的角都落在画布里
 * （横 0 到宽、纵 0 到高）。返回毛病（空 = 好）。
 */
export function paintIssues(s: Scene, def: DefId): string[] {
  const b = s.def(def).body;
  if (b.kind !== "mesh") return [];
  const bad: string[] = [], k = b.kernel, cols = new Map(k.columnDefs().map((c) => [c.guid, c.arity]));
  for (const row of b.uvSets.values()) {
    if (!(Number.isInteger(row.width) && Number.isInteger(row.height) && row.width > 0 && row.height > 0)) bad.push(`uvSet ${row.guid}: canvas ${row.width} × ${row.height} is not a positive whole size`);
    const ar = cols.get(row.guid);
    if (ar === undefined) { bad.push(`uvSet ${row.guid}: the kernel has no column with this GUID`); continue; }
    if (ar !== 2) { bad.push(`uvSet ${row.guid}: column has ${ar} numbers per corner, not 2`); continue; }
    const box = k.columnBoxes(row.guid), eps = 1e-6;
    for (let i = 0; i < box.length; i += 4) if (box[i] < -eps || box[i + 1] < -eps || box[i + 2] > row.width + eps || box[i + 3] > row.height + eps) { bad.push(`uvSet ${row.guid}: a face has corners outside the ${row.width} × ${row.height} canvas`); break; }
  }
  return bad;
}
/** 网格体的全部自检：内核的不变量 + 画的规矩。 */
export function meshBodyIssues(s: Scene, def: DefId): string[] {
  const b = s.def(def).body;
  return b.kind === "mesh" ? [...b.kernel.check(), ...paintIssues(s, def)] : [];
}

/**
 * 走画、但在那一套贴图坐标上还没有值的面（按那一套分；面按编号升序）。candidates = 只看这些面（改动日志给的这一步动过的面）；null = 看全部（日志记不得了）。
 * 「要么有位置，要么明着报出来放不下」：收尾补完之后还剩在这里的，就是放不下的。
 */
export function unplacedPaintFaces(s: Scene, def: DefId, candidates: Iterable<number> | null): Map<Guid, number[]> {
  const out = new Map<Guid, number[]>(), b = s.defs.get(def)?.body;
  if (!b || b.kind !== "mesh" || !b.uvSets.size) return out;
  const k = b.kernel, seen = new Set<number>();
  for (const f of candidates ?? k.faces()) {
    if (seen.has(f)) continue;
    seen.add(f);
    const g = paintUvOf(s, def, f);
    if (g === null || k.cornerValues(f, g)) continue;
    const list = out.get(g) ?? [];
    list.push(f); out.set(g, list);
  }
  for (const l of out.values()) l.sort((a, c) => a - c);
  return out;
}

/** 搬的是什么：一个定义上的一摞面（不给 faces = 全部面）；或者一份粘贴的载荷（材质表 + 贴图 + 散面用到的材质编号）。 */
export type PaintMove =
  | { readonly def: DefId; readonly faces?: Iterable<number> }
  | { readonly payload: { readonly materials?: readonly Material[]; readonly textures?: readonly TextureDoc[]; readonly faceMats?: Iterable<number> } };
/**
 * 「带着画的面现在还搬不了」唯一的判断（1-3b 第六节）：并物件、把面分成新物件、变成独立的、炸开网格体组件、网格体转硬表面、复制 / 粘贴（含跨文件）都调它。
 * 一个定义上的面：有一张走画 = 拒绝。粘贴的载荷：散面里有画的材质 = 拒绝；载荷带着一张画、它所属的定义在这份文件里没有（= 跨文件、要造一份新的）= 拒绝。
 * 同一份文件里复制整个物件的另一份摆放（实例）不受影响：它们本来就共用同一张画（载荷里那张画的定义在这份文件里就有）。
 * 返回原因 / null（放行）。
 */
export function paintMoveBlocked(s: Scene, what: PaintMove): string | null {
  if ("def" in what) {
    const b = s.defs.get(what.def)?.body;
    if (!b || b.kind !== "mesh" || !b.uvSets.size) return null;
    for (const f of what.faces ?? b.kernel.faces()) if (paintUvOf(s, what.def, f) !== null) return PAINT_CANT_MOVE;
    return null;
  }
  const p = what.payload, mats = p.materials ?? [];
  if (!mats.length) return null;
  const table = new Map<Guid, TextureDoc>((p.textures ?? []).map((t) => [t.guid, t])), defGuids = new Set([...s.defs.values()].map((d) => d.guid));
  const paints = mats.map((m) => paintIn(table, m));
  for (const c of p.faceMats ?? []) if (c >= 0 && paints[c]) return PAINT_CANT_MOVE;
  for (const pr of paints) if (pr && !defGuids.has(pr.definition)) return PAINT_CANT_MOVE;
  return null;
}
