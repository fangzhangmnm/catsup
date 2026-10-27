// self-check.ts —— brep 公理自检：五条不变量的谓词 → 违规清单（不改任何东西）。
// created 2026-10-27 by Claude Fable 5.1；纪元账本 FM83 / 审计稿 ai-docs/proofs/20261027-localization-audit-and-induction.md §2。
// user 10-27：「也许启动导入的时候自检？然后要不要自愈？以及什么时候自检比较好？」——答：膜是「涌现但被存储」的，违规不会被下一步重算掉、会潜伏到被碰到
// （那时守恒断言拒整步、没出路），所以查是便宜的保险；**不自动自愈**，查出来报「N 处不干净 → 修复…」（修 = 交结算机 absorb，导入同一条管线）。
// 用处：① 测试里每步全图自检（抓内核自己造出的违规——差分对拍抓不到「合法但错」）② 修复面板「检查」项 ③ 打开后空闲时间查老文件 ④ mesh → brep 转换后报数。
// 不变量（审计稿 §2.1）：I1 每张平面上的边构成平面图（边不交叉、点不骑在边内部）；I2 膜与膜不重叠（同平面）；I3 重合即同一（格点上没有两个点同坐标）；
// I4 每张膜的环在 τ 内共面、环闭合且边都在；I5 faceLinks 与膜一致。谓词和导入修复（from-triangles.ts dirtyTriangles）同一套：精确格点算术、STICKY.r 容差。

import { type Pt, type Pt3, distToPlane, pointInRing, ptKey3, quantize3 } from "./geom.ts";
import type { Kernel } from "./kernel.ts";
import type { EdgeId, FaceId, VertexId } from "./topology.ts";
import { type Ring, representativePoint } from "./facefind.ts";
import { STICKY } from "./subdivide.ts";
import { Q } from "./geom.ts";
import { fromLattice3, toLattice3 } from "./exact/lattice.ts";
import { pointRidesInterior, segSeg3Exact } from "./exact/predicates3d.ts";

export type ViolationKind = "edgeCross" | "vertexRidesEdge" | "faceOverlap" | "faceNotPlanar" | "ringBroken" | "faceLinkMismatch" | "duplicatePoint";
export interface Violation {
  readonly kind: ViolationKind;
  /** 牵涉的 id（边 / 顶点 / 膜，按 kind）。 */
  readonly ids: readonly number[];
  /** 出事的位置（有的话，世界坐标）。 */
  readonly at?: Pt3;
  /** 人话。 */
  readonly text: string;
}

export interface SelfCheckOptions {
  /** 只查这几条（缺 = 全部）。 */
  only?: readonly ViolationKind[];
  /** 最多报几条（缺 = 不限）。**只给界面省时间用**：报给人看时要说「≥ N」，不能把全量数藏起来（user 10-27「像切尔诺贝利一样……静默，就不好」：剂量计量程要够）。 */
  limit?: number;
}

/** 全图自检。O(E × 近边) + O(每平面膜数² 包围盒粗筛) + O(环边)。 */
export function selfCheck(k: Kernel, opts?: SelfCheckOptions): Violation[] {
  const out: Violation[] = [];
  const want = (kd: ViolationKind): boolean => !opts?.only || opts.only.includes(kd);
  const full = (): boolean => opts?.limit !== undefined && out.length >= opts.limit;
  const g = k.graph, tol = k.coplanarTol;

  // I3 重合即同一
  if (want("duplicatePoint")) {
    const seen = new Map<string, VertexId>();
    for (const v of g.vertices()) {
      const key = ptKey3(quantize3(v));
      const prev = seen.get(key);
      if (prev !== undefined) out.push({ kind: "duplicatePoint", ids: [prev, v.id], at: { x: v.x, y: v.y, z: v.z }, text: `顶点 ${prev} 和 ${v.id} 在同一个格点上` });
      else seen.set(key, v.id);
      if (full()) return out;
    }
  }

  // I1 平面图：边不交叉、点不骑边（精确格点算术，和导入修复同一套谓词）
  if (want("edgeCross") || want("vertexRidesEdge")) {
    const r = STICKY.r, rL = Math.round(r / Q);
    const rides = (p: Pt3, a: Pt3, b: Pt3): boolean => pointRidesInterior(toLattice3(p), toLattice3(a), toLattice3(b), rL);
    for (const e of g.edges()) {
      const ea = g.pt(e.a), eb = g.pt(e.b);
      if (want("edgeCross")) for (const o of g.edgesNear(ea, eb)) {
        if (o.id <= e.id) continue;
        const oa = g.pt(o.a), ob = g.pt(o.b);
        const hit = segSeg3Exact(toLattice3(ea), toLattice3(eb), toLattice3(oa), toLattice3(ob), rL);
        for (const q of hit.points) {
          const p = quantize3(fromLattice3(q));
          if (rides(p, ea, eb) || rides(p, oa, ob)) { out.push({ kind: "edgeCross", ids: [e.id, o.id], at: p, text: `边 ${e.id} 和 ${o.id} 在中间相交` }); break; }
        }
        if (full()) return out;
      }
      if (want("vertexRidesEdge")) for (const v of g.verticesNear(ea, eb)) {
        if (v.id === e.a || v.id === e.b) continue;
        const p = { x: v.x, y: v.y, z: v.z };
        if (rides(p, ea, eb)) out.push({ kind: "vertexRidesEdge", ids: [v.id, e.id], at: p, text: `顶点 ${v.id} 骑在边 ${e.id} 的中间（T 形接头）` });
        if (full()) return out;
      }
    }
  }

  // I4 / I5：环闭合、边都在、共面；faceLinks 一致
  const expectLinks = new Map<EdgeId, FaceId[]>();
  for (const f of k.faces()) {
    const rec = k.planeOf(f.id);
    const rings = [f.outer, ...f.holes];
    for (const ring of rings) {
      const n = ring.edges.length;
      for (let i = 0; i < n; i++) {
        const d = ring.edges[i];
        if (!g.hasEdge(d.edge)) { if (want("ringBroken")) out.push({ kind: "ringBroken", ids: [f.id, d.edge], text: `膜 ${f.id} 的环引用了不存在的边 ${d.edge}` }); continue; }
        const e = g.edge(d.edge);
        const from = d.forward ? e.a : e.b, to = d.forward ? e.b : e.a;
        const next = ring.edges[(i + 1) % n];
        if (want("ringBroken") && g.hasEdge(next.edge)) {
          const ne = g.edge(next.edge), nextFrom = next.forward ? ne.a : ne.b;
          if (to !== nextFrom) out.push({ kind: "ringBroken", ids: [f.id, d.edge, next.edge], at: g.pt(to), text: `膜 ${f.id} 的环在边 ${d.edge} → ${next.edge} 处不连` });
        }
        if (want("faceLinkMismatch")) (expectLinks.get(d.edge) ?? expectLinks.set(d.edge, []).get(d.edge)!).push(f.id);
        if (want("faceNotPlanar") && rec) {
          const p = g.pt(from);
          const dist = distToPlane(p, rec.plane);
          if (dist > tol) out.push({ kind: "faceNotPlanar", ids: [f.id, from], at: p, text: `膜 ${f.id} 的顶点 ${from} 离它的平面 ${(dist * 1e3).toFixed(3)} mm（τ = ${(tol * 1e3).toFixed(3)} mm）` });
        }
        if (full()) return out;
      }
    }
    if (!rec && want("ringBroken")) out.push({ kind: "ringBroken", ids: [f.id], text: `膜 ${f.id} 的平面 ${f.planeId} 没登记` });
  }
  if (want("faceLinkMismatch")) {
    for (const e of g.edges()) {
      const exp = (expectLinks.get(e.id) ?? []).sort((a, b) => a - b), act = [...e.faceLinks].sort((a, b) => a - b);
      if (exp.length !== act.length || exp.some((x, i) => x !== act[i])) out.push({ kind: "faceLinkMismatch", ids: [e.id], at: g.pt(e.a), text: `边 ${e.id} 的 faceLinks [${act.join(",")}] 和膜的环 [${exp.join(",")}] 不一致` });
      if (full()) return out;
    }
  }

  // I2 同平面膜不重叠：I1 成立的前提下，两张膜重叠 ⇔ 一张的代表点落在另一张里面（同平面 = 同一组 canonical 基，2D 直接比）
  if (want("faceOverlap")) {
    const byPlane = new Map<number, FaceId[]>();
    for (const f of k.faces()) (byPlane.get(f.planeId) ?? byPlane.set(f.planeId, []).get(f.planeId)!).push(f.id);
    for (const ids of byPlane.values()) {
      if (ids.length < 2) continue;
      const fs = ids.map((id) => k.face(id)!);
      const rep = fs.map((f) => representativePoint({ outer: f.outer, holes: f.holes }));
      const inside = (outer: Ring, holes: readonly Ring[], p: Pt): boolean => pointInRing(p, outer.pts) && !holes.some((h) => pointInRing(p, h.pts));
      for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
        const a = fs[i], b = fs[j];
        if (a.bbox.x1 < b.bbox.x0 || b.bbox.x1 < a.bbox.x0 || a.bbox.y1 < b.bbox.y0 || b.bbox.y1 < a.bbox.y0) continue;
        const ab = inside(a.outer, a.holes, rep[j]), ba = inside(b.outer, b.holes, rep[i]);
        if (ab || ba) out.push({ kind: "faceOverlap", ids: [a.id, b.id], text: `膜 ${a.id} 和 ${b.id} 在同一张平面上重叠` });
        if (full()) return out;
      }
    }
  }
  return out;
}

/** 一句人话汇总（修复面板 / 打开后提示用）。 */
export function describeViolations(vs: readonly Violation[]): string {
  if (!vs.length) return "公理自检：干净";
  const count = new Map<ViolationKind, number>();
  for (const v of vs) count.set(v.kind, (count.get(v.kind) ?? 0) + 1);
  const name: Record<ViolationKind, string> = { edgeCross: "边在中间相交", vertexRidesEdge: "点骑在边上（T 形接头）", faceOverlap: "同平面的面重叠", faceNotPlanar: "面不平", ringBroken: "面的环断了", faceLinkMismatch: "边和面的链接不一致", duplicatePoint: "同一格点上有两个点" };
  return `公理自检：${vs.length} 处不干净——${[...count].map(([kd, n]) => `${name[kd]} ${n}`).join("、")}`;
}
