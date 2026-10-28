// mesh/ops/merge.ts —— 合：一组顶点并成一个（到中心 / 到第一个 / 到给定点）。退化的面（少于 3 个不同顶点）自动清掉。created 2026-10-27 by Claude Fable 5.1
import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel, F_WIRE } from "../mesh-kernel.ts";

export function mergeVerts(k: MeshKernel, ids: readonly number[], target: "center" | "first" | Pt3 = "center"): number {
  const set = [...new Set(ids)].filter((v) => k.hasV(v));
  if (set.length < 2) throw new Error("mergeVerts: need ≥ 2 distinct alive vertices");
  const survivor = set[0];
  const pts = set.map((v) => k.pt(v));
  const to: Pt3 = target === "first" ? pts[0] : target === "center" ? { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length, z: pts.reduce((s, p) => s + p.z, 0) / pts.length } : target;
  const gone = new Set(set.slice(1));
  // 受影响的面：含任一被并顶点的面
  const faces = new Set<number>();
  for (const v of set) for (const e of k.vEdges(v)) for (const f of k.eFaces(e)) faces.add(f);
  // 记下被并顶点的裸线（另一端不在并集里的）：之后挂到幸存者上
  const wires: [number, number, number][] = [];
  for (const v of gone) for (const e of k.vEdges(v)) if (k.edgeFlags[e] & F_WIRE) { const o = k.edgeA[e] === v ? k.edgeB[e] : k.edgeA[e]; if (!gone.has(o) && o !== survivor) wires.push([survivor, o, k.edgeFlags[e]]); }
  for (const f of [...faces].sort((a, b) => a - b)) {
    const r = k.faceVerts(f).map((v) => (gone.has(v) ? survivor : v));
    const ring: number[] = [];
    for (const v of r) if (!ring.length || ring[ring.length - 1] !== v) ring.push(v);
    while (ring.length > 1 && ring[0] === ring[ring.length - 1]) ring.pop();
    if (new Set(ring).size < 3) { k.removeFace(f); continue; }
    cutSpurs(ring);   // 两次出现之间只夹着不到 3 个不同点的那段 = 零面积的刺（并点落在自己这张面的一条边上），剪掉（2026-10-28 Opus；镜像设计稿 §5.5）
    if (new Set(ring).size < 3) { k.removeFace(f); continue; }
    if (new Set(ring).size !== ring.length) {   // 环里还有不相邻的重复（并出一个捏点 = 两边都是像样的环，蝴蝶结）：按第一次出现的位置去重——面还成立，拓扑上是捏点，留给自检报
      const seen = new Set<number>(), r2: number[] = []; for (const v of ring) if (!seen.has(v)) { seen.add(v); r2.push(v); }
      if (r2.length < 3) { k.removeFace(f); continue; }
      k.setFaceRing(f, r2); continue;
    }
    k.setFaceRing(f, ring);
  }
  // 被并顶点剩下的边（裸线 / 面已删留下的）全删，再删顶点
  for (const v of gone) { for (const e of [...k.vEdges(v)]) { if (k.eFaces(e).length) throw new Error("mergeVerts: internal: face still references merged vertex"); k.removeEdge(e); } k.removeVertex(v); }
  for (const [a, b, fl] of wires) if (a !== b) { const e = k.ensureEdge(a, b); if (!k.eFaces(e).length) k.setEdgeFlags(e, fl); }
  k.setPos(survivor, to);
  return survivor;
}

/**
 * 剪刺（原地改 ring）：某个点在环里出现两次（不相邻），两次之间那段（或绕回来的另一段）不到 3 个不同的点 = 零面积的一根刺（来回走同一条线），剪掉那段、留一次。
 * 例：A X M B M（把 X 对面的角并到自己这张面的边 AB 的中点 M 上）→ A X M。两段都像样（蝴蝶结）的不碰。
 */
function cutSpurs(ring: number[]): void {
  for (let guard = 0; guard < 64; guard++) {
    let cut = false;
    outer: for (let i = 0; i < ring.length; i++) for (let j = i + 1; j < ring.length; j++) {
      if (ring[i] !== ring[j]) continue;
      const inner = ring.slice(i, j), outerArc = [...ring.slice(j), ...ring.slice(0, i)];
      if (new Set(inner).size < 3) { ring.splice(i + 1, j - i); cut = true; break outer; }          // 里面那段是刺：留 ring[i]，去掉 i+1..j
      if (new Set(outerArc).size < 3) { const keep = ring.slice(i, j); ring.length = 0; ring.push(...keep); cut = true; break outer; }   // 外面那段是刺：只留里面
    }
    if (!cut) return;
    for (let i = ring.length - 1; i > 0; i--) if (ring[i] === ring[i - 1]) ring.splice(i, 1);   // 剪完可能又挨着重复
    while (ring.length > 1 && ring[0] === ring[ring.length - 1]) ring.pop();
  }
}

