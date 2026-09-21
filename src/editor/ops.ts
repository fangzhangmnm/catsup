// ops.ts —— 编辑动词的**指令**（op）：可序列化、按几何寻址（µm 格点坐标 = 顶点身份，公理 3「重合即同一」），不含运行时 id。
// created 2026-09-20 by Claude Fable 5.1（A1 正规 undo；user 09-20「一开始就按照 multiplayer friendly 做这种 replay 指令式」）
//
// 为什么按坐标寻址：单机重放靠 id 计数器逐字一致也成立，但联机各 peer 的 id 历史不同——线协议上只有几何本身是共识。
//   顶点 = 量化格点；边 = 两端点；面 = 外环顶点集（同一外环只有一张膜）。运行时 id 只在「应用那一刻」的内核上解析。
// 解析失败（目标已不在）→ 抛 OpTargetError：单机 = 这批不落地（History 回滚）；联机 = 上层政策（跳过 / 降级），这里不裁。
// 指令流生命周期 = runtime（user 2026-09-07：文件只存快照，不存 op 日志）——可序列化是为了联机与测试，不是为了持久化。
// 重放与实时走同一条 applyOp（内核确定性 = 公理 5）；事件是叙事不是状态（undo 不重放事件，redo 照发）。
import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { ptKey3, quantize3 } from "../kernel/geom.ts";
import { PRESETS, applyPreset } from "./presets.ts";

export type Seg = [PtIn, PtIn];
/** 边的寻址 = 两端点坐标。 */
export type EdgeKey = [Pt3, Pt3];
/** 面的寻址 = 外环顶点坐标（顺序无关；集合相等即同一张膜）。 */
export type FaceKey = Pt3[];

export type Op =
  | { op: "clear" }
  | { op: "preset"; name: string }
  | { op: "addEdges"; segs: Seg[] }
  | { op: "eraseEdges"; edges: EdgeKey[] }
  | { op: "eraseFaces"; faces: FaceKey[] }
  | { op: "eraseSelection"; faces: FaceKey[]; edges: EdgeKey[] }
  | { op: "move"; moves: { from: Pt3; to: Pt3 }[] }
  | { op: "pushpull"; face: FaceKey; dist: number };

export interface ApplyResult { kernel: Kernel; events: FaceEvent[]; }

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
export function moveOp(k: Kernel, moves: readonly { id: VertexId; to: PtIn }[]): Op {
  return { op: "move", moves: moves.map((m) => ({ from: k.graph.pt(m.id), to: { x: m.to.x, y: m.to.y, z: m.to.z ?? 0 } })) };
}

// ---------- 应用（重放与实时同一条路；clear / preset 换新内核，其余原地）----------
/** 先解析全部目标再动内核：目标缺席在改动之前就抛，不留半改动（History 仍兜底回滚）。 */
export function applyOp(k: Kernel, op: Op): ApplyResult {
  switch (op.op) {
    case "clear": return { kernel: new Kernel(), events: [] };
    case "preset": {
      const k2 = new Kernel();
      const preset = PRESETS.find((p) => p.name === op.name);
      return { kernel: k2, events: preset ? applyPreset(k2, preset).flat() : [] };
    }
    case "addEdges": return { kernel: k, events: k.addEdges(op.segs) };
    case "eraseEdges": { const ids = op.edges.map((e) => resolveEdge(k, e)); return { kernel: k, events: k.eraseEdges(ids) }; }
    case "eraseFaces": { const ids = op.faces.map((f) => resolveFace(k, f)); return { kernel: k, events: k.eraseFaces(ids) }; }
    case "eraseSelection": {
      const fids = op.faces.map((f) => resolveFace(k, f));
      const eids = op.edges.map((e) => resolveEdge(k, e));
      return { kernel: k, events: [...k.eraseFaces(fids), ...k.eraseEdges(eids)] };
    }
    case "move": { const moves = op.moves.map((m) => ({ id: resolveVertex(k, m.from), to: m.to })); return { kernel: k, events: k.moveVertices(moves) }; }
    case "pushpull": { const fid = resolveFace(k, op.face); return { kernel: k, events: k.pushPull(fid, op.dist) }; }
  }
}

// ---------- 摘要（调试日志一行：动词 + 数量，不含坐标——黑匣子记「做了什么」；失败那条另附 op JSON 当复现钥匙）----------
// created 2026-09-20 by Claude Fable 5.1（user 09-20「op 操作是否要上 Log」→ 上，一 op 一行）
export function describeOp(op: Op): string {
  switch (op.op) {
    case "clear": return "clear";
    case "preset": return `preset ${op.name}`;
    case "addEdges": return `addEdges segs=${op.segs.length}`;
    case "eraseEdges": return `eraseEdges n=${op.edges.length}`;
    case "eraseFaces": return `eraseFaces n=${op.faces.length}`;
    case "eraseSelection": return `eraseSelection faces=${op.faces.length} edges=${op.edges.length}`;
    case "move": return `move verts=${op.moves.length}`;
    case "pushpull": return `pushpull ring=${op.face.length} dist=${Number(op.dist.toFixed(4))}`;
  }
}
