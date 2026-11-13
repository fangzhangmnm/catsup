// format/entry-kinds.ts —— CatsUp 的五种条目（组件定义 / 材质 / 层 / 贴图 / 排法）在身份层的声明。政策表 = 设计书 ai-docs/20261104-identity-layer-design.md §3。created 2026-11-04 by Claude Opus 5.5（ID-4a）
// 贴图独立成条目（材质纪元）= 这里加一份声明 + 文件里一节，不加算法。2026-11-10 落地（贴图主线 1-0½，Claude Opus 5.5）：材质经 channels 指贴图，贴图不指别人。
import { registerKind, type Ref } from "../identity/kinds.ts";
import { BUILTIN_BACK_GUID, BUILTIN_FRONT_GUID, DEFAULT_LAYER_GUID, mintGuid, type Guid } from "../identity/guid.ts";
import { paintUvSetOfRow, type DefinitionDoc, type LayerDoc, type MaterialDoc, type TextureDoc, type UvSetDoc } from "./document.ts";
import { canonDefinition, canonMaterial, canonTexture } from "./entry-canon.ts";

export const DEFINITION = "definition", MATERIAL = "material", LAYER = "layer", TEXTURE = "texture", UVSET = "uvSet";
export const defRef = (guid: Guid): Ref => ({ kind: DEFINITION, guid });
export const materialRef = (guid: Guid): Ref => ({ kind: MATERIAL, guid });
export const layerRef = (guid: Guid): Ref => ({ kind: LAYER, guid });
export const textureRef = (guid: Guid): Ref => ({ kind: TEXTURE, guid });
export const uvSetRef = (guid: Guid): Ref => ({ kind: UVSET, guid });
/** 定义用到的排法（网格体上 uv 列的号；施工单十八 3.4）。 */
const uvSetsOfDef = (d: DefinitionDoc): Guid[] => (d.mesh?.columns ?? []).filter((c) => c.kind === "uv").map((c) => c.guid);

/** 定义这种条目在图上的样子：文件形状 + 它实例上层代号的那张对照表（层代号是源文件层表的代号，家规「编号只当对照表的代号」；离开那份文件就得带着表走）。 */
export interface DefinitionEntry { readonly def: DefinitionDoc; readonly layerGuid: (code: number) => Guid | undefined }
export const layerGuidOfTable = (layers: readonly LayerDoc[]): ((code: number) => Guid | undefined) => { const m = new Map(layers.map((l) => [l.id, l.guid])); return (code) => m.get(code); };

registerKind<DefinitionEntry>({
  kind: DEFINITION, carry: true, structural: true, overwrite: true, constants: [],
  guidOf: (e) => e.def.guid,
  nameOf: (e) => e.def.name,
  refs(e) {   // 材质 / 层在前：落地时它们先于用它们的子组件进表（表的先后和以前一样）
    const out: Ref[] = [];
    for (const g of e.def.materialSlots) if (g !== null) out.push(materialRef(g));
    for (const i of e.def.instances) { const g = i.layer === undefined ? undefined : e.layerGuid(i.layer); if (g !== undefined) out.push(layerRef(g)); }
    for (const i of e.def.instances) out.push(defRef(i.definition));
    for (const g of uvSetsOfDef(e.def)) out.push(uvSetRef(g));   // 网格体的 uv 列指排法（施工单十八 3.4）
    return out;
  },
  rewrite: (e, map) => ({ ...e, def: { ...e.def, guid: map(defRef(e.def.guid)), materialSlots: e.def.materialSlots.map((g) => (g === null ? null : map(materialRef(g)))), instances: e.def.instances.map((i) => ({ ...i, definition: map(defRef(i.definition)) })),
    ...(e.def.mesh?.columns ? { mesh: { ...e.def.mesh, columns: e.def.mesh.columns.map((c) => (c.kind === "uv" ? { ...c, guid: map(uvSetRef(c.guid)) } : c)) } } : {}) } }),
  remintOwned(e) {
    const groups = new Map(e.def.groups.map((g) => [g.guid, mintGuid()])), parent = (g: Guid | null): Guid | null => (g === null ? null : (groups.get(g) ?? null));
    return { ...e, def: { ...e.def, groups: e.def.groups.map((g) => ({ ...g, guid: groups.get(g.guid)!, parent: parent(g.parent) })), instances: e.def.instances.map((i) => ({ ...i, guid: mintGuid(), parent: parent(i.parent) })) } };
  },
  canon: (e) => canonDefinition(e.def, e.layerGuid),
});

registerKind<MaterialDoc>({
  kind: MATERIAL, carry: true, structural: false, overwrite: true, constants: [BUILTIN_FRONT_GUID, BUILTIN_BACK_GUID],
  guidOf: (m) => m.guid,
  nameOf: (m) => m.name,
  refs: (m) => Object.values(m.channels ?? {}).flatMap((stack) => stack.map(textureRef)),   // 材质指贴图（channels 的每一摞；不认识的通道名也算）
  rewrite: (m, map) => ({ ...m, guid: map(materialRef(m.guid)), ...(m.channels ? { channels: Object.fromEntries(Object.entries(m.channels).map(([k, stack]) => [k, stack.map((g) => map(textureRef(g)))])) } : {}) }),
  remintOwned: (m) => m,
  canon: canonMaterial,
});

registerKind<TextureDoc>({
  kind: TEXTURE, carry: true, structural: false, overwrite: true, constants: [],   // 跟着用它的材质走；内容不一样 = 和材质一样问（更新 / 留这里的 / 断开）
  guidOf: (t) => t.guid,
  nameOf: (t) => t.name,
  refs: (t) => { const g = paintUvSetOfRow(t); return g ? [uvSetRef(g)] : []; },   // 画挂在排法上（layout = { uvSet }，施工单十八 3.4）；别的 layout 形状原样带、不当引用走
  rewrite: (t, map) => { const g = paintUvSetOfRow(t); return { ...t, guid: map(textureRef(t.guid)), ...(g ? { layout: { uvSet: map(uvSetRef(g)) } } : {}) }; },
  remintOwned: (t) => t,
  canon: canonTexture,
});

registerKind<UvSetDoc>({
  kind: UVSET, carry: true, structural: false, overwrite: false, constants: [],   // 施工单十八 3.4：粘贴时永远用目标文件里的那一份（这一张只放行「原件还在」的粘贴；更新和断开等搬画那张单重新定）
  guidOf: (u) => u.guid,
  nameOf: (u) => u.name,
  refs: () => [],   // 排法自己不指别人
  rewrite: (u, map) => ({ ...u, guid: map(uvSetRef(u.guid)) }),
  remintOwned: (u) => u,
  canon: (u) => ({ ...u, extra: u.extra?.json ?? null }),   // 永不更新 = 不比（overwrite: false）；声明齐全
});

registerKind<LayerDoc>({
  kind: LAYER, carry: true, structural: false, overwrite: false, constants: [DEFAULT_LAYER_GUID],   // 永不更新：显不显示是看法不是内容
  guidOf: (l) => l.guid,
  nameOf: (l) => l.name,
  refs: () => [],
  rewrite: (l, map) => ({ ...l, guid: map(layerRef(l.guid)) }),
  remintOwned: (l) => l,
  canon: (l) => l,   // 永不更新 = 根本不比（overwrite: false）；这行只是声明齐全
});
