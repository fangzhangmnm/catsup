// 网格体三角化保持面的绕向（2026-10-28 Claude Opus 5.5；纪元账本 FM130 user「导出的时候面的法向一堆错误」「不一定是法向也可能是面的朝向」）。
// 根：planeOfRing 返回规范化了符号的平面，按它切出来的三角形在面的真实朝向和规范方向相反时整张反了（修前实测：立方体 12 个三角形反 6 个、球 224 反 96）。
// 修：format/triangulate.ts triangulateFace 按 Newell 对齐；MeshKernel.triangles 和导出 bakeMesh 都走它。这里两层都钉：内核的三角形、导出真正写进 glb 的三角形。
import { describe, it, eq } from "./runner.mjs";
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
      const posAcc = r.accessors[0] as { bufferView: number; count: number };
      const pos = new Float32Array(views[posAcc.bufferView].buffer.slice(0));
      const P = (i: number): Pt3 => ({ x: pos[3 * i], y: pos[3 * i + 1], z: pos[3 * i + 2] });
      const ctr = kind === "sphere" ? { x: 0, y: 0, z: 0 } : { x: 0, y: 0.5, z: 0 };   // Z-up (0,0,0.5) → Y-up (0,0.5,0)
      let bad = 0, n = 0;
      for (const prim of r.mesh.primitives as { indices: number; mode: number }[]) {
        if (prim.mode !== 4) continue;
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
});
