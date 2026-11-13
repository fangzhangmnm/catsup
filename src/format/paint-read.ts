// format/paint-read.ts —— 读文件时「画」这一层的收口（贴图主线 1-2½；契约 ai-docs/20261110-painting-data-contract.md 第五节「校验」，11-11 改过的那条统一的规矩）。created 2026-11-11 by Claude Opus 5.5
// 2026-11-13 施工单十八第 1 刀改写（排法表搬到顶层 CATSUP_uvsets、网格体上是角上的列）。网格体自己的列在 mesh-payload.ts 里收口（整列不认 / 整面没有）；
// 这里看的是要对着顶层的排法表、材质、贴图表才判得了的几件，都不拒开、记进 notes：
//   ① 网格体的 uv 列在排法表里没有那一行 → 这一列不认（不带回）。
//   ② uv 列上一张面的角落在那张画布外面 → 这张面在这一列上整面写成没有（不夹回画布里）。
//   ③ 画挂的排法不在排法表里 → 这张贴图当孤儿留着（资源页能清），不动它。
//   ④ 旧存法的画（贴图行的 layout 还是以前的 { definition, uvSet }）→ 这一版不当画（照 3.3 原样带回、按底色），数出来打开时说一句（保存之后它们在面上的位置不再保留）。
//   ⑤ 面的材质是画、这个网格体有那一列、这张面在那一列上没有位置 → 照材质的底色显示（内存里本来就是这样），记一笔：哪个定义、哪一套、几张面。
// 以前（≤ v0.19.79）还有一条「别的定义借用了单品的画 → 那一格改成没有材质」：排法不属于哪个物件了，这条没有意义，而且是读的时候替人改数据，拿掉（施工单十八第 1 刀）。
// 读贴图的 layout 只经 document.ts 的口（paintIn / paintUvSetOfRow / isOldPaintRow；守卫 test/paint-start-guard.test.ts ①）。
import { COLOR_CHANNEL, UV_CANVAS_EPS, isOldPaintRow, paintIn, type DefinitionDoc, type MaterialDoc, type TextureDoc, type UvSetDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
import type { Guid } from "./guid.ts";


export function paintReadChecks(definitions: readonly DefinitionDoc[], materials: readonly MaterialDoc[], textures: readonly TextureDoc[], uvSets: readonly UvSetDoc[], notes: FormatReadNotes): void {
  const table = new Map<Guid, TextureDoc>(textures.map((t) => [t.guid, t])), mats = new Map<Guid, MaterialDoc>(materials.map((m) => [m.guid, m]));
  const rows = new Map<Guid, UvSetDoc>(uvSets.map((u) => [u.guid, u]));
  // ① ② 网格体的 uv 列对着排法表
  for (const d of definitions) {
    const mesh = d.kind === "mesh" ? d.mesh : undefined;
    if (!mesh?.columns?.length) continue;
    const drop = (col: { guid: string; name: string }, faces: number, why: "no-row" | "off-canvas-corners"): void => { (notes.uvDropped ??= []).push({ def: { guid: d.guid, name: d.name }, uvSet: col, faces, why }); };
    mesh.columns = mesh.columns.filter((c) => {
      if (c.kind !== "uv") return true;
      const row = rows.get(c.guid);
      if (!row) { drop({ guid: c.guid, name: "" }, 0, "no-row"); return false; }
      let off = 0;
      for (let f = 0; f < mesh.faceStart.length; f++) {
        const s = 2 * mesh.faceStart[f], e = s + 2 * mesh.faceLen[f];
        if (Number.isNaN(c.values[s])) continue;
        let out = false;
        for (let i = s; i < e; i++) { const v = c.values[i]; if (v < -UV_CANVAS_EPS || v > ((i - s) % 2 === 0 ? row.width : row.height) + UV_CANVAS_EPS) out = true; }
        if (out) { off++; c.values.fill(NaN, s, e); }
      }
      if (off) drop({ guid: c.guid, name: row.name }, off, "off-canvas-corners");
      return true;
    });
    if (!mesh.columns.length) delete mesh.columns;
  }
  // ③ 画挂的排法不在表里；④ 旧存法的画
  for (const t of textures) {
    if (isOldPaintRow(t)) { notes.oldPaintFormat = (notes.oldPaintFormat ?? 0) + 1; continue; }
    const p = paintIn(table, { channels: { [COLOR_CHANNEL]: [t.guid] } });   // 这张贴图要是画：它挂在哪套排法上（layout 只经 paintIn 读）
    if (p && !rows.has(p.uvSet)) notes.orphanPaintTextures = (notes.orphanPaintTextures ?? 0) + 1;
  }
  // ⑤ 走画的面没有位置
  for (const d of definitions) {
    const mesh = d.kind === "mesh" ? d.mesh : undefined, cols = mesh?.columns?.filter((c) => c.kind === "uv");
    if (!mesh || !cols?.length) continue;
    const byGuid = new Map(cols.map((c) => [c.guid, c])), count = new Map<Guid, number>();
    for (let f = 0; f < mesh.faceStart.length; f++) {
      const slot = mesh.faceMat[f], g = slot >= 0 ? d.materialSlots[slot] : null, m = g ? mats.get(g) : undefined, p = m ? paintIn(table, m) : null;
      const c = p && rows.has(p.uvSet) ? byGuid.get(p.uvSet) : undefined;
      if (c && Number.isNaN(c.values[2 * mesh.faceStart[f]])) count.set(c.guid, (count.get(c.guid) ?? 0) + 1);
    }
    for (const [g, n] of count) (notes.paintUnplaced ??= []).push({ def: { guid: d.guid, name: d.name }, uvSet: { guid: g, name: rows.get(g)!.name }, faces: n });
  }
}
