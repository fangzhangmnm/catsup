// editor/born-this-gesture.ts —— 「这一下动作自己新生的」只在这里判（N / T 拾眼前画出来的东西用；统筹 11-13 锁的一轮第三步审后）。
// created by Claude Opus 5.5 2026-11-13
//
// 规矩（统筹的读法）：N / T 拾眼前画出来的东西——被挪 / 被转的照现在的位置和朝向算；只有这一下动作自己新生的不算：
// 预演线、新画出来的面、推拉 / 挤出新长出来的侧面。新生的对 N / T 透明：拾不到，也不挡后面的（pick.ts 的 skip）。
//
// 怎么判「新生」：
//   面：动作开始前的世界里有这个编号 = 原有的（挪 / 转保编号）。没有 → 顺着这一下预演的面事件往上追：
//       DIVIDE 的碎片 → 被切的那张、MERGE / ABSORB 并出来的 → 并进来的那几张；追到动作开始前就有的面 = 原有那张被切开 / 并起来的，算原有。
//       追不到（BIRTH，或网格体这种不报事件的内核里新编号）= 新生。
//   边：内核切边不留血缘（topology splitEdge 直接换新编号），按几何判：两个端点都落在某条原有边「现在」的位置上
//       （那条边两个端点在眼前世界里的坐标；挪过的边照挪过以后的）= 原有那条边被切开的一段，算原有；否则新生。
//
// 编号：stat / live 是同一套槽的世界视图（全局编号 = 槽序号 × ID_STRIDE + 本地编号）；预演事件是活动池内核的本地编号，经 live.global 换。

import type { EdgeId, FaceId, Pt3 } from "../kernel/kernel.ts";
import type { FaceEvent } from "../kernel/face-lifecycle.ts";
import type { GeomView } from "../scene/world-view.ts";

export interface BornJudge {
  /** 这张面是这一下动作新生的吗（眼前世界里的编号）。 */
  face(f: FaceId): boolean;
  /** 这条边是这一下动作新生的吗（眼前世界里的编号）。 */
  edge(e: EdgeId): boolean;
}

/** 端点落在原有边上的容差（米）：内核切点是量化过的，落在原线段上差不到这个数（同站点粘连 10 µm 的量级）。 */
const ON_OLD_EDGE_TOL = 1e-5;

type WorldIds = GeomView & { global?: (localId: number) => number };

export function bornThisGesture(stat: GeomView, live: GeomView, events: readonly FaceEvent[]): BornJudge {
  const g = (id: number): number => (live as WorldIds).global?.(id) ?? id;
  // 面的血缘：子 → 父（可能好几个父：MERGE）
  const parents = new Map<FaceId, FaceId[]>();
  const link = (child: FaceId, parent: FaceId): void => { const c = g(child), p = g(parent); if (c === p) return; const l = parents.get(c); if (l) l.push(p); else parents.set(c, [p]); };
  for (const ev of events) {
    if (ev.type === "DIVIDE") for (const i of ev.into) link(i, ev.from);
    else if (ev.type === "MERGE") for (const f of ev.from) link(ev.into, f);
    else if (ev.type === "ABSORB") link(ev.into, ev.from);
  }
  const faceMemo = new Map<FaceId, boolean>();
  const faceOld = (f: FaceId, seen: Set<FaceId>): boolean => {
    if (stat.face(f)) return true;
    const m = faceMemo.get(f); if (m !== undefined) return m;
    if (seen.has(f)) return false;
    seen.add(f);
    const r = (parents.get(f) ?? []).some((p) => faceOld(p, seen));
    faceMemo.set(f, r);
    return r;
  };
  const onSeg = (p: Pt3, a: Pt3, b: Pt3): boolean => {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz;
    if (L2 === 0) return false;
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy + (p.z - a.z) * dz) / L2, L = Math.sqrt(L2);
    if (t < -ON_OLD_EDGE_TOL / L || t > 1 + ON_OLD_EDGE_TOL / L) return false;
    const qx = a.x + t * dx - p.x, qy = a.y + t * dy - p.y, qz = a.z + t * dz - p.z;
    return qx * qx + qy * qy + qz * qz <= ON_OLD_EDGE_TOL * ON_OLD_EDGE_TOL;
  };
  const edgeMemo = new Map<EdgeId, boolean>();
  const edgeOld = (e: EdgeId): boolean => {
    if (stat.graph.hasEdge(e)) return true;
    const m = edgeMemo.get(e); if (m !== undefined) return m;
    const E = live.graph.edge(e), p = live.graph.pt(E.a), q = live.graph.pt(E.b);
    let r = false;
    for (const S of stat.edges()) {
      if (!live.graph.hasVertex(S.a) || !live.graph.hasVertex(S.b)) continue;
      const a = live.graph.pt(S.a), b = live.graph.pt(S.b);   // 原有那条边现在在哪
      if (onSeg(p, a, b) && onSeg(q, a, b)) { r = true; break; }
    }
    edgeMemo.set(e, r);
    return r;
  };
  return { face: (f) => !faceOld(f, new Set()), edge: (e) => !edgeOld(e) };
}
