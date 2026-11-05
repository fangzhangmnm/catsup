// scene/resources.ts —— 资源清点：组件定义 / 材质被谁用、用了几次、哪些没人用（孤儿）。纯函数（零 DOM，node 直测）。
// created 2026-10-30 by Claude Opus 5.5 · 0.18 物品栏纪元 I10（第一版；user 10-30「这样，我们先写一个。然后高中时代让fable重写一个，因为反正那时候流加载什么的」）。
// · 起因：组件定义 / 材质的生死没有统一的主人——炸开自己写了「最后一份炸掉就删定义」、合并没写（user「为什么删实例会有删组件定义的风险？这个风险就不应该有」
//   「我们没有一个中心化的按引用计数的东西吗？学blender」）。现在：谁用谁、活没活只有这里回答；删组件定义只有一条用户点了才跑的指令（ops.ts purgeDefs）。
// · 活着 = 从活着的根够得着（user「反正就是要么被引用要么被素材库引用。和blender的逻辑一样」）：根 = 模型根 + 素材架收着的组件（身份地基 ID-3）。
//   被孤儿用着的也算孤儿（孤儿 A 里摆着 B、B 没别人用 → 两个一起是孤儿；Blender 的「递归清理」同款）。
// · 身份层（ID-4，2026-11-04 Claude Opus 5.5）：走图和数用量归 src/identity/ + format/scene-store.ts，这里只是资源页要的那个形状。
// · 材质（身份地基 ID-2，2026-11-04 Claude Opus 5.5）：活着的组件里几张面用它 + 只躺在孤儿组件里几张面 + 素材架收没收。能清理 = 三样都没有（清掉只被孤儿用的，孤儿的颜色就没了：清点 P8）；
//   要清它们先清孤儿。真正的删在 ops.ts purgeMaterials（同一步重排所有槽表）。
import type { BodyKind } from "./body-kind.ts";
import type { Guid } from "../format/guid.ts";
import type { DefId, InstId, Scene } from "./scene.ts";
import { closure } from "../identity/graph.ts";
import type { Ref } from "../identity/kinds.ts";
import { DEFINITION, defRef, materialRef } from "../format/entry-kinds.ts";
import { sceneStore, type SceneStore } from "../format/scene-store.ts";

export interface DefCensus {
  readonly def: DefId;
  readonly name: string;
  readonly kind: BodyKind;
  /** 谁摆着它（哪个组件里的哪一份）；孤儿摆着的也列。 */
  readonly users: readonly { readonly in: DefId; readonly instance: InstId }[];
  /** 其中摆在模型里（活着的组件里）的份数；users.length − placed = 躺在孤儿里的。 */
  readonly placed: number;
  /** 从活着的根够得着。 */
  readonly live: boolean;
  /** 素材架收着。 */
  readonly shelved: boolean;
}
export interface MaterialCensus {
  /** 运行时句柄（文档材质表下标；只活这次会话）。 */
  readonly index: number;
  readonly guid: Guid;
  readonly name: string;
  readonly textured: boolean;
  /** 活着的组件里用它的面（一面一侧算一次；藏起来的面也算）。 */
  readonly faces: number;
  /** 只躺在孤儿组件里的面（孤儿捡回来还要它）。 */
  readonly orphanFaces: number;
  /** 素材架收着。 */
  readonly shelved: boolean;
}
export interface MaterialUse { faces: number; orphanFaces: number; shelved: boolean }
/** 素材架一行（资源页按这个顺序画）：文件夹在前、条目在后，按 parent 树展开；depth = 缩进。 */
export interface ShelfRow { readonly type: "folder" | "definition" | "material" | "other"; readonly guid: Guid; readonly name: string; readonly depth: number; readonly def?: DefId; readonly material?: number }
export interface Census { readonly defs: readonly DefCensus[]; readonly materials: readonly MaterialCensus[]; readonly shelf: readonly ShelfRow[] }

/** 这几条引用里的定义 → 句柄。 */
const defIds = (store: SceneStore, refs: readonly Ref[]): Set<DefId> => { const out = new Set<DefId>(); for (const r of refs) if (r.kind === DEFINITION) { const id = store.defIdOf(r.guid); if (id !== undefined) out.add(id); } return out; };
/** 活着的组件定义（含模型根）：从根和素材架沿「谁摆着谁」走得到的。 */
export function liveDefs(s: Scene): Set<DefId> { const store = sceneStore(s); return defIds(store, closure(store, store.roots())); }
/** 从这几个定义沿实例引用够得着的全部定义（自己算）。 */
export function reachableDefs(s: Scene, roots: readonly DefId[]): Set<DefId> { const store = sceneStore(s); return defIds(store, closure(store, roots.filter((id) => s.defs.has(id)).map((id) => defRef(s.def(id).guid)))); }

/** 一次清点（模型根不列：它不是谁摆出来的，也不会是孤儿）。 */
export function census(s: Scene): Census {
  const store = sceneStore(s), live = liveDefs(s), users = new Map<DefId, { in: DefId; instance: InstId }[]>();
  for (const d of s.defs.values()) for (const i of d.instances.values()) { const u = users.get(i.def) ?? []; u.push({ in: d.id, instance: i.id }); users.set(i.def, u); }
  const defs = [...s.defs.values()].filter((d) => d.id !== s.root).map((d): DefCensus => { const u = store.usage(defRef(d.guid)); return { def: d.id, name: d.name, kind: s.kindOf(d.id), users: users.get(d.id) ?? [], placed: u.placed, live: live.has(d.id), shelved: u.shelved }; });
  const materials = s.materials.map((m, index): MaterialCensus => { const u = store.usage(materialRef(m.guid)); return { index, guid: m.guid, name: m.name, textured: !!m.texture, faces: u.faces, orphanFaces: u.orphanFaces, shelved: u.shelved }; });
  return { defs, materials, shelf: shelfRows(s) };
}

/** 素材架按文件夹树展开成一张顺序表（纯函数）。手改过的文件里成环 / 指不到的文件夹不许让东西看不见：没走到的排在最后、不缩进。 */
export function shelfRows(s: Scene): ShelfRow[] {
  const out: ShelfRow[] = [], { folders, items } = s.shelf, seenF = new Set<Guid>(), seenI = new Set<Guid>();
  const defByGuid = new Map([...s.defs.values()].map((d) => [d.guid, d]));
  const itemRow = (it: (typeof items)[number], depth: number): void => {
    seenI.add(it.guid);
    if (it.kind === "definition") { const d = defByGuid.get(it.ref); out.push({ type: "definition", guid: it.guid, name: d?.name ?? "（已经不在了）", depth, ...(d ? { def: d.id } : {}) }); return; }
    if (it.kind === "material") { const m = s.materialByGuid(it.ref); out.push({ type: "material", guid: it.guid, name: s.materials[m]?.name ?? "（已经不在了）", depth, ...(m >= 0 ? { material: m } : {}) }); return; }
    out.push({ type: "other", guid: it.guid, name: `（更新版的素材：${it.kind}）`, depth });
  };
  const folderRow = (f: (typeof folders)[number], depth: number): void => {
    if (seenF.has(f.guid)) return;
    seenF.add(f.guid);
    out.push({ type: "folder", guid: f.guid, name: f.name, depth });
    for (const c of folders) if (c.parent === f.guid) folderRow(c, depth + 1);
    for (const it of items) if (it.folder === f.guid) itemRow(it, depth + 1);
  };
  for (const f of folders) if (f.parent === null) folderRow(f, 0);
  for (const it of items) if (it.folder === null) itemRow(it, 0);
  for (const f of folders) folderRow(f, 0);
  for (const it of items) if (!seenI.has(it.guid)) itemRow(it, 0);
  return out;
}

/** 每个材质（按文档材质表下标）被谁用：活着的组件 / 孤儿组件 / 素材架。能不能清理按**面**算，不按槽表算（槽表占位不算有人用；引用图上它还算被引用，闭包照带）。 */
export function materialUse(s: Scene): MaterialUse[] {
  const store = sceneStore(s);
  return s.materials.map((m) => { const u = store.usage(materialRef(m.guid)); return { faces: u.faces, orphanFaces: u.orphanFaces, shelved: u.shelved }; });
}
/** 能清理的材质（没有任何面用、架子也没收）：清理指令吃这张单子。 */
export const unusedMaterials = (c: Census): number[] => c.materials.filter((m) => !m.faces && !m.orphanFaces && !m.shelved).map((m) => m.index);
/** 孤儿组件（够不着的）：清理指令吃这张单子。 */
export const orphanDefs = (c: Census): DefId[] => c.defs.filter((d) => !d.live).map((d) => d.def);
