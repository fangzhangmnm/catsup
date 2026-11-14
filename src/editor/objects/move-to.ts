// move-to.ts —— 「移到…」「移出一层」的规划（第 1 版施工单第三节，统筹 11-13〔默认〕；created 2026-11-13 by Claude Opus 5.5）。
// 选中的东西原位搬到别的层（世界位置不变、一步撤销）：子物体 = moveInstance（保 GUID，和层级窗口拖动同一条指令）；几何和组 = 编辑器那头
// 抽载荷 → 删 → 走过去 → 原位贴（不碰剪贴板）。这里只管：能不能搬、子物体那几条指令、搬到的那一层是什么种类、说什么。纯函数，不碰编辑器。
import type { BodyKind } from "../../scene/body-kind.ts";
import type { EditContext, InstId, Scene } from "../../scene/scene.ts";
import { compose, invert } from "../../scene/xform.ts";
import type { Op } from "../ops.ts";

export type MoveDest = { readonly kind: "into"; readonly instance: InstId } | { readonly kind: "up" };
type Pick = { readonly kind: "group"; readonly group: number } | { readonly kind: "instance"; readonly instance: InstId };

export interface MovePlan {
  /** 搬到的那一层的身体种类（几何要贴进去：种类对不上编辑器先问）。 */
  readonly kind: BodyKind;
  /** 子物体那几条（几何 / 组走载荷，不在这里）。 */
  readonly ops: readonly Op[];
  /** 选中的组（跟几何一起走载荷）。 */
  readonly groups: readonly Pick[];
  /** 「移出一层」搬上去的子物体的 GUID（编辑器退一层之后按它们选中）。 */
  readonly movedGuids: readonly string[];
  readonly say: string;
}

const shear = (m: readonly number[]): boolean => {   // 列向量两两不正交 = 斜切（glTF 不许组件斜切；和 object-tree.ts moveRowOp 同一个护栏）
  const c = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]], d = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const n = c.map((v) => Math.sqrt(d(v, v)) || 1);
  return Math.abs(d(c[0], c[1])) / (n[0] * n[1]) > 1e-6 || Math.abs(d(c[0], c[2])) / (n[0] * n[2]) > 1e-6 || Math.abs(d(c[1], c[2])) / (n[1] * n[2]) > 1e-6;
};

/** 搬进 / 搬出一个摆了好几份的组件，提示行后面跟的那一句（「移到…」「移出一层」和层级窗口拖动同一句；施工单第九节小调整）。n ≤ 1 = 空串；name = null = 「原来那个组件」。 */
export const copiesNote = (name: string | null, n: number, way: "more" | "less"): string => (n > 1 ? `${name === null ? "原来那个组件" : `「${name}」`}摆了 ${n} 份，每一份里都${way === "more" ? "多了" : "少了"}它` : "");

export function planMove(scene: Scene, ctx: EditContext, picks: readonly Pick[], hasGeometry: boolean, dest: MoveDest, locked: (p: Pick) => boolean): MovePlan | { readonly why: string } {
  const verb = dest.kind === "up" ? "移出一层" : "移到…";
  if (!picks.length && !hasGeometry) return { why: `${verb}：先选中要搬的东西` };
  if (picks.some(locked)) return { why: `${verb}：选区里有锁定的组 / 组件，先解锁` };
  const defA = scene.defOfContext(ctx), here = scene.def(defA), insts = picks.filter((p): p is Extract<Pick, { kind: "instance" }> => p.kind === "instance"), groups = picks.filter((p) => p.kind === "group");
  const copies = (def: number): number => (def === scene.root ? 1 : scene.instanceCount(def));
  const what = `${insts.length ? ` ${insts.length} 个物体` : ""}${insts.length && (hasGeometry || groups.length) ? " 和" : ""}${hasGeometry || groups.length ? "选中的几何" : ""}`;   // 数字前留空格（「把 1 个物体」）
  if (dest.kind === "into") {
    const t = here.instances.get(dest.instance);
    if (!t) return { why: "移到…：要搬进去的那个物体不在这一层" };
    if (insts.some((p) => p.instance === dest.instance)) return { why: "移到…：不能把一个物体搬进它自己" };
    if (locked({ kind: "instance", instance: dest.instance })) return { why: `移到…：「${scene.def(t.def).name}」锁着，先解锁再往里放` };
    const ops: Op[] = [];
    for (const p of insts) {
      const inst = here.instances.get(p.instance);
      if (!inst) return { why: "移到…：选区过期了，重新选一下" };
      if (scene.references(inst.def, t.def)) return { why: `移到…：不能把「${scene.def(inst.def).name}」放进它自己里面的东西里` };
      const xform = compose(invert(t.xform), inst.xform);
      if (shear(xform)) return { why: `移到…：「${scene.def(t.def).name}」被不等比缩放过，放进去会斜切（glTF 不许组件斜切）；先对它点「应用缩放」` };
      ops.push({ op: "moveInstance", from: { def: defA, inst: inst.id }, into: { def: t.def, parent: null }, xform });
    }
    const n = copies(t.def), name = scene.def(t.def).name;
    return { kind: scene.kindOf(t.def), ops, groups, movedGuids: [], say: `把${what}搬进「${name}」（位置不动${n > 1 ? `；${copiesNote(name, n, "more")}` : ""}）` };
  }
  // 移出一层：组里 → 组的上一级（同一个定义）；组件里 → 放着它的那一层
  if (ctx.group !== null) {
    const g = scene.group({ def: defA, group: ctx.group });
    const ops: Op[] = insts.map((p) => ({ op: "moveInstance", from: { def: defA, inst: p.instance }, into: { def: defA, parent: g.parent } }));
    return { kind: scene.kindOf(defA), ops, groups, movedGuids: insts.map((p) => here.instances.get(p.instance)!.guid), say: `把${what}搬出这个组（位置不动）` };
  }
  if (!ctx.chain.length) return { why: "移出一层：已经在最外一层，没有上一层" };
  const up = scene.defOfContext({ chain: ctx.chain.slice(0, -1), group: null }), I = scene.instance(up, ctx.chain[ctx.chain.length - 1]);
  const ops: Op[] = [];
  for (const p of insts) {
    const inst = here.instances.get(p.instance);
    if (!inst) return { why: "移出一层：选区过期了，重新选一下" };
    const xform = compose(I.xform, inst.xform);
    if (shear(xform)) return { why: `移出一层：这个组件被不等比缩放过，搬出去会斜切（glTF 不许组件斜切）；先对它点「应用缩放」` };
    ops.push({ op: "moveInstance", from: { def: defA, inst: inst.id }, into: { def: up, parent: I.parent }, xform });
  }
  const n = copies(defA);
  return { kind: scene.kindOf(up), ops, groups, movedGuids: insts.map((p) => here.instances.get(p.instance)!.guid), say: `把${what}搬到上一层（位置不动${n > 1 ? `；${copiesNote(here.name, n, "less")}，上一层只多一份` : ""}）` };
}
