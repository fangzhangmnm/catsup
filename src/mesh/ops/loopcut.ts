// mesh/ops/loopcut.ts —— 环切（Blender Ctrl+R）：从一条边出发，沿四边形带一路走「对边」，每条边在 t 处劈开，每张四边形在新点之间劈一刀。
// 走到非四边形 / 边界 / 回到起点为止；开口带也行（两头停在边界）。只切不长：面数只会从 n 张四边形变 2n 张。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel } from "../mesh-kernel.ts";
import { splitEdge, splitFace } from "./split.ts";

/** 四边形 f 里边 e 的对边（环里和 e 相隔一个位置的那条）。不是四边形 → -1。 */
function oppositeEdge(k: MeshKernel, f: number, e: number): number {
  const vs = k.faceVerts(f); if (vs.length !== 4) return -1;
  const i = vs.findIndex((v, j) => k.edgeOf(v, vs[(j + 1) % 4]) === e); if (i < 0) return -1;
  return k.edgeOf(vs[(i + 2) % 4], vs[(i + 3) % 4]);
}

export interface LoopCutResult { edges: number[]; newVerts: number[]; closed: boolean; }

export function loopCut(k: MeshKernel, start: number, t = 0.5): LoopCutResult {
  if (!k.hasE(start)) throw new Error(`loopCut: edge ${start} is not alive`);
  // 1. 找环：从 start 向两边走对边
  const ring: number[] = [start];
  const seen = new Set<number>([start]);
  let closed = false;
  const walk = (from: number, into: number | undefined, push: (e: number) => void): void => {
    let e = from, f = into;
    while (f !== undefined) {
      const o = oppositeEdge(k, f, e);
      if (o < 0) return;
      if (o === start) { closed = true; return; }
      if (seen.has(o)) return;
      seen.add(o); push(o);
      const next = [...k.eFaces(o)].filter((ff) => ff !== f);
      if (next.length !== 1) return;   // 边界 / 非流形：停
      e = o; f = next[0];
    }
  };
  const fl = [...k.eFaces(start)];
  if (fl.length === 0 || fl.length > 2) throw new Error(`loopCut: edge ${start} has ${fl.length} faces`);
  walk(start, fl[0], (e) => ring.push(e));
  if (!closed && fl.length === 2) walk(start, fl[1], (e) => ring.unshift(e));
  // 2. 劈每条环边
  const newVerts = ring.map((e) => splitEdge(k, e, t));
  // 3. 每张被环穿过的四边形：两个新点之间劈一刀（现在它是六边形：新点在两条对边上）
  const faces = new Set<number>();
  for (const v of newVerts) for (const e of k.vEdges(v)) for (const f of k.eFaces(e)) faces.add(f);
  const edges: number[] = [];
  for (const f of [...faces].sort((a, b) => a - b)) {
    const vs = k.faceVerts(f), mine = vs.filter((v) => newVerts.includes(v));
    if (mine.length !== 2 || vs.length !== 6) continue;   // 环的两头停在边界时，端头的面只有一个新点：不切
    const ia = vs.indexOf(mine[0]), ib = vs.indexOf(mine[1]);
    if ((ib - ia + 6) % 6 === 1 || (ia - ib + 6) % 6 === 1) continue;
    splitFace(k, f, mine[0], mine[1]);
    edges.push(k.edgeOf(mine[0], mine[1]));
  }
  return { edges, newVerts, closed };
}
