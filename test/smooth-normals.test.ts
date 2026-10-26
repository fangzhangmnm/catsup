// 平滑边法向（纪元账本 DT11）：bake 的平滑组法向在圆柱侧面上 = 每个角点的径向（以前膜存的规范法向一半朝里，直接加在交界处抵消）。
// 渲染那一份（render3.smoothNormals）同算法，由 test/probes/probe-smooth-normals.mjs 拍像素守。created 2026-10-26 by Claude Opus 5.5
// DT96（同日）：渲染换成池网格的扇内法线（editor/pool-mesh.ts fanNormal），导出跟着换——下面对拍「导出的 = 屏幕上的」，再守硬接缝不被抹平。
import { describe, it, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { smoothNormalsOf } from "../src/format/bake.ts";
import { fanNormal } from "../src/editor/pool-mesh.ts";

const ring = (N: number) => Array.from({ length: N }, (_, i) => ({ x: Math.cos((i / N) * 2 * Math.PI), y: Math.sin((i / N) * 2 * Math.PI), z: 0 }));
const ck = (p: { x: number; y: number; z: number }): string => `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`;
/** 内核每张膜每个外环角的扇内法线 vs 导出快照的同一个角（按坐标对上膜和角）。 */
function sameAsExport(k: Kernel, ctx: string): number {
  const snap = k.toBrep(), sm = smoothNormalsOf(snap), V = snap.vertices;
  const faceKey = (pts: { x: number; y: number; z: number }[]): string => pts.map(ck).sort().join("|");
  const snapByKey = new Map<string, number>();
  snap.faces.forEach((f, fi) => snapByKey.set(faceKey(f.outer.map((i) => V[i])), fi));
  let n = 0;
  for (const f of k.faces()) {
    const pts = f.outer.vids.map((v) => k.graph.pt(v)), fi = snapByKey.get(faceKey(pts));
    assert(fi !== undefined, `${ctx}: 面 ${f.id} 在快照里没对上`);
    const m = sm.get(fi!);
    f.outer.vids.forEach((v, j) => {
      const a = fanNormal(k, f.id, j), vi = snap.faces[fi!].outer.find((i) => ck(V[i]) === ck(k.graph.pt(v)))!;
      const b = m?.get(vi) ?? (() => { const q = snap.planes[snap.faces[fi!].plane].n; return [q.x, q.y, q.z]; })();
      assert(Math.abs(a.x - b[0]) + Math.abs(a.y - b[1]) + Math.abs(a.z - b[2]) < 1e-6, `${ctx}: 面 ${f.id} 角 ${j}：屏幕 ${[a.x, a.y, a.z].map((x) => x.toFixed(4))} ≠ 导出 ${b.map((x) => x.toFixed(4))}`);
      n++;
    });
  }
  return n;
}

describe("平滑边法向（DT11）", () => {
  it("24 边圆柱：侧面每个角点的平滑法向都是那一点的径向（±，和本膜同侧）", () => {
    const N = 24, pts = Array.from({ length: N }, (_, i) => ({ x: Math.cos((i / N) * 2 * Math.PI), y: Math.sin((i / N) * 2 * Math.PI), z: 0 }));
    const k = new Kernel();
    k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % N]] as const), { curve: true });
    k.pushPull(k.faces()[0].id, 1);
    const snap = k.toBrep(), sm = smoothNormalsOf(snap);
    let checked = 0;
    snap.faces.forEach((f, fi) => {
      const m = sm.get(fi);
      if (!m) return;
      for (const [vi, n] of m) {
        const p = snap.vertices[vi], l = Math.hypot(p.x, p.y);
        const radial = Math.abs(n[0] * p.x / l + n[1] * p.y / l);
        assert(radial > 0.995 && Math.abs(n[2]) < 0.01, `面 ${fi} 顶点 ${vi}：法向 ${n.map((x) => x.toFixed(3)).join(",")} 不是径向`);
        checked++;
      }
    });
    assert(checked >= 4 * N, `检查了 ${checked} 个角点`);
  });
  it("平滑组里留一条硬接缝：接缝两侧各自的法向不被抹平（旧的整组平均会把它们拉成一样）", () => {
    const N = 16, k = new Kernel();
    k.addEdges(ring(N).map((p, i, a) => [p, a[(i + 1) % N]] as const), { curve: true });
    k.pushPull(k.faces()[0].id, 1);
    const seam = k.edges().find((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return Math.abs(a.x - 1) < 1e-9 && Math.abs(b.x - 1) < 1e-9 && Math.abs(a.y) < 1e-9 && Math.abs(b.y) < 1e-9; })!;
    assert(!!seam && k.isSmooth(seam.id), "x = 1 那条侧棱本来是平滑边");
    k.setEdgeLayer("smooth", [seam.id], false); k.setEdgeLayer("soft", [seam.id], false);
    const [fa, fb] = [...new Set(seam.faceLinks)];
    const at = (fid: number): { x: number; y: number; z: number } => { const f = k.face(fid)!, j = f.outer.vids.indexOf(seam.a); return fanNormal(k, fid, j); };
    const na = at(fa), nb = at(fb), d = na.x * nb.x + na.y * nb.y + na.z * nb.z;
    assert(Math.abs(d) < Math.cos((0.5 * 2 * Math.PI) / N), `接缝两侧的法向夹角应该 > 半个段角：点积 ${d.toFixed(4)}`);
    sameAsExport(k, "硬接缝圆柱");
  });
  it("导出的 = 屏幕上的：随机模型（圆柱 / 盒子 / 软化一部分边 / 挪点）每个角点的平滑法向一致", () => {
    let total = 0;
    for (let seed = 1; seed <= 20; seed++) {
      let s = seed * 7919; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const k = new Kernel();
      const N = 6 + Math.floor(rnd() * 12), cx = Math.round(rnd() * 3 * 1000) / 1000;
      k.addEdges(ring(N).map((p) => ({ x: p.x + cx, y: p.y, z: 0 })).map((p, i, a) => [p, a[(i + 1) % N]] as const), { curve: true });
      k.pushPull(k.faces()[0].id, 0.5 + rnd());
      k.addEdges([[{ x: -3, y: -3, z: 0 }, { x: -2, y: -3, z: 0 }], [{ x: -2, y: -3, z: 0 }, { x: -2, y: -2, z: 0 }], [{ x: -2, y: -2, z: 0 }, { x: -3, y: -2, z: 0 }], [{ x: -3, y: -2, z: 0 }, { x: -3, y: -3, z: 0 }]]);
      k.pushPull(k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.x < -1.5 && p.z === 0))!.id, 1);
      const es = k.edges(), pick = es.filter(() => rnd() < 0.35).map((e) => e.id), on = rnd() < 0.5;
      k.setEdgeLayer("smooth", pick, on); k.setEdgeLayer("soft", pick, on);
      try { const v = k.vertices()[Math.floor(rnd() * k.vertices().length)]; k.moveVertices([{ id: v.id, to: { x: v.x, y: v.y, z: v.z + 0.05 } }]); } catch { /* 拒绝也照核 */ }
      total += sameAsExport(k, `seed ${seed}`);
    }
    assert(total > 200, `核了 ${total} 个角点`);
  });
});
