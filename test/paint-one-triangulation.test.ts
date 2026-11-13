// 网格体的一张面切成哪几个三角形，只从一个地方来（贴图主线 1-3a 第一节，施工单 ai-docs/20261110-paint-workorders-7.md）。created 2026-11-10 by Claude Opus 5.5
// ① 屏幕上画的（pool-mesh.ts buildFaceRec，真走一遍）和 MeshKernel.triangles() 逐面比：顶点三元组的集合相同——正方形面、扭过的四边形、凹多边形、五边形、抖过的环面
// ② 选中高亮 / OBJ 那条路（editor/face-triangles.ts）也一样 ③ 扫源码：网格体显示那条路上不再直接切三角形（triangulateRings 只能作硬表面的后备）
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { MeshView } from "../src/mesh/mesh-view.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { buildFaceRec } from "../src/editor/pool-mesh.ts";
import { faceTriangles } from "../src/editor/face-triangles.ts";
import type { GeomView } from "../src/scene/world-view.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string };

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const CASES: Record<string, () => MeshKernel> = {
  box: () => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(2, 1, 1)); return k; },
  twistedQuads: () => { const k = new MeshKernel(), n = 4, v = (i: number, j: number): number => i * (n + 1) + j, r = rng(3); for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) k.addVertex(P(i, j, (i + j) % 2 ? 0.3 * r() : -0.3 * r())); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) k.addFace([v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)], -1, FRESH); return k; },
  concave: () => { const k = new MeshKernel(), vs = [P(0, 0, 0), P(3, 0, 0), P(3, 1, 0), P(1, 1, 0), P(1, 3, 0), P(0, 3, 0)].map((p) => k.addVertex(p)); k.addFace(vs, -1, FRESH); const ws = [P(0, 0, 1), P(2, 0, 1), P(1, 0.3, 1.2), P(2, 2, 1), P(0, 2, 1)].map((p) => k.addVertex(p)); k.addFace(ws, -1, FRESH); return k; },
  pentagons: () => { const k = new MeshKernel(); for (let c = 0; c < 3; c++) { const vs = [0, 1, 2, 3, 4].map((i) => k.addVertex(P(c * 3 + Math.cos((2 * Math.PI * i) / 5), Math.sin((2 * Math.PI * i) / 5), 0.2 * c * Math.sin(i)))); k.addFace(c % 2 ? [...vs].reverse() : vs, -1, FRESH); } return k; },
  jitteredTorus: () => {
    const N = 10, k = new MeshKernel(), id = (i: number, j: number): number => ((i + N) % N) * N + ((j + N) % N), r = rng(9);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const u = (2 * Math.PI * i) / N, v = (2 * Math.PI * j) / N; k.addVertex(P((3 + Math.cos(v)) * Math.cos(u) + 0.05 * r(), (3 + Math.cos(v)) * Math.sin(u), Math.sin(v))); }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) k.addFace([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)], -1, FRESH);
    return k;
  },
};
const key = (a: number, b: number, c: number): string => [a, b, c].sort((x, y) => x - y).join(",");
/** 内核 triangles() 里这张面的三角形（顶点编号三元组的集合）。 */
function kernelTris(k: MeshKernel): Map<number, Set<string>> {
  const { tris, faceOfTri } = k.triangles(), out = new Map<number, Set<string>>();
  for (let t = 0; t < faceOfTri.length; t++) { const f = faceOfTri[t]; (out.get(f) ?? out.set(f, new Set()).get(f)!).add(key(tris[3 * t], tris[3 * t + 1], tris[3 * t + 2])); }
  return out;
}
/** 一批三角形的角（位置）→ 这张面的顶点编号：认最近的那个顶点（差不超过百万分之一米；显卡那份是 float32、高亮那份把平面的角抬回拟合平面；测试网格体的点互相离得远）。 */
function idsOf(k: MeshKernel, f: number, corners: Pt3[]): Set<string> {
  const vs = k.faceVerts(f);
  const id = (p: Pt3): number => {
    let best = -1, bd = Infinity;
    for (const v of vs) { const q = k.pt(v), d = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z); if (d < bd) { bd = d; best = v; } }
    assert(bd <= 1e-6, `面 ${f} 的三角形角 (${p.x}, ${p.y}, ${p.z}) 不是它的顶点（最近 ${bd}）`); return best;
  };
  const out = new Set<string>();
  for (let i = 0; i < corners.length; i += 3) out.add(key(id(corners[i]), id(corners[i + 1]), id(corners[i + 2])));
  return out;
}

describe("网格体的三角形只从一个地方来（1-3a 第一节）", () => {
  it("屏幕上画的（buildFaceRec）= 内核 triangles()：逐面顶点三元组的集合相同", () => {
    for (const [name, mk] of Object.entries(CASES)) {
      const k = mk(), view = new MeshView(k), want = kernelTris(k);
      for (const f of k.faces()) {
        const rec = buildFaceRec(view, f, () => null);
        assert(rec !== null, `${name} 面 ${f} 画出来了`);
        const corners: Pt3[] = []; for (let i = 0; i < rec!.pos.length; i += 3) corners.push(P(rec!.pos[i], rec!.pos[i + 1], rec!.pos[i + 2]));
        eq([...idsOf(k, f, corners)].sort().join(" | "), [...want.get(f)!].sort().join(" | "), `${name} 面 ${f}`);
      }
    }
  });
  it("选中高亮 / OBJ 那条路（face-triangles.ts）也是同一份", () => {
    for (const [name, mk] of Object.entries(CASES)) {
      const k = mk(), view = new MeshView(k), want = kernelTris(k);
      for (const f of k.faces()) {
        const tris = faceTriangles(view as unknown as GeomView, f);
        eq([...idsOf(k, f, tris.flat())].sort().join(" | "), [...want.get(f)!].sort().join(" | "), `${name} 面 ${f}`);
      }
    }
  });
  it("扫源码：网格体显示那条路上不再直接切三角形（mesh-view.ts 不切；pool-mesh.ts / face-triangles.ts 的 triangulateRings 只作硬表面的后备）", () => {
    const view = readFileSync("src/mesh/mesh-view.ts", "utf8");
    assert(!/triangulateRings|triangulateFace/.test(view), "mesh-view.ts 自己切了三角形（该问内核 faceTriangles）");
    for (const f of ["src/editor/pool-mesh.ts", "src/editor/face-triangles.ts"]) {
      const bad = readFileSync(f, "utf8").split("\n").filter((l) => /triangulateRings\(/.test(l) && !/^\s*import /.test(l) && !/faceTriangles\?\.\(/.test(l));
      eq(bad.length, 0, `${f}：triangulateRings 没先问 faceTriangles：${bad.join(" / ").slice(0, 120)}`);
    }
    const k = readFileSync("src/mesh/mesh-kernel.ts", "utf8").split("\n").filter((l) => /triangulateFace\(/.test(l) && !/^\s*import /.test(l));
    eq(k.length, 1, "内核里只有 faceTriangles 那一处切三角形");
  });
});
