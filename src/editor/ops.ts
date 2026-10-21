// ops.ts —— 编辑动词的**指令**（op）：可序列化、按几何寻址（µm 格点坐标 = 顶点身份，公理 3「重合即同一」），不含顶点 / 边 / 面的运行时 id。
// created 2026-09-20 by Claude Fable 5.1（A1 正规 undo；user 09-20「一开始就按照 multiplayer friendly 做这种 replay 指令式」）
// 2026-10-21（group / component 纪元，Claude Fable 5.1）：op 作用在 **Scene** 上；几何 op 带池地址 `at`（definition + group，缺省 = 根池）；
//   新动词 makeGroup / makeComponent / explode / transformPool / transformInstance / placeInstance / eraseInstance / eraseGroup。
//   池 / 实例的 id 由 Scene 顺序铸造，重放同序列 → 同 id，所以 op 里可以带它们（与顶点 µm 寻址同一精神：共识只在确定性上）。
//
// 为什么按坐标寻址：单机重放靠 id 计数器逐字一致也成立，但联机各 peer 的 id 历史不同——线协议上只有几何本身是共识。
// 解析失败（目标已不在）→ 抛 OpTargetError：单机 = 这批不落地（History 回滚）；联机 = 上层政策，这里不裁。
// 指令流生命周期 = runtime（user 2026-09-07：文件只存快照，不存 op 日志）。
import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { ptKey3, quantize3 } from "../kernel/geom.ts";
import { PRESETS, applyPreset } from "./presets.ts";
import { type PoolRef, Scene, absorbSnapshot, bboxMin, extractSnapshot, transformSnapshot } from "../scene/scene.ts";
import { type Xform, applyPt, compose, frameAt, transformFrame, translation } from "../scene/xform.ts";

export type Seg = [PtIn, PtIn];
/** 边的寻址 = 两端点坐标。 */
export type EdgeKey = [Pt3, Pt3];
/** 面的寻址 = 外环顶点坐标（顺序无关；集合相等即同一张膜）。 */
export type FaceKey = Pt3[];

export type Op =
  | { op: "clear" }
  | { op: "preset"; name: string }
  | { op: "addEdges"; at?: PoolRef; segs: Seg[]; soft?: boolean }
  | { op: "eraseEdges"; at?: PoolRef; edges: EdgeKey[] }
  | { op: "eraseFaces"; at?: PoolRef; faces: FaceKey[] }
  | { op: "eraseSelection"; at?: PoolRef; faces: FaceKey[]; edges: EdgeKey[] }
  | { op: "move"; at?: PoolRef; moves: { from: Pt3; to: Pt3 }[] }
  | { op: "pushpull"; at?: PoolRef; face: FaceKey; dist: number }
  | { op: "absorb"; at?: PoolRef; faces: Pt3[][][]; wires: [Pt3, Pt3][]; soft?: [Pt3, Pt3][] }
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
  | { op: "eraseGroup"; at: PoolRef; group: number };

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
const poolOf = (s: Scene, at?: PoolRef): { kernel: Kernel; ref: PoolRef } => {
  const ref = at ?? { def: s.root, group: null };
  if (!s.hasPool(ref)) throw new OpTargetError(`pool ${ref.def}/${ref.group ?? "root"}`);
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
    case "addEdges": { const { kernel } = poolOf(s, op.at); return { scene: s, events: kernel.addEdges(op.segs, op.soft ? { soft: true } : undefined) }; }
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
    case "absorb": { const { kernel } = poolOf(s, op.at); return { scene: s, events: kernel.absorb(op.faces, op.wires.map(([a, b]) => ({ a, b })), (op.soft ?? []).map(([a, b]) => ({ a, b }))) }; }
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
      s.mintInstance(ref.def, ref.group, def.id, translation(origin));
      return { scene: s, events };
    }
    case "explode": {
      const { kernel, ref } = poolOf(s, op.at);
      const d = s.def(ref.def);
      if (op.group !== undefined) {
        const g = d.groups.get(op.group);
        if (!g || g.parent !== ref.group) throw new OpTargetError(`group ${op.group}`);
        absorbSnapshot(kernel, g.kernel.toBrep());
        for (const cg of d.groups.values()) if (cg.parent === g.id) cg.parent = ref.group;
        for (const ci of d.instances.values()) if (ci.parent === g.id) ci.parent = ref.group;
        d.groups.delete(g.id);
        return { scene: s, events: [] };
      }
      if (op.instance !== undefined) {
        const inst = d.instances.get(op.instance);
        if (!inst || inst.parent !== ref.group) throw new OpTargetError(`instance ${op.instance}`);
        const src = s.def(inst.def);
        absorbSnapshot(kernel, src.kernel.toBrep(), inst.xform);
        // 定义里的子 group / 子实例 → 复制成父池下的 group / 实例（经实例变换）
        const gmap = new Map<number, number>();
        for (const sg of src.groups.values()) {
          const gk = Kernel.fromBrep(transformSnapshot(sg.kernel.toBrep(), inst.xform));
          const ng = s.mintGroup(ref.def, ref.group, gk, transformFrame(inst.xform, sg.axes));
          gmap.set(sg.id, ng.id);
        }
        for (const sg of src.groups.values()) if (sg.parent !== null) s.group({ def: ref.def, group: gmap.get(sg.id)! }).parent = gmap.get(sg.parent) ?? ref.group;
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
      const d = s.def(ref.def);
      const src = d.groups.get(op.group);
      if (!src || src.parent !== ref.group) throw new OpTargetError(`group ${op.group}`);
      const gmap = new Map<number, number>();
      const desc = new Set<number>([src.id]);
      let grew = true;
      while (grew) { grew = false; for (const g of d.groups.values()) if (g.parent !== null && desc.has(g.parent) && !desc.has(g.id)) { desc.add(g.id); grew = true; } }
      for (const gid of desc) {
        const g = d.groups.get(gid)!;
        const ng = s.mintGroup(ref.def, ref.group, Kernel.fromBrep(transformSnapshot(g.kernel.toBrep(), op.xform)), transformFrame(op.xform, g.axes));
        gmap.set(gid, ng.id);
      }
      for (const gid of desc) { const g = d.groups.get(gid)!; if (g.parent !== null && gmap.has(g.parent)) s.group({ def: ref.def, group: gmap.get(gid)! }).parent = gmap.get(g.parent)!; }
      for (const inst of [...d.instances.values()]) if (inst.parent !== null && desc.has(inst.parent)) s.mintInstance(ref.def, gmap.get(inst.parent)!, inst.def, compose(op.xform, inst.xform));
      return { scene: s, events: [] };
    }
    case "eraseInstance": {
      const d = s.def(op.def);
      if (!d.instances.delete(op.instance)) throw new OpTargetError(`instance ${op.instance}`);
      return { scene: s, events: [] };
    }
    case "eraseGroup": {
      const d = s.def(op.at.def);
      const g = d.groups.get(op.group);
      if (!g) throw new OpTargetError(`group ${op.group}`);
      // 子项一并删（递归）
      const kill = new Set<number>([g.id]);
      let grew = true;
      while (grew) { grew = false; for (const cg of d.groups.values()) if (cg.parent !== null && kill.has(cg.parent) && !kill.has(cg.id)) { kill.add(cg.id); grew = true; } }
      for (const id of kill) d.groups.delete(id);
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
    case "addEdges": return `addEdges segs=${op.segs.length}${op.soft ? " soft" : ""}${at}`;
    case "eraseEdges": return `eraseEdges n=${op.edges.length}${at}`;
    case "eraseFaces": return `eraseFaces n=${op.faces.length}${at}`;
    case "eraseSelection": return `eraseSelection faces=${op.faces.length} edges=${op.edges.length}${at}`;
    case "move": return `move verts=${op.moves.length}${at}`;
    case "pushpull": return `pushpull ring=${op.face.length} dist=${Number(op.dist.toFixed(4))}${at}`;
    case "absorb": return `absorb faces=${op.faces.length} wires=${op.wires.length}${at}`;
    case "makeGroup": return `makeGroup faces=${op.faces.length} edges=${op.edges.length}${at}`;
    case "makeComponent": return `makeComponent "${op.name}" faces=${op.faces.length} edges=${op.edges.length}${at}`;
    case "explode": return `explode ${op.group !== undefined ? `group ${op.group}` : `instance ${op.instance}`}${at}`;
    case "transformPool": return `transformPool${at}`;
    case "transformInstance": return `transformInstance ${op.def}/${op.instance}`;
    case "placeInstance": return `placeInstance def=${op.definition}${at}`;
    case "eraseInstance": return `eraseInstance ${op.def}/${op.instance}`;
    case "copyGroup": return `copyGroup ${op.group}${at}`;
    case "eraseGroup": return `eraseGroup ${op.group}${at}`;
  }
}
