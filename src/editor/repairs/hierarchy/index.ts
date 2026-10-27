// repairs/hierarchy —— 修复「恢复层级」（DT99）：规划在 plan.ts，这里 = 模块 + 插件指令 "hierarchy" 的执行（场景层搬家）。
// 2026-10-26 Claude Opus 5.5；同日搬成模块（user「做成可以扔的模块化的」）；老指令名 restoreHierarchy 由 ops.ts 认成 "hierarchy" 重放。
import { Kernel } from "../../../kernel/kernel.ts";
import { bboxMin, extractSnapshot, transformSnapshot, type Scene, type PoolRef } from "../../../scene/scene.ts";
import { IDENTITY, compose, frameAt, translation } from "../../../scene/xform.ts";
import { guideCount } from "../../../scene/guides.ts";
import { edgeKey, faceKey, poolOf, registerOpPlugin, resolveEdge, resolveFace, type EdgeKey, type FaceKey } from "../../ops.ts";
import type { RepairModule } from "../repair.ts";
import { classifyShapes, piecesOf } from "./plan.ts";

interface HierarchyArgs { faces: FaceKey[]; edges: EdgeKey[]; dedupe: boolean; /** 镜像对上的也算一样（负变换实例）。缺 = 否（老 op）。 */ mirror?: boolean }

/** 素组 = 这一层的组、里面只有散几何（没有子组 / 实例 / 参考几何）：参加形状比对，合进组件时整组换成一份实例。按 id 排。 */
function plainGroups(s: Scene, at: PoolRef) {
  const d0 = s.def(at.def), b0 = s.brep(at.def);
  return [...b0.groups.values()].filter((g) => g.parent === at.group && g.kernel.faces().length > 0 && guideCount(g.guides) === 0
    && ![...b0.groups.values()].some((c) => c.parent === g.id) && ![...d0.instances.values()].some((i) => i.parent === g.id)).sort((a, b) => a.id - b.id);
}

registerOpPlugin("hierarchy", {
  apply(s, at, a0) {
    const a = a0 as unknown as HierarchyArgs, { kernel, ref } = poolOf(s, at);
    const scope = a.faces.length || a.edges.length ? { faces: a.faces.map((f) => resolveFace(kernel, f)), edges: a.edges.map((e) => resolveEdge(kernel, e)) } : null;
    const pieces = piecesOf(kernel, scope), b0 = s.brep(ref.def);
    const plain = a.dedupe ? plainGroups(s, ref) : [];
    const items = [...pieces.map((p) => ({ piece: p, group: null as null | (typeof plain)[number], snap: extractSnapshot(kernel, p.faces, p.edges) })),
      ...plain.map((g) => ({ piece: null as null | (typeof pieces)[number], group: g, snap: g.kernel.toBrep() }))];
    const { classes, xf } = a.dedupe ? classifyShapes(items.map((x) => x.snap), { mirror: !!a.mirror }) : { classes: items.map((_, i) => [i]), xf: items.map(() => IDENTITY) };
    const split = pieces.length >= 2, moved: typeof pieces = [];
    let nComp = [...s.defs.values()].filter((d) => /^零件 \d+$/.test(d.name)).length;
    for (const cls of classes) {
      if (cls.length >= 2) {
        const tpl = items[cls[0]].snap, origin = bboxMin([...tpl.vertices]);
        const named = cls.map((i) => items[i].group?.name).find((n) => n !== undefined);
        const def = s.mintDef(named ?? `零件 ${++nComp}`, Kernel.fromBrep(transformSnapshotOf(tpl, origin)));
        s.brep(def.id).materialSlots = [...b0.materialSlots];
        for (const i of cls) {
          s.mintInstance(ref.def, ref.group, def.id, compose(xf[i], translation(origin)));
          const it = items[i];
          if (it.piece) moved.push(it.piece); else if (it.group) b0.groups.delete(it.group.id);
        }
      } else if (split && items[cls[0]].piece) {
        const it = items[cls[0]];
        s.mintGroup(ref.def, ref.group, Kernel.fromBrep(it.snap), frameAt(bboxMin([...it.snap.vertices])));
        moved.push(it.piece!);
      }
    }
    // 源池：搬走的块整块删（块是连通分量，删它碰不到别人）
    const events = kernel.eraseFaces(moved.flatMap((p) => p.faces));
    const left = moved.flatMap((p) => p.edges).filter((e) => kernel.graph.hasEdge(e));
    if (left.length) events.push(...kernel.eraseEdges(left));
    return { scene: s, events };
  },
  describe: (a0) => { const a = a0 as unknown as HierarchyArgs; return `${a.faces.length || a.edges.length ? `sel=${a.faces.length}+${a.edges.length}` : "all"}${a.dedupe ? " dedupe" : ""}${a.mirror ? " mirror" : ""}`; },
});
/** 模板快照挪到组件自己的原点（包围盒最小角 = 0）。 */
const transformSnapshotOf = (snap: Parameters<typeof transformSnapshot>[0], origin: { x: number; y: number; z: number }) => transformSnapshot(snap, translation({ x: -origin.x, y: -origin.y, z: -origin.z }));

export const hierarchy: RepairModule = {
  id: "hierarchy",
  title: "恢复层级",
  panel: { on: false, label: () => "恢复层级（连在一起的块各成一组，形状一样的合成组件）" },   // 默认不勾：它改结构，不是修小伤
  defaults: () => ({ dedupe: true, mirror: true }),
  fields: () => [{ key: "dedupe", def: { kind: "bool", label: "形状一样的合成组件" } }, { key: "mirror", def: { kind: "bool", label: "镜像对上的也算一样（左右对称件 = 镜像的一份）" } }],
  plan(ctx, { at, sel }, v) {
    // 按现在的样子数：会搬家的块（成组 / 成实例）+ 合进组件的素组；extra = 合成几个组件。执行时插件指令自己再规划一遍。
    const k = ctx.scene.kernelOf(at), dedupe = v.dedupe !== false, mirror = dedupe && v.mirror !== false;
    if (sel && !sel.faces.size && !sel.edges.size) return { ops: [], count: 0 };
    const faces = sel ? [...sel.faces].filter((f) => k.face(f)) : [], edges = sel ? [...sel.edges].filter((e) => k.graph.hasEdge(e)) : [];
    const pieces = piecesOf(k, sel ? { faces, edges } : null);
    const plain = dedupe ? plainGroups(ctx.scene, at) : [];
    const snaps = [...pieces.map((p) => extractSnapshot(k, p.faces, p.edges)), ...plain.map((g) => g.kernel.toBrep())];
    const classes = dedupe ? classifyShapes(snaps, { mirror }).classes : snaps.map((_, i) => [i]);
    const split = pieces.length >= 2;
    let count = 0, comps = 0;
    for (const c of classes) { if (c.length >= 2) { count += c.length; comps++; } else if (split && c[0] < pieces.length) count++; }
    if (!count) return { ops: [], count: 0 };
    const args: HierarchyArgs = { faces: faces.map((f) => faceKey(k, f)), edges: edges.map((e) => edgeKey(k, e)), dedupe, mirror };
    return { ops: [{ op: "plugin", name: "hierarchy", at, args: args as unknown as Record<string, unknown> }], count, extra: comps };
  },
  done: (n, e) => `整理了 ${n} 块：各自成组${e ? `，形状一样的合成 ${e} 个组件` : ""}`,
  none: "没有要整理的（每层只有一块、也没有形状一样的）",
  menu: { icon: "collection", label: (n) => `恢复层级…（${n} 块）` },
  // 菜单用的便宜数法：块 ≥ 2 → 块数 + 素组 ≥ 2 → 组数（不做形状比对；大模型上每步都比太贵）
  quickCount(ctx, { at, sel }) {
    const k = ctx.scene.kernelOf(at);
    const pieces = sel && !sel.faces.size && !sel.edges.size ? [] : piecesOf(k, sel ? { faces: [...sel.faces].filter((f) => k.face(f)), edges: [...sel.edges].filter((e) => k.graph.hasEdge(e)) } : null);
    const plain = plainGroups(ctx.scene, at).length;
    return (pieces.length >= 2 ? pieces.length : 0) + (plain >= 2 ? plain : 0);
  },
  deepFirst: true,
};
