// format/paint-read.ts —— 读文件时「画」这一层的收口（贴图主线 1-2½；契约 ai-docs/20261110-painting-data-contract.md 第五节「校验」，11-11 改过的那条统一的规矩）。created 2026-11-11 by Claude Opus 5.5
// 2026-11-13 施工单十八第 1 刀改写（排法表搬到顶层 CATSUP_uvsets、网格体上是角上的列）。网格体自己的列在 mesh-payload.ts 里收口（整列不认 / 整面没有）；
// 这里看的是要对着顶层的排法表、材质、贴图表才判得了的几件，都不拒开、记进 notes：
//   ① 网格体的贴图坐标指的排法在排法表里没有那一行 → 这一套不认（不带回；在那一套上的面没有位置）。
//   ② 一张面的角落在它那张画布外面 → 这张面没有位置（不夹回画布里）。
//   ③ 画挂的排法不在排法表里 → 这张贴图当孤儿留着（资源页能清），不动它。
//   ④ 旧存法的画（贴图行的 layout 还是以前的 { definition, uvSet }）→ 这一版不当画（照 3.3 原样带回、按底色），数出来打开时说一句（保存之后它们在面上的位置不再保留）。
//   ⑤ 面的材质是画、这个网格体在那一套上、这张面在那一套上没有位置 → 照材质的底色显示（内存里本来就是这样），记一笔：哪个定义、哪一套、几张面。
// 以前（≤ v0.19.79）还有一条「别的定义借用了单品的画 → 那一格改成没有材质」：排法不属于哪个物件了，这条没有意义，而且是读的时候替人改数据，拿掉（施工单十八第 1 刀）。
// 读贴图的 layout 只经 document.ts 的口（paintIn / paintUvSetOfRow / isOldPaintRow；守卫 test/paint-start-guard.test.ts ①）。
import { COLOR_CHANNEL, UV_CANVAS_EPS, dropUvSets, isOldPaintRow, paintIn, type DefinitionDoc, type MaterialDoc, type TextureDoc, type UvSetDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
import type { Guid } from "./guid.ts";


export function paintReadChecks(definitions: readonly DefinitionDoc[], materials: readonly MaterialDoc[], textures: readonly TextureDoc[], uvSets: readonly UvSetDoc[], notes: FormatReadNotes): void {
  const table = new Map<Guid, TextureDoc>(textures.map((t) => [t.guid, t])), mats = new Map<Guid, MaterialDoc>(materials.map((m) => [m.guid, m]));
  const rows = new Map<Guid, UvSetDoc>(uvSets.map((u) => [u.guid, u]));
  // ① ② 网格体的贴图坐标（MeshDoc.uv：排法列表 + 每面代号 + 每角坐标）对着排法表
  for (const d of definitions) {
    const mesh = d.kind === "mesh" ? d.mesh : undefined;
    if (!mesh?.uv?.sets.length) continue;
    const drop = (col: { guid: string; name: string }, faces: number, why: "no-row" | "off-canvas-corners"): void => { (notes.uvDropped ??= []).push({ def: { guid: d.guid, name: d.name }, uvSet: col, faces, why }); };
    const uv = mesh.uv, noRow = new Set(uv.sets.filter((g) => !rows.has(g))), faceSet = Int32Array.from(uv.faceSet), data = Float32Array.from(uv.data), off = new Map<Guid, number>();
    for (let f = 0; f < mesh.faceStart.length; f++) {
      const c = faceSet[f], g = c >= 0 ? uv.sets[c] : undefined, row = g !== undefined ? rows.get(g) : undefined;
      if (!row) continue;   // 没有位置 / 那一套在表里没有（整套下面一起去掉）
      const s0 = 2 * mesh.faceStart[f], e0 = s0 + 2 * mesh.faceLen[f];
      let out = false;
      for (let i = s0; i < e0; i++) { const v = data[i]; if (v < -UV_CANVAS_EPS || v > ((i - s0) % 2 === 0 ? row.width : row.height) + UV_CANVAS_EPS) out = true; }
      if (out) { off.set(g!, (off.get(g!) ?? 0) + 1); faceSet[f] = -1; data.fill(0, s0, e0); }
    }
    for (const g of uv.sets) {   // 一套一套说（先后 = 排法列表的先后，和以前一列一列说的一样）
      if (noRow.has(g)) drop({ guid: g, name: "" }, 0, "no-row");
      else if (off.get(g)) drop({ guid: g, name: rows.get(g)!.name }, off.get(g)!, "off-canvas-corners");
    }
    mesh.uv = dropUvSets({ sets: uv.sets, faceSet, data }, noRow, mesh.faceStart, mesh.faceLen).uv;
    if (!mesh.uv.sets.length) delete mesh.uv;
  }
  // ③ 画挂的排法不在表里；④ 旧存法的画
  for (const t of textures) {
    if (isOldPaintRow(t)) { notes.oldPaintFormat = (notes.oldPaintFormat ?? 0) + 1; continue; }
    const p = paintIn(table, { channels: { [COLOR_CHANNEL]: [t.guid] } });   // 这张贴图要是画：它挂在哪套排法上（layout 只经 paintIn 读）
    if (p && !rows.has(p.uvSet)) notes.orphanPaintTextures = (notes.orphanPaintTextures ?? 0) + 1;
  }
  // ⑤ 走画的面没有位置
  for (const d of definitions) {
    const mesh = d.kind === "mesh" ? d.mesh : undefined, uv = mesh?.uv;
    if (!mesh || !uv?.sets.length) continue;
    const on = new Set(uv.sets), count = new Map<Guid, number>();
    for (let f = 0; f < mesh.faceStart.length; f++) {
      const slot = mesh.faceMat[f], g = slot >= 0 ? d.materialSlots[slot] : null, m = g ? mats.get(g) : undefined, p = m ? paintIn(table, m) : null;
      if (!p || !rows.has(p.uvSet) || !on.has(p.uvSet)) continue;   // 网格体在那一套上（速查表里有它）才算
      const c = uv.faceSet[f];
      if (c < 0 || uv.sets[c] !== p.uvSet) count.set(p.uvSet, (count.get(p.uvSet) ?? 0) + 1);
    }
    for (const [g, n] of count) (notes.paintUnplaced ??= []).push({ def: { guid: d.guid, name: d.name }, uvSet: { guid: g, name: rows.get(g)!.name }, faces: n });
  }
}
