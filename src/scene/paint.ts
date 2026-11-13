// scene/paint.ts —— 画在场景这一层的问法（贴图主线 1-3b，施工单 ai-docs/20261110-paint-workorders-8.md）。created 2026-11-10 by Claude Opus 5.5
// 哪些面走画（Scene.facePaint 是那一个问法，这里是它的批量用法）、规矩自检、哪些走画的面还没有位置、「带着画的面现在还搬不了」那个唯一的拒绝判断。
// 不认识编辑器、不改场景：改场景的只有三条指令（editor/paint-ops.ts）。
import { faceMaterial, materialColumn } from "../mesh/reserved-columns.ts";
import type { DefId, Material, MeshBody, Scene, UvSetRow } from "./scene.ts";
import { paintIn, tiledPaintIn, UV_CANVAS_EPS, type TextureDoc } from "../format/document.ts";
import type { Guid } from "../format/guid.ts";
import { hasUvColumns, uvAt, uvBoxes, uvCodeOf } from "./uv.ts";

/** 这个网格体在哪几套排法上（网格体上的速查表；施工单十八第 1½ 刀起 = MeshBody.uvSetSlots，scene/uv.ts）。 */
export const uvSetsOf = (b: MeshBody): readonly Guid[] => b.uvSetSlots;
/** 这个网格体带不带贴图坐标（速查表空不空；从画换走的面位置还留着，所以和「有没有面走画」不是一回事）。施工单十八第 2 刀起只剩搬家的拒绝（paintMoveBlocked，第 3 刀开）用它；问「走不走画」一律看面。 */
const hasUv = (b: MeshBody): boolean => b.uvSetSlots.length > 0;

/** 第六节那几种动作碰到走画的面时的原因（拒绝之后场景一个字节不变）。 */
export const PAINT_CANT_MOVE = "这些面上有画：带着画的面现在还不能并进别的物件、分出去、做成唯一、复制粘贴、炸开或者转成硬表面（这个功能还没做）";   // 人话（贴图主线 1-7 第 7 条）

/** 这张面走哪一套贴图坐标（走画 = 那一套的 GUID；不走 = null）。 */
export function paintUvOf(s: Scene, def: DefId, f: number): Guid | null {
  const b = s.defs.get(def)?.body;
  if (!b || b.kind !== "mesh" || !b.kernel.hasF(f)) return null;
  return s.facePaint(def, faceMaterial(b.kernel, f))?.uvSet.guid ?? null;
}

/**
 * 这个物件有没有一张面走画（施工单十八第 2 刀：「开始画过没有」只看面，不看网格体的速查表——画过的面全换成普通材质之后，速查表还留着那一套）。
 * 先按材质槽筛（没有一个槽是画 = 没有，不走面）；有才走面，碰到第一张就停。
 */
export function anyFaceWalksPaint(s: Scene, def: DefId): boolean {
  const b = s.defs.get(def)?.body;
  if (!b || b.kind !== "mesh") return false;
  const paintSlots = new Set<number>();
  for (let i = 0; i < b.materialSlots.length; i++) if (s.facePaint(def, i)) paintSlots.add(i);
  if (!paintSlots.size) return false;
  const c = materialColumn(b.kernel);   // 没有这一列 = 每张面都是缺省（−1，不是哪个槽）
  if (!c) return false;
  for (const f of b.kernel.faces()) if (paintSlots.has(c.data[f])) return true;
  return false;
}

/**
 * 这张画铺在哪（画板登记处跟着坐标改大小、垫底色用；贴图主线 1-3c）：贴图表里这一行是画、有材质的颜色那一槽指着它、它挂的排法在场景的排法表里、有网格体带着那一列
 * → 那个定义、那一套、指着它的第一个材质（底色）；差一样 = null。layout 照旧只经 paintIn 读。
 * 施工单十八第 1 刀：排法不属于哪个物件了，「那个定义」= 带着这一列的定义（编号最小的）。带着画的面这一刀还搬不动（paintMoveBlocked 全拒），所以只会有一个；
 *   第 2 刀改成「所有定义」（每格归谁的表按排法收所有定义的面）。
 */
export function paintPlaceOf(s: Scene, texture: Guid): { def: DefId; uvSet: UvSetRow; material: Material } | null {
  for (const m of s.materials) {
    const p = paintIn(s.textures, m);
    if (!p || p.textureDoc.guid !== texture) continue;
    const row = s.uvSets.get(p.uvSet);
    if (!row) return null;
    for (const d of [...s.defs.values()].sort((a, c) => a.id - c.id)) if (d.body.kind === "mesh" && d.body.uvSetSlots.includes(row.guid)) return { def: d.id, uvSet: row, material: m };
    return null;
  }
  return null;
}
/**
 * 一张画在哪（画板登记处：画板在不在、底色、能不能变热、给渲染器什么图；存盘：底色。施工单二十一第 3 刀）：两种——
 * uv = 铺在一套贴图坐标上的（就是 paintPlaceOf）；tiled = 平铺的画（CATSUP_textures 1.2：有材质的颜色那一槽指着它、分层 + sizeM、没有 layout）→ sizeM 和指着它的第一个材质。
 * 平铺的画没有坐标：画布大小写在它自己的分层字节里（新建时就编好空白的，editor/paint-ops.ts addTiledPaint），不跟谁改大小。
 */
export type BoardPlace = ({ readonly kind: "uv" } & NonNullable<ReturnType<typeof paintPlaceOf>>) | { readonly kind: "tiled"; readonly sizeM: readonly [number, number]; readonly material: Material };
export function boardPlaceOf(s: Scene, texture: Guid): BoardPlace | null {
  const p = paintPlaceOf(s, texture);
  if (p) return { kind: "uv", ...p };
  for (const m of s.materials) { const t = tiledPaintIn(s.textures, m); if (t && t.textureDoc.guid === texture) return { kind: "tiled", sizeM: t.sizeM, material: m }; }
  return null;
}

/**
 * 规矩（进场景的自检，和 MeshKernel.check() 一起跑；施工单十八第 1½ 刀改成看速查表和代号）：速查表里每个号在场景的排法表里有那一行、画布宽高是正整数；
 * 每张面的代号在 −1…速查表长度之间；有位置的面角都落在那张画布里（横 0 到宽、纵 0 到高）。返回毛病（空 = 好）。
 */
export function paintIssues(s: Scene, def: DefId): string[] {
  const b = s.def(def).body;
  if (b.kind !== "mesh") return [];
  const bad: string[] = [], k = b.kernel, slots = b.uvSetSlots;
  for (const guid of slots) {
    const row = s.uvSets.get(guid);
    if (!row) { bad.push(`uvSetSlots ${guid}: the scene has no uvSet row with this GUID`); continue; }
    if (!(Number.isInteger(row.width) && Number.isInteger(row.height) && row.width > 0 && row.height > 0)) bad.push(`uvSet ${row.guid}: canvas ${row.width} × ${row.height} is not a positive whole size`);
    const box = uvBoxes(k, slots, guid), eps = UV_CANVAS_EPS;   // 读文件的收口用同一个数
    for (let i = 0; i < box.length; i += 4) if (box[i] < -eps || box[i + 1] < -eps || box[i + 2] > row.width + eps || box[i + 3] > row.height + eps) { bad.push(`uvSet ${row.guid}: a face has corners outside the ${row.width} × ${row.height} canvas`); break; }
  }
  if (new Set(slots).size !== slots.length) bad.push(`uvSetSlots: the same uvSet appears twice`);
  if (hasUvColumns(k)) for (const f of k.faces()) { const c = uvCodeOf(k, f); if (!(Number.isInteger(c) && c >= -1 && c < slots.length)) { bad.push(`face ${f}: uv code ${c} is outside −1…${slots.length - 1}`); break; } }
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
  if (!b || b.kind !== "mesh") return out;   // 施工单十八第 2 刀：不看速查表空不空（材质是画而没有位置的面 = 走画没位置，收尾去补）
  const k = b.kernel, seen = new Set<number>();
  for (const f of candidates ?? k.faces()) {
    if (seen.has(f)) continue;
    seen.add(f);
    const g = paintUvOf(s, def, f);
    if (g === null || uvAt(k, b.uvSetSlots, f, g)) continue;
    const list = out.get(g) ?? [];
    list.push(f); out.set(g, list);
  }
  for (const l of out.values()) l.sort((a, c) => a - c);
  return out;
}

/**
 * 搬的是什么：一个定义上的一摞面（给 faces）；整个定义（不给 faces：并物件 / 炸开 / 转硬表面 / 变成独立的 / 粘贴「更新」换掉它的身体）；
 * 或者一份粘贴的载荷（材质表 + 贴图 + 散面用到的材质编号 + 这一贴要新建 / 更新的定义各自的槽表 + 要被换掉身体的现有定义）。
 */
export type PaintMove =
  | { readonly def: DefId; readonly faces?: Iterable<number> }
  | { readonly payload: { readonly materials?: readonly Material[]; readonly textures?: readonly TextureDoc[]; readonly faceMats?: Iterable<number>; readonly defSlots?: Iterable<readonly (Guid | null)[]>; readonly replaces?: Iterable<DefId>; /** 这一贴要新建 / 更新的定义里有带着贴图坐标的（1-2½ 起文件形状带着它们）。 */ readonly carriesUv?: boolean } };
/**
 * 「带着画的面现在还搬不了」唯一的判断（1-3b 第六节 + 审后补）：并物件、把面分成新物件、变成独立的、炸开网格体组件、网格体转硬表面、复制 / 粘贴（含跨文件）都调它。
 * · 一摞面：有一张走画 = 拒。
 * · 整个定义：带着贴图坐标（有 uv 列，不管现在有没有面走画——从画换走的面角上的数还留着）= 拒：1-2½ 起文件形状（definitionToDoc）带着贴图坐标了，
 *   但搬到别处（复制成唯一、粘贴新建、并进别的物件）要给那几套铸新身份、把画的 layout 对上、贴图跟着按值拷，那是 1-3d；在那之前照旧拒，不让两个定义悄悄共用一套坐标的身份。
 * · 粘贴的载荷：散面里有画的材质 = 拒；这一贴要新建（跨文件 / 「断开」铸新身份）或更新的定义，槽表里有画的材质 = 拒（画会落到别的定义里、或者跟着换掉的身体丢了）；
 *   要被「更新」换掉身体的现有定义带着贴图坐标 = 拒；这一贴要新建 / 更新的定义自己带着贴图坐标（哪怕只剩没人引用的那几套）= 拒（1-2½ 起文件形状带着它们：
 *   跨文件 / 「断开」新建要给那几套铸新身份，归 1-3d；和「整个定义带着贴图坐标」那条一致）。同一份文件里贴整个物件的另一份摆放（留这里的那条）不受影响：它们本来就共用同一张画。
 * 返回原因 / null（放行）。
 */
export function paintMoveBlocked(s: Scene, what: PaintMove): string | null {
  if ("def" in what) {
    const b = s.defs.get(what.def)?.body;
    if (!b || b.kind !== "mesh" || !hasUv(b)) return null;
    if (!what.faces) return PAINT_CANT_MOVE;
    for (const f of what.faces) if (paintUvOf(s, what.def, f) !== null) return PAINT_CANT_MOVE;
    return null;
  }
  const p = what.payload, mats = p.materials ?? [];
  const table = new Map<Guid, TextureDoc>(s.textures);
  for (const t of p.textures ?? []) table.set(t.guid, t);
  const isPaint = (m: Material | undefined): boolean => !!m && !!paintIn(table, m);
  for (const c of p.faceMats ?? []) if (c >= 0 && isPaint(mats[c])) return PAINT_CANT_MOVE;
  const byGuid = new Map<Guid, Material>(s.materials.map((m) => [m.guid, m]));
  for (const m of mats) byGuid.set(m.guid, m);
  for (const slots of p.defSlots ?? []) for (const g of slots) if (g !== null && isPaint(byGuid.get(g))) return PAINT_CANT_MOVE;
  for (const d of p.replaces ?? []) if (paintMoveBlocked(s, { def: d })) return PAINT_CANT_MOVE;
  if (p.carriesUv) return PAINT_CANT_MOVE;
  return null;
}
