// transfer.ts —— 几何 / 物件在容器之间搬家的载荷（剪贴板、以后的移动复制共用）。created 2026-10-28 by Claude Fable 5.1
// 设计稿 ai-docs/20261028-object-layer-and-clipboard-design.md §2–3（user 10-28 夜「复制黏贴我们没做」「取决于对方能不能接，不允许强制类型转换」
// →「这么说几何的复制黏贴也值得做，然后也许这种情况允许cast但是会弹窗。然后变成选择」）。
// 载荷 = 值拷贝、**世界坐标**、材质用文档材质 id（不是定义的槽号）：和任何一份定义都没有引用关系，撤销换掉场景也还在。
//   · brep   = 硬表面散几何快照（面 / 线 / 曲线 / 边层 / 面层）
//   · groups = 硬表面组的子树（每个组一份快照 + 坐标架 + 参考几何；parent = 载荷内下标）
//   · mesh   = 网格体散几何（面 / 裸线 / 边标记）
//   · instances = 组件实例（定义 id + 世界变换 + 名字 / 锁 / 层 / 藏；parent = 载荷内组下标 | null）——通用货币，什么容器都接
// 三个纯函数：extract（从场景抠）· accept（目标接不接；不接 = 要转种类）· castPayload（用户点了「转」才做的转换，和物体设置窗同一套 castBody）· localize（世界 → 目标容器本地）。
// 真正写进场景的是 ops.ts 的 `paste` 指令（吃本地坐标的载荷，材质 id 在指令里换成目标定义的槽号）。
import type { Pt3 } from "../kernel/geom.ts";
import { Kernel, type BrepSnapshot } from "../kernel/kernel.ts";
import { MeshKernel, F_WIRE } from "../mesh/mesh-kernel.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { cloneGuides, emptyGuides, transformGuides, type Guides } from "../scene/guides.ts";
import { castBody } from "../scene/kinds.ts";
import { extractSnapshot, remapSnapshotMaterial, transformSnapshot, type DefId, type EditContext, type GroupId, type InstId, type Scene } from "../scene/scene.ts";
import { applyPt, compose, transformFrame, type Frame, type Xform } from "../scene/xform.ts";

export interface TransferGroup { readonly parent: number | null; readonly snap: BrepSnapshot; readonly axes: Frame; readonly name?: string; readonly guides: Guides }
export interface TransferInstance { readonly parent: number | null; readonly def: DefId; readonly xform: Xform; readonly name?: string; readonly locked?: boolean; readonly layer?: number; readonly hidden?: boolean }
/** 网格体散几何：faces.mat / 边 flags 原样；mat = 文档材质 id（−1 = 无）。 */
export interface MeshFragment { readonly verts: Pt3[]; readonly faces: { readonly ring: number[]; readonly mat: number }[]; readonly edges: { readonly a: number; readonly b: number; readonly flags: number }[] }
export interface TransferPayload {
  /** 从哪种身体抠出来的（提示用）。 */
  readonly from: BodyKind;
  readonly brep?: BrepSnapshot;
  readonly groups?: TransferGroup[];
  readonly mesh?: MeshFragment;
  readonly instances?: TransferInstance[];
}
export interface TransferCounts { faces: number; edges: number; groups: number; instances: number }

export const transferCounts = (p: TransferPayload): TransferCounts => ({
  faces: (p.brep?.faces.length ?? 0) + (p.mesh?.faces.length ?? 0) + (p.groups ?? []).reduce((n, g) => n + g.snap.faces.length, 0),
  edges: (p.brep?.edges.length ?? 0) + (p.mesh?.edges.length ?? 0),
  groups: p.groups?.length ?? 0,
  instances: p.instances?.length ?? 0,
});
export const transferEmpty = (p: TransferPayload): boolean => { const c = transferCounts(p); return c.faces + c.edges + c.groups + c.instances === 0; };
/** 人话：「3 张面、1 个组、2 个物件」。 */
export function transferSay(p: TransferPayload): string {
  const c = transferCounts(p), parts: string[] = [];
  if (c.faces) parts.push(`${c.faces} 张面`);
  if (!c.faces && c.edges) parts.push(`${c.edges} 条线`);
  if (c.groups) parts.push(`${c.groups} 个组`);
  if (c.instances) parts.push(`${c.instances} 个物件`);
  return parts.join("、") || "空";
}

/** 从活动池抠一份（世界坐标）：选中的面 / 边 + 选中的组（子树）+ 选中的实例。什么都没选中 = null。 */
export function extract(s: Scene, ctx: EditContext, sel: { faces: Iterable<number>; edges: Iterable<number> }, pools: readonly ({ kind: "group"; group: GroupId } | { kind: "instance"; instance: InstId })[]): TransferPayload | null {
  const at = s.poolOfContext(ctx), X = s.xformOfContext(ctx), d = s.def(at.def), kind = s.kindOf(at.def);
  const instOf = (i: { def: DefId; xform: Xform; name?: string; locked?: boolean; layer?: number; hidden?: boolean }, parent: number | null): TransferInstance =>
    ({ parent, def: i.def, xform: compose(X, i.xform), ...(i.name !== undefined ? { name: i.name } : {}), ...(i.locked ? { locked: true } : {}), ...(i.layer !== undefined ? { layer: i.layer } : {}), ...(i.hidden ? { hidden: true } : {}) });
  const instances: TransferInstance[] = [];
  for (const p of pools) if (p.kind === "instance") { const i = d.instances.get(p.instance); if (i) instances.push(instOf(i, null)); }
  if (kind === "mesh") {
    const k = s.mesh(at.def).kernel, slots = s.mesh(at.def).materialSlots, faces = [...sel.faces].filter((f) => k.hasF(f)).sort((a, b) => a - b);
    const map = new Map<number, number>(), verts: Pt3[] = [];
    const nv = (v: number): number => { let x = map.get(v); if (x === undefined) { x = verts.length; map.set(v, x); verts.push(applyPt(X, k.pt(v))); } return x; };
    const outFaces = faces.map((f) => ({ ring: k.faceVerts(f).map(nv), mat: k.faceMat[f] >= 0 ? (slots[k.faceMat[f]] ?? -1) : -1 }));
    const eSet = new Set<number>();
    for (const f of faces) for (const e of k.fEdges(f)) if (e >= 0) eSet.add(e);
    for (const e of sel.edges) if (k.hasE(e)) eSet.add(e);   // 选中的裸线 / 别的边也带着（没有面的在目标里成裸线）
    const edges = [...eSet].sort((a, b) => a - b).map((e) => ({ a: nv(k.edgeA[e]), b: nv(k.edgeB[e]), flags: k.edgeFlags[e] | (k.eFaces(e).length && faces.some((f) => k.fEdges(f).includes(e)) ? 0 : F_WIRE) }));
    const mesh = outFaces.length || edges.length ? { verts, faces: outFaces, edges } : undefined;
    const out: TransferPayload = { from: "mesh", ...(mesh ? { mesh } : {}), ...(instances.length ? { instances } : {}) };
    return transferEmpty(out) ? null : out;
  }
  const b = s.brep(at.def), k = s.kernelOf(at), idOf = (slot: number): number => b.materialSlots[slot] ?? -1;
  const faces = [...sel.faces].filter((f) => !!k.face(f)), edges = [...sel.edges].filter((e) => k.graph.hasEdge(e));
  const brep = faces.length || edges.length ? transformSnapshot(remapSnapshotMaterial(extractSnapshot(k, faces, edges), idOf), X) : undefined;
  // 组：选中的 + 它们下面的全部子组（parent 链），按 id 升序出；子组的 parent 指向载荷内下标
  const picked = pools.filter((p): p is { kind: "group"; group: GroupId } => p.kind === "group").map((p) => p.group).filter((g) => b.groups.has(g));
  const sub = new Set<GroupId>(picked);
  for (let grew = true; grew;) { grew = false; for (const g of b.groups.values()) if (g.parent !== null && sub.has(g.parent) && !sub.has(g.id)) { sub.add(g.id); grew = true; } }
  const order = [...sub].sort((a, c) => a - c), idx = new Map<GroupId, number>(order.map((g, i) => [g, i]));
  const groups: TransferGroup[] = order.map((gid) => {
    const g = b.groups.get(gid)!, guides = cloneGuides(g.guides); transformGuides(guides, X);
    return { parent: g.parent !== null && idx.has(g.parent) ? idx.get(g.parent)! : null, snap: transformSnapshot(remapSnapshotMaterial(g.kernel.toBrep(), idOf), X), axes: transformFrame(X, g.axes), ...(g.name !== undefined ? { name: g.name } : {}), guides };
  });
  for (const i of d.instances.values()) if (i.parent !== null && idx.has(i.parent)) instances.push(instOf(i, idx.get(i.parent)!));
  const out: TransferPayload = { from: "brep", ...(brep ? { brep } : {}), ...(groups.length ? { groups } : {}), ...(instances.length ? { instances } : {}) };
  return transferEmpty(out) ? null : out;
}

/** 目标容器接不接：接 = ok；不接 = 要把散几何转成目标的种类（组件实例什么都接）。 */
export function accept(p: TransferPayload, target: BodyKind): { ok: true } | { ok: false; cast: BodyKind; what: string } {
  if (target === "brep" && p.mesh) return { ok: false, cast: "brep", what: `${p.mesh.faces.length} 张网格体的面` };
  if (target === "mesh" && (p.brep || p.groups?.length)) { const c = transferCounts(p); return { ok: false, cast: "mesh", what: `${c.faces} 张硬表面的面${c.groups ? `（含 ${c.groups} 个组，转过去组就没了）` : ""}` }; }
  return { ok: true };
}

/** 用户点了「转」：散几何按目标种类转（物体设置窗的 castBody 同一套，确定性）；组转成网格体后不再是组（网格体没有组），里面的实例挂到载荷根上。 */
export function castPayload(p: TransferPayload, to: BodyKind): TransferPayload {
  const instances = p.instances ?? [];
  if (to === "mesh") {
    const parts: BrepSnapshot[] = [...(p.brep ? [p.brep] : []), ...(p.groups ?? []).map((g) => g.snap)];
    const verts: Pt3[] = [], faces: MeshFragment["faces"] = [], edges: MeshFragment["edges"] = [];
    for (const snap of parts) {
      const body = castBody({ kind: "brep", kernel: Kernel.fromBrep(snap), groups: new Map(), nextGroup: 1, materialSlots: [], guides: emptyGuides() }, "mesh");
      if (body.kind !== "mesh") continue;
      const k = body.kernel, base = verts.length, vmap = new Map<number, number>();
      for (const v of k.verts()) { vmap.set(v, verts.length); verts.push(k.pt(v)); }
      for (const f of k.faces()) faces.push({ ring: k.faceVerts(f).map((v) => vmap.get(v)!), mat: k.faceMat[f] });   // 槽表给的是空的：faceMat 里就是材质 id
      for (const e of k.edges()) edges.push({ a: vmap.get(k.edgeA[e])!, b: vmap.get(k.edgeB[e])!, flags: k.edgeFlags[e] });
      void base;
    }
    const mesh = verts.length ? { verts, faces, edges } : undefined;
    const flat = instances.map((i) => (i.parent === null ? i : { ...i, parent: null }));
    return { from: p.from, ...(mesh ? { mesh } : {}), ...(flat.length ? { instances: flat } : {}) };
  }
  if (!p.mesh) return p;
  const k = new MeshKernel(), vs = p.mesh.verts.map((q) => k.addVertex(q));
  for (const f of p.mesh.faces) k.addFace(f.ring.map((i) => vs[i]), f.mat);
  for (const e of p.mesh.edges) { const id = k.ensureEdge(vs[e.a], vs[e.b]); k.setEdgeFlags(id, e.flags); }
  const body = castBody({ kind: "mesh", kernel: k, materialSlots: [] }, "brep");
  const brep = body.kind === "brep" ? body.kernel.toBrep() : undefined;
  return { from: p.from, ...(brep ? { brep } : {}), ...(p.groups?.length ? { groups: p.groups } : {}), ...(instances.length ? { instances } : {}) };
}

/** 世界坐标 → 目标容器本地（Xi = 目标上下文世界变换的逆）。 */
export function localize(p: TransferPayload, Xi: Xform): TransferPayload {
  return {
    from: p.from,
    ...(p.brep ? { brep: transformSnapshot(p.brep, Xi) } : {}),
    ...(p.groups ? { groups: p.groups.map((g) => { const guides = cloneGuides(g.guides); transformGuides(guides, Xi); return { ...g, snap: transformSnapshot(g.snap, Xi), axes: transformFrame(Xi, g.axes), guides }; }) } : {}),
    ...(p.mesh ? { mesh: { ...p.mesh, verts: p.mesh.verts.map((q) => applyPt(Xi, q)) } } : {}),
    ...(p.instances ? { instances: p.instances.map((i) => ({ ...i, xform: compose(Xi, i.xform) })) } : {}),
  };
}
