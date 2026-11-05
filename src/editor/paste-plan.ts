// editor/paste-plan.ts —— 这一贴怎么搬（身份层的客户）：载荷 → 包 → frontier → plan → applyPlan，外加能不能贴、指令流留什么、弹窗的事实、提示行。素材导入是同一条路。设计书 ai-docs/20261104-identity-layer-design.md §5–§8。created 2026-11-04 by Claude Opus 5.5（ID-4，从 transfer.ts 分出来：transfer.ts 只管载荷本身）
// 同一次打开里贴 = 留这里的（KEEP），不比内容、永不问；别的情况内容不一样才问（user 11-04 深夜「2弹窗 3 跟，可开关 4 用」）。
import { DEFINITION, LAYER, MATERIAL, defRef, layerGuidOfTable, layerRef, materialRef, type DefinitionEntry } from "../format/entry-kinds.ts";
import { applyPlan, docStore, sceneStore, type SceneStore } from "../format/scene-store.ts";
import type { CatsupDocument, LayerDoc } from "../format/document.ts";
import { mintGuid, type Guid } from "../format/guid.ts";
import { KEEP, bundleOf, docsNeeded, frontier, plan, planWouldCycle, type Bundle, type Decision, type Frontier, type MergePlan } from "../identity/graph.ts";
import { KINDS, refKey, type Ref } from "../identity/kinds.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { ROOT_CONTEXT, remapSnapshotMaterial, type DefId, type EditContext, type GroupId, type InstId, type Material, type PoolRef, type Scene } from "../scene/scene.ts";
import type { Xform } from "../scene/xform.ts";
import { isHex4 } from "./object-tree.ts";
import type { Op } from "./ops.ts";
import { docsOfKind, localize, transferSay, type TransferInstance, type TransferPayload } from "./transfer.ts";
export { KEEP, type Decision } from "../identity/graph.ts";

/**
 * 载荷在身份层眼里的样子（设计书 §1「包」）：闭包 + 对照表成文件形状，从「要摆的、面上用的」往下走（素材导入没有摆放 = closure.roots）。
 * 老复现包：实例的 def / layer 是数字句柄、没有对照表，不进包（landPayload 原样认）。
 */
export function payloadBundle(p: Pick<TransferPayload, "brep" | "groups" | "mesh" | "instances" | "materials" | "closure">): Bundle {
  const layers = p.closure?.layers ?? [], layerGuid = layerGuidOfTable(layers), placed = p.instances ?? [], guids = (xs: readonly (Guid | undefined)[]): Guid[] => xs.filter((g): g is Guid => typeof g === "string");
  const codes = new Set<number>(), collect = (c: number): number => { codes.add(c); return c; };
  for (const snap of [...(p.brep ? [p.brep] : []), ...(p.groups ?? []).map((g) => g.snap)]) remapSnapshotMaterial(snap, collect);
  for (const f of p.mesh?.faces ?? []) if (f.mat >= 0) collect(f.mat);
  const faceMaterials = guids([...codes].map((c) => p.materials?.[c]?.guid));
  return {
    docs: [...(p.closure?.definitions ?? []).map((def) => ({ kind: DEFINITION, doc: { def, layerGuid } satisfies DefinitionEntry })), ...(p.materials ?? []).map((m) => ({ kind: MATERIAL, doc: m as unknown })), ...layers.map((l) => ({ kind: LAYER, doc: l as unknown }))],
    roots: [...(p.closure?.roots ?? guids(placed.map((i) => i.def))).map(defRef), ...guids(placed.map((i) => i.layer)).map(layerRef), ...faceMaterials.map(materialRef)],
  };
}
type PastePayload = Parameters<typeof payloadBundle>[0];
/** 这一贴的计划：frontier → plan（applyPlan 在 landPayload）。 */
export interface PastePlan { readonly store: SceneStore; readonly bundle: Bundle; readonly plan: MergePlan }
export function planPaste(s: Scene, p: PastePayload, d: Decision = KEEP, f?: Frontier): PastePlan { const store = sceneStore(s), bundle = payloadBundle(p); return { store, bundle, plan: plan(store, bundle, d, f) }; }
/** 这个计划走不通的话，为什么（人话，不带「粘贴：」：弹窗写在灰掉的选项下面，提示行前面加）。 */
function whyBlocked(s: Scene, pp: PastePlan, into: DefId, inside: readonly DefId[]): string | null {
  const updated = new Set(pp.plan.update.filter((r) => r.kind === DEFINITION).map((r) => r.guid)), under = inside.find((id) => updated.has(s.def(id).guid));
  if (under !== undefined) return `你站在组件「${s.def(under).name}」里面，更新它会把你脚下的路断掉：先退出来`;
  return planWouldCycle(pp.store, pp.bundle, pp.plan, defRef(s.def(into).guid)) ? "会把物件贴进它自己里" : null;
}
/** 这一贴不能做的话，说为什么（站在要被更新的组件里面 / 会成环）。inside = 编辑上下文这一路上的定义（指令只知道贴进哪个定义，所以传它一个；编辑器传整条链）。 */
export function pasteBlocked(s: Scene, pp: PastePlan, into: DefId, inside: readonly DefId[] = [into]): string | null { const why = whyBlocked(s, pp, into, inside); return why && `粘贴：${why}`; }
/** 编辑上下文这一路上的定义（根 → 站着的这一层）。 */
function defsOnChain(s: Scene, ctx: EditContext): DefId[] {
  const out = [s.root];
  let def = s.root;
  for (const iid of ctx.chain) { def = s.instance(def, iid).def; out.push(def); }
  return out;
}
/** 落地之后怎么认载荷里的东西（ops.ts 的 paste 用）。 */
export interface LandedPayload { defOf(i: TransferInstance): number | undefined; layerOf(i: TransferInstance): number | undefined; materialOf(code: number): number; defGuid(g: Guid): Guid }
/** 按计划落地（新建带原 GUID、更新原地换身体、断开铸新）。 */
export function landPayload(s: Scene, pp: PastePlan, table: readonly Material[] | undefined): LandedPayload {
  const land = applyPlan(s, pp.bundle, pp.plan);
  return {
    defOf(i) { const raw = i.def as unknown; return typeof raw === "number" ? (s.defs.has(raw) ? raw : undefined) : land.idOf(defRef(i.def)); },
    layerOf(i) { const raw = i.layer as unknown; return typeof raw === "number" ? raw : i.layer === undefined ? undefined : land.idOf(layerRef(i.layer)); },
    materialOf(code) { if (code < 0) return -1; if (!table) return code; const m = table[code]; return m ? (land.idOf(materialRef(m.guid)) ?? -1) : -1; },   // 没表 = 老复现包，编号就是文档材质下标
    defGuid: (g) => land.guidOf(defRef(g)),
  };
}
/** 进指令之前：闭包只留这个计划要的定义（指令流永不驱逐，同一个文件里贴一百次不许攒一百份闭包；提示行照用没剪的那份载荷）。重放时场景状态相同，结果相同。 */
export function trimClosure(s: Scene, p: TransferPayload, d: Decision = KEEP, pp: PastePlan = planPaste(s, p, d)): TransferPayload {
  if (!p.closure) return p;
  const need = docsNeeded(pp.bundle, pp.plan);
  return { ...p, closure: { ...p.closure, definitions: p.closure.definitions.filter((x) => need.has(refKey(defRef(x.guid)))) } };
}
/** 弹窗的一行（事实，不是「谁新」：文件里没有版本号，机器判不了）。 */
export interface ConflictRow { readonly kind: string; readonly name: string; readonly placed: number; readonly faces: number; readonly locked: number; readonly shelved: boolean; /** 组件两边各几张面。 */ readonly hereFaces?: number; readonly incomingFaces?: number; /** 材质两边的颜色（sRGB 0..1）+ 有没有贴图。 */ readonly hereMaterial?: Material; readonly incomingMaterial?: Material }
const faceCount = (e: DefinitionEntry): number => (e.def.kind === "mesh" && e.def.mesh ? e.def.mesh.faceLen.length : e.def.brep.faces.length + e.def.groups.reduce((n, g) => n + g.brep.faces.length, 0));
export function conflictRows(f: Frontier): ConflictRow[] {
  return f.differ.map((x) => {
    const base = { kind: x.ref.kind, name: KINDS.get(x.ref.kind)!.nameOf(x.here), placed: x.usage.placed, faces: x.usage.faces, locked: x.usage.locked, shelved: x.usage.shelved };
    if (x.ref.kind === DEFINITION) return { ...base, hereFaces: faceCount(x.here as DefinitionEntry), incomingFaces: faceCount(x.incoming as DefinitionEntry) };
    return x.ref.kind === MATERIAL ? { ...base, hereMaterial: x.here as Material, incomingMaterial: x.incoming as Material } : base;
  });
}
/** 三种处理各走不走得通：null = 走得通，字符串 = 为什么走不通（人话）。 */
export type PasteWays = Readonly<Record<Decision["entries"], string | null>>;
/** 跨打开贴之前的预查（内容不一样才有）：弹窗的事实 + 三种处理走不走得通 + 算好的前沿（后面的计划接着用，一贴只比一次内容）。stuck = 三种都走不通时的人话（不弹窗：不问没答案的问题）。 */
export interface PasteConflict { readonly rows: readonly ConflictRow[]; readonly ways: PasteWays; readonly frontier: Frontier; readonly stuck: string | null }
/** 三种都走不通的人话：同一个原因并成一条（通常都是「贴进它自己」）。 */
function stuckSay(w: PasteWays): string | null {
  const says: [string, string | null][] = [["更新", w.update], ["留这里的", w.keep], ["断开", w.detach]], byWhy = new Map<string, string[]>();
  for (const [label, why] of says) { if (!why) return null; byWhy.set(why, [...(byWhy.get(why) ?? []), label]); }
  return `三种处理都走不通，没贴。${[...byWhy].map(([why, labels]) => `${labels.join("、")}：${why}`).join("；")}`;
}
/** 跨打开贴之前：有内容不一样的条目吗（有 = 要问，一行一条）。同一次打开不调（永不问）。ctx = 站在哪（这一路上的定义不能被更新）；into = 贴进哪个定义（查成环）：手动粘贴 = 站的这一层，导入素材 = 根（落在根、不摆放，站在哪都不会贴进站着的这一层）。 */
export function pasteConflict(s: Scene, p: TransferPayload, ctx: EditContext = ROOT_CONTEXT, into: DefId = s.defOfContext(ctx)): PasteConflict | null {
  if (!p.closure && !p.materials) return null;
  const store = sceneStore(s), bundle = payloadBundle(p), f = frontier(store, bundle), rows = conflictRows(f);
  if (!rows.length) return null;
  const inside = defsOnChain(s, ctx), why = (entries: Decision["entries"]): string | null => whyBlocked(s, { store, bundle, plan: plan(store, bundle, { entries }, f) }, into, inside);
  const ways: PasteWays = { update: why("update"), keep: why("keep"), detach: why("detach") };
  return { rows, ways, frontier: f, stuck: stuckSay(ways) };
}

/** 从别的文件抠闭包（素材导入：只读那份文件、挑几个组件）：没有摆放，只有 picks 往下走到底的定义 + 材质 + 层。文档的根不算（它不是素材）。 */
export function payloadFromDocument(doc: CatsupDocument, picks: readonly Guid[]): TransferPayload {
  const store = docStore(doc), roots = picks.filter((g) => g !== doc.root.guid && store.has(defRef(g))), b = bundleOf(store, roots.map(defRef)), materials = docsOfKind<Material>(b, MATERIAL);
  return { from: "brep", ...(materials.length ? { materials } : {}), closure: { definitions: docsOfKind<DefinitionEntry>(b, DEFINITION).map((e) => e.def).filter((d) => d.guid !== doc.root.guid), layers: docsOfKind<LayerDoc>(b, LAYER), roots } };
}
/** 那份文件里能上架的组件（素材架上的东西要有名字，user 10-30：没起名的不列、数出来说一声）。摆了几份 = 那份文件里的总数。 */
export function importCandidates(doc: CatsupDocument): { rows: { guid: Guid; name: string; kind: BodyKind; placed: number }[]; unnamed: number } {
  const all = doc.definitions.filter((d) => d.guid !== doc.root.guid), named = all.filter((d) => !isHex4(d.name));
  const placed = (g: Guid): number => doc.definitions.reduce((n, d) => n + d.instances.filter((i) => i.definition === g).length, 0);
  return { rows: named.map((d) => ({ guid: d.guid, name: d.name, kind: d.kind ?? "brep", placed: placed(d.guid) })), unnamed: all.length - named.length };
}
/** 导入素材点了之后再查一遍（瑞士奶酪，和 preparePaste 同款）：指令只知道贴进根，站的这一路只有编辑器知道。不能做 = 人话（不带前缀）。 */
export const importBlocked = (s: Scene, p: TransferPayload, d: Decision, ctx: EditContext, f?: Frontier): string | null => whyBlocked(s, planPaste(s, p, d, f), s.root, defsOnChain(s, ctx));
/** 素材导入这一步的指令：纯合并的 paste，带上「还没在架上的」上架（断开之后是新身份，所以上架在 paste 里按落地之后的 GUID 做），一步撤销。already = 已经在架上的几个。 */
export function shelfImportOp(s: Scene, doc: CatsupDocument, picks: readonly Guid[], d: Decision = KEEP, f?: Frontier): { op: Op; payload: TransferPayload; already: number } {
  const payload = payloadFromDocument(doc, picks), roots = payload.closure?.roots ?? [], pp = planPaste(s, payload, d, f);
  const fresh = roots.filter((g) => pp.plan.remint.has(g) || !s.shelf.items.some((it) => it.kind === "definition" && it.ref === g));
  const trimmed = trimClosure(s, payload, d, pp);
  const paste: Op = { op: "paste", at: { def: s.root, group: null }, ...(trimmed.materials ? { materials: trimmed.materials } : {}), ...(trimmed.closure ? { closure: trimmed.closure } : {}), ...(d.entries !== "keep" ? { merge: d } : {}), ...(fresh.length ? { shelve: fresh.map((ref) => ({ ref, guid: mintGuid() })) } : {}) };
  return { op: { op: "batch", label: "导入素材", ops: [paste] }, payload, already: roots.length - fresh.length };
}

/**
 * 编辑器这一贴要的全部（从 editor.ts 搬出来，棘轮是让本体别长）：能不能贴（不能 = 返回人话）、指令、贴完怎么找「新的」、提示行。
 * 站在要被更新的定义里（编辑上下文这一路上任何一层）= 拒，不只是贴进的那一层：换身体会让上下文链断掉（设计书 §6）。
 */
export function preparePaste(s: Scene, ctx: EditContext, at: PoolRef, p: TransferPayload, d: Decision, toLocal: Xform, f?: Frontier): string | { op: Op; fresh(after: Scene): { pools: [string, { kind: "instance"; instance: InstId } | { kind: "group"; group: GroupId }][]; meshFaces: number[] }; say(after: Scene, copies: number, crossOpen: boolean): string } {
  const pp = planPaste(s, p, d, f), blocked = pasteBlocked(s, pp, at.def, defsOnChain(s, ctx));   // 一个计划从头用到尾；问过的话前沿也是问的时候那份（比内容要序列化，一贴只比一次）。点了之后照旧再查一遍（瑞士奶酪）
  if (blocked) return blocked;
  const l = trimClosure(s, localize(p, toLocal), d, pp), before: PasteBefore = { defs: new Set(), plan: pp.plan, bundle: pp.bundle }, def = at.def, isBrep = s.kindOf(def) === "brep";
  const instBefore = new Set(s.def(def).instances.keys()), groupBefore = new Set(isBrep ? s.brep(def).groups.keys() : []), meshBefore = isBrep ? null : new Set(s.mesh(def).kernel.faces());
  return {
    op: { op: "paste", at, ...(l.brep ? { brep: l.brep } : {}), ...(l.groups ? { groups: l.groups } : {}), ...(l.mesh ? { mesh: l.mesh } : {}), ...(l.instances ? { instances: l.instances } : {}), ...(l.materials ? { materials: l.materials } : {}), ...(l.closure ? { closure: l.closure } : {}), ...(d.entries !== "keep" ? { merge: d } : {}) },
    fresh(after) {
      const pools: [string, { kind: "instance"; instance: InstId } | { kind: "group"; group: GroupId }][] = [];
      for (const id of after.def(def).instances.keys()) if (!instBefore.has(id)) pools.push([`i${id}`, { kind: "instance", instance: id }]);
      if (after.kindOf(def) === "brep") for (const id of after.brep(def).groups.keys()) if (!groupBefore.has(id) && after.brep(def).groups.get(id)!.parent === at.group) pools.push([`g${id}`, { kind: "group", group: id }]);
      return { pools, meshFaces: meshBefore && after.kindOf(def) === "mesh" ? after.mesh(def).kernel.faces().filter((f) => !meshBefore.has(f)) : [] };
    },
    say: (after, copies, crossOpen) => `贴了 ${transferSay(p)}（原位${copies > 1 ? `；这个组件摆了 ${copies} 份，每份都多了` : ""}）${pasteSay(pasteReport(before, after), crossOpen)}`,
  };
}
/** 贴进 into 这个定义会不会造环（查的是合并之后的样子：同 GUID 用目标那条，不在的看闭包）。 */
export function pasteWouldCycle(s: Scene, p: TransferPayload, into: DefId, d: Decision = KEEP): boolean {
  const pp = planPaste(s, p, d);
  return planWouldCycle(pp.store, pp.bundle, pp.plan, defRef(s.def(into).guid));
}
/** 贴之前记一下这一贴的计划（pasteReport 用）。 */
export interface PasteBefore { readonly defs: ReadonlySet<Guid>; readonly plan: MergePlan; readonly bundle: Bundle }
export const pasteBefore = (s: Scene, p: TransferPayload, d: Decision = KEEP, f?: Frontier): PasteBefore => { const pp = planPaste(s, p, d, f); return { defs: new Set([...s.defs.values()].map((x) => x.guid)), plan: pp.plan, bundle: pp.bundle }; };
/** 这一贴用了本文件已有的哪些、新建 / 更新 / 断开了哪些（只数真走到的：被已有定义挡住、没走到的都不算）。 */
export interface PasteReport { readonly reusedDefs: readonly string[]; readonly createdDefs: readonly string[]; readonly updatedDefs: readonly string[]; readonly detachedDefs: readonly string[]; readonly reusedMaterials: readonly string[]; readonly createdMaterials: readonly string[]; readonly updatedMaterials: readonly string[]; readonly createdLayers: readonly string[] }
export function pasteReport(before: PasteBefore, after: Scene): PasteReport {
  const { plan: mp, bundle } = before, docs = new Map(bundle.docs.map((e) => [refKey({ kind: e.kind, guid: KINDS.get(e.kind)!.guidOf(e.doc) }), e.doc]));
  const named = (rs: readonly Ref[], kind: string): string[] => rs.filter((r) => r.kind === kind).map((r) => { const doc = docs.get(refKey(r)); return doc === undefined ? "" : KINDS.get(kind)!.nameOf(doc); }).filter((n) => n !== "");
  const here = (rs: readonly Ref[], kind: string): string[] => rs.filter((r) => r.kind === kind).map((r) => (kind === DEFINITION ? after.defByGuid(r.guid)?.name : after.materials[after.materialByGuid(r.guid)]?.name) ?? "").filter((n) => n !== "");
  const fresh = mp.create.filter((r) => !mp.remint.has(r.guid)), detached = mp.create.filter((r) => mp.remint.has(r.guid));
  return { reusedDefs: here(mp.kept, DEFINITION), createdDefs: named(fresh, DEFINITION), updatedDefs: named(mp.update, DEFINITION), detachedDefs: named(detached, DEFINITION), reusedMaterials: here(mp.kept, MATERIAL), createdMaterials: named(mp.create, MATERIAL), updatedMaterials: named(mp.update, MATERIAL), createdLayers: named(fresh, LAYER) };
}
const nameList = (names: readonly string[]): string => `${names.slice(0, 3).map((n) => `「${n}」`).join("、")}${names.length > 3 ? ` 等 ${names.length} 个` : ""}`;
/**
 * 提示行补的那半句（拷来的可能是同一文件重开之后的，所以不说「别的模型」，设计书 §8）。crossOpen = 这份剪贴板不是这次打开里拷的：留了这里那版必须说（不静默）；
 * 同一次打开里每次贴都「用了已有的」，那是常态，不说。新建 / 更新 / 断开的永远说（同一次打开里新建 = 撤销过了头、按拷贝时的样子建回来）。
 */
export function pasteSay(r: PasteReport, crossOpen: boolean): string {
  const parts: string[] = [];
  if (r.updatedDefs.length) parts.push(`更新了组件${nameList(r.updatedDefs)}（摆着的每一份都跟上了）`);
  if (r.updatedMaterials.length) parts.push(`更新了材质${nameList(r.updatedMaterials)}`);
  if (r.detachedDefs.length) parts.push(`断开：组件${nameList(r.detachedDefs)}贴成了新的，原来的不动`);
  if (r.createdDefs.length) parts.push(`新建了组件${nameList(r.createdDefs)}`);
  if (r.createdMaterials.length) parts.push(`新建了材质${nameList(r.createdMaterials)}`);
  if (r.createdLayers.length) parts.push(`新建了层${nameList(r.createdLayers)}`);
  if (crossOpen && r.reusedDefs.length) parts.push(`组件${nameList(r.reusedDefs)}本文件已有，用的是本文件这版`);
  if (crossOpen && r.reusedMaterials.length) parts.push(`材质${nameList(r.reusedMaterials)}本文件已有，用的是本文件这版`);
  return parts.length ? `；${parts.join("；")}` : "";
}
