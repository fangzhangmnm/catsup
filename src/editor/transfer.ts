// transfer.ts —— 几何 / 物件在容器之间搬家的载荷（剪贴板、以后的移动复制共用）。created 2026-10-28 by Claude Fable 5.1
// 设计稿 ai-docs/20261028-object-layer-and-clipboard-design.md §2–3（user 10-28 夜「复制黏贴我们没做」「取决于对方能不能接，不允许强制类型转换」
// →「这么说几何的复制黏贴也值得做，然后也许这种情况允许cast但是会弹窗。然后变成选择」）。
// 载荷 = 值拷贝、**世界坐标**：和任何一份定义都没有引用关系，撤销换掉场景也还在。
// 材质（身份地基 ID-2，2026-11-04 Claude Opus 5.5）：面上的编号 = 载荷自己那张 materials 对照表的下标（家规「编号只当对照表的代号」），表里是材质条目本身（带 GUID）；
//   以前直接存文档材质下标 = 清理材质 / 撤销过头之后下标换了人，静默贴错（清点 §4 A）。
// 闭包（身份地基 ID-3，计划书 §15，2026-11-04 Claude Opus 5.5）：实例按 GUID 引用定义 / 层，载荷自带它们用到的定义（递归）、材质、层，文件形状（素材导入拿到的就是这个形状，装进场景和打开文件同一份代码）。
//   所以载荷不再依赖「拷的那个模型还在」：换模型、撤销过了头都能贴（同 GUID 用目标那条，不在就按闭包带原 GUID 新建；摆放现铸 GUID）。
//   · brep   = 硬表面散几何快照（面 / 线 / 曲线 / 边层 / 面层）
//   · groups = 硬表面组的子树（每个组一份快照 + 坐标架 + 参考几何；parent = 载荷内下标）
//   · mesh   = 网格体散几何（面 / 裸线 / 边标记）
//   · materials = 面上编号的对照表
//   · instances = 组件实例（定义 GUID + 世界变换 + 名字 / 锁 / 层 GUID / 藏；parent = 载荷内组下标 | null）——通用货币，什么容器都接
//   · closure = 实例用到的定义（递归）+ 层（文件形状）；它们槽表里的材质也在 materials 表里（按 GUID 查，不走编号）
// 纯函数：extract（从场景抠）· accept（目标接不接；不接 = 要转种类）· castPayload（用户点了「转」才做的转换，和物体设置窗同一套 castBody）· localize（世界 → 目标容器本地）。
// 这一贴怎么搬（比内容、更新 / 断开、查环、提示行）= editor/paste-plan.ts；真正写进场景的是 ops.ts 的 `paste` 指令（吃本地坐标的载荷，面上的编号经对照表换成目标定义的槽号）。
import { faceMaterial, givenFaceValues, packEdgeByte, unpackEdgeByte } from "../mesh/reserved-columns.ts";
import type { Pt3 } from "../kernel/geom.ts";
import { Kernel, type BrepSnapshot } from "../kernel/kernel.ts";
import { MeshKernel } from "../mesh/mesh-kernel.ts";
import { F_WIRE } from "../mesh/edge-bits.ts";
import { FRESH } from "../mesh/columns.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { cloneGuides, emptyGuides, transformGuides, type Guides } from "../scene/guides.ts";
import { castBody, castLosses, sumLosses, type CastLoss } from "../scene/kinds.ts";
import { BUILTIN_BACK, BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import { extractSnapshot, remapSnapshotMaterial, transformSnapshot, type Body, type DefId, type EditContext, type GroupId, type InstId, type Instance, type Material, type Scene } from "../scene/scene.ts";
import { applyPt, compose, transformFrame, type Frame, type Xform } from "../scene/xform.ts";
import type { DefinitionDoc, LayerDoc, TextureDoc } from "../format/document.ts";
import type { Guid } from "../format/guid.ts";
import { DEFINITION, LAYER, MATERIAL, defRef, layerRef, type DefinitionEntry } from "../format/entry-kinds.ts";
import { sceneStore } from "../format/scene-store.ts";
import { paintMoveBlocked } from "../scene/paint.ts";
import { bundleOf, type Bundle } from "../identity/graph.ts";
import type { Ref } from "../identity/kinds.ts";

export interface TransferGroup { readonly parent: number | null; readonly snap: BrepSnapshot; readonly axes: Frame; readonly name?: string; readonly guides: Guides }
export interface TransferInstance { readonly parent: number | null; readonly def: Guid; readonly xform: Xform; readonly name?: string; readonly locked?: boolean; readonly layer?: Guid; readonly hidden?: boolean }
/** 载荷自带的条目（文件形状）。definitions 里实例上的 layer 是源文件那张层表的代号，经 layers 的 id 对回 GUID；槽表是材质 GUID，在 TransferPayload.materials 里找。 */
export interface TransferClosure {
  readonly definitions: readonly DefinitionDoc[];
  readonly layers: readonly LayerDoc[];
  /** 合并从谁往下走：缺 = 从载荷里摆放的实例走；素材导入没有摆放，= 挑中的那几个。 */
  readonly roots?: readonly Guid[];
}
/** 网格体散几何：faces.mat / 边 flags 原样；mat = 载荷 materials 表的下标（−1 = 无）。 */
export interface MeshFragment { readonly verts: Pt3[]; readonly faces: { readonly ring: number[]; readonly mat: number }[]; readonly edges: { readonly a: number; readonly b: number; readonly flags: number }[] }
export interface TransferPayload {
  /** 从哪种身体抠出来的（提示用）。 */
  readonly from: BodyKind;
  readonly brep?: BrepSnapshot;
  readonly groups?: TransferGroup[];
  readonly mesh?: MeshFragment;
  readonly instances?: TransferInstance[];
  /** 面上材质编号的对照表（brep 面层 / groups 面层 / mesh.faces[].mat 都是它的下标）+ 闭包里定义用到的材质（按 GUID 查）。 */
  readonly materials?: readonly Material[];
  /** 上面这些材质指着的贴图（文件形状，按 GUID 查；2026-11-10 贴图主线 1-0½：贴图是独立的条目，跟着材质走）。 */
  readonly textures?: readonly TextureDoc[];
  /** 实例用到的定义（递归）+ 层。有实例才有。 */
  readonly closure?: TransferClosure;
}
export const docsOfKind = <T>(b: Bundle, kind: string): T[] => b.docs.filter((e) => e.kind === kind).map((e) => e.doc as T);
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
/**
 * 拷贝 / 剪切用的那一口（1-3b 第六节）：选中的网格体面里有走画的 = 拒（{ blocked: 原因 }，判断 = scene/paint.ts paintMoveBlocked）；剪切走拷贝，所以也不会先删掉再贴不上。
 * 整个物件（实例）照拷：同一份文件里贴出来的另一份摆放共用同一张画；跨文件贴的时候粘贴那一步再拦。
 */
export function extractForCopy(s: Scene, ctx: EditContext, sel: { faces: Iterable<number>; edges: Iterable<number> }, pools: Parameters<typeof extract>[3]): TransferPayload | { readonly blocked: string } | null {
  const at = s.poolOfContext(ctx);
  if (s.kindOf(at.def) === "mesh") { const blocked = paintMoveBlocked(s, { def: at.def, faces: sel.faces }); if (blocked) return { blocked }; }
  return extract(s, ctx, sel, pools);
}
export function extract(s: Scene, ctx: EditContext, sel: { faces: Iterable<number>; edges: Iterable<number> }, pools: readonly ({ kind: "group"; group: GroupId } | { kind: "instance"; instance: InstId })[]): TransferPayload | null {
  const at = s.poolOfContext(ctx), X = s.xformOfContext(ctx), d = s.def(at.def), kind = s.kindOf(at.def);
  const layerRoots: Ref[] = [];
  const instOf = (i: Instance, parent: number | null): TransferInstance => {
    const layer = i.layer === undefined ? undefined : s.layers.find((x) => x.id === i.layer)?.guid;
    if (layer !== undefined) layerRoots.push(layerRef(layer));
    return { parent, def: s.def(i.def).guid, xform: compose(X, i.xform), ...(i.name !== undefined ? { name: i.name } : {}), ...(i.locked ? { locked: true } : {}), ...(layer !== undefined ? { layer } : {}), ...(i.hidden ? { hidden: true } : {}) };
  };
  const table: Material[] = [];
  const tableCode = (m: Material): number => { let c = table.indexOf(m); if (c < 0) { c = table.length; table.push(m); } return c; };
  /** 文档材质下标 → 载荷对照表的编号。 */
  const codeOf = (matIndex: number): number => { const m = matIndex === BUILTIN_BACK_SLOT ? BUILTIN_BACK : s.materials[matIndex]; return m ? tableCode(m) : -1; };
  const tableOut = (): { materials?: readonly Material[]; textures?: readonly TextureDoc[] } => {
    if (!table.length) return {};
    const textures = [...new Set(table.flatMap((m) => Object.values(m.channels ?? {}).flat()))].map((g) => s.textures.get(g)).filter((t): t is TextureDoc => !!t);   // 材质指着的贴图跟着走
    return { materials: table, ...(textures.length ? { textures } : {}) };
  };
  const instances: TransferInstance[] = [], rootDefs = new Set<DefId>();
  const putInst = (i: Instance, parent: number | null): void => { if (!s.defs.has(i.def)) return; instances.push(instOf(i, parent)); rootDefs.add(i.def); };
  /** 闭包：摆放用到的定义往下走到底（文件形状）；它们的材质进对照表、层进 layerRows。 */
  const closureOut = (): { closure?: TransferClosure } => {
    if (!rootDefs.size) return {};
    const b = bundleOf(sceneStore(s), [...[...rootDefs].map((id) => defRef(s.def(id).guid)), ...layerRoots]);
    for (const m of docsOfKind<Material>(b, MATERIAL)) tableCode(m);
    return { closure: { definitions: docsOfKind<DefinitionEntry>(b, DEFINITION).map((e) => e.def), layers: docsOfKind<LayerDoc>(b, LAYER).map((l) => ({ ...l })) } };
  };
  for (const p of pools) if (p.kind === "instance") { const i = d.instances.get(p.instance); if (i) putInst(i, null); }
  if (kind === "mesh") {
    const k = s.mesh(at.def).kernel, slots = s.mesh(at.def).materialSlots, faces = [...sel.faces].filter((f) => k.hasF(f)).sort((a, b) => a - b);
    const map = new Map<number, number>(), verts: Pt3[] = [];
    const nv = (v: number): number => { let x = map.get(v); if (x === undefined) { x = verts.length; map.set(v, x); verts.push(applyPt(X, k.pt(v))); } return x; };
    const outFaces = faces.map((f) => ({ ring: k.faceVerts(f).map(nv), mat: faceMaterial(k, f) >= 0 ? codeOf(slots[faceMaterial(k, f)] ?? -1) : -1 }));
    const eSet = new Set<number>();
    for (const f of faces) for (const e of k.fEdges(f)) if (e >= 0) eSet.add(e);
    for (const e of sel.edges) if (k.hasE(e)) eSet.add(e);   // 选中的裸线 / 别的边也带着（没有面的在目标里成裸线）
    const edges = [...eSet].sort((a, b) => a - b).map((e) => ({ a: nv(k.edgeA[e]), b: nv(k.edgeB[e]), flags: packEdgeByte(k, e) | (k.eFaces(e).length && faces.some((f) => k.fEdges(f).includes(e)) ? 0 : F_WIRE) }));
    const mesh = outFaces.length || edges.length ? { verts, faces: outFaces, edges } : undefined;
    const out: TransferPayload = { from: "mesh", ...(mesh ? { mesh } : {}), ...(instances.length ? { instances } : {}), ...closureOut(), ...tableOut() };   // closureOut 先跑：它会往对照表里加
    return transferEmpty(out) ? null : out;
  }
  const b = s.brep(at.def), k = s.kernelOf(at), idOf = (slot: number): number => codeOf(b.materialSlots[slot] ?? -1);
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
  for (const i of d.instances.values()) if (i.parent !== null && idx.has(i.parent)) putInst(i, idx.get(i.parent)!);
  const out: TransferPayload = { from: "brep", ...(brep ? { brep } : {}), ...(groups.length ? { groups } : {}), ...(instances.length ? { instances } : {}), ...closureOut(), ...tableOut() };   // closureOut 先跑：它会往对照表里加
  return transferEmpty(out) ? null : out;
}

/** 载荷里要转的散几何拼成的身体（castPayload 真转和 accept 问丢什么看的是同一批：第 1 版第五节 4½「和真转同一份算法」）。槽号 = 对照表的编号，槽表按对照表造（转换才认得内置默认背面，§9.3-6）。 */
function payloadBodies(p: TransferPayload, to: BodyKind): Body[] {
  const slots = (): number[] => (p.materials ?? []).map((m, i) => (m === BUILTIN_BACK || m.guid === BUILTIN_BACK.guid ? BUILTIN_BACK_SLOT : i));
  if (to === "mesh") return [...(p.brep ? [p.brep] : []), ...(p.groups ?? []).map((g) => g.snap)].map((snap): Body => ({ kind: "brep", kernel: Kernel.fromBrep(snap), groups: new Map(), nextGroup: 1, materialSlots: slots(), guides: emptyGuides() }));
  if (to !== "brep" || !p.mesh) return [];
  const k = new MeshKernel(), vs = p.mesh.verts.map((q) => k.addVertex(q));
  for (const f of p.mesh.faces) k.addFace(f.ring.map((i) => vs[i]), { kind: "fresh", face: givenFaceValues(k, { material: f.mat }) });   // 经过剪贴板：故意不带角上的数（统筹 11-11 定，1-2½）——这里是转成硬表面，本来也带不过去
  for (const e of p.mesh.edges) { const id = k.ensureEdge(vs[e.a], vs[e.b]); unpackEdgeByte(k, id, e.flags); }
  return [{ kind: "mesh", kernel: k, materialSlots: slots(), uvSetSlots: [] }];
}
/** 目标容器接不接：接 = ok；不接 = 要把散几何转成目标的种类（组件实例什么都接）+ 转过去带不过去什么（castLosses，组转成网格体 = 组分区没了）。 */
export function accept(p: TransferPayload, target: BodyKind): { ok: true } | { ok: false; cast: BodyKind; what: string; losses: readonly CastLoss[] } {
  const losses = (to: BodyKind): readonly CastLoss[] => sumLosses([...payloadBodies(p, to).map((b) => castLosses(b, to)), to === "mesh" && p.groups?.length ? [{ what: "groups" as const, count: p.groups.length }] : []]);
  if (target === "brep" && p.mesh) return { ok: false, cast: "brep", what: `${p.mesh.faces.length} 张网格体的面`, losses: losses("brep") };
  if (target === "mesh" && (p.brep || p.groups?.length)) { const c = transferCounts(p); return { ok: false, cast: "mesh", what: `${c.faces} 张硬表面的面${c.groups ? `（含 ${c.groups} 个组）` : ""}`, losses: losses("mesh") }; }
  return { ok: true };
}

/** 用户点了「转」：散几何按目标种类转（物体设置窗的 castBody 同一套，确定性）；组转成网格体后不再是组（网格体没有组），里面的实例挂到载荷根上。 */
export function castPayload(p: TransferPayload, to: BodyKind): TransferPayload {
  const instances = p.instances ?? [];
  if (to === "mesh") {
    const verts: Pt3[] = [], faces: MeshFragment["faces"] = [], edges: MeshFragment["edges"] = [];
    for (const src of payloadBodies(p, "mesh")) {
      const { body } = castBody(src, "mesh");
      if (body.kind !== "mesh") continue;
      const k = body.kernel, base = verts.length, vmap = new Map<number, number>();
      for (const v of k.verts()) { vmap.set(v, verts.length); verts.push(k.pt(v)); }
      for (const f of k.faces()) faces.push({ ring: k.faceVerts(f).map((v) => vmap.get(v)!), mat: faceMaterial(k, f) });   // 槽号就是对照表的编号
      for (const e of k.edges()) edges.push({ a: vmap.get(k.edgeA[e])!, b: vmap.get(k.edgeB[e])!, flags: packEdgeByte(k, e) });
      void base;
    }
    const mesh = verts.length ? { verts, faces, edges } : undefined;
    const flat = instances.map((i) => (i.parent === null ? i : { ...i, parent: null }));
    return { from: p.from, ...(mesh ? { mesh } : {}), ...(flat.length ? { instances: flat } : {}), ...(p.materials ? { materials: p.materials } : {}), ...(p.textures ? { textures: p.textures } : {}), ...(p.closure ? { closure: p.closure } : {}) };
  }
  const src = payloadBodies(p, "brep")[0];
  if (!src) return p;
  const { body } = castBody(src, "brep");
  const brep = body.kind === "brep" ? body.kernel.toBrep() : undefined;
  // 转硬表面可能新开内置默认背面那一格：对照表跟着长（编号 = 槽号）
  const table = body.materialSlots.map((h, i) => (h === BUILTIN_BACK_SLOT ? BUILTIN_BACK : (p.materials?.[i] ?? BUILTIN_BACK)));
  for (const m of p.materials ?? []) if (!table.includes(m)) table.push(m);   // 闭包按 GUID 查的那些，转换不许丢
  return { from: p.from, ...(brep ? { brep } : {}), ...(p.groups?.length ? { groups: p.groups } : {}), ...(instances.length ? { instances } : {}), ...(table.length ? { materials: table } : {}), ...(p.textures ? { textures: p.textures } : {}), ...(p.closure ? { closure: p.closure } : {}) };
}

/** 世界坐标 → 目标容器本地（Xi = 目标上下文世界变换的逆）。 */
export function localize(p: TransferPayload, Xi: Xform): TransferPayload {
  return {
    from: p.from,
    ...(p.brep ? { brep: transformSnapshot(p.brep, Xi) } : {}),
    ...(p.groups ? { groups: p.groups.map((g) => { const guides = cloneGuides(g.guides); transformGuides(guides, Xi); return { ...g, snap: transformSnapshot(g.snap, Xi), axes: transformFrame(Xi, g.axes), guides }; }) } : {}),
    ...(p.mesh ? { mesh: { ...p.mesh, verts: p.mesh.verts.map((q) => applyPt(Xi, q)) } } : {}),
    ...(p.instances ? { instances: p.instances.map((i) => ({ ...i, xform: compose(Xi, i.xform) })) } : {}),
    ...(p.materials ? { materials: p.materials } : {}),
    ...(p.textures ? { textures: p.textures } : {}),
    ...(p.closure ? { closure: p.closure } : {}),   // 定义在自己的坐标里，不跟着换
  };
}
