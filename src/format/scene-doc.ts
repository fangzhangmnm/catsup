// scene-doc.ts —— Scene（运行时：Kernel 池 + group + instance）↔ CatsupDocument（文件形状）的桥。
// 装载 = 复原存储态（每个池 Kernel.fromBrep，拓扑校验在内核，失败整份拒开）；保存 = 每个池 toBrep。
// definition 的 id：文件里是 list 索引，运行时由 Scene 顺序铸造（装载顺序 = 文件顺序 → 索引 i ↔ DefId i+1）。
// created 2026-10-21 by Claude Fable 5.1
import { Kernel } from "../kernel/kernel.ts";
import { Scene, type DefId } from "../scene/scene.ts";
import type { CatsupDocument, DefinitionDoc } from "./document.ts";
import { newDocument } from "./document.ts";

/** 文档 → 场景。 */
export function sceneFromDocument(doc: CatsupDocument): Scene {
  const scene = new Scene(Kernel.fromBrep(doc.root.brep));
  const idOf = new Map<number, DefId>();
  idOf.set(doc.rootIndex, scene.root);
  scene.def(scene.root).name = doc.root.name;
  doc.definitions.forEach((d, i) => { if (i !== doc.rootIndex) idOf.set(i, scene.mintDef(d.name, Kernel.fromBrep(d.brep)).id); });
  doc.definitions.forEach((d, i) => {
    const def = scene.def(idOf.get(i)!);
    for (const g of d.groups) {
      const grp = scene.mintGroup(def.id, null, Kernel.fromBrep(g.brep), g.axes);
      (grp as { id: number }).id = g.id;   // 保留文件里的 id（稳定；parent 引用按它）
      def.groups.delete(grp.id === g.id ? -1 : grp.id);
      def.groups.set(g.id, grp);
      if (g.name !== undefined) grp.name = g.name;
    }
    for (const g of d.groups) { const grp = def.groups.get(g.id)!; grp.parent = g.parent !== null && def.groups.has(g.parent) ? g.parent : null; }
    def.nextGroup = Math.max(1, ...[...def.groups.keys()].map((k) => k + 1));
    for (const inst of d.instances) {
      const target = idOf.get(inst.definition);
      if (target === undefined) continue;
      const ii = scene.mintInstance(def.id, inst.parent !== null && def.groups.has(inst.parent) ? inst.parent : null, target, inst.xform);
      (ii as { id: number }).id = inst.id;
      def.instances.delete(ii.id === inst.id ? -1 : ii.id);
      def.instances.set(inst.id, ii);
      if (inst.name !== undefined) ii.name = inst.name;
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
    return {
      name: id === scene.root ? name : d.name,
      brep: d.kernel.toBrep(),
      groups: [...d.groups.values()].map((g) => ({ id: g.id, parent: g.parent, axes: g.axes, brep: g.kernel.toBrep(), ...(g.name !== undefined ? { name: g.name } : {}) })),
      instances: [...d.instances.values()].filter((i) => idx.has(i.def)).map((i) => ({ id: i.id, definition: idx.get(i.def)!, parent: i.parent, xform: i.xform, ...(i.name !== undefined ? { name: i.name } : {}) })),
    };
  });
  const root = definitions[rootIndex];
  if (base) return { ...base, definitions, rootIndex, root: { ...root, ...(base.root.extras ? { extras: base.root.extras } : {}) } };
  const doc = newDocument(root.brep, name);
  doc.definitions = definitions;
  doc.rootIndex = rootIndex;
  doc.root = definitions[rootIndex];
  return doc;
}
