// format/scene-store.ts —— 场景 / 纯文档适配身份层（唯一一处「店」的实现 + 落地）。设计书 ai-docs/20261104-identity-layer-design.md §4–§6。created 2026-11-04 by Claude Opus 5.5（ID-4a）
// · 店的 refsOf / usage 不序列化几何（普查、活死只随定义 / 实例 / 面数涨，不碰 toBrep）；docOf 才序列化。
// · 店是一次性的视图：建的时候拍下 GUID → 句柄，场景改了（落地之后）要重建。
import { KINDS, refKey, type EntryKind, type Ref } from "../identity/kinds.ts";
import { bundleIndex, closure, type Bundle, type MergePlan } from "../identity/graph.ts";
import { NO_USAGE, tableStore, type EntryStore, type Usage } from "../identity/store.ts";
import { BUILTIN_BACK_GUID, mintGuid, type Guid } from "../identity/guid.ts";
import { BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import type { DefId, Definition, Scene } from "../scene/scene.ts";
import type { CatsupDocument, LayerDoc } from "./document.ts";
import { DEFINITION, LAYER, MATERIAL, defRef, layerGuidOfTable, layerRef, materialRef, type DefinitionEntry } from "./entry-kinds.ts";
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
    const d = r.kind === DEFINITION ? defs.get(r.guid) : undefined;
    if (!d) return [];
    const out: Ref[] = [];
    for (const m of d.body.materialSlots) { const g = m === BUILTIN_BACK_SLOT ? BUILTIN_BACK_GUID : s.materials[m]?.guid; if (g !== undefined) out.push(materialRef(g)); }
    for (const i of d.instances.values()) { const g = i.layer === undefined ? undefined : layerGuid(i.layer); if (g !== undefined) out.push(layerRef(g)); }
    for (const i of d.instances.values()) { const t = s.defs.get(i.def); if (t) out.push(defRef(t.guid)); }
    return out;
  };
  const store: SceneStore = {
    has: (r) => (r.kind === DEFINITION ? defs.has(r.guid) : r.kind === MATERIAL ? mats.has(r.guid) : r.kind === LAYER ? layers.has(r.guid) : false),
    docOf(r) {
      if (r.kind === DEFINITION) { const d = defs.get(r.guid); return d ? ({ def: definitionToDoc(s, d.id), layerGuid } satisfies DefinitionEntry) : undefined; }
      if (r.kind === MATERIAL) { const i = mats.get(r.guid); return i === undefined ? undefined : s.materials[i]; }
      return r.kind === LAYER ? layers.get(r.guid) : undefined;
    },
    all: (kind: EntryKind) => (kind === DEFINITION ? [...defs.keys()] : kind === MATERIAL ? [...mats.keys()] : kind === LAYER ? [...layers.keys()] : []),
    roots,
    refsOf,
    usage(r) { use ??= scan(s, closure(store, roots())); return use.get(refKey(r)) ?? NO_USAGE; },
    defIdOf: (g) => defs.get(g)?.id,
  };
  let use: ReadonlyMap<string, Usage> | undefined;
  return store;
}

/** 用量一次扫完（定义 / 实例 / 面数级，不碰序列化）：活着的组件里摆了几份、锁了几份；每个材质几张面（面的每一侧算一次）。 */
function scan(s: Scene, live: readonly Ref[]): ReadonlyMap<string, Usage> {
  const isLive = new Set(live.map(refKey)), out = new Map<string, { placed: number; faces: number; orphanFaces: number; locked: number; shelved: boolean }>();
  const row = (r: Ref) => { const key = refKey(r); let u = out.get(key); if (!u) { u = { ...NO_USAGE }; out.set(key, u); } return u; };
  for (const it of s.shelf.items) row({ kind: it.kind, guid: it.ref }).shelved = true;
  for (const d of s.defs.values()) {
    const liveHere = isLive.has(refKey(defRef(d.guid))), b = d.body;
    if (liveHere) for (const i of d.instances.values()) { const t = s.defs.get(i.def); if (!t) continue; const u = row(defRef(t.guid)); u.placed++; if (i.locked) u.locked++; }
    const hit = (slot: number | undefined): void => { if (slot === undefined || slot < 0) return; const m = s.materials[b.materialSlots[slot]]; if (!m) return; const u = row(materialRef(m.guid)); if (liveHere) u.faces++; else u.orphanFaces++; };
    if (b.kind === "mesh") { for (const f of b.kernel.faces()) hit(b.kernel.faceMat[f]); continue; }
    for (const k of [b.kernel, ...[...b.groups.values()].map((g) => g.kernel)]) for (const f of k.faces()) { hit(k.faceMaterialOf(f.id, 0)); hit(k.faceMaterialOf(f.id, 1)); }
  }
  return out;
}

/** 纯文档的店（素材导入只读那份文件）。 */
export function docStore(doc: CatsupDocument): EntryStore {
  const layers = doc.layers ?? [], layerGuid = layerGuidOfTable(layers);
  const docs = [...doc.definitions.map((def) => ({ kind: DEFINITION, doc: { def, layerGuid } satisfies DefinitionEntry })), ...doc.materials.map((m) => ({ kind: MATERIAL, doc: m as unknown })), ...layers.map((l) => ({ kind: LAYER, doc: l as unknown }))];
  return tableStore(docs, [defRef(doc.root.guid), ...(doc.shelf?.items ?? []).map((it) => ({ kind: it.kind, guid: it.ref })), ...constantRefs()]);
}

/** 落地之后怎么认：GUID → 这个场景的句柄（定义 DefId、材质下标 / 内置背面句柄、层 id）。 */
export interface Landing { idOf(r: Ref): number | undefined }
/**
 * 按计划把条目装进场景（ID-4a：只有 create）：材质 / 层先进表，定义走 materializeDefinitions（和打开文件同一份）。
 * 打开文件不走这里：那是整张表原样装（下标 / 层代号字节级不变），没有要决定的事，直接调 materializeDefinitions。
 */
export function applyPlan(s: Scene, bundle: Bundle, p: MergePlan): Landing {
  const docs = bundleIndex(bundle), made: DefinitionEntry[] = [];
  for (const r of p.create) {
    const doc = docs.get(refKey(r));
    if (r.kind === MATERIAL) s.addMaterial(doc as Parameters<Scene["addMaterial"]>[0]);
    else if (r.kind === LAYER) s.layers.push({ ...(doc as LayerDoc), id: s.nextLayer++ });
    else if (r.kind === DEFINITION) made.push(doc as DefinitionEntry);
  }
  const materials = new Map<Guid, number>();
  s.materials.forEach((m, i) => { if (!materials.has(m.guid)) materials.set(m.guid, i); });
  const defs = materializeDefinitions(s, made, (g) => materials.get(g) ?? -1);
  return {
    idOf(r) {
      if (r.kind === DEFINITION) return defs.get(r.guid);
      if (r.kind === MATERIAL) return r.guid === BUILTIN_BACK_GUID ? BUILTIN_BACK_SLOT : materials.get(r.guid);
      return r.kind === LAYER ? s.layers.find((l) => l.guid === r.guid)?.id : undefined;
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
