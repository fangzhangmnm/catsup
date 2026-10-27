// 拖着的东西不会吸到自己（家族周账 F-89 / Fable 账单 A5 / 纪元账本 DT55；user 10-26「No independent check that dragging can't snap to itself. 记周帐」）。
// 对齐引擎层的独立性质测试（不走编辑器）：hand = 在手里的顶点集（谓词制：AlignQuery.hand 必填，NO_HAND 要显式）。性质：
//   (S1) 解点永远不落在任何在手里的顶点上；(S2) 解点不落在「手势边」的内部（手势边 = 一端在手里、且那一端不是把静态边切开的二度共线点）；
//   (S3) 在手里的顶点全部删掉后再求解，若原来的解不碰手里的东西，解相同（手里的东西对静态世界的解没有影响 = WYSIWYG 吸静态世界）。
// 随机场景（轴对齐矩形 + 裸线）× 随机手 × 全屏扫描。created 2026-10-27 by Claude Fable 5.1
import { describe, it, assert, eq } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3, VertexId } from "../src/kernel/kernel.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { GROUND, snapPoint, NO_HAND } from "../src/editor/pick.ts";
import type { AlignHand } from "../src/editor/solver.ts";

const VP = { w: 800, h: 600 };
const TOL = 8;
function topCam(): OrbitCamera { const c = new OrbitCamera(); c.yaw = -Math.PI / 2; c.pitch = 1.5707; c.target = { x: 10, y: 10, z: 0 }; c.halfH = 16; return c; }
const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: Pt3, b: Pt3, t = 1e-6): boolean => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= t;
const distSeg = (p: Pt3, a: Pt3, b: Pt3): number => { const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, L2 = abx * abx + aby * aby + abz * abz; const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / L2)) : 0; return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby), p.z - (a.z + t * abz)); };

function scene(seed: number): Kernel {
  let s = seed; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const k = new Kernel();
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * 14), y = Math.floor(rnd() * 14), w = 2 + Math.floor(rnd() * 5), h = 2 + Math.floor(rnd() * 5);
    k.addEdges([[P(x, y), P(x + w, y)], [P(x + w, y), P(x + w, y + h)], [P(x + w, y + h), P(x, y + h)], [P(x, y + h), P(x, y)]]);
  }
  for (let i = 0; i < 2; i++) { const x = Math.floor(rnd() * 18), y = Math.floor(rnd() * 18); k.addEdges([[P(x, y), P(x + 1 + Math.floor(rnd() * 4), y + Math.floor(rnd() * 3))]]); }
  return k;
}
/**
 * 求解器的链规则（solver.ts edgeTargets）：手里的顶点 v 处若有一对**共线反向**的边，这一对并成一条静态链（v 只是把静态边切开，链的两端是静态顶点 → 链整条仍是目标）；
 * v 处其余的边 = 手势边（追光标）。这里按同一条规则判「v 处的边 e 是不是手势边」。
 */
function isGestureEdgeAt(k: Kernel, vid: VertexId, eid: number): boolean {
  const p = k.graph.pt(vid);
  const dir = (id: number): Pt3 | null => { const e = k.graph.edge(id); const o = k.graph.pt(e.a === vid ? e.b : e.a); const l = Math.hypot(o.x - p.x, o.y - p.y, o.z - p.z); return l > 0 ? { x: (o.x - p.x) / l, y: (o.y - p.y) / l, z: (o.z - p.z) / l } : null; };
  const d = dir(eid); if (!d) return false;
  for (const other of k.graph.vertex(vid).edges) { if (other === eid) continue; const o = dir(other); if (o && d.x * o.x + d.y * o.y + d.z * o.z < -(1 - 1e-9)) return false; }
  return true;
}
/** v 处没有任何共线反向的边对（不是任何静态链的切点）。 */
const noChainThrough = (k: Kernel, vid: VertexId): boolean => [...k.graph.vertex(vid).edges].every((eid) => isGestureEdgeAt(k, vid, eid));

describe("拖着的东西不会吸到自己（对齐引擎层，A5）", () => {
  it("(S1)(S2) 随机场景 × 随机手 × 全屏扫描：解点不碰手里的顶点、不落在手势边内部", () => {
    const c = topCam();
    let seed = 11;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let checked = 0;
    for (let sc = 1; sc <= 12; sc++) {
      const k = scene(sc * 7919);
      const vs = k.vertices();
      const handIds = new Set<VertexId>(vs.filter(() => rnd() < 0.3).map((v) => v.id));
      if (!handIds.size) handIds.add(vs[0].id);
      const hand: AlignHand = { has: (vid) => handIds.has(vid), opaque: false };
      // S1 只对「没有静态链穿过」的手里顶点断言：切点那种顶点的位置可能正好是静态链的中点（链是静态目标，中点不随手动），吸到那儿是对的
      const handPts = [...handIds].filter((id) => noChainThrough(k, id)).map((id) => k.graph.pt(id));
      const handEdges = k.edges().filter((e) => (handIds.has(e.a) && isGestureEdgeAt(k, e.a, e.id)) || (handIds.has(e.b) && isGestureEdgeAt(k, e.b, e.id))).map((e) => [k.graph.pt(e.a), k.graph.pt(e.b)] as const);
      for (let sx = 20; sx < VP.w; sx += 37) for (let sy = 20; sy < VP.h; sy += 41) {
        const r = snapPoint(k, c, VP, sx, sy, TOL, { hand, plane: GROUND });
        checked++;
        for (const hp of handPts) assert(!near(r.p, hp), `场景 ${sc} 光标 (${sx},${sy})：解点落在手里的顶点 (${hp.x},${hp.y}) 上，kind=${r.kind}`);
        if (r.kind === null) continue;   // 没吸到任何东西 = 光标原位投影；它碰巧落在手势边上不是吸附
        for (const [a, b] of handEdges) {
          if (near(r.p, a) || near(r.p, b)) continue;   // 端点是静态顶点（另一端）或已经被 S1 否定
          assert(distSeg(r.p, a, b) > 1e-6, `场景 ${sc} 光标 (${sx},${sy})：解点落在手势边 (${a.x},${a.y})-(${b.x},${b.y}) 内部，kind=${r.kind}`);
        }
      }
    }
    assert(checked > 2000, `扫了 ${checked} 个光标位置`);
  });
  it("(S3) 手里的东西对静态世界的解没有影响：把手里的顶点真删掉再求解，不碰手的解逐点相同", () => {
    const c = topCam();
    let mismatch = 0, compared = 0;
    for (let sc = 1; sc <= 8; sc++) {
      const k = scene(sc * 104729);
      const vs = k.vertices().filter((v) => noChainThrough(k, v.id));   // 不是任何静态链切点的顶点：它的邻边全是手势边，删掉 = 静态世界
      if (vs.length < 2) continue;
      const handIds = new Set<VertexId>([vs[0].id, vs[Math.floor(vs.length / 2)].id]);
      const hand: AlignHand = { has: (vid) => handIds.has(vid), opaque: false };
      // 静态世界 = 删掉手里顶点的全部邻边（它们的链整条退赛）
      const k2 = k.clone();
      const drop = new Set<number>(); for (const id of handIds) for (const eid of k2.graph.vertex(id).edges) drop.add(eid);
      k2.eraseEdges([...drop]);
      for (let sx = 20; sx < VP.w; sx += 53) for (let sy = 20; sy < VP.h; sy += 47) {
        const a = snapPoint(k, c, VP, sx, sy, TOL, { hand, plane: GROUND }), b = snapPoint(k2, c, VP, sx, sy, TOL, { hand: NO_HAND, plane: GROUND });
        compared++;
        if (!near(a.p, b.p, 1e-6) || a.kind !== b.kind) mismatch++;
      }
    }
    eq(mismatch, 0, `${compared} 个位置里 ${mismatch} 个解不同（手里的东西影响了静态世界的解）`);
  });
});
