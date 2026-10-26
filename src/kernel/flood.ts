// flood.ts —— 「灌」的纯函数模块（纪元排期 T5 / 账本 DT10；零 DOM、只读拓扑，node 直测）。created 2026-10-26 by Claude Opus 5.5
// 以前同一个「从一张面出发、按规则跨边扩散」的循环抄了三份（paint-flood.ts surfaceFaces、surface-assign.ts facesForAssign、editor.ts selectExpand 的三击）；
// 收成三个动词，差别只在「这条边能不能跨过去」——一个判定函数（EdgeGate），现有几种规则各是一个现成的判定：
//   floodFaces       从种子面灌（油漆桶 / 表面模式三档、单击曲面 = 整张）
//   partitionFaces   把一批面全部分组（user「flood fill divide」：修复用——拍平 DT7 每组一张平面）
//   connectedFrom    连通体（三击）：经边和顶点走，含没面的线
//   floodSides       按侧灌（DT8 两个表面之后；2026-10-26）：灌的单位是「某张面的某一侧」——圆柱只灌满一侧、莫比乌斯环两侧都灌满（user 10-25 的例子）
import type { EdgeId, FaceId, Kernel } from "./kernel.ts";
import { signedArea } from "./geom.ts";

type FloodView = Pick<Kernel, "face" | "graph">;
/** 跨边判定：这条边能不能灌过去。 */
export type EdgeGate = (eid: EdgeId) => boolean;

/** 现成的判定。角度一律用弯折角（Kernel.bendDeg：0 = 平展、180 = 对折；2026-10-26 以前用二面角绝对值，尖屋脊会被当成平的）。 */
export const gates = {
  /** 只过软边 = 曲面（SketchUp 的 Surface；0.10 设计稿 §4.2：soft 决定成不成一张面来选，smooth 只管着色）。 */
  soft: (k: Pick<Kernel, "isSoft">): EdgeGate => (e) => k.isSoft(e),
  /** 过软边，或两膜夹角 ≤ deg 的边（油漆桶「到锐角为止」）。 */
  softOrFlat: (k: Pick<Kernel, "isSoft" | "bendDeg">, deg: number): EdgeGate => (e) => { if (k.isSoft(e)) return true; const d = k.bendDeg(e); return d !== null && d <= deg; },
  /** 任何边（连通的面）。 */
  any: (): EdgeGate => () => true,
  /** 夹角小于 deg 的**硬**边（拍平 DT7 的候选：软边从来不是候选，平滑组自动不碰）。 */
  hardBelow: (k: Pick<Kernel, "isSoft" | "bendDeg">, deg: number): EdgeGate => (e) => { if (k.isSoft(e)) return false; const d = k.bendDeg(e); return d !== null && d < deg; },
} as const;

/** 从种子面灌：经 gate 放行的边走到邻面。种子不存在 → []。 */
export function floodFaces(k: FloodView, seed: FaceId, gate: EdgeGate): FaceId[] {
  if (!k.face(seed)) return [];
  const seen = new Set<FaceId>([seed]);
  const stack: FaceId[] = [seed];
  while (stack.length) {
    const f = k.face(stack.pop()!);
    if (!f) continue;
    for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) {
      if (!gate(d.edge)) continue;
      for (const g of k.graph.edge(d.edge).faceLinks) if (!seen.has(g) && k.face(g)) { seen.add(g); stack.push(g); }
    }
  }
  return [...seen];
}

/** 曲面：从一张面出发沿软边灌出的面集（派生态，不存）。 */
export function surfaceFaces(k: Pick<Kernel, "face" | "isSoft" | "graph">, seed: FaceId): FaceId[] { return floodFaces(k, seed, gates.soft(k)); }

/** 把一批面全部分组：每组 = 经 gate 放行的边连起来、且都在这批面里的连通分量。组内顺序 = 灌到的顺序；组之间按各自最小的面 id 排（确定性）。 */
export function partitionFaces(k: FloodView, faces: Iterable<FaceId>, gate: EdgeGate): FaceId[][] {
  const pool = new Set<FaceId>(); for (const f of faces) if (k.face(f)) pool.add(f);
  const done = new Set<FaceId>(), out: FaceId[][] = [];
  for (const seed of [...pool].sort((a, b) => a - b)) {
    if (done.has(seed)) continue;
    const group: FaceId[] = [seed]; done.add(seed);
    for (let i = 0; i < group.length; i++) {
      const f = k.face(group[i])!;
      for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) {
        if (!gate(d.edge)) continue;
        for (const g of k.graph.edge(d.edge).faceLinks) if (pool.has(g) && !done.has(g)) { done.add(g); group.push(g); }
      }
    }
    out.push(group);
  }
  return out;
}

/** 连通体（三击）：从这些边 / 面出发，经边、顶点（含没面的线）、面走到底。返回边集 + 面集（种子在里面）。 */
export function connectedFrom(k: FloodView, seedEdges: Iterable<EdgeId>, seedFaces: Iterable<FaceId>): { edges: Set<EdgeId>; faces: Set<FaceId> } {
  const edges = new Set<EdgeId>(), faces = new Set<FaceId>();
  const qE: EdgeId[] = [], qF: FaceId[] = [];
  for (const e of seedEdges) if (!edges.has(e)) { edges.add(e); qE.push(e); }
  for (const f of seedFaces) if (!faces.has(f)) { faces.add(f); qF.push(f); }
  while (qE.length || qF.length) {
    const fid = qF.pop();
    if (fid !== undefined) {
      const f = k.face(fid);
      if (f) for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) if (!edges.has(d.edge)) { edges.add(d.edge); qE.push(d.edge); }
      continue;
    }
    const eid = qE.pop()!;
    if (!k.graph.hasEdge(eid)) continue;
    const e = k.graph.edge(eid);
    for (const f2 of e.faceLinks) if (!faces.has(f2)) { faces.add(f2); qF.push(f2); }
    for (const vid of [e.a, e.b]) for (const e2 of k.graph.vertex(vid).edges) if (!edges.has(e2)) { edges.add(e2); qE.push(e2); }
  }
  return { edges, faces };
}

/** 面的一侧：0 = 平面法向 +n 那侧，1 = −n 那侧（= 面层 material / materialBack）。 */
export type Side = 0 | 1;
/**
 * 面 f 在它的哪条环边上「面在左手边」（从 +n 看）：+1 = 沿 a→b 走面在左、−1 = 在右。内核约定外环逆时针、洞环顺时针（都是面在左），
 * 这里照环的实际绕向算（signedArea），不靠约定。
 */
function leftSign(k: FloodView, fid: FaceId, eid: EdgeId): number | null {
  const f = k.face(fid);
  if (!f) return null;
  const rings = [f.outer, ...f.holes];
  for (let ri = 0; ri < rings.length; ri++) {
    const d = rings[ri].edges.find((x) => x.edge === eid);
    if (!d) continue;
    const interiorLeft = (signedArea(rings[ri].pts) > 0) === (ri === 0);
    return (d.forward ? 1 : -1) * (interiorLeft ? 1 : -1);
  }
  return null;
}
/**
 * 按侧灌：从 (seed, side) 出发，经 gate 放行的边走到邻面的**对应那一侧**。跨边 e 从 A 到 B：两张面「面在左」的符号相反 = 两张面的 +n 朝同一边
 * （朝向一致）→ 侧不变；相同 = 朝向相反 → 侧翻转。同一张面两侧都灌到（莫比乌斯环）就两侧都在结果里。顺序 = 灌到的顺序。
 */
export function floodSides(k: FloodView, seed: FaceId, side: Side, gate: EdgeGate): { face: FaceId; side: Side }[] {
  if (!k.face(seed)) return [];
  const key = (f: FaceId, s: Side): number => f * 2 + s;
  const seen = new Set<number>([key(seed, side)]);
  const out: { face: FaceId; side: Side }[] = [{ face: seed, side }];
  for (let i = 0; i < out.length; i++) {
    const { face: a, side: sa } = out[i];
    const f = k.face(a);
    if (!f) continue;
    for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) {
      if (!gate(d.edge)) continue;
      const la = leftSign(k, a, d.edge);
      if (la === null) continue;
      for (const b of k.graph.edge(d.edge).faceLinks) {
        if (b === a || !k.face(b)) continue;
        const lb = leftSign(k, b, d.edge);
        if (lb === null) continue;
        const sb: Side = la * lb < 0 ? sa : ((1 - sa) as Side);
        if (seen.has(key(b, sb))) continue;
        seen.add(key(b, sb)); out.push({ face: b, side: sb });
      }
    }
  }
  return out;
}
