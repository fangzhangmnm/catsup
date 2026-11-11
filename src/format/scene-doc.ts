// scene-doc.ts —— Scene（运行时：Kernel 池 + group + instance）↔ CatsupDocument（文件形状）的桥。
// 装载 = 复原存储态（每个池 Kernel.fromBrep，拓扑校验在内核，失败整份拒开）；保存 = 每个池 toBrep。
// **身份在这里换算**（2026-11-04 身份地基，计划书 ai-docs/20261104-identity-foundation-plan.md §2.1）：文件里条目之间的引用全是 GUID；运行时的数字句柄（DefId / GroupId / InstId / 材质下标）
//   读的时候顺序现发、不落盘，只活这次会话。面上的材质槽号是槽表的代号，这里不碰；槽表的值在文件里是材质 GUID、在运行时是材质下标。
// created 2026-10-21 by Claude Fable 5.1
import { Kernel } from "../kernel/kernel.ts";
import { kernelFromMeshDoc, meshDocFromKernel } from "../mesh/mesh-doc.ts";
import { DEFAULT_LAYER, defaultLayers, emptyGuidesDoc, emptyShelf, shelfIsEmpty } from "./document.ts";
import { Scene, type DefId, type GroupId, type Material } from "../scene/scene.ts";
import type { CatsupDocument, Channels, DefinitionDoc, GuidesDoc, MaterialDoc, ShelfDoc } from "./document.ts";
import { emptyGuides, type Guides } from "../scene/guides.ts";
import { BUILTIN_BACK_GUID, type Guid } from "./guid.ts";
import { BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import { newDocument } from "./document.ts";
import type { DefinitionEntry } from "./entry-kinds.ts";

const guidesFromDoc = (g: GuidesDoc): Guides => ({
  lines: g.lines.map((l) => ({ id: l.id, p: { ...l.p }, dir: { ...l.dir } })),
  points: g.points.map((q) => ({ id: q.id, p: { ...q.p } })),
  circles: (g.circles ?? []).map((c) => ({ id: c.id, c: { ...c.c }, n: { ...c.n }, r: c.r })),
  spheres: (g.spheres ?? []).map((s) => ({ id: s.id, c: { ...s.c }, r: s.r })),
  next: Math.max(1, ...g.lines.map((l) => l.id + 1), ...g.points.map((q) => q.id + 1), ...(g.circles ?? []).map((c) => c.id + 1), ...(g.spheres ?? []).map((s) => s.id + 1)),
});
const guidesToDoc = (g: Guides): GuidesDoc => ({ lines: g.lines.map((l) => ({ id: l.id, p: { ...l.p }, dir: { ...l.dir } })), points: g.points.map((q) => ({ id: q.id, p: { ...q.p } })),
  ...(g.circles.length ? { circles: g.circles.map((c) => ({ id: c.id, c: { ...c.c }, n: { ...c.n }, r: c.r })) } : {}), ...(g.spheres.length ? { spheres: g.spheres.map((s) => ({ id: s.id, c: { ...s.c }, r: s.r })) } : {}) });
const copyFrame = (f: CatsupDocument["axes"]): CatsupDocument["axes"] => ({ origin: { ...f.origin }, x: { ...f.x }, y: { ...f.y }, z: { ...f.z } });
const copyShelf = (s: ShelfDoc): ShelfDoc => ({ folders: s.folders.map((f) => ({ ...f })), items: s.items.map((i) => ({ ...i })), extra: s.extra });

/** 非 brep 定义在文件里的占位 brep（文件布局不动：definitions[i].brep 永远在）。 */
const EMPTY_BREP = () => new Kernel().toBrep();

/** materializeDefinitions 的两处差别：整份文件 vs 从别的文件搬几条。 */
export interface MaterializeOpts {
  /** 这一条已经在场景里、但身体要装（sceneFromDocument 的根：构造器先造了空的）。 */
  readonly fillExisting?: Guid;
  /** 实例上的层代号就是这个场景的层 id（打开文件 / 做成唯一：同一张层表）。缺 = 经条目自己的对照表按 GUID 认（层已经先进表了，format/scene-store.ts applyPlan）；认不出 = 这一份不归层。 */
  readonly sameLayerTable?: boolean;
  /** 这几条已经在场景里、要原地换身体（粘贴选了「用拷来的更新」，设计书 §6）：句柄 / GUID 不变，摆着的每一份自然跟上。 */
  readonly update?: ReadonlySet<Guid>;
}
/** 换身体前清空：名字、身体（种类可能变）、内部实例、对称设置都按拷来的来。组 / 实例的编号接着往上数，不复用（旧选区不会认错人）。 */
function resetDefinition(scene: Scene, id: DefId, d: DefinitionDoc): void {
  const def = scene.def(id), old = def.body;
  def.name = d.name;
  def.instances.clear();
  def.body = { kind: "brep", kernel: Kernel.fromBrep(d.brep), groups: new Map(), nextGroup: old.kind === "brep" ? old.nextGroup : 1, materialSlots: [], guides: emptyGuides() };
  scene.meshMirrors.delete(id);
}
/**
 * 把文件形状的定义装进场景（打开文件、跨文件粘贴、做成唯一同一份代码，计划书 §15.1-A）：已经有同 GUID 的跳过；其余带原 GUID 新建，它内部的组 / 子实例也保留 GUID（是这一条的内部结构）。
 * 要装谁由身份层决定（identity/graph.ts plan）。materialOf = 材质 GUID → 下标（槽表换算；内置背面这里先认常量）。返回：这张场景里全部定义的 GUID → 句柄。
 */
export function materializeDefinitions(scene: Scene, entries: readonly DefinitionEntry[], materialOf: (g: Guid) => number, opts: MaterializeOpts = {}): Map<Guid, DefId> {
  const idOf = new Map<Guid, DefId>();
  for (const d of scene.defs.values()) idOf.set(d.guid, d.id);
  const fill: DefinitionEntry[] = [];
  for (const e of entries) {
    const d = e.def;
    if (d.guid === opts.fillExisting) { fill.push(e); continue; }
    const have = idOf.get(d.guid);
    if (have !== undefined) { if (opts.update?.has(d.guid)) { resetDefinition(scene, have, d); fill.push(e); } continue; }
    idOf.set(d.guid, scene.mintDef(d.name, Kernel.fromBrep(d.brep), d.guid).id);
    fill.push(e);
  }
  const slotsOf = (d: DefinitionDoc): number[] => d.materialSlots.map((g) => (g === BUILTIN_BACK_GUID ? BUILTIN_BACK_SLOT : g !== null ? materialOf(g) : -1));
  const layerOf = (e: DefinitionEntry, code: number): number | undefined => { if (opts.sameLayerTable) return code; const g = e.layerGuid(code); return g === undefined ? undefined : scene.layers.find((l) => l.guid === g)?.id; };
  /** 两种身体共用：实例按文件顺序摆（Map 插入顺序 = 同级顺序，计划书 §2.3）。 */
  const placeInstances = (defId: DefId, e: DefinitionEntry, parentOf: (g: Guid | null) => GroupId | null): void => {
    for (const inst of e.def.instances) {
      const target = idOf.get(inst.definition);
      if (target === undefined) continue;
      const ii = scene.mintInstance(defId, parentOf(inst.parent), target, inst.xform, inst.guid);
      if (inst.name !== undefined) ii.name = inst.name;
      if (inst.locked) ii.locked = true;
      if (inst.layer !== undefined) { const l = layerOf(e, inst.layer); if (l !== undefined) ii.layer = l; }
      if (inst.hidden) ii.hidden = true;
    }
  };
  for (const e of fill) {
    const d = e.def, def = scene.def(idOf.get(d.guid)!);
    // 0.14 身体种类（契约 §2）：mesh 的载荷装进身体；文件里平铺的 brep / groups 对它们是空占位
    if (d.kind === "mesh" && d.mesh) {
      def.body = { kind: "mesh", kernel: kernelFromMeshDoc(d.mesh, `definition "${d.name}"`), materialSlots: slotsOf(d) };
      if (d.mesh.mirror) scene.meshMirrors.set(def.id, { mode: d.mesh.mirror.mode, axis: d.mesh.mirror.axis });
      placeInstances(def.id, e, () => null);   // 网格体没有组
      continue;
    }
    const body = scene.brep(def.id);   // 文件平铺的 brep / groups / materialSlots / guides = brep 身体（门 1：文件布局不动）
    body.materialSlots = slotsOf(d);
    body.guides = guidesFromDoc(d.guides);
    if (d.drawFrame && def.id !== scene.root) body.drawFrame = copyFrame(d.drawFrame);   // 根的坐标架 = document.axes
    const groupOf = new Map<Guid, GroupId>();
    for (const g of d.groups) {
      const grp = scene.mintGroup(def.id, null, Kernel.fromBrep(g.brep), g.axes, g.guid);
      grp.guides = guidesFromDoc(g.guides);
      if (g.name !== undefined) grp.name = g.name;
      groupOf.set(g.guid, grp.id);
    }
    const parentOf = (g: Guid | null): GroupId | null => (g !== null ? (groupOf.get(g) ?? null) : null);
    for (const g of d.groups) body.groups.get(groupOf.get(g.guid)!)!.parent = parentOf(g.parent);
    placeInstances(def.id, e, parentOf);
  }
  // 循环引用防线：任何 definition 不得（直接或间接）引用自己（已有的定义没被改过，只查新装的）
  for (const { def: d } of fill) { const def = scene.def(idOf.get(d.guid)!); for (const inst of def.instances.values()) if (scene.references(inst.def, def.id)) throw new Error(`readCatsup: definition "${def.name}" references itself through instances`); }
  return idOf;
}

const noLayerTable = (): undefined => undefined;   // 打开文件：层代号就是这张表的 id，用不着对照
/** 文档 → 场景（打开 = 往空店里落地；整张表原样装，没有要决定的事，不走 plan）。 */
export function sceneFromDocument(doc: CatsupDocument): Scene {
  const scene = new Scene(Kernel.fromBrep(doc.root.brep), doc.root.guid);
  scene.axes = copyFrame(doc.axes);
  const matIndex = new Map<Guid, number>();
  for (const t of doc.textures) scene.addTexture(t);   // 贴图条目不可变：文件形状就是场景里那一行
  scene.texturesFrozen = doc.readNotes?.texturesTooNew ?? null;
  for (const m of doc.materials) matIndex.set(m.guid, scene.addMaterial(materialFromDoc(m)));
  scene.def(scene.root).name = doc.root.name;
  scene.layers = (doc.layers?.length ? doc.layers : defaultLayers()).map((l) => ({ ...l }));
  if (!scene.layers.some((l) => l.id === 0)) scene.layers.unshift({ ...DEFAULT_LAYER });
  scene.nextLayer = Math.max(1, ...scene.layers.map((l) => l.id + 1));
  scene.shelf = doc.shelf ? copyShelf(doc.shelf) : emptyShelf();
  scene.shelfFrozen = doc.readNotes?.shelfTooNew ?? null;
  materializeDefinitions(scene, doc.definitions.map((def) => ({ def, layerGuid: noLayerTable })), (g) => matIndex.get(g) ?? -1, { fillExisting: doc.root.guid, sameLayerTable: true });
  return scene;
}

/** 一个定义 → 文件形状（documentFromScene 和跨文件载荷的闭包同一份；name = 根用文件名）。 */
export function definitionToDoc(scene: Scene, id: DefId, name?: string): DefinitionDoc {
  const d = scene.def(id);
  const slotGuids = (slots: readonly number[]): (Guid | null)[] => slots.map((m) => (m === BUILTIN_BACK_SLOT ? BUILTIN_BACK_GUID : (scene.materials[m]?.guid ?? null)));
  const groupGuid = (g: GroupId | null): Guid | null => (g !== null && d.body.kind === "brep" ? (d.body.groups.get(g)?.guid ?? null) : null);
  const instances = [...d.instances.values()].filter((i) => scene.defs.has(i.def)).map((i) => ({ guid: i.guid, definition: scene.def(i.def).guid, parent: groupGuid(i.parent), xform: i.xform, ...(i.name !== undefined ? { name: i.name } : {}), ...(i.locked ? { locked: true } : {}), ...(i.layer !== undefined ? { layer: i.layer } : {}), ...(i.hidden ? { hidden: true } : {}) }));
  if (d.body.kind === "mesh") { const mr = scene.meshMirrors.get(d.id); return { guid: d.guid, name: d.name, kind: "mesh", mesh: { ...meshDocFromKernel(d.body.kernel), ...(mr ? { mirror: { mode: mr.mode, axis: mr.axis } } : {}) }, brep: EMPTY_BREP(), groups: [], instances, materialSlots: slotGuids(d.body.materialSlots), guides: emptyGuidesDoc() }; }
  const b = d.body;
  return {
    guid: d.guid,
    name: name ?? d.name,
    kind: d.body.kind,
    brep: b.kernel.toBrep(),
    groups: [...b.groups.values()].map((g) => ({ guid: g.guid, parent: groupGuid(g.parent), axes: g.axes, brep: g.kernel.toBrep(), guides: guidesToDoc(g.guides), ...(g.name !== undefined ? { name: g.name } : {}) })),
    instances,
    materialSlots: slotGuids(b.materialSlots),
    guides: guidesToDoc(b.guides),
    ...(b.drawFrame ? { drawFrame: copyFrame(b.drawFrame) } : {}),
  };
}

/** 场景 → 文档（base = 打开时的文档，保留未知携带内容 / 设置 / 视图）。 */
export function documentFromScene(scene: Scene, name: string, base?: CatsupDocument | null): CatsupDocument {
  const ids = [...scene.defs.keys()];
  const rootIndex = ids.indexOf(scene.root);
  const definitions: DefinitionDoc[] = ids.map((id) => definitionToDoc(scene, id, id === scene.root ? name : undefined));
  const materials = scene.materials.map(materialToDoc), textures = [...scene.textures.values()];
  const root = definitions[rootIndex];
  const layers = scene.layers.map((l) => ({ ...l }));
  const shelf = shelfIsEmpty(scene.shelf) ? undefined : copyShelf(scene.shelf);
  if (base) { const { shelf: _old, ...rest } = base; void _old; return { ...rest, definitions, rootIndex, root: { ...root, ...(base.root.extras ? { extras: base.root.extras } : {}) }, materials, textures, axes: copyFrame(scene.axes), layers, ...(shelf ? { shelf } : {}) }; }   // final / finalRev 随 base 带
  const doc = newDocument(root.brep, name);
  doc.axes = copyFrame(scene.axes);
  doc.definitions = definitions;
  doc.rootIndex = rootIndex;
  doc.root = definitions[rootIndex];
  doc.materials = materials;
  doc.textures = textures;
  doc.layers = layers;
  if (shelf) doc.shelf = shelf;
  return doc;
}

/** 材质：文件形状 ↔ 场景（channels 深拷一层：一摞是数组）。 */
const copyChannels = (c: Channels | undefined): { channels?: Record<string, Guid[]> } => (c && Object.keys(c).length ? { channels: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, [...v]])) } : {});
export const materialFromDoc = (m: MaterialDoc): Omit<Material, "guid"> & { guid: Guid } => ({ guid: m.guid, name: m.name, color: [m.color[0], m.color[1], m.color[2]], ...copyChannels(m.channels) });
export const materialToDoc = (m: Material): MaterialDoc => ({ guid: m.guid, name: m.name, color: [m.color[0], m.color[1], m.color[2]], ...copyChannels(m.channels) });
