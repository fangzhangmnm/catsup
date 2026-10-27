// scene-doc.ts —— Scene（运行时：Kernel 池 + group + instance）↔ CatsupDocument（文件形状）的桥。
// 装载 = 复原存储态（每个池 Kernel.fromBrep，拓扑校验在内核，失败整份拒开）；保存 = 每个池 toBrep。
// definition 的 id：文件里是 list 索引，运行时由 Scene 顺序铸造（装载顺序 = 文件顺序 → 索引 i ↔ DefId i+1）。
// created 2026-10-21 by Claude Fable 5.1
import { Kernel } from "../kernel/kernel.ts";
import { meshFromTriangles, meshToTriangles } from "../mesh/tri-soup.ts";
import { DEFAULT_LAYER, defaultLayers, emptyGuidesDoc } from "./document.ts";
import { Scene, type DefId } from "../scene/scene.ts";
import type { CatsupDocument, DefinitionDoc, GuidesDoc } from "./document.ts";
import type { Guides } from "../scene/guides.ts";
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

/** 非 brep 定义在文件里的占位 brep（文件布局不动：definitions[i].brep 永远在）。 */
const EMPTY_BREP = () => new Kernel().toBrep();

/** 文档 → 场景。 */
export function sceneFromDocument(doc: CatsupDocument): Scene {
  const scene = new Scene(Kernel.fromBrep(doc.root.brep));
  scene.axes = copyFrame(doc.axes);
  for (const m of doc.materials) scene.addMaterial({ name: m.name, color: [m.color[0], m.color[1], m.color[2]], ...(m.texture ? { texture: { mimeType: m.texture.mimeType, bytes: m.texture.bytes, sizeM: [m.texture.sizeM[0], m.texture.sizeM[1]] } } : {}) });
  const idOf = new Map<number, DefId>();
  idOf.set(doc.rootIndex, scene.root);
  scene.def(scene.root).name = doc.root.name;
  scene.layers = (doc.layers?.length ? doc.layers : defaultLayers()).map((l) => ({ ...l }));
  if (!scene.layers.some((l) => l.id === 0)) scene.layers.unshift({ ...DEFAULT_LAYER });
  scene.nextLayer = Math.max(1, ...scene.layers.map((l) => l.id + 1));
  doc.definitions.forEach((d, i) => { if (i !== doc.rootIndex) idOf.set(i, scene.mintDef(d.name, Kernel.fromBrep(d.brep)).id); });
  doc.definitions.forEach((d, i) => {
    const def = scene.def(idOf.get(i)!);
    // 0.14 身体种类（契约 §2）：mesh 的载荷装进身体；文件里平铺的 brep / groups 对它们是空占位
    if (d.kind === "mesh" && d.mesh) { const soup = meshFromTriangles(d.mesh); if (soup.skipped) console.warn(`mesh definition "${d.name}": ${soup.skipped} degenerate triangles dropped`); def.body = { kind: "mesh", kernel: soup.kernel, materialSlots: d.materialSlots.map((m) => (m in doc.materials ? m : -1)) }; for (const inst of d.instances) { const target = idOf.get(inst.definition); if (target === undefined) continue; const ii = scene.mintInstance(def.id, null, target, inst.xform); if (inst.name !== undefined) ii.name = inst.name; if (inst.locked) ii.locked = true; if (inst.layer !== undefined) ii.layer = inst.layer; } return; }
    const body = scene.brep(def.id);   // 文件平铺的 brep / groups / materialSlots / guides = brep 身体（门 1：文件布局不动）
    body.materialSlots = d.materialSlots.map((m) => (m in doc.materials ? m : -1));
    body.guides = guidesFromDoc(d.guides);
    if (d.drawFrame && def.id !== scene.root) body.drawFrame = copyFrame(d.drawFrame);   // 根的坐标架 = document.axes
    for (const g of d.groups) {
      const grp = scene.mintGroup(def.id, null, Kernel.fromBrep(g.brep), g.axes);
      grp.guides = guidesFromDoc(g.guides);
      (grp as { id: number }).id = g.id;   // 保留文件里的 id（稳定；parent 引用按它）
      body.groups.delete(grp.id === g.id ? -1 : grp.id);
      body.groups.set(g.id, grp);
      if (g.name !== undefined) grp.name = g.name;
    }
    for (const g of d.groups) { const grp = body.groups.get(g.id)!; grp.parent = g.parent !== null && body.groups.has(g.parent) ? g.parent : null; }
    body.nextGroup = Math.max(1, ...[...body.groups.keys()].map((k) => k + 1));
    // 实例按文件里的 id 放（2026-10-25 Opus 修：此前先改 id 再判「临时 id 要不要删」，判断永远为「不删」→ id 有空缺（删过实例）的文件读回来，
    // 临时 id 下面多一份同一个实例 = 存一次读一次就重复。现在：临时 id 从文件最大 id 之后起（不会撞上文件 id）、先删临时再按文件 id 放；
    // 已经重复过的文件（同一个 id 写了两次）读进来后写的覆盖先写的 = 自动合回一份（两份本来就是同一个实例、同一个位置）。
    def.nextInst = Math.max(def.nextInst, 1 + Math.max(0, ...d.instances.map((i) => i.id)));
    for (const inst of d.instances) {
      const target = idOf.get(inst.definition);
      if (target === undefined) continue;
      const ii = scene.mintInstance(def.id, inst.parent !== null && body.groups.has(inst.parent) ? inst.parent : null, target, inst.xform);
      def.instances.delete(ii.id);
      (ii as { id: number }).id = inst.id;
      def.instances.set(inst.id, ii);
      if (inst.name !== undefined) ii.name = inst.name;
      if (inst.locked) ii.locked = true;
      if (inst.layer !== undefined) ii.layer = inst.layer;
      if (inst.hidden) ii.hidden = true;
    }
    def.nextInst = Math.max(1, ...[...def.instances.keys()].map((k) => k + 1));
  });
  // 循环引用防线：任何 definition 不得（直接或间接）引用自己
  for (const d of scene.defs.values()) for (const inst of d.instances.values()) if (scene.references(inst.def, d.id)) throw new Error(`readCatsup: definition "${d.name}" references itself through instances`);
  return scene;
}

/** 场景 → 文档（base = 打开时的文档，保留未知携带内容 / 设置 / 视图）。 */
export function documentFromScene(scene: Scene, name: string, base?: CatsupDocument | null): CatsupDocument {
  const ids = [...scene.defs.keys()];
  const rootIndex = ids.indexOf(scene.root);
  const idx = new Map<DefId, number>(ids.map((id, i) => [id, i]));
  const definitions: DefinitionDoc[] = ids.map((id) => {
    const d = scene.def(id);
    const instances = [...d.instances.values()].filter((i) => idx.has(i.def)).map((i) => ({ id: i.id, definition: idx.get(i.def)!, parent: i.parent, xform: i.xform, ...(i.name !== undefined ? { name: i.name } : {}), ...(i.locked ? { locked: true } : {}), ...(i.layer !== undefined ? { layer: i.layer } : {}), ...(i.hidden ? { hidden: true } : {}) }));
    if (d.body.kind === "mesh") return { name: d.name, kind: "mesh", mesh: meshToTriangles(d.body.kernel), brep: EMPTY_BREP(), groups: [], instances, materialSlots: [...d.body.materialSlots], guides: emptyGuidesDoc() };
    const b = d.body;
    return {
      name: id === scene.root ? name : d.name,
      kind: d.body.kind,
      brep: b.kernel.toBrep(),
      groups: [...b.groups.values()].map((g) => ({ id: g.id, parent: g.parent, axes: g.axes, brep: g.kernel.toBrep(), guides: guidesToDoc(g.guides), ...(g.name !== undefined ? { name: g.name } : {}) })),
      instances,
      materialSlots: [...b.materialSlots],
      guides: guidesToDoc(b.guides),
      ...(b.drawFrame ? { drawFrame: copyFrame(b.drawFrame) } : {}),
    };
  });
  const materials = scene.materials.map((m) => ({ name: m.name, color: [m.color[0], m.color[1], m.color[2]] as [number, number, number], ...(m.texture ? { texture: { mimeType: m.texture.mimeType, bytes: m.texture.bytes, sizeM: [m.texture.sizeM[0], m.texture.sizeM[1]] as [number, number] } } : {}) }));
  const root = definitions[rootIndex];
  const layers = scene.layers.map((l) => ({ ...l }));
  if (base) return { ...base, definitions, rootIndex, root: { ...root, ...(base.root.extras ? { extras: base.root.extras } : {}) }, materials, axes: copyFrame(scene.axes), layers };   // final / finalRev 随 base 带
  const doc = newDocument(root.brep, name);
  doc.axes = copyFrame(scene.axes);
  doc.definitions = definitions;
  doc.rootIndex = rootIndex;
  doc.root = definitions[rootIndex];
  doc.materials = materials;
  doc.layers = layers;
  return doc;
}
