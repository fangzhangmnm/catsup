// 网格体三角化保持面的绕向（2026-10-28 Claude Opus 5.5；纪元账本 FM130 user「导出的时候面的法向一堆错误」「不一定是法向也可能是面的朝向」）。
// 根：planeOfRing 返回规范化了符号的平面，按它切出来的三角形在面的真实朝向和规范方向相反时整张反了（修前实测：立方体 12 个三角形反 6 个、球 224 反 96）。
// 修：format/triangulate.ts triangulateFace 按 Newell 对齐；MeshKernel.triangles 和导出 bakeMesh 都走它。这里两层都钉：内核的三角形、导出真正写进 glb 的三角形。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addPrimitive, type PrimitiveKind } from "../src/mesh/ops/index.ts";
import { meshDocFromKernel } from "../src/mesh/mesh-doc.ts";
import { bakeMesh } from "../src/format/bake.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";

const F = { o: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
const build = (kind: PrimitiveKind): MeshKernel => { const m = new MeshKernel(); addPrimitive(m, kind, F, kind === "box" || kind === "plane" ? [1, 1, kind === "plane" ? 0 : 1] : [0.5, 0.5, 1], 16); return m; };
const triN = (a: Pt3, b: Pt3, c: Pt3): Pt3 => { const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }; return { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x }; };
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const KINDS: PrimitiveKind[] = ["box", "cylinder", "cone", "sphere", "plane"];

describe("网格体三角化保持面的绕向（导出不再一半反面）", () => {
  it("MeshKernel.triangles：每个三角形的法向和它所在面的朝向同号（五种基本体）", () => {
    for (const kind of KINDS) {
      const m = build(kind), { tris, faceOfTri } = m.triangles();
      let bad = 0;
      for (let i = 0; i < faceOfTri.length; i++) if (dot(triN(m.pt(tris[3 * i]), m.pt(tris[3 * i + 1]), m.pt(tris[3 * i + 2])), m.faceNormal(faceOfTri[i])) <= 0) bad++;
      eq(bad, 0, `${kind}：${bad} / ${faceOfTri.length} 个三角形反了`);
    }
  });
  it("bakeMesh 写进 glb 的三角形（Y-up 之后）全部朝外：封闭基本体每个三角形法向 · (三角形心 − 体心) > 0", () => {
    for (const kind of ["box", "cylinder", "cone", "sphere"] as const) {
      const m = build(kind), doc = meshDocFromKernel(m), views: Uint8Array[] = [];
      const r = bakeMesh(doc, { add: (b) => { views.push(b.slice()); return views.length - 1; } }, 0);
      const ctr = kind === "sphere" ? { x: 0, y: 0, z: 0 } : { x: 0, y: 0.5, z: 0 };   // Z-up (0,0,0.5) → Y-up (0,0.5,0)
      let bad = 0, n = 0;
      for (const prim of r.mesh.primitives as { indices: number; mode: number; attributes: { POSITION: number } }[]) {
        if (prim.mode !== 4) continue;
        const posAcc = r.accessors[prim.attributes.POSITION] as { bufferView: number; count: number };   // 每组自己的 POSITION（2026-10-28 带法向以后）
        const pos = new Float32Array(views[posAcc.bufferView].buffer.slice(0));
        const P = (i: number): Pt3 => ({ x: pos[3 * i], y: pos[3 * i + 1], z: pos[3 * i + 2] });
        const acc = r.accessors[prim.indices] as { bufferView: number; count: number; componentType: number };
        const raw = views[acc.bufferView], idx = acc.componentType === 5121 ? raw : acc.componentType === 5123 ? new Uint16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)) : new Uint32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
        for (let i = 0; i + 2 < acc.count; i += 3) {
          const a = P(idx[i]), b = P(idx[i + 1]), c = P(idx[i + 2]), g = { x: (a.x + b.x + c.x) / 3 - ctr.x, y: (a.y + b.y + c.y) / 3 - ctr.y, z: (a.z + b.z + c.z) / 3 - ctr.z };
          n++; if (dot(triN(a, b, c), g) <= 0) bad++;
        }
      }
      eq(bad, 0, `${kind}：导出的 ${n} 个三角形里 ${bad} 个朝里`);
    }
  });
  it("bakeMesh 写 NORMAL（2026-10-28 FM130 法向那半）：盒子 = 每面 4 个顶点、法向沿轴；16 段圆柱按角度 30° = 侧面法向水平朝外（平滑）、顶底法向竖直（棱）", () => {
    const read = (kind: PrimitiveKind): { P: Pt3[]; N: Pt3[] } => {
      const m = build(kind); m.setSmoothDefault({ mode: "angle", deg: 30 });
      const views: Uint8Array[] = [], r = bakeMesh(meshDocFromKernel(m), { add: (b) => { views.push(b.slice()); return views.length - 1; } }, 0);
      const out = { P: [] as Pt3[], N: [] as Pt3[] };
      for (const prim of r.mesh.primitives as { mode: number; attributes: { POSITION: number; NORMAL?: number } }[]) {
        if (prim.mode !== 4) continue;
        if (prim.attributes.NORMAL === undefined) throw new Error("三角形 primitive 没有 NORMAL");
        const f = (acc: number): Float32Array => new Float32Array(views[(r.accessors[acc] as { bufferView: number }).bufferView].buffer.slice(0));
        const p = f(prim.attributes.POSITION), nn = f(prim.attributes.NORMAL);
        for (let i = 0; i < p.length; i += 3) { out.P.push({ x: p[i], y: p[i + 1], z: p[i + 2] }); out.N.push({ x: nn[i], y: nn[i + 1], z: nn[i + 2] }); }
      }
      return out;
    };
    const box = read("box");
    eq(box.P.length, 24, "立方体：8 个角 × 3 张面 = 24 个顶点（棱上法向分开）");
    assert(box.N.every((q) => [q.x, q.y, q.z].filter((c) => Math.abs(Math.abs(c) - 1) < 1e-6).length === 1), "盒子法向都沿轴");
    const cyl = read("cylinder");
    let side = 0, cap = 0;
    cyl.N.forEach((q, i) => {
      const p = cyl.P[i];
      if (Math.abs(q.y) > 0.999) { cap++; return; }   // Y-up：顶底法向竖直
      side++;
      assert(Math.abs(q.y) < 1e-6, `侧面法向水平（${q.y}）`);
      const r2 = Math.hypot(p.x, p.z); assert(r2 > 0 && (q.x * p.x + q.z * p.z) / r2 > 0.999, "侧面法向 = 半径方向朝外（平滑，不是面法向）");
    });
    eq(side, 32, "侧面 16 列 × 上下两圈 = 32 个顶点（平滑区共用）"); eq(cap, 32, "顶底各 16 个（棱把它们和侧面分开）");
  });
});
