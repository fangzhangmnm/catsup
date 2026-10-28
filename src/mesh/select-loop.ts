// mesh/select-loop.ts —— 从一条边走出「环」或「洞」（Blender Alt+点边）。纯拓扑、零 DOM，node 直测。created 2026-10-28 by Claude Opus 5.5
// user 10-28「对了，alt 点边可以选择洞还是环，然后有镜像的时候环的算法要小心一点」。
//   · 边界边（只挨着一张面）= 洞：沿边界一路走（每个点上找另一条边界边；不是正好一条 = 走不下去，停）；
//   · 两侧都有面 = 环：Blender 的走法——走到一个点，这个点正好连四条边、而且只有两侧都有面的边（内部四度点）时，接着走「和来的那条边不共面的那条」；
//     别的点（三度 / 五度的极点、边界上的点）= 停；
//   · 裸线（不挨面）= 沿二度点连成的线；
//   · 走回起点 = 闭合；没闭合就从起点往另一头再走一遍。
// 镜像要小心的地方：
//   ① 强行对称的中缝点是两边共用的同一个点（mirror.ts symmetrize），环走到中缝照常接着走过去——中缝不是断点（单测钉住）；
//   ② 镜像开着时，落在镜像面上的边界不是洞（那是另一半接上来的地方，Blender 镜像修改器 + clipping 同理）：
//      点在中缝上的边界边 = 只沿中缝走（选出中线）；点在别处的边界边 = 走到中缝就停、不绕着中缝那条开口兜一圈。
import type { MeshKernel } from "./mesh-kernel.ts";
import { type MirrorAxis, coordOf } from "./mirror.ts";

export type LoopKind = "loop" | "hole" | "wire";
export interface LoopResult { readonly edges: number[]; readonly kind: LoopKind; readonly closed: boolean }
export interface LoopOpts { /** 镜像开着：镜像面（本地坐标轴、容差米）。 */ readonly mirror?: { readonly axis: MirrorAxis; readonly tol: number } }

const nFaces = (m: MeshKernel, e: number): number => m.eFaces(e).length;
const other = (m: MeshKernel, e: number, v: number): number => (m.edgeA[e] === v ? m.edgeB[e] : m.edgeA[e]);

/** 从 e 出发走一条（环 / 洞 / 裸线）；e 不存在 = 空。 */
export function edgeLoop(m: MeshKernel, e: number, opts: LoopOpts = {}): LoopResult {
  if (!m.hasE(e)) return { edges: [], kind: "loop", closed: false };
  const mir = opts.mirror;
  const onPlane = (v: number): boolean => !!mir && Math.abs(coordOf(m.pt(v), mir.axis)) <= mir.tol;
  const seamEdge = (x: number): boolean => onPlane(m.edgeA[x]) && onPlane(m.edgeB[x]);
  const nf = nFaces(m, e), kind: LoopKind = nf === 0 ? "wire" : nf === 1 ? "hole" : "loop";
  const startSeam = kind === "hole" && seamEdge(e);
  /** 在点 v 上、从边 prev 来，下一条边（没有 = -1）。 */
  const next = (prev: number, v: number): number => {
    const es = m.vEdges(v);
    if (kind === "wire") { if (es.length !== 2) return -1; const x = es[0] === prev ? es[1] : es[0]; return nFaces(m, x) === 0 ? x : -1; }
    if (kind === "hole") {
      let found = -1, n = 0;
      for (const x of es) {
        if (x === prev || nFaces(m, x) !== 1) continue;
        if (mir && seamEdge(x) !== startSeam) continue;   // 镜像开着：中缝上的边界只和中缝上的连（见文件头 ②）
        found = x; n++;
      }
      return n === 1 ? found : -1;
    }
    // 环：内部四度点才走得下去
    if (es.length !== 4) return -1;
    for (const x of es) if (nFaces(m, x) !== 2) return -1;
    const fs = new Set(m.eFaces(prev));
    let found = -1, n = 0;
    for (const x of es) { if (x === prev) continue; let shares = false; for (const f of m.eFaces(x)) if (fs.has(f)) { shares = true; break; } if (!shares) { found = x; n++; } }
    return n === 1 ? found : -1;
  };
  const seen = new Set<number>([e]), out = [e];
  const walk = (from: number, v0: number): boolean => {   // 返回：走回了起点
    let prev = from, v = v0;
    for (let guard = m.edgeCount() + 1; guard > 0; guard--) {
      const x = next(prev, v);
      if (x < 0) return false;
      if (x === e) return true;
      if (seen.has(x)) return false;
      seen.add(x); out.push(x);
      v = other(m, x, v); prev = x;
    }
    return false;
  };
  const closed = walk(e, m.edgeB[e]);
  if (!closed) walk(e, m.edgeA[e]);
  return { edges: out, kind, closed };
}
