// editor/paint-material.ts —— 油漆桶「蘸的」↔ 文档材质（从 editor.ts 搬出来：行数棘轮让本体别长）。
// created 2026-11-10 by Claude Opus 5.5（贴图主线 1-0½；施工单 ai-docs/20261110-paint-workorders-2.md 第四节 editor.ts 那一行）。
// 蘸的是图：先找同一份字节（同一个对象，不比内容——内容哈希当身份全家族否决过）、同尺寸的贴图（没有 = addTexture），
// 再找同名、颜色那一槽指着它的材质（没有 = addMaterial）。两条指令由调用方在同一步里提交（一步撤干净；重做回来 GUID 不变，因为 GUID 写在指令里）。
// 这里只算、不提交：提交只有编辑器能做（StepPass）。
import type { Op } from "./ops.ts";
import type { PaintPick } from "./editor.ts";
import { COLOR_CHANNEL } from "../format/document.ts";
import { mintGuid, type Guid } from "../format/guid.ts";
import { BUILTIN_BACK, BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import type { Material, Scene } from "../scene/scene.ts";

/** 蘸的东西 → 文档材质：已经有 = found（下标；内置默认背面 = 它的句柄；null = 默认）；没有 = 按顺序要提交的指令（提交完新材质的下标 = materials.length − 1）。 */
export function materialForPick(s: Scene, p: PaintPick): { readonly found: number | null } | { readonly ops: readonly Op[] } {
  if (!p) return { found: null };
  if (p.kind === "back") return { found: BUILTIN_BACK_SLOT };   // 内置默认背面不进材质表
  if (p.kind === "color") {
    const i = s.materials.findIndex((m) => !s.colorMapOf(m) && m.name === p.name && m.color.every((c, k) => Math.abs(c - p.color[k]) < 1e-6));
    return i >= 0 ? { found: i } : { ops: [{ op: "addMaterial", name: p.name, color: p.color }] };
  }
  const ops: Op[] = [];
  let tex: Guid | undefined;
  for (const t of s.textures.values()) if (t.content.kind === "image" && t.content.bytes === p.bytes && t.sizeM && t.sizeM[0] === p.sizeM[0] && t.sizeM[1] === p.sizeM[1]) { tex = t.guid; break; }
  if (tex === undefined) { tex = mintGuid(); ops.push({ op: "addTexture", guid: tex, name: p.name, mimeType: p.mimeType, bytes: p.bytes, sizeM: [p.sizeM[0], p.sizeM[1]] }); }
  else { const i = s.materials.findIndex((m) => m.name === p.name && s.colorMapOf(m)?.guid === tex); if (i >= 0) return { found: i }; }
  ops.push({ op: "addMaterial", name: p.name, color: [1, 1, 1], channels: { [COLOR_CHANNEL]: [tex] } });
  return { ops };
}

/** 吸色：这个材质当「蘸的」是什么（默认背面 = 那一格；有原图 = 图；否则 = 颜色）。 */
export function pickOfMaterial(s: Scene, m: Material): NonNullable<PaintPick> {
  if (m === BUILTIN_BACK) return { kind: "back", name: m.name };
  const map = s.colorMapOf(m);
  return map ? { kind: "texture", name: m.name, mimeType: map.content.mimeType, bytes: map.content.bytes, sizeM: [map.sizeM[0], map.sizeM[1]] } : { kind: "color", name: m.name, color: [m.color[0], m.color[1], m.color[2]] };
}
