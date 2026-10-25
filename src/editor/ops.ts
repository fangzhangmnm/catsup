// ops.ts —— 编辑动词的**指令**（op）：可序列化、按几何寻址（µm 格点坐标 = 顶点身份，公理 3「重合即同一」），不含顶点 / 边 / 面的运行时 id。
// created 2026-09-20 by Claude Fable 5.1（A1 正规 undo；user 09-20「一开始就按照 multiplayer friendly 做这种 replay 指令式」）
// 2026-10-21（group / component 纪元，Claude Fable 5.1）：op 作用在 **Scene** 上；几何 op 带池地址 `at`（definition + group，缺省 = 根池）；
//   新动词 makeGroup / makeComponent / explode / transformPool / transformInstance / placeInstance / eraseInstance / eraseGroup。
//   池 / 实例的 id 由 Scene 顺序铸造，重放同序列 → 同 id，所以 op 里可以带它们（与顶点 µm 寻址同一精神：共识只在确定性上）。
//
// 为什么按坐标寻址：单机重放靠 id 计数器逐字一致也成立，但联机各 peer 的 id 历史不同——线协议上只有几何本身是共识。
// 解析失败（目标已不在）→ 抛 OpTargetError：单机 = 这批不落地（History 回滚）；联机 = 上层政策，这里不裁。
// 指令流生命周期 = runtime（user 2026-09-07：文件只存快照，不存 op 日志）。
import type { CurveSpec } from "../kernel/kernel.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { castBody } from "../scene/kinds.ts";
import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { ptKey3, quantize3 } from "../kernel/geom.ts";
import { PRESETS, applyPreset } from "./presets.ts";
import { type PoolRef, Scene, absorbSnapshot, bboxMin, extractSnapshot, remapSnapshotMaterial, transformSnapshot } from "../scene/scene.ts";
import { type Frame, type Xform, applyPt, compose, frameAt, transformFrame, translation } from "../scene/xform.ts";
import { addGuideLine, addGuidePoint, cloneGuides, eraseGuides, transformGuides } from "../scene/guides.ts";

export type Seg = [PtIn, PtIn];
/** 边的寻址 = 两端点坐标。 */
export type EdgeKey = [Pt3, Pt3];
/** 面的寻址 = 外环顶点坐标（顺序无关；集合相等即同一张膜）。 */
export type FaceKey = Pt3[];

export type Op =
  | { op: "clear" }
  | { op: "preset"; name: string }
  | { op: "addEdges"; at?: PoolRef; segs: Seg[]; curve?: boolean | CurveSpec }
  /** 炸开曲线（SU Explode Curve）：edges 里每条边所在的曲线散成普通边。 */
  | { op: "explodeCurves"; at: PoolRef; edges: EdgeKey[] }
  /** 焊接（B19）：edges = 有序链的各边（坐标寻址）→ 一条曲线。 */
  | { op: "weldEdges"; at: PoolRef; edges: EdgeKey[] }
  /** 溶解（焊边橡皮「共轴 → 真合并」；user 2026-10-24）：这些顶点（坐标寻址）各并成一条边——须二度共线、两边面链接相同、两端之间没边，不满足的跳过。 */
  | { op: "dissolveVertices"; at: PoolRef; points: Pt3[] }
  /** 批：几个 op 当一步（一次撤销；焊边橡皮一刮 = 溶解 + 焊接、软边橡皮一刮 = 删边 + 软化）。顺序执行；中途抛 = 整批回滚（history 装回快照）。 */
  | { op: "batch"; label: string; ops: Op[] }
  | { op: "eraseEdges"; at?: PoolRef; edges: EdgeKey[] }
  | { op: "eraseFaces"; at?: PoolRef; faces: FaceKey[] }
  | { op: "eraseSelection"; at?: PoolRef; faces: FaceKey[]; edges: EdgeKey[] }
  | { op: "move"; at?: PoolRef; moves: { from: Pt3; to: Pt3 }[] }
  | { op: "pushpull"; at?: PoolRef; face: FaceKey; dist: number }
  | { op: "followme"; at?: PoolRef; face: FaceKey; path: Pt3[]; closed: boolean; smoothJoints: boolean[] }
  | { op: "absorb"; at?: PoolRef; faces: Pt3[][][]; wires: [Pt3, Pt3][]; edgeSegs?: Record<string, [Pt3, Pt3][]>; faceLayers?: (Record<string, number> | undefined)[] }
  /** 选区 → 新 group（父 = at.group）；几何从池里搬出去，与别的面共享的边留下。 */
  | { op: "makeGroup"; at: PoolRef; faces: FaceKey[]; edges: EdgeKey[] }
  /** 选区 → 新 definition + 一个实例（轴 = 包围盒最小角）。 */
  | { op: "makeComponent"; at: PoolRef; faces: FaceKey[]; edges: EdgeKey[]; name: string }
  /** 炸开：group 的几何并回父池；实例的定义几何（经变换）并回父池（group 与实例都递归成子项）。 */
  | { op: "explode"; at: PoolRef; group?: number; instance?: number }
  | { op: "transformPool"; at: PoolRef; xform: Xform }
  | { op: "transformInstance"; def: number; instance: number; xform: Xform }
  | { op: "placeInstance"; at: PoolRef; definition: number; xform: Xform }
  | { op: "eraseInstance"; def: number; instance: number }
  /** 复制一个 group（含子 group / 子实例）到同父池，整体经 xform（父空间）。 */
  | { op: "copyGroup"; at: PoolRef; group: number; xform: Xform }
  /** 新材质（文档级，只增）：颜色 sRGB 0..1；贴图 = 原图字节（运行时 Uint8Array；线协议要走 base64，未做）+ 物理尺寸 米。返回索引 = 当时的 materials.length。 */
  | { op: "addMaterial"; name: string; color: [number, number, number]; texture?: { mimeType: string; bytes: Uint8Array; sizeM: [number, number] } }
  /** 边层开关（软化 / 硬化 / 隐藏…）：这些边打上 / 去掉若干层。 */
  | { op: "setEdgeLayers"; at: PoolRef; edges: EdgeKey[]; layers: string[]; on: boolean }
  /** 油漆桶：这些面涂文档材质 material（null = 回默认）；槽号在该 definition 里解析 / 新开。 */
  | { op: "paintFaces"; at: PoolRef; faces: FaceKey[]; material: number | null }
  | { op: "eraseGroup"; at: PoolRef; group: number }
  /** 锁定 / 解锁一个子实例（A27；at = 它所在的池）。解锁永远允许（Editor 的锁护栏对本 op 豁免）。0.14 起组不是物体、不能锁：带 group 的 setLocked 被拒。 */
  | { op: "setLocked"; at: PoolRef; group?: number; instance?: number; on: boolean }
  // ---------- 0.14 物体模型（契约 ai-docs/20261024-object-model-contract.md）----------
  /** 显式换身体种类（定义级：共享定义的全部实例一起变）；只认 kinds.ts 登记表里的方向，失败不改文档。 */
  | { op: "castDefinition"; def: number; to: BodyKind }
  /** 层表（文档级）：加 / 改名 / 可见 / 删（成员回继承；id 0 不可删）。 */
  | { op: "addLayer"; name: string; color?: [number, number, number] }
  | { op: "renameLayer"; layer: number; name: string }
  | { op: "setLayerVisible"; layer: number; visible: boolean }
  | { op: "removeLayer"; layer: number }
  /** 归层：at 定义的子实例归到某层；null = 回到继承。（面不打层——user 2026-10-24「facelayer可能太复杂了……不要」：要藏汤里的一部分 = 做成组件再归层。） */
  | { op: "assignLayer"; at: PoolRef; instances: number[]; layer: number | null }
  // ---- 参考几何 / 轴（0.11 尺规纪元；池本地坐标）----
  | { op: "addGuide"; at: PoolRef; line?: { p: Pt3; dir: Pt3 }; point?: Pt3 }
  | { op: "eraseGuides"; at: PoolRef; ids: number[] }
  | { op: "clearGuides"; at: PoolRef }
  /** 改轴：group = 换 group 的帧（definition 坐标，几何不动）；根 = 绘图轴（世界坐标）；组件定义暂不支持。 */
  | { op: "setAxes"; at: PoolRef; frame: Frame };

export interface ApplyResult { scene: Scene; events: FaceEvent[]; }

export class OpTargetError extends Error {
  readonly what: string;
  constructor(what: string) { super(`op target vanished: ${what}`); this.name = "OpTargetError"; this.what = what; }
}

// ---------- 寻址 → 运行时 id（在应用那一刻的内核上解析）----------
const key = (p: Pt3): string => ptKey3(quantize3(p));
const fmt = (p: Pt3): string => `(${p.x},${p.y},${p.z})`;
export function resolveVertex(k: Kernel, p: Pt3): VertexId {
  const id = k.graph.vertexAt(quantize3(p));
  if (id === undefined) throw new OpTargetError(`vertex ${fmt(p)}`);
  return id;
}
export function resolveEdge(k: Kernel, [a, b]: EdgeKey): EdgeId {
  const id = k.graph.edgeBetween(resolveVertex(k, a), resolveVertex(k, b));
  if (id === undefined) throw new OpTargetError(`edge ${fmt(a)}-${fmt(b)}`);
  return id;
}
const ringSig = (ring: readonly Pt3[]): string => [...new Set(ring.map(key))].sort().join(";");
export function resolveFace(k: Kernel, fk: FaceKey): FaceId {
  const want = ringSig(fk);
  for (const f of k.faces()) if (ringSig(k.faceRings3(f.id)!.outer) === want) return f.id;
  throw new OpTargetError(`face [${fk.map(fmt).join(" ")}]`);
}

// ---------- 运行时 id → 寻址（造 op 时，在当前 checkpoint 上）----------
export const edgeKey = (k: Kernel, id: EdgeId): EdgeKey => { const e = k.graph.edge(id); return [k.graph.pt(e.a), k.graph.pt(e.b)]; };
export function faceKey(k: Kernel, id: FaceId): FaceKey {
  const r = k.faceRings3(id);
  if (!r) throw new OpTargetError(`face #${id}`);
  return r.outer;
}
/** 工具算出的 {id, to} 移动集 → 按坐标寻址的 move op。 */
export function moveOp(k: Kernel, moves: readonly { id: VertexId; to: PtIn }[], at?: PoolRef): Op {
  return { op: "move", ...(at ? { at } : {}), moves: moves.map((m) => ({ from: k.graph.pt(m.id), to: { x: m.to.x, y: m.to.y, z: m.to.z ?? 0 } })) };
}

// ---------- 应用（重放与实时同一条路；clear / preset 换新场景，其余原地）----------
// 门 1（0.13 刀 ①）：内核 op 只对 brep 池成立；别的 kind（mesh…）各有自己的 op 集，到时按 s.kindOf(ref.def) 在这里分叉，不改既有分支。
const poolOf = (s: Scene, at?: PoolRef): { kernel: Kernel; ref: PoolRef } => {
  const ref = at ?? { def: s.root, group: null };
  if (!s.hasPool(ref)) throw new OpTargetError(`pool ${ref.def}/${ref.group ?? "root"}`);
  const kind = s.kindOf(ref.def);
  if (kind !== "brep") throw new OpTargetError(`pool ${ref.def}/${ref.group ?? "root"} is a ${kind} pool: no brep op applies`);
  return { kernel: s.kernelOf(ref), ref };
};

/** 先解析全部目标再动内核：目标缺席在改动之前就抛，不留半改动（History 仍兜底回滚）。 */
export function applyOp(s: Scene, op: Op): ApplyResult {
  switch (op.op) {
    case "clear": return { scene: new Scene(), events: [] };
    case "preset": {
      const k2 = new Kernel();
      const preset = PRESETS.find((p) => p.name === op.name);
      return { scene: new Scene(k2), events: preset ? applyPreset(k2, preset).flat() : [] };
    }
    case "addEdges": { const { kernel } = poolOf(s, op.at); return { scene: s, events: kernel.addEdges(op.segs, op.curve ? { curve: op.curve } : undefined) }; }
    case "weldEdges": { const { kernel } = poolOf(s, op.at); return { scene: s, events: kernel.weldEdges(op.edges.map((e) => resolveEdge(kernel, e))) }; }
    case "dissolveVertices": { const { kernel } = poolOf(s, op.at); kernel.dissolveVertices(op.points.map((q) => resolveVertex(kernel, q))); return { scene: s, events: [] }; }
    case "batch": { let sc = s; const events: FaceEvent[] = []; for (const o of op.ops) { const r = applyOp(sc, o); sc = r.scene; events.push(...r.events); } return { scene: sc, events }; }
    case "explodeCurves": { const { kernel } = poolOf(s, op.at); const ids = new Set<number>(); for (const e of op.edges) { const cid = kernel.curveOf(resolveEdge(kernel, e)); if (cid !== undefined) ids.add(cid); } return { scene: s, events: kernel.explodeCurves([...ids]) }; }
    case "eraseEdges": { const { kernel } = poolOf(s, op.at); const ids = op.edges.map((e) => resolveEdge(kernel, e)); return { scene: s, events: kernel.eraseEdges(ids) }; }
    case "eraseFaces": { const { kernel } = poolOf(s, op.at); const ids = op.faces.map((f) => resolveFace(kernel, f)); return { scene: s, events: kernel.eraseFaces(ids) }; }
    case "eraseSelection": {
      const { kernel } = poolOf(s, op.at);
      const fids = op.faces.map((f) => resolveFace(kernel, f));
      const eids = op.edges.map((e) => resolveEdge(kernel, e));
      return { scene: s, events: [...kernel.eraseFaces(fids), ...kernel.eraseEdges(eids)] };
    }
    case "move": { const { kernel } = poolOf(s, op.at); const moves = op.moves.map((m) => ({ id: resolveVertex(kernel, m.from), to: m.to })); return { scene: s, events: kernel.moveVertices(moves) }; }
    case "pushpull": { const { kernel } = poolOf(s, op.at); const fid = resolveFace(kernel, op.face); return { scene: s, events: kernel.pushPull(fid, op.dist) }; }
    case "followme": { const { kernel } = poolOf(s, op.at); const fid = resolveFace(kernel, op.face); return { scene: s, events: kernel.followMe(fid, op.path, { closed: op.closed, smoothJoints: op.smoothJoints }) }; }
    case "absorb": {
      const { kernel } = poolOf(s, op.at);
      const edgeSegs: Record<string, { a: Pt3; b: Pt3 }[]> = {};
      for (const [n, segs] of Object.entries(op.edgeSegs ?? {})) edgeSegs[n] = segs.map(([a, b]) => ({ a, b }));
      return { scene: s, events: kernel.absorb(op.faces, op.wires.map(([a, b]) => ({ a, b })), { edgeSegs, faceLayers: op.faceLayers }) };
    }
    case "makeGroup":
    case "makeComponent": {
      const { kernel, ref } = poolOf(s, op.at);
      const fids = op.faces.map((f) => resolveFace(kernel, f));
      const eids = op.edges.map((e) => resolveEdge(kernel, e));
      const snap = extractSnapshot(kernel, fids, eids);
      if (!snap.vertices.length) throw new OpTargetError("empty selection");
      // 源池：删膜；搬走的边（选中的 + 搬走膜的环边）若已无膜引用才删——与别的膜共享的边留下（SU 同款：边在两边各有一份）
      const events = kernel.eraseFaces(fids);
      const has = snapEdgeSet(snap);
      const orphans = kernel.edges().filter((e) => e.faceLinks.length === 0 && has(kernel.graph.pt(e.a), kernel.graph.pt(e.b))).map((e) => e.id);
      if (orphans.length) events.push(...kernel.eraseEdges(orphans));
      if (op.op === "makeGroup") {
        const gk = Kernel.fromBrep(snap);
        s.mintGroup(ref.def, ref.group, gk, frameAt(bboxMin(snap.vertices)));
        return { scene: s, events };
      }
      const origin = bboxMin(snap.vertices);
      const local = transformSnapshot(snap, translation({ x: -origin.x, y: -origin.y, z: -origin.z }));
      const def = s.mintDef(op.name, Kernel.fromBrep(local));
      s.brep(def.id).materialSlots = [...s.brep(ref.def).materialSlots];   // 槽号沿用（同一张槽表拷一份；面上的槽号不用改）
      s.mintInstance(ref.def, ref.group, def.id, translation(origin));
      return { scene: s, events };
    }
    case "explode": {
      const { kernel, ref } = poolOf(s, op.at);
      const d = s.def(ref.def), db = s.brep(ref.def);
      if (op.group !== undefined) {
        const g = db.groups.get(op.group);
        if (!g || g.parent !== ref.group) throw new OpTargetError(`group ${op.group}`);
        absorbSnapshot(kernel, g.kernel.toBrep());
        for (const cg of db.groups.values()) if (cg.parent === g.id) cg.parent = ref.group;
        for (const ci of d.instances.values()) if (ci.parent === g.id) ci.parent = ref.group;
        db.groups.delete(g.id);
        return { scene: s, events: [] };
      }
      if (op.instance !== undefined) {
        const inst = d.instances.get(op.instance);
        if (!inst || inst.parent !== ref.group) throw new OpTargetError(`instance ${op.instance}`);
        const src = s.def(inst.def), srcB = s.brep(inst.def);
        const remap = (slot: number): number => { const mat = srcB.materialSlots[slot]; return mat === undefined ? -1 : s.slotFor(ref.def, mat); };
        absorbSnapshot(kernel, srcB.kernel.toBrep(), inst.xform, remap);
        // 定义里的子 group / 子实例 → 复制成父池下的 group / 实例（经实例变换）
        const gmap = new Map<number, number>();
        for (const sg of srcB.groups.values()) {
          const gk = Kernel.fromBrep(remapSnapshotMaterial(transformSnapshot(sg.kernel.toBrep(), inst.xform), remap));
          const ng = s.mintGroup(ref.def, ref.group, gk, transformFrame(inst.xform, sg.axes));
          gmap.set(sg.id, ng.id);
        }
        for (const sg of srcB.groups.values()) if (sg.parent !== null) s.group({ def: ref.def, group: gmap.get(sg.id)! }).parent = gmap.get(sg.parent) ?? ref.group;
        for (const si of src.instances.values()) s.mintInstance(ref.def, si.parent === null ? ref.group : (gmap.get(si.parent) ?? ref.group), si.def, compose(inst.xform, si.xform));
        d.instances.delete(inst.id);
        if (s.instanceCount(src.id) === 0 && src.id !== s.root) s.defs.delete(src.id);
        return { scene: s, events: [] };
      }
      throw new OpTargetError("explode: nothing named");
    }
    case "transformPool": {
      const { kernel, ref } = poolOf(s, op.at);
      const events = kernel.transformAll((p) => applyPt(op.xform, p));
      if (ref.group !== null) { const g = s.group({ def: ref.def, group: ref.group }); g.axes = transformFrame(op.xform, g.axes); }
      transformGuides(s.guidesOf(ref), op.xform);   // 参考几何跟着池走
      return { scene: s, events };
    }
    case "transformInstance": {
      const inst = s.instance(op.def, op.instance);
      inst.xform = compose(op.xform, inst.xform);
      return { scene: s, events: [] };
    }
    case "placeInstance": {
      const { ref } = poolOf(s, op.at);
      if (!s.defs.has(op.definition)) throw new OpTargetError(`definition ${op.definition}`);
      if (s.references(op.definition, ref.def)) throw new OpTargetError("placeInstance: would create a cycle");
      s.mintInstance(ref.def, ref.group, op.definition, op.xform);
      return { scene: s, events: [] };
    }
    case "copyGroup": {
      const { ref } = poolOf(s, op.at);
      const d = s.def(ref.def), db = s.brep(ref.def);
      const src = db.groups.get(op.group);
      if (!src || src.parent !== ref.group) throw new OpTargetError(`group ${op.group}`);
      const gmap = new Map<number, number>();
      const desc = new Set<number>([src.id]);
      let grew = true;
      while (grew) { grew = false; for (const g of db.groups.values()) if (g.parent !== null && desc.has(g.parent) && !desc.has(g.id)) { desc.add(g.id); grew = true; } }
      for (const gid of desc) {
        const g = db.groups.get(gid)!;
        const ng = s.mintGroup(ref.def, ref.group, Kernel.fromBrep(transformSnapshot(g.kernel.toBrep(), op.xform)), transformFrame(op.xform, g.axes));
        ng.guides = cloneGuides(g.guides); transformGuides(ng.guides, op.xform);
        gmap.set(gid, ng.id);
      }
      for (const gid of desc) { const g = db.groups.get(gid)!; if (g.parent !== null && gmap.has(g.parent)) s.group({ def: ref.def, group: gmap.get(gid)! }).parent = gmap.get(g.parent)!; }
      for (const inst of [...d.instances.values()]) if (inst.parent !== null && desc.has(inst.parent)) s.mintInstance(ref.def, gmap.get(inst.parent)!, inst.def, compose(op.xform, inst.xform));
      return { scene: s, events: [] };
    }
    case "addGuide": {
      const { ref } = poolOf(s, op.at);
      const G = s.guidesOf(ref);
      if (op.line) addGuideLine(G, op.line.p, op.line.dir);
      if (op.point) addGuidePoint(G, op.point);
      return { scene: s, events: [] };
    }
    case "eraseGuides": { const { ref } = poolOf(s, op.at); eraseGuides(s.guidesOf(ref), new Set(op.ids)); return { scene: s, events: [] }; }
    case "clearGuides": { const { ref } = poolOf(s, op.at); const G = s.guidesOf(ref); G.lines = []; G.points = []; return { scene: s, events: [] }; }
    case "setAxes": {
      const { ref } = poolOf(s, op.at);
      const f: Frame = { origin: { ...op.frame.origin }, x: { ...op.frame.x }, y: { ...op.frame.y }, z: { ...op.frame.z } };
      if (ref.group !== null) s.group({ def: ref.def, group: ref.group }).axes = f;
      else if (ref.def === s.root) s.axes = f;
      else throw new OpTargetError("component definition axes are not editable yet");
      return { scene: s, events: [] };
    }
    case "addMaterial": {
      s.addMaterial({ name: op.name, color: [op.color[0], op.color[1], op.color[2]], ...(op.texture ? { texture: { mimeType: op.texture.mimeType, bytes: op.texture.bytes, sizeM: [op.texture.sizeM[0], op.texture.sizeM[1]] } } : {}) });
      return { scene: s, events: [] };
    }
    case "setEdgeLayers": {
      const { kernel } = poolOf(s, op.at);
      const ids = op.edges.map((e) => resolveEdge(kernel, e));
      for (const n of op.layers) kernel.setEdgeLayer(n, ids, op.on);
      return { scene: s, events: [] };
    }
    case "paintFaces": {
      const { kernel, ref } = poolOf(s, op.at);
      const fids = op.faces.map((f) => resolveFace(kernel, f));
      if (op.material !== null && !(op.material in s.materials)) throw new OpTargetError(`material ${op.material}`);
      kernel.setFaceMaterial(fids, op.material === null ? null : s.slotFor(ref.def, op.material));
      return { scene: s, events: [] };
    }
    case "eraseInstance": {
      const d = s.def(op.def);
      if (!d.instances.delete(op.instance)) throw new OpTargetError(`instance ${op.instance}`);
      return { scene: s, events: [] };
    }
    case "setLocked": {
      if (op.group !== undefined) throw new OpTargetError("group lock: 组不是物体，不能锁（0.14）；要当参考就做成组件再锁");
      const d = s.def(op.at.def);
      if (op.instance !== undefined) {
        const inst = d.instances.get(op.instance);
        if (!inst || inst.parent !== op.at.group) throw new OpTargetError(`instance ${op.instance}`);
        if (op.on) inst.locked = true; else delete inst.locked;
        return { scene: s, events: [] };
      }
      throw new OpTargetError("setLocked: no target");
    }
    case "castDefinition": {
      const d = s.def(op.def);
      const body = castBody(d.body, op.to);   // 不认的方向在这里抛，文档不动
      d.body = body;
      return { scene: s, events: [] };
    }
    case "addLayer": { const id = s.nextLayer++; s.layers.push({ id, name: op.name, visible: true, ...(op.color ? { color: op.color } : {}) }); return { scene: s, events: [] }; }
    case "renameLayer": { const l = s.layers.find((x) => x.id === op.layer); if (!l) throw new OpTargetError(`layer ${op.layer}`); l.name = op.name; return { scene: s, events: [] }; }
    case "setLayerVisible": { const l = s.layers.find((x) => x.id === op.layer); if (!l) throw new OpTargetError(`layer ${op.layer}`); l.visible = op.visible; return { scene: s, events: [] }; }
    case "removeLayer": {
      if (op.layer === 0) throw new OpTargetError("layer 0 is the default layer and cannot be removed");
      const i = s.layers.findIndex((x) => x.id === op.layer); if (i < 0) throw new OpTargetError(`layer ${op.layer}`);
      s.layers.splice(i, 1);
      for (const d of s.defs.values()) for (const inst of d.instances.values()) if (inst.layer === op.layer) delete inst.layer;
      return { scene: s, events: [] };
    }
    case "assignLayer": {
      if (op.layer !== null && !s.layers.some((x) => x.id === op.layer)) throw new OpTargetError(`layer ${op.layer}`);
      const def = s.def(op.at.def);
      for (const iid of op.instances) { const inst = def.instances.get(iid); if (!inst) throw new OpTargetError(`instance ${iid}`); if (op.layer === null) delete inst.layer; else inst.layer = op.layer; }
      return { scene: s, events: [] };
    }
    case "eraseGroup": {
      const d = s.def(op.at.def), db = s.brep(op.at.def);
      const g = db.groups.get(op.group);
      if (!g) throw new OpTargetError(`group ${op.group}`);
      // 子项一并删（递归）
      const kill = new Set<number>([g.id]);
      let grew = true;
      while (grew) { grew = false; for (const cg of db.groups.values()) if (cg.parent !== null && kill.has(cg.parent) && !kill.has(cg.id)) { kill.add(cg.id); grew = true; } }
      for (const id of kill) db.groups.delete(id);
      for (const [iid, ci] of [...d.instances]) if (ci.parent !== null && kill.has(ci.parent)) d.instances.delete(iid);
      return { scene: s, events: [] };
    }
  }
}
/** 快照里的边集（按端点坐标查）。 */
function snapEdgeSet(snap: ReturnType<typeof extractSnapshot>): (a: Pt3, b: Pt3) => boolean {
  const ks = snap.vertices.map(key);
  const set = new Set(snap.edges.map(([x, y]) => (ks[x] < ks[y] ? `${ks[x]}|${ks[y]}` : `${ks[y]}|${ks[x]}`)));
  return (a, b) => { const ka = key(a), kb = key(b); return set.has(ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`); };
}

// ---------- 摘要（调试日志一行：动词 + 数量，不含坐标）----------
export function describeOp(op: Op): string {
  const at = "at" in op && op.at ? ` @${op.at.def}/${op.at.group ?? "root"}` : "";
  switch (op.op) {
    case "clear": return "clear";
    case "preset": return `preset ${op.name}`;
    case "addEdges": return `addEdges segs=${op.segs.length}${op.curve ? (typeof op.curve === "object" ? ` curve:${op.curve.kind}` : " curve") : ""}${at}`;
    case "explodeCurves": return `explodeCurves n=${op.edges.length}${at}`;
    case "weldEdges": return `weldEdges n=${op.edges.length}${at}`;
    case "castDefinition": return `castDefinition def=${op.def} → ${op.to}`;
    case "addLayer": return `addLayer ${op.name}`;
    case "renameLayer": return `renameLayer ${op.layer}`;
    case "setLayerVisible": return `setLayerVisible ${op.layer} ${op.visible ? "on" : "off"}`;
    case "removeLayer": return `removeLayer ${op.layer}`;
    case "assignLayer": return `assignLayer inst=${op.instances.length} → ${op.layer === null ? "inherit" : op.layer}${at}`;
    case "dissolveVertices": return `dissolveVertices n=${op.points.length}${at}`;
    case "batch": return `batch ${op.label} [${op.ops.map(describeOp).join("; ")}]`;
    case "eraseEdges": return `eraseEdges n=${op.edges.length}${at}`;
    case "eraseFaces": return `eraseFaces n=${op.faces.length}${at}`;
    case "eraseSelection": return `eraseSelection faces=${op.faces.length} edges=${op.edges.length}${at}`;
    case "move": { const m = op.moves[0]; const d = m ? ` Δ=${(m.to.x - m.from.x).toFixed(3)},${(m.to.y - m.from.y).toFixed(3)},${(m.to.z - m.from.z).toFixed(3)}` : ""; return `move verts=${op.moves.length}${d}${at}`; }   // 位移不是坐标：D17 要靠它判断落定帧纯不纯
    case "pushpull": return `pushpull ring=${op.face.length} dist=${Number(op.dist.toFixed(4))}${at}`;
    case "followme": return `followme ring=${op.face.length} path=${op.path.length}${op.closed ? " closed" : ""}${at}`;
    case "absorb": return `absorb faces=${op.faces.length} wires=${op.wires.length}${at}`;
    case "makeGroup": return `makeGroup faces=${op.faces.length} edges=${op.edges.length}${at}`;
    case "makeComponent": return `makeComponent "${op.name}" faces=${op.faces.length} edges=${op.edges.length}${at}`;
    case "explode": return `explode ${op.group !== undefined ? `group ${op.group}` : `instance ${op.instance}`}${at}`;
    case "transformPool": return `transformPool${at}`;
    case "transformInstance": return `transformInstance ${op.def}/${op.instance}`;
    case "placeInstance": return `placeInstance def=${op.definition}${at}`;
    case "eraseInstance": return `eraseInstance ${op.def}/${op.instance}`;
    case "copyGroup": return `copyGroup ${op.group}${at}`;
    case "addMaterial": return `addMaterial "${op.name}"${op.texture ? " +texture" : ""}`;
    case "paintFaces": return `paintFaces n=${op.faces.length} material=${op.material ?? "default"}${at}`;
    case "setEdgeLayers": return `setEdgeLayers n=${op.edges.length} ${op.on ? "+" : "-"}${op.layers.join(",")}${at}`;
    case "eraseGroup": return `eraseGroup ${op.group}${at}`;
    case "setLocked": return `setLocked ${op.on ? "on" : "off"} ${op.group !== undefined ? `group ${op.group}` : `instance ${op.instance}`}${at}`;
    case "addGuide": return `addGuide ${op.line ? "line" : "point"}${at}`;
    case "eraseGuides": return `eraseGuides n=${op.ids.length}${at}`;
    case "clearGuides": return `clearGuides${at}`;
    case "setAxes": return `setAxes${at}`;
  }
}
