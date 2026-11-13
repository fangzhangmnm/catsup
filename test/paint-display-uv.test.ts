// 池网格给画的面算的贴图坐标（贴图主线 1-3c）：走画的面进「画」那一组，每个三角顶点的贴图坐标 = 它那个角上存的数 ÷ 画板实际宽高（不翻转），顶点色白；
// 不走画 / 有角没位置 = 不进那一组（照旧按底色）；画板实际比坐标大（裁定：不砍有内容的行）= 按画板的宽高除。created 2026-11-11 by Claude Opus 5.5
import { givenFaceValues } from "../src/mesh/reserved-columns.ts";
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { MeshView } from "../src/mesh/mesh-view.ts";
import { PoolMesh, type PoolMeshEnv } from "../src/editor/pool-mesh.ts";
import type { Material } from "../src/scene/scene.ts";
import { placeOn, slotsOf, uvAtOf } from "./uv-kit.ts";
import { unplaceFace } from "../src/scene/uv.ts";

const MAT = { guid: "m", name: "画", color: [0.5, 0.5, 0.5] } as unknown as Material;
/** 两张面：一张走画（角上有数），一张不走（paintOf 给 null）。第一张是拉伸过、四个点不共面的四边形。 */
function rig(w: number, h: number) {
  const m = new MeshKernel(), P = (x: number, y: number, z: number) => m.addVertex({ x, y, z });
  const a = m.addFace([P(0, 0, 0), P(3, 0, 0.4), P(2.5, 1.5, 0), P(0, 1, 0.2)], { kind: "fresh", face: givenFaceValues(m, { material: 0 }) }), b = m.addFace([P(5, 0, 0), P(6, 0, 0), P(6, 1, 0), P(5, 1, 0)], { kind: "fresh", face: givenFaceValues(m, { material: 0 }) });
  const vals = [2, 3, 40, 5, 37.5, 20, 4, 16];
  placeOn(m, a, "uv", vals);
  const env: PoolMeshEnv = {
    matOf: () => MAT, mapOf: () => null, slotsSig: "1", singleSided: true, backLook: "cull",
    faceColor: () => [0.5, 0.5, 0.5], seams: false, edgeColor: () => [0, 0, 0], thick: false,
    paintOf: (k, fid) => { const v = uvAtOf((k as MeshView).mesh, fid, "uv"); if (!v || [...v].some((x) => !Number.isFinite(x))) return null; return { values: v, w, h, key: "T" }; },
  };
  return { m, a, b, vals, env };
}

describe("池网格给画的面算贴图坐标（1-3c）", () => {
  it("走画的面进「画」那一组：每个三角顶点 = 那个角上的数 ÷ 画板宽高（不翻转）、顶点色白；不走画的面不进", () => {
    const { m, a, b, vals, env } = rig(64, 32), pm = new PoolMesh(), view = new MeshView(m);
    pm.sync(view, env);
    const g = pm.groups.get("paint:T");
    assert(g, "有「画」那一组");
    const r = g!.store.range(a)!, A = g!.store.arrays, ring = m.faceVerts(a);
    assert(r && r[1] === 6, `两个三角形 6 个顶点（${r}）`);
    let n = 0;
    for (let i = r[0]; i < r[0] + r[1]; i++) {
      const p = { x: A.position[3 * i], y: A.position[3 * i + 1], z: A.position[3 * i + 2] };
      const c = ring.findIndex((v) => { const q = m.pt(v); return Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6 && Math.abs(q.z - p.z) < 1e-6; });
      assert(c >= 0, "顶点对得上一个角");
      eq(+A.aUv[2 * i].toFixed(6), +(vals[2 * c] / 64).toFixed(6), `u（角 ${c}）`);
      eq(+A.aUv[2 * i + 1].toFixed(6), +(vals[2 * c + 1] / 32).toFixed(6), `v（角 ${c}）`);
      eq([A.aColor[3 * i], A.aColor[3 * i + 1], A.aColor[3 * i + 2]].join(), "127,127,127", "顶点色白");
      n++;
    }
    eq(n, 6, "六个顶点都查了");
    eq(g!.store.range(b), null, "不走画的面不在这一组");
  });
  it("画板比坐标大（有内容不砍的那种）：按画板实际的宽高除", () => {
    const { m, a, vals, env } = rig(64, 48), pm = new PoolMesh();
    pm.sync(new MeshView(m), env);
    const g = pm.groups.get("paint:T")!, r = g.store.range(a)!, A = g.store.arrays;
    const vs = new Set<string>(); for (let i = r[0]; i < r[0] + r[1]; i++) vs.add(A.aUv[2 * i + 1].toFixed(6));
    for (const y of [vals[1], vals[3], vals[5], vals[7]]) assert(vs.has((y / 48).toFixed(6)), `v = ${y} / 48`);
  });
  it("没有位置（代号 −1）= 不进「画」那一组（照旧按底色）", () => {
    const { m, a, env } = rig(64, 32);
    unplaceFace(m, slotsOf(m), a);
    const pm = new PoolMesh(); pm.sync(new MeshView(m), env);
    eq(pm.groups.get("paint:T")?.store.range(a) ?? null, null, "不在画那一组");
  });
});
