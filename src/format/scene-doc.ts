// scene-doc.ts —— Scene（运行时：Kernel 池 + group + instance）↔ CatsupDocument（文件形状）的桥。
// 装载 = 复原存储态（每个池 Kernel.fromBrep，拓扑校验在内核，失败整份拒开）；保存 = 每个池 toBrep。
// **身份在这里换算**（2026-11-04 身份地基，计划书 ai-docs/20261104-identity-foundation-plan.md §2.1）：文件里条目之间的引用全是 GUID；运行时的数字句柄（DefId / GroupId / InstId / 材质下标）
//   读的时候顺序现发、不落盘，只活这次会话。面上的材质槽号是槽表的代号，这里不碰；槽表的值在文件里是材质 GUID、在运行时是材质下标。
// created 2026-10-21 by Claude Fable 5.1
import { Kernel } from "../kernel/kernel.ts";
import { kernelFromMeshDoc, meshDocFromKernel } from "../mesh/mesh-doc.ts";
import { DEFAULT_LAYER, defaultLayers, emptyGuidesDoc, emptyShelf, shelfIsEmpty } from "./document.ts";
import { Scene, type DefId, type GroupId } from "../scene/scene.ts";
import type { CatsupDocument, DefinitionDoc, GuidesDoc, ShelfDoc } from "./document.ts";
import type { Guides } from "../scene/guides.ts";
import { BUILTIN_BACK_GUID, type Guid } from "./guid.ts";
import { BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import { newDocument } from "./document.ts";

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

/**
 * 这些文件形状的定义里，从 roots 往下走真要新建的（场景里有同 GUID 的 = 用场景那条，**它下面的不再看**：不比内容；不然目标的旧版用不上的子组件会被建出来当孤儿）。计划书 §15.1-B。
 */
export function definitionsToMake(scene: Scene, defs: readonly DefinitionDoc[], roots: Iterable<Guid>): DefinitionDoc[] {
  const docs = new Map(defs.map((d) => [d.guid, d])), exists = new Set([...scene.defs.values()].map((d) => d.guid)), make: DefinitionDoc[] = [], seen = new Set<Guid>();
  const walk = (g: Guid): void => { if (seen.has(g) || exists.has(g)) return; seen.add(g); const d = docs.get(g); if (!d) return; make.push(d); for (const i of d.instances) walk(i.definition); };
  for (const g of roots) walk(g);
  return make;
}
/** materializeDefinitions 的两处差别：整份文件 vs 从别的文件搬几条。 */
export interface MaterializeOpts {
  /** 这一条已经在场景里、但身体要装（sceneFromDocument 的根：构造器先造了空的）。 */
  readonly fillExisting?: Guid;
  /** 文件里实例上的层代号 → 这个场景的层 id（缺 = 原样：装整份文件时层表就是这张）；undefined = 这一份不归层。 */
  readonly layerOf?: (code: number) => number | undefined;
}
/**
 * 把文件形状的定义装进场景（打开文件和跨文件粘贴同一份代码，计划书 §15.1-A）：已经有同 GUID 的跳过（用场景那条，不比内容，§15.1-B）；其余带原 GUID 新建，它内部的组 / 子实例也保留 GUID（是这一条的内部结构）。
 * materialOf = 材质 GUID → 下标（槽表换算；内置背面由调用方的函数负责时返回 −2，这里先认常量）。返回：这张场景里全部定义的 GUID → 句柄。
 */
export function materializeDefinitions(scene: Scene, defs: readonly DefinitionDoc[], materialOf: (g: Guid) => number, opts: MaterializeOpts = {}): Map<Guid, DefId> {
  const idOf = new Map<Guid, DefId>();
  for (const d of scene.defs.values()) idOf.set(d.guid, d.id);
  const fill: DefinitionDoc[] = [];
  for (const d of defs) {
    if (d.guid === opts.fillExisting) { fill.push(d); continue; }
    if (idOf.has(d.guid)) continue;
    idOf.set(d.guid, scene.mintDef(d.name, Kernel.fromBrep(d.brep), d.guid).id);
    fill.push(d);
  }
  const slotsOf = (d: DefinitionDoc): number[] => d.materialSlots.map((g) => (g === BUILTIN_BACK_GUID ? BUILTIN_BACK_SLOT : g !== null ? materialOf(g) : -1));
  /** 两种身体共用：实例按文件顺序摆（Map 插入顺序 = 同级顺序，计划书 §2.3）。 */
  const placeInstances = (defId: DefId, d: DefinitionDoc, parentOf: (g: Guid | null) => GroupId | null): void => {
    for (const inst of d.instances) {
      const target = idOf.get(inst.definition);
      if (target === undefined) continue;
      const ii = scene.mintInstance(defId, parentOf(inst.parent), target, inst.xform, inst.guid);
      if (inst.name !== undefined) ii.name = inst.name;
      if (inst.locked) ii.locked = true;
      if (inst.layer !== undefined) { const l = opts.layerOf ? opts.layerOf(inst.layer) : inst.layer; if (l !== undefined) ii.layer = l; }
      if (inst.hidden) ii.hidden = true;
    }
  };
  for (const d of fill) {
    const def = scene.def(idOf.get(d.guid)!);
    // 0.14 身体种类（契约 §2）：mesh 的载荷装进身体；文件里平铺的 brep / groups 对它们是空占位
    if (d.kind === "mesh" && d.mesh) {
      def.body = { kind: "mesh", kernel: kernelFromMeshDoc(d.mesh, `definition "${d.name}"`), materialSlots: slotsOf(d) };
      if (d.mesh.mirror) scene.meshMirrors.set(def.id, { mode: d.mesh.mirror.mode, axis: d.mesh.mirror.axis });
      placeInstances(def.id, d, () => null);   // 网格体没有组
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
    placeInstances(def.id, d, parentOf);
  }
  // 循环引用防线：任何 definition 不得（直接或间接）引用自己（已有的定义没被改过，只查新装的）
  for (const d of fill) { const def = scene.def(idOf.get(d.guid)!); for (const inst of def.instances.values()) if (scene.references(inst.def, def.id)) throw new Error(`readCatsup: definition "${def.name}" references itself through instances`); }
  return idOf;
}

/** 文档 → 场景。 */
export function sceneFromDocument(doc: CatsupDocument): Scene {
  const scene = new Scene(Kernel.fromBrep(doc.root.brep), doc.root.guid);
  scene.axes = copyFrame(doc.axes);
  const matIndex = new Map<Guid, number>();
  for (const m of doc.materials) matIndex.set(m.guid, scene.addMaterial({ guid: m.guid, name: m.name, color: [m.color[0], m.color[1], m.color[2]], ...(m.texture ? { texture: { mimeType: m.texture.mimeType, bytes: m.texture.bytes, sizeM: [m.texture.sizeM[0], m.texture.sizeM[1]] } } : {}) }));
  scene.def(scene.root).name = doc.root.name;
  scene.layers = (doc.layers?.length ? doc.layers : defaultLayers()).map((l) => ({ ...l }));
  if (!scene.layers.some((l) => l.id === 0)) scene.layers.unshift({ ...DEFAULT_LAYER });
  scene.nextLayer = Math.max(1, ...scene.layers.map((l) => l.id + 1));
  scene.shelf = doc.shelf ? copyShelf(doc.shelf) : emptyShelf();
  scene.shelfFrozen = doc.readNotes?.shelfTooNew ?? null;
  materializeDefinitions(scene, doc.definitions, (g) => matIndex.get(g) ?? -1, { fillExisting: doc.root.guid });
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
  const materials = scene.materials.map((m) => ({ guid: m.guid, name: m.name, color: [m.color[0], m.color[1], m.color[2]] as [number, number, number], ...(m.texture ? { texture: { mimeType: m.texture.mimeType, bytes: m.texture.bytes, sizeM: [m.texture.sizeM[0], m.texture.sizeM[1]] as [number, number] } } : {}) }));
  const root = definitions[rootIndex];
  const layers = scene.layers.map((l) => ({ ...l }));
  const shelf = shelfIsEmpty(scene.shelf) ? undefined : copyShelf(scene.shelf);
  if (base) { const { shelf: _old, ...rest } = base; void _old; return { ...rest, definitions, rootIndex, root: { ...root, ...(base.root.extras ? { extras: base.root.extras } : {}) }, materials, axes: copyFrame(scene.axes), layers, ...(shelf ? { shelf } : {}) }; }   // final / finalRev 随 base 带
  const doc = newDocument(root.brep, name);
  doc.axes = copyFrame(scene.axes);
  doc.definitions = definitions;
  doc.rootIndex = rootIndex;
  doc.root = definitions[rootIndex];
  doc.materials = materials;
  doc.layers = layers;
  if (shelf) doc.shelf = shelf;
  return doc;
}
