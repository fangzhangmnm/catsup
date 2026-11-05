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
// 纯函数：extract（从场景抠）· accept（目标接不接；不接 = 要转种类）· castPayload（用户点了「转」才做的转换，和物体设置窗同一套 castBody）· localize（世界 → 目标容器本地）· payloadFromDocument（从别的文件抠闭包）· pasteWouldCycle / pasteReport（贴之前查环、贴之后说清用了什么）。
// 真正写进场景的是 ops.ts 的 `paste` 指令（吃本地坐标的载荷，面上的编号经对照表换成目标定义的槽号）。
import type { Pt3 } from "../kernel/geom.ts";
import { Kernel, type BrepSnapshot } from "../kernel/kernel.ts";
import { MeshKernel, F_WIRE } from "../mesh/mesh-kernel.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { cloneGuides, emptyGuides, transformGuides, type Guides } from "../scene/guides.ts";
import { castBody } from "../scene/kinds.ts";
import { BUILTIN_BACK, BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import { reachableDefs } from "../scene/resources.ts";
import { extractSnapshot, remapSnapshotMaterial, transformSnapshot, type DefId, type EditContext, type GroupId, type InstId, type Instance, type Material, type Scene } from "../scene/scene.ts";
import { applyPt, compose, transformFrame, type Frame, type Xform } from "../scene/xform.ts";
import type { CatsupDocument, DefinitionDoc, LayerDoc } from "../format/document.ts";
import { mintGuid, type Guid } from "../format/guid.ts";
import { definitionToDoc, definitionsToMake } from "../format/scene-doc.ts";
import { isHex4 } from "./object-tree.ts";
import type { Op } from "./ops.ts";

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
  /** 实例用到的定义（递归）+ 层。有实例才有。 */
  readonly closure?: TransferClosure;
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
  const layerRows: LayerDoc[] = [];
  /** 层代号 → GUID，顺手记进闭包（整条）。 */
  const layerGuid = (code: number | undefined): Guid | undefined => { const l = code === undefined ? undefined : s.layers.find((x) => x.id === code); if (l && !layerRows.includes(l)) layerRows.push(l); return l?.guid; };
  const instOf = (i: Instance, parent: number | null): TransferInstance => {
    const layer = layerGuid(i.layer);
    return { parent, def: s.def(i.def).guid, xform: compose(X, i.xform), ...(i.name !== undefined ? { name: i.name } : {}), ...(i.locked ? { locked: true } : {}), ...(layer !== undefined ? { layer } : {}), ...(i.hidden ? { hidden: true } : {}) };
  };
  const table: Material[] = [];
  /** 文档材质下标 → 载荷对照表的编号。 */
  const codeOf = (matIndex: number): number => { const m = matIndex === BUILTIN_BACK_SLOT ? BUILTIN_BACK : s.materials[matIndex]; if (!m) return -1; let c = table.indexOf(m); if (c < 0) { c = table.length; table.push(m); } return c; };
  const tableOut = (): { materials?: readonly Material[] } => (table.length ? { materials: table } : {});
  const instances: TransferInstance[] = [], rootDefs = new Set<DefId>();
  const putInst = (i: Instance, parent: number | null): void => { if (!s.defs.has(i.def)) return; instances.push(instOf(i, parent)); rootDefs.add(i.def); };
  /** 闭包：摆放用到的定义往下走到底（文件形状）；它们的材质进对照表、层进 layerRows。 */
  const closureOut = (): { closure?: TransferClosure } => {
    if (!rootDefs.size) return {};
    const ids = [...reachableDefs(s, [...rootDefs])].filter((id) => id !== s.root);
    for (const id of ids) { const def = s.def(id); for (const m of def.body.materialSlots) if (m >= 0) codeOf(m); for (const i of def.instances.values()) layerGuid(i.layer); }
    return { closure: { definitions: ids.map((id) => definitionToDoc(s, id)), layers: layerRows.map((l) => ({ ...l })) } };
  };
  for (const p of pools) if (p.kind === "instance") { const i = d.instances.get(p.instance); if (i) putInst(i, null); }
  if (kind === "mesh") {
    const k = s.mesh(at.def).kernel, slots = s.mesh(at.def).materialSlots, faces = [...sel.faces].filter((f) => k.hasF(f)).sort((a, b) => a - b);
    const map = new Map<number, number>(), verts: Pt3[] = [];
    const nv = (v: number): number => { let x = map.get(v); if (x === undefined) { x = verts.length; map.set(v, x); verts.push(applyPt(X, k.pt(v))); } return x; };
    const outFaces = faces.map((f) => ({ ring: k.faceVerts(f).map(nv), mat: k.faceMat[f] >= 0 ? codeOf(slots[k.faceMat[f]] ?? -1) : -1 }));
    const eSet = new Set<number>();
    for (const f of faces) for (const e of k.fEdges(f)) if (e >= 0) eSet.add(e);
    for (const e of sel.edges) if (k.hasE(e)) eSet.add(e);   // 选中的裸线 / 别的边也带着（没有面的在目标里成裸线）
    const edges = [...eSet].sort((a, b) => a - b).map((e) => ({ a: nv(k.edgeA[e]), b: nv(k.edgeB[e]), flags: k.edgeFlags[e] | (k.eFaces(e).length && faces.some((f) => k.fEdges(f).includes(e)) ? 0 : F_WIRE) }));
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

/** 目标容器接不接：接 = ok；不接 = 要把散几何转成目标的种类（组件实例什么都接）。 */
export function accept(p: TransferPayload, target: BodyKind): { ok: true } | { ok: false; cast: BodyKind; what: string } {
  if (target === "brep" && p.mesh) return { ok: false, cast: "brep", what: `${p.mesh.faces.length} 张网格体的面` };
  if (target === "mesh" && (p.brep || p.groups?.length)) { const c = transferCounts(p); return { ok: false, cast: "mesh", what: `${c.faces} 张硬表面的面${c.groups ? `（含 ${c.groups} 个组，转过去组就没了）` : ""}` }; }
  return { ok: true };
}

/** 用户点了「转」：散几何按目标种类转（物体设置窗的 castBody 同一套，确定性）；组转成网格体后不再是组（网格体没有组），里面的实例挂到载荷根上。 */
export function castPayload(p: TransferPayload, to: BodyKind): TransferPayload {
  const instances = p.instances ?? [];
  // 槽号 = 对照表的编号；槽表按对照表造，转换才认得内置默认背面（§9.3-6）
  const slots = (): number[] => (p.materials ?? []).map((m, i) => (m === BUILTIN_BACK || m.guid === BUILTIN_BACK.guid ? BUILTIN_BACK_SLOT : i));
  if (to === "mesh") {
    const parts: BrepSnapshot[] = [...(p.brep ? [p.brep] : []), ...(p.groups ?? []).map((g) => g.snap)];
    const verts: Pt3[] = [], faces: MeshFragment["faces"] = [], edges: MeshFragment["edges"] = [];
    for (const snap of parts) {
      const body = castBody({ kind: "brep", kernel: Kernel.fromBrep(snap), groups: new Map(), nextGroup: 1, materialSlots: slots(), guides: emptyGuides() }, "mesh");
      if (body.kind !== "mesh") continue;
      const k = body.kernel, base = verts.length, vmap = new Map<number, number>();
      for (const v of k.verts()) { vmap.set(v, verts.length); verts.push(k.pt(v)); }
      for (const f of k.faces()) faces.push({ ring: k.faceVerts(f).map((v) => vmap.get(v)!), mat: k.faceMat[f] });   // 槽号就是对照表的编号
      for (const e of k.edges()) edges.push({ a: vmap.get(k.edgeA[e])!, b: vmap.get(k.edgeB[e])!, flags: k.edgeFlags[e] });
      void base;
    }
    const mesh = verts.length ? { verts, faces, edges } : undefined;
    const flat = instances.map((i) => (i.parent === null ? i : { ...i, parent: null }));
    return { from: p.from, ...(mesh ? { mesh } : {}), ...(flat.length ? { instances: flat } : {}), ...(p.materials ? { materials: p.materials } : {}), ...(p.closure ? { closure: p.closure } : {}) };
  }
  if (!p.mesh) return p;
  const k = new MeshKernel(), vs = p.mesh.verts.map((q) => k.addVertex(q));
  for (const f of p.mesh.faces) k.addFace(f.ring.map((i) => vs[i]), f.mat);
  for (const e of p.mesh.edges) { const id = k.ensureEdge(vs[e.a], vs[e.b]); k.setEdgeFlags(id, e.flags); }
  const body = castBody({ kind: "mesh", kernel: k, materialSlots: slots() }, "brep");
  const brep = body.kind === "brep" ? body.kernel.toBrep() : undefined;
  // 转硬表面可能新开内置默认背面那一格：对照表跟着长（编号 = 槽号）
  const table = body.materialSlots.map((h, i) => (h === BUILTIN_BACK_SLOT ? BUILTIN_BACK : (p.materials?.[i] ?? BUILTIN_BACK)));
  for (const m of p.materials ?? []) if (!table.includes(m)) table.push(m);   // 闭包按 GUID 查的那些，转换不许丢
  return { from: p.from, ...(brep ? { brep } : {}), ...(p.groups?.length ? { groups: p.groups } : {}), ...(instances.length ? { instances } : {}), ...(table.length ? { materials: table } : {}), ...(p.closure ? { closure: p.closure } : {}) };
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
    ...(p.closure ? { closure: p.closure } : {}),   // 定义在自己的坐标里，不跟着换
  };
}

/** 进指令之前：闭包只留这一贴真要新建的定义（指令流永不驱逐，同一个文件里贴一百次不许攒一百份闭包；提示行的「用了已有的」照用没剪的那份载荷）。重放时场景状态相同，结果相同。 */
export function trimClosure(s: Scene, p: TransferPayload): TransferPayload {
  if (!p.closure) return p;
  return { ...p, closure: { ...p.closure, definitions: definitionsToMake(s, p.closure.definitions, p.closure.roots ?? (p.instances ?? []).map((i) => i.def)) } };
}

/** 从别的文件抠闭包（素材导入：只读那份文件、挑几个组件）：没有摆放，只有 picks 往下走到底的定义 + 材质 + 层。文档的根不算（它不是素材）。 */
export function payloadFromDocument(doc: CatsupDocument, picks: readonly Guid[]): TransferPayload {
  const byGuid = new Map(doc.definitions.map((d) => [d.guid, d])), seen = new Set<Guid>(), definitions: DefinitionDoc[] = [], roots: Guid[] = [];
  const walk = (g: Guid): void => { if (seen.has(g) || g === doc.root.guid) return; seen.add(g); const d = byGuid.get(g); if (!d) return; definitions.push(d); for (const i of d.instances) walk(i.definition); };
  for (const g of picks) if (byGuid.has(g) && g !== doc.root.guid) { roots.push(g); walk(g); }
  const matGuids = new Set(definitions.flatMap((d) => d.materialSlots.filter((g): g is Guid => g !== null)));
  const layerCodes = new Set(definitions.flatMap((d) => d.instances.map((i) => i.layer).filter((c): c is number => c !== undefined)));
  const materials: Material[] = doc.materials.filter((m) => matGuids.has(m.guid)).map((m) => ({ guid: m.guid, name: m.name, color: m.color, ...(m.texture ? { texture: m.texture } : {}) }));
  return { from: "brep", ...(materials.length ? { materials } : {}), closure: { definitions, layers: (doc.layers ?? []).filter((l) => layerCodes.has(l.id)), roots } };
}
/** 那份文件里能上架的组件（素材架上的东西要有名字，user 10-30：没起名的不列、数出来说一声）。摆了几份 = 那份文件里的总数。 */
export function importCandidates(doc: CatsupDocument): { rows: { guid: Guid; name: string; kind: BodyKind; placed: number }[]; unnamed: number } {
  const all = doc.definitions.filter((d) => d.guid !== doc.root.guid), named = all.filter((d) => !isHex4(d.name));
  const placed = (g: Guid): number => doc.definitions.reduce((n, d) => n + d.instances.filter((i) => i.definition === g).length, 0);
  return { rows: named.map((d) => ({ guid: d.guid, name: d.name, kind: d.kind ?? "brep", placed: placed(d.guid) })), unnamed: all.length - named.length };
}
/** 素材导入这一步的指令：纯合并的 paste + 还没在架上的上架，一步撤销。already = 已经在架上的几个。 */
export function shelfImportOp(s: Scene, doc: CatsupDocument, picks: readonly Guid[]): { op: Op; payload: TransferPayload; already: number } {
  const payload = payloadFromDocument(doc, picks), roots = payload.closure?.roots ?? [];
  const fresh = roots.filter((g) => !s.shelf.items.some((it) => it.kind === "definition" && it.ref === g));
  const trimmed = trimClosure(s, payload);
  const paste: Op = { op: "paste", at: { def: s.root, group: null }, ...(trimmed.materials ? { materials: trimmed.materials } : {}), ...(trimmed.closure ? { closure: trimmed.closure } : {}) };
  return { op: { op: "batch", label: "导入素材", ops: [paste, ...fresh.map((ref): Op => ({ op: "shelfPut", kind: "definition", ref, folder: null, guid: mintGuid() }))] }, payload, already: roots.length - fresh.length };
}

/** 贴进 into 这个定义会不会造环（查的是合并之后的样子：同 GUID 用目标那条，不在的看闭包）。 */
export function pasteWouldCycle(s: Scene, p: TransferPayload, into: DefId): boolean {
  const byGuid = new Map((p.closure?.definitions ?? []).map((d) => [d.guid, d])), intoGuid = s.def(into).guid, seen = new Set<Guid>();
  const walk = (g: Guid): boolean => {
    if (g === intoGuid) return true;
    if (seen.has(g)) return false;
    seen.add(g);
    const have = s.defByGuid(g);
    return have ? s.references(have.id, into) : (byGuid.get(g)?.instances ?? []).some((i) => walk(i.definition));
  };
  return (p.instances ?? []).some((i) => walk(i.def));
}
/** 贴之前这个文件里有哪些条目（pasteReport 比对用）。 */
export interface PasteBefore { readonly defs: ReadonlySet<Guid>; readonly materials: ReadonlySet<Guid>; readonly layers: ReadonlySet<Guid> }
export const pasteBefore = (s: Scene): PasteBefore => ({ defs: new Set([...s.defs.values()].map((d) => d.guid)), materials: new Set(s.materials.map((m) => m.guid)), layers: new Set(s.layers.map((l) => l.guid)) });
/** 这一贴用了本文件已有的哪些、新建了哪些（只数载荷里提到的）。闭包里被已有定义挡住、没建出来的两边都不算。 */
export interface PasteReport { readonly reusedDefs: readonly string[]; readonly createdDefs: readonly string[]; readonly reusedMaterials: readonly string[]; readonly createdMaterials: readonly string[]; readonly createdLayers: readonly string[] }
export function pasteReport(before: PasteBefore, after: Scene, p: TransferPayload): PasteReport {
  const defs = p.closure?.definitions ?? [], mats = (p.materials ?? []).filter((m) => m.guid !== BUILTIN_BACK.guid), hasDef = new Set([...after.defs.values()].map((d) => d.guid)), hasMat = new Set(after.materials.map((m) => m.guid)), hasLayer = new Set(after.layers.map((l) => l.guid));
  return {
    reusedDefs: defs.filter((d) => before.defs.has(d.guid)).map((d) => after.defByGuid(d.guid)?.name ?? d.name),
    createdDefs: defs.filter((d) => !before.defs.has(d.guid) && hasDef.has(d.guid)).map((d) => d.name),
    reusedMaterials: mats.filter((m) => before.materials.has(m.guid)).map((m) => m.name),
    createdMaterials: mats.filter((m) => !before.materials.has(m.guid) && hasMat.has(m.guid)).map((m) => m.name),
    createdLayers: (p.closure?.layers ?? []).filter((l) => !before.layers.has(l.guid) && hasLayer.has(l.guid)).map((l) => l.name),
  };
}
const nameList = (names: readonly string[]): string => `${names.slice(0, 3).map((n) => `「${n}」`).join("、")}${names.length > 3 ? ` 等 ${names.length} 个` : ""}`;
/**
 * 提示行补的那半句。fromOtherModel = 这份剪贴板是在别的模型里拷的：那边改过的同 GUID 组件这里用的是本文件那版（user 11-04「第一次新建，之后再贴只多摆一份」），必须说（不静默）；
 * 同一个模型里每次贴都「用了已有的」，那是常态，不说。新建的永远说（同一个模型里 = 撤销过了头、按拷贝时的样子建回来）。
 */
export function pasteSay(r: PasteReport, fromOtherModel: boolean): string {
  const parts: string[] = [];
  if (r.createdDefs.length) parts.push(`新建了组件${nameList(r.createdDefs)}`);
  if (r.createdMaterials.length) parts.push(`新建了材质${nameList(r.createdMaterials)}`);
  if (r.createdLayers.length) parts.push(`新建了层${nameList(r.createdLayers)}`);
  if (fromOtherModel && r.reusedDefs.length) parts.push(`组件${nameList(r.reusedDefs)}本文件已有，用的是本文件这版`);
  if (fromOtherModel && r.reusedMaterials.length) parts.push(`材质${nameList(r.reusedMaterials)}本文件已有，用的是本文件这版`);
  return parts.length ? `；${parts.join("；")}` : "";
}
