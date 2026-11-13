// format/scene-store.ts —— 场景 / 纯文档适配身份层（唯一一处「店」的实现 + 落地）。设计书 ai-docs/20261104-identity-layer-design.md §4–§6。created 2026-11-04 by Claude Opus 5.5（ID-4a）
// · 店的 refsOf / usage 不序列化几何（普查、活死只随定义 / 实例 / 面数涨，不碰 toBrep）；docOf 才序列化。
// · 店是一次性的视图：建的时候拍下 GUID → 句柄，场景改了（落地之后）要重建。
import { faceMaterial } from "../mesh/reserved-columns.ts";
import { KINDS, refKey, type EntryKind, type Ref } from "../identity/kinds.ts";
import { bundleIndex, closure, type Bundle, type MergePlan } from "../identity/graph.ts";
import { NO_USAGE, tableStore, type EntryStore, type Usage } from "../identity/store.ts";
import { BUILTIN_BACK_GUID, mintGuid, type Guid } from "../identity/guid.ts";
import { BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import type { DefId, Definition, Material, Scene } from "../scene/scene.ts";
import type { CatsupDocument, LayerDoc, TextureDoc } from "./document.ts";
import { DEFINITION, LAYER, MATERIAL, TEXTURE, UVSET, defRef, layerGuidOfTable, layerRef, materialRef, textureRef, uvSetRef, type DefinitionEntry } from "./entry-kinds.ts";
import { paintUvSetOfRow, type UvSetDoc } from "./document.ts";
import { definitionToDoc, materializeDefinitions } from "./scene-doc.ts";

const constantRefs = (): Ref[] => [...KINDS.values()].flatMap((k) => k.constants.map((guid) => ({ kind: k.kind, guid })));
const sceneLayerGuid = (s: Scene): ((code: number) => Guid | undefined) => layerGuidOfTable(s.layers);

export interface SceneStore extends EntryStore { defIdOf(g: Guid): DefId | undefined }
export function sceneStore(s: Scene): SceneStore {
  const defs = new Map<Guid, Definition>(), mats = new Map<Guid, number>(), layers = new Map<Guid, LayerDoc>(), layerGuid = sceneLayerGuid(s);
  for (const d of s.defs.values()) defs.set(d.guid, d);
  s.materials.forEach((m, i) => { if (!mats.has(m.guid)) mats.set(m.guid, i); });
  for (const l of s.layers) layers.set(l.guid, l);
  const roots = (): Ref[] => [defRef(s.def(s.root).guid), ...s.shelf.items.map((it) => ({ kind: it.kind, guid: it.ref })), ...constantRefs()];
  const refsOf = (r: Ref): Ref[] => {
    if (r.kind === MATERIAL) { const i = mats.get(r.guid), m = i === undefined ? undefined : s.materials[i]; return m ? Object.values(m.channels ?? {}).flatMap((stack) => stack.map(textureRef)) : []; }   // 材质指贴图（2026-11-10）
    if (r.kind === TEXTURE) { const t = s.textures.get(r.guid), g = t ? paintUvSetOfRow(t) : null; return g ? [uvSetRef(g)] : []; }   // 画指它挂的排法（施工单十八）
    const d = r.kind === DEFINITION ? defs.get(r.guid) : undefined;
    if (!d) return [];
    const out: Ref[] = [];
    for (const m of d.body.materialSlots) { const g = m === BUILTIN_BACK_SLOT ? BUILTIN_BACK_GUID : s.materials[m]?.guid; if (g !== undefined) out.push(materialRef(g)); }
    for (const i of d.instances.values()) { const g = i.layer === undefined ? undefined : layerGuid(i.layer); if (g !== undefined) out.push(layerRef(g)); }
    for (const i of d.instances.values()) { const t = s.defs.get(i.def); if (t) out.push(defRef(t.guid)); }
    if (d.body.kind === "mesh") for (const g of d.body.uvSetSlots) out.push(uvSetRef(g));   // 网格体的速查表指排法（第 1½ 刀：表上有、零张面有位置的也算引用，和以前「有这一列」同一个意思）
    return out;
  };
  const store: SceneStore = {
    has: (r) => (r.kind === DEFINITION ? defs.has(r.guid) : r.kind === MATERIAL ? mats.has(r.guid) : r.kind === LAYER ? layers.has(r.guid) : r.kind === TEXTURE ? s.textures.has(r.guid) : r.kind === UVSET ? s.uvSets.has(r.guid) : false),
    docOf(r) {
      if (r.kind === DEFINITION) { const d = defs.get(r.guid); return d ? ({ def: definitionToDoc(s, d.id), layerGuid } satisfies DefinitionEntry) : undefined; }
      if (r.kind === MATERIAL) { const i = mats.get(r.guid); return i === undefined ? undefined : s.materials[i]; }
      if (r.kind === TEXTURE) return s.textures.get(r.guid);
      if (r.kind === UVSET) return s.uvSets.get(r.guid);
      return r.kind === LAYER ? layers.get(r.guid) : undefined;
    },
    all: (kind: EntryKind) => (kind === DEFINITION ? [...defs.keys()] : kind === MATERIAL ? [...mats.keys()] : kind === LAYER ? [...layers.keys()] : kind === TEXTURE ? [...s.textures.keys()] : kind === UVSET ? [...s.uvSets.keys()] : []),
    roots,
    refsOf,
    usage(r) { use ??= scan(s, closure(store, roots())); return use.get(refKey(r)) ?? NO_USAGE; },
    defIdOf: (g) => defs.get(g)?.id,
    modelRoot: defRef(s.def(s.root).guid),
  };
  let use: ReadonlyMap<string, Usage> | undefined;
  return store;
}

/** 用量一次扫完（定义 / 实例 / 面数级，不碰序列化）：活着的组件里摆了几份、锁了几份；每个材质几张面（面的每一侧算一次）；
 *  每张贴图几个材质指着它（借 placed 这一格：材质是贴图的「摆放」；不管那个材质自己有没有人用——施工单（二）：贴图的用量 = 几个材质指着它 + 素材架收没收）。 */
function scan(s: Scene, live: readonly Ref[]): ReadonlyMap<string, Usage> {
  const isLive = new Set(live.map(refKey)), out = new Map<string, { placed: number; faces: number; orphanFaces: number; locked: number; shelved: boolean }>();
  const row = (r: Ref) => { const key = refKey(r); let u = out.get(key); if (!u) { u = { ...NO_USAGE }; out.set(key, u); } return u; };
  for (const it of s.shelf.items) row({ kind: it.kind, guid: it.ref }).shelved = true;
  for (const m of s.materials) for (const g of new Set(Object.values(m.channels ?? {}).flat())) row(textureRef(g)).placed++;
  for (const d of s.defs.values()) {
    const liveHere = isLive.has(refKey(defRef(d.guid))), b = d.body;
    if (liveHere) for (const i of d.instances.values()) { const t = s.defs.get(i.def); if (!t) continue; const u = row(defRef(t.guid)); u.placed++; if (i.locked) u.locked++; }
    const hit = (slot: number | undefined): void => { if (slot === undefined || slot < 0) return; const m = s.materials[b.materialSlots[slot]]; if (!m) return; const u = row(materialRef(m.guid)); if (liveHere) u.faces++; else u.orphanFaces++; };
    if (b.kind === "mesh") { for (const f of b.kernel.faces()) hit(faceMaterial(b.kernel, f)); continue; }
    for (const k of [b.kernel, ...[...b.groups.values()].map((g) => g.kernel)]) for (const f of k.faces()) { hit(k.faceMaterialOf(f.id, 0)); hit(k.faceMaterialOf(f.id, 1)); }
  }
  return out;
}

/** 纯文档的店（素材导入只读那份文件）。 */
export function docStore(doc: CatsupDocument): EntryStore {
  const layers = doc.layers ?? [], layerGuid = layerGuidOfTable(layers);
  const docs = [...doc.definitions.map((def) => ({ kind: DEFINITION, doc: { def, layerGuid } satisfies DefinitionEntry })), ...doc.materials.map((m) => ({ kind: MATERIAL, doc: m as unknown })), ...layers.map((l) => ({ kind: LAYER, doc: l as unknown })), ...(doc.textures ?? []).map((t) => ({ kind: TEXTURE, doc: t as unknown })), ...(doc.uvSets ?? []).map((u) => ({ kind: UVSET, doc: u as unknown }))];
  return tableStore(docs, [defRef(doc.root.guid), ...(doc.shelf?.items ?? []).map((it) => ({ kind: it.kind, guid: it.ref })), ...constantRefs()], undefined, defRef(doc.root.guid));
}

/** 落地之后怎么认：GUID → 这个场景的句柄（定义 DefId、材质下标 / 内置背面句柄、层 id）；断开过的按新身份认。guidOf = 这条引用落地之后的 GUID。 */
export interface Landing { idOf(r: Ref): number | undefined; guidOf(r: Ref): Guid }
/**
 * 按计划把条目装进场景（设计书 §6）：贴图先进表（材质指它），再材质 / 层，定义走 materializeDefinitions（和打开文件同一份）。
 * 新建带原 GUID；断开的先铸新（自己 + 附属 + 引用）；更新原地换身体（句柄 / GUID 不变，摆着的每一份自然跟上）、材质原地换条；层永不更新（计划里不会有）。
 * 打开文件不走这里：那是整张表原样装（下标 / 层代号字节级不变），没有要决定的事，直接调 materializeDefinitions。
 */
export function applyPlan(s: Scene, bundle: Bundle, p: MergePlan): Landing {
  const docs = bundleIndex(bundle), entries: DefinitionEntry[] = [], guidOf = (g: Guid): Guid => p.remint.get(g) ?? g;
  const landed = (r: Ref): unknown => { const doc = docs.get(refKey(r)), k = KINDS.get(r.kind)!; return p.remint.has(r.guid) ? k.remintOwned(k.rewrite(doc, (x) => guidOf(x.guid))) : doc; };
  for (const r of p.create) if (r.kind === UVSET) { const u = landed(r) as UvSetDoc; s.uvSets.set(u.guid, u); }   // 排法先进表（画和网格体的列指它；永不更新：计划里只会有新建）
  for (const r of p.create) if (r.kind === TEXTURE) s.addTexture(landed(r) as TextureDoc);   // 贴图排在材质前面
  for (const r of p.create) {
    const doc = landed(r);
    if (r.kind === TEXTURE || r.kind === UVSET) continue;
    if (r.kind === MATERIAL) s.addMaterial(doc as Parameters<Scene["addMaterial"]>[0]);
    else if (r.kind === LAYER) s.layers.push({ ...(doc as LayerDoc), id: s.nextLayer++ });
    else if (r.kind === DEFINITION) entries.push(doc as DefinitionEntry);
  }
  const update = new Set<Guid>();
  for (const r of p.update) {
    const doc = docs.get(refKey(r));
    if (r.kind === TEXTURE) s.addTexture(doc as TextureDoc);   // 同一个 GUID = 换掉那一行（条目不可变，换引用；渲染缓存按对象身份）
    else if (r.kind === MATERIAL) s.materials[s.materialByGuid(r.guid)] = doc as Material;   // Material 不可变，换引用（渲染缓存按对象身份）；面上的槽号指下标，下标不变
    else if (r.kind === DEFINITION) { update.add(r.guid); entries.push(doc as DefinitionEntry); }
  }
  const materials = new Map<Guid, number>();
  s.materials.forEach((m, i) => { if (!materials.has(m.guid)) materials.set(m.guid, i); });
  const defs = materializeDefinitions(s, entries, (g) => materials.get(g) ?? -1, { update });
  return {
    guidOf: (r) => guidOf(r.guid),
    idOf(r) {
      const g = guidOf(r.guid);
      if (r.kind === DEFINITION) return defs.get(g);
      if (r.kind === MATERIAL) return g === BUILTIN_BACK_GUID ? BUILTIN_BACK_SLOT : materials.get(g);
      return r.kind === LAYER ? s.layers.find((l) => l.guid === g)?.id : undefined;
    },
  };
}

/** 做成唯一（SketchUp Make Unique）：这一条铸新身份、内部的组 / 实例也铸新；摆着的子组件、材质、层不变（断开的同一份声明）。返回新句柄。 */
export function uniqueCopy(s: Scene, id: DefId): DefId {
  const k = KINDS.get(DEFINITION)!, src = s.def(id), entry: DefinitionEntry = { def: definitionToDoc(s, id), layerGuid: sceneLayerGuid(s) }, guid = mintGuid();
  const copy = k.remintOwned(k.rewrite(entry, (r) => (r.kind === DEFINITION && r.guid === src.guid ? guid : r.guid))) as DefinitionEntry;
  const materials = new Map(s.materials.map((m, i) => [m.guid, i]));
  return materializeDefinitions(s, [{ ...copy, def: { ...copy.def, name: `${src.name}·唯一` } }], (g) => materials.get(g) ?? -1, { sameLayerTable: true }).get(guid)!;
}
