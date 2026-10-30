// scene/resources.ts —— 资源清点：组件定义 / 材质被谁用、用了几次、哪些没人用（孤儿）。纯函数（零 DOM，node 直测）。
// created 2026-10-30 by Claude Opus 5.5 · 0.18 物品栏纪元 I10（第一版；user 10-30「这样，我们先写一个。然后高中时代让fable重写一个，因为反正那时候流加载什么的」）。
// · 起因：组件定义 / 材质的生死没有统一的主人——炸开自己写了「最后一份炸掉就删定义」、合并没写（user「为什么删实例会有删组件定义的风险？这个风险就不应该有」
//   「我们没有一个中心化的按引用计数的东西吗？学blender」）。现在：谁用谁、活没活只有这里回答；删组件定义只有一条用户点了才跑的指令（ops.ts purgeDefs）。
// · 活着 = 从活着的根够得着（user「反正就是要么被引用要么被素材库引用。和blender的逻辑一样」）：根 = 模型根；素材架（I6）做了以后它收着的也是根。
//   被孤儿用着的也算孤儿（孤儿 A 里摆着 B、B 没别人用 → 两个一起是孤儿；Blender 的「递归清理」同款）。
// · 材质：只数「活着的组件里有几张面（一面一侧算一次）用它」。材质按序号编号，删一个后面全挪号 → 材质清理等身份换 GUID（I11，家规「不用序号」），这里只清点不删。
import type { BodyKind } from "./body-kind.ts";
import type { DefId, InstId, Scene } from "./scene.ts";

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
}
export interface MaterialCensus {
  /** 文档材质表里第几个（序号：I11 换 GUID 之前的临时身份）。 */
  readonly index: number;
  readonly name: string;
  readonly textured: boolean;
  /** 活着的组件里用它的面（一面一侧算一次；藏起来的面也算）。 */
  readonly faces: number;
}
export interface Census { readonly defs: readonly DefCensus[]; readonly materials: readonly MaterialCensus[] }

/** 活着的组件定义（含模型根）：从根沿「谁摆着谁」走得到的。 */
export function liveDefs(s: Scene): Set<DefId> {
  const live = new Set<DefId>(), stack: DefId[] = [s.root];
  while (stack.length) { const d = stack.pop()!; if (live.has(d) || !s.defs.has(d)) continue; live.add(d); for (const i of s.def(d).instances.values()) stack.push(i.def); }
  return live;
}

/** 一次清点（模型根不列：它不是谁摆出来的，也不会是孤儿）。 */
export function census(s: Scene): Census {
  const live = liveDefs(s), users = new Map<DefId, { in: DefId; instance: InstId }[]>();
  for (const d of s.defs.values()) for (const i of d.instances.values()) { const u = users.get(i.def) ?? []; u.push({ in: d.id, instance: i.id }); users.set(i.def, u); }
  const defs = [...s.defs.values()].filter((d) => d.id !== s.root).map((d): DefCensus => ({ def: d.id, name: d.name, kind: s.kindOf(d.id), users: users.get(d.id) ?? [], placed: (users.get(d.id) ?? []).filter((u) => live.has(u.in)).length, live: live.has(d.id) }));
  const faces = new Array<number>(s.materials.length).fill(0);
  const hit = (slots: readonly number[], slot: number | undefined): void => { if (slot === undefined || slot < 0) return; const m = slots[slot]; if (m !== undefined && m >= 0 && m < faces.length) faces[m]++; };
  for (const id of live) {
    const b = s.def(id).body;
    if (b.kind === "mesh") { const k = b.kernel; for (const f of k.faces()) hit(b.materialSlots, k.faceMat[f]); continue; }
    for (const k of [b.kernel, ...[...b.groups.values()].map((g) => g.kernel)]) for (const f of k.faces()) { hit(b.materialSlots, k.faceMaterialOf(f.id, 0)); hit(b.materialSlots, k.faceMaterialOf(f.id, 1)); }
  }
  const materials = s.materials.map((m, index): MaterialCensus => ({ index, name: m.name, textured: !!m.texture, faces: faces[index] }));
  return { defs, materials };
}

/** 孤儿组件（够不着的）：清理指令吃这张单子。 */
export const orphanDefs = (c: Census): DefId[] => c.defs.filter((d) => !d.live).map((d) => d.def);
