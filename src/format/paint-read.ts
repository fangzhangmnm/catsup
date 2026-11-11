// format/paint-read.ts —— 读文件时「画」这一层的收口（贴图主线 1-2½；契约 ai-docs/20261110-painting-data-contract.md 第五节「校验」，11-11 改过的那条统一的规矩）。created 2026-11-11 by Claude Opus 5.5
// 网格体自己的贴图坐标在 mesh-payload.ts 里收口（整套不认 / 整面没有）；这里看的是要对着材质和贴图表才判得了的三件，都不拒开、记进 notes：
//   ① 接了单品的画的材质被别的定义的槽表引用 → 那一格当没有材质（槽写成 null；再存盘会去掉这个引用）。
//   ② 贴图的 layout 指向不存在的定义、或那个定义里没有那一套 → 这张贴图当孤儿留着（资源页能清），不动它。
//   ③ 面的材质用了这个定义某一套坐标上的画、而这张面在那一套上没有位置 → 照材质的底色显示（内存里本来就是这样），记一笔：哪个定义、哪一套、几张面。
// 读贴图的 layout 只经 document.ts paintIn（全仓唯一的问法；守卫 test/paint-start-guard.test.ts ①）。
import { COLOR_CHANNEL, paintIn, type DefinitionDoc, type MaterialDoc, type TextureDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
import type { Guid } from "./guid.ts";

export function paintReadChecks(definitions: readonly DefinitionDoc[], materials: readonly MaterialDoc[], textures: readonly TextureDoc[], notes: FormatReadNotes): void {
  const table = new Map<Guid, TextureDoc>(textures.map((t) => [t.guid, t])), mats = new Map<Guid, MaterialDoc>(materials.map((m) => [m.guid, m]));
  const defs = new Map<Guid, DefinitionDoc>(definitions.map((d) => [d.guid, d]));
  // ① 别的定义借用了单品的画
  for (const d of definitions) d.materialSlots.forEach((g, i) => {
    const m = g === null ? undefined : mats.get(g), p = m ? paintIn(table, m) : null;
    if (!p || p.definition === d.guid) return;
    d.materialSlots[i] = null;
    notes.foreignPaintSlots = (notes.foreignPaintSlots ?? 0) + 1;
  });
  // ② layout 指向不存在的那一套
  for (const t of textures) {
    const p = paintIn(table, { channels: { [COLOR_CHANNEL]: [t.guid] } });   // 这张贴图要是画：它铺在哪（layout 只经 paintIn 读）
    if (!p) continue;
    const d = defs.get(p.definition);
    if (d?.kind === "mesh" && d.mesh?.uvSets?.some((u) => u.guid === p.uvSet)) continue;
    notes.orphanPaintTextures = (notes.orphanPaintTextures ?? 0) + 1;
  }
  // ③ 走画的面没有位置
  for (const d of definitions) {
    const mesh = d.kind === "mesh" ? d.mesh : undefined, sets = mesh?.uvSets;
    if (!mesh || !sets?.length) continue;
    const bySet = new Map(sets.map((u) => [u.guid, u])), count = new Map<Guid, number>();
    for (let f = 0; f < mesh.faceStart.length; f++) {
      const slot = mesh.faceMat[f], g = slot >= 0 ? d.materialSlots[slot] : null, m = g ? mats.get(g) : undefined, p = m ? paintIn(table, m) : null;
      const u = p && p.definition === d.guid ? bySet.get(p.uvSet) : undefined;
      if (u && Number.isNaN(u.loopUv[2 * mesh.faceStart[f]])) count.set(u.guid, (count.get(u.guid) ?? 0) + 1);
    }
    for (const [g, n] of count) { const u = bySet.get(g)!; (notes.paintUnplaced ??= []).push({ def: { guid: d.guid, name: d.name }, uvSet: { guid: u.guid, name: u.name }, faces: n }); }
  }
}
