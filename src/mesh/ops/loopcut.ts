// mesh/ops/loopcut.ts —— 环切（Blender Ctrl+R）：从一条边出发，沿四边形带一路走「对边」，每条边在 t 处劈开，每张四边形在新点之间劈一刀。
// 走到非四边形 / 边界 / 回到起点为止；开口带也行（两头停在边界）。只切不长：面数只会从 n 张四边形变 2n 张。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel } from "../mesh-kernel.ts";
import { splitEdge, splitFaceAlong } from "./split.ts";

/** 四边形 f 里边 e 的对边（环里和 e 相隔一个位置的那条）+ 对边上和 e 的 ref 端同一侧的那一端。不是四边形 → edge = -1。 */
function oppositeEdge(k: MeshKernel, f: number, e: number, ref: number): { edge: number; ref: number } {
  const vs = k.faceVerts(f); if (vs.length !== 4) return { edge: -1, ref: -1 };
  const i = vs.findIndex((v, j) => k.edgeOf(v, vs[(j + 1) % 4]) === e); if (i < 0) return { edge: -1, ref: -1 };
  return { edge: k.edgeOf(vs[(i + 2) % 4], vs[(i + 3) % 4]), ref: vs[i] === ref ? vs[(i + 3) % 4] : vs[(i + 2) % 4] };   // vs[i] ↔ vs[i+3]、vs[i+1] ↔ vs[i+2] 同一侧
}

/** startVert = 起手那条边上的新点（N 圈接着切剩下那段用）。 */
export interface LoopCutResult { edges: number[]; newVerts: number[]; closed: boolean; startVert?: number; }

/** 环切一圈。t = 在起手那条边上从 edgeA 那头量的位置；整圈的点都在同一侧的 t 处（W-8 2026-11-10：以前每条边各从自己的 edgeA 量，t ≠ 0.5 时切成锯齿；t = 0.5 两种量法一样）。 */
export function loopCut(k: MeshKernel, start: number, t = 0.5): LoopCutResult {
  if (!k.hasE(start)) throw new Error(`loopCut: edge ${start} is not alive`);
  // 1. 找环：从 start 向两边走对边（记着每条边上和起手那条 edgeA 同一侧的那一端）
  const ring: number[] = [start];
  const seen = new Set<number>([start]), refOf = new Map<number, number>([[start, k.edgeA[start]]]);
  let closed = false;
  const walk = (from: number, into: number | undefined, push: (e: number) => void): void => {
    let e = from, f = into;
    while (f !== undefined) {
      const { edge: o, ref } = oppositeEdge(k, f, e, refOf.get(e)!);
      if (o < 0) return;
      if (o === start) { closed = true; return; }
      if (seen.has(o)) return;
      seen.add(o); refOf.set(o, ref); push(o);
      const next = [...k.eFaces(o)].filter((ff) => ff !== f);
      if (next.length !== 1) return;   // 边界 / 非流形：停
      e = o; f = next[0];
    }
  };
  const fl = [...k.eFaces(start)];
  // 起手那条边是裸线（0 张面）或非流形（≥ 3 张面）= 切不出一圈：交回空结果，调用方说「切不出」（2026-10-29 Opus：以前抛错，右键菜单数「环切能切几条」时炸成脚本错误——user 10-29 日志 `loopCut: edge 18 has 4 faces`）
  if (fl.length === 0 || fl.length > 2) return { edges: [], newVerts: [], closed: false };
  walk(start, fl[0], (e) => ring.push(e));
  if (!closed && fl.length === 2) walk(start, fl[1], (e) => ring.unshift(e));
  // 2. 劈每条环边（同一侧量：这条边的 edgeA 不在起手那侧 = 1 − t；t = 0.5 时调用和以前一字不差）
  const newVerts = ring.map((e) => splitEdge(k, e, refOf.get(e) === k.edgeA[e] ? t : 1 - t));
  // 3. 每张被环穿过的四边形：两个新点之间劈一刀（现在它是六边形：新点在两条对边上）
  const faces = new Set<number>();
  for (const v of newVerts) for (const e of k.vEdges(v)) for (const f of k.eFaces(e)) faces.add(f);
  const edges: number[] = [];
  for (const f of [...faces].sort((a, b) => a - b)) {
    const vs = k.faceVerts(f), mine = vs.filter((v) => newVerts.includes(v));
    if (mine.length !== 2 || vs.length !== 6) continue;   // 环的两头停在边界时，端头的面只有一个新点：不切
    const ia = vs.indexOf(mine[0]), ib = vs.indexOf(mine[1]);
    if ((ib - ia + 6) % 6 === 1 || (ia - ib + 6) % 6 === 1) continue;
    splitFaceAlong(k, f, mine[0], mine[1]);
    edges.push(k.edgeOf(mine[0], mine[1]));
  }
  return { edges, newVerts, closed, startVert: newVerts[ring.indexOf(start)] };
}

/**
 * 环切 cuts 圈（W-8；Fable 11-10 裁定：N 圈均分在 1/(N+1)、2/(N+1)…，位置不起作用；一条记录 = 一步撤销）。cuts ≤ 1 = loopCut(k, start, t)。
 * 做法：从起手那条边的 edgeA 那头起，每次在剩下那段的第一个均分点切一圈，再接着切剩下那段。第一圈切不出 = 空结果。
 */
export function loopCuts(k: MeshKernel, start: number, cuts = 1, t = 0.5): LoopCutResult {
  if (cuts <= 1) return loopCut(k, start, t);
  const far = k.edgeB[start], out: LoopCutResult = { edges: [], newVerts: [], closed: false };
  let e = start, from = k.edgeA[start];
  for (let i = 0; i < cuts; i++) {
    const rel = 1 / (cuts - i + 1), r = loopCut(k, e, k.edgeA[e] === from ? rel : 1 - rel);
    if (!r.edges.length || r.startVert === undefined) break;
    out.edges.push(...r.edges); out.newVerts.push(...r.newVerts); out.closed = r.closed;
    out.startVert ??= r.startVert;
    from = r.startVert; e = k.edgeOf(from, far);
    if (e < 0) break;
  }
  return out;
}
