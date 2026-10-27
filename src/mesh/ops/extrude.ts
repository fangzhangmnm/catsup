// mesh/ops/extrude.ts —— 长：挤出一组面（区域的顶点复制一份、面改指向新点、区域边界每条边长一张四边形侧面；内部边不长）。不挪：挪归工具。
// created 2026-10-27 by Claude Fable 5.1
import { MeshKernel } from "../mesh-kernel.ts";

export interface ExtrudeResult { newVerts: Map<number, number>; sides: number[]; }

export function extrudeFaces(k: MeshKernel, fs: readonly number[]): ExtrudeResult {
  const region = new Set([...fs].filter((f) => k.hasF(f)));
  if (!region.size) throw new Error("extrudeFaces: no alive faces");
  // 区域顶点 → 新顶点（同位置）
  const newVerts = new Map<number, number>();
  for (const f of [...region].sort((a, b) => a - b)) for (const v of k.faceVerts(f)) if (!newVerts.has(v)) newVerts.set(v, k.addVertex(k.pt(v)));
  // 边界边 = 恰有一张区域内的面（按区域内那张面的绕向记 a→b）
  const boundary: [number, number, number][] = [];   // [a, b, 面]
  for (const f of [...region].sort((a, b) => a - b)) {
    const r = k.faceVerts(f);
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], e = k.edgeOf(a, b);
      const inRegion = [...k.eFaces(e)].filter((ff) => region.has(ff)).length;
      if (inRegion === 1) boundary.push([a, b, f]);
    }
  }
  // 面改指向新点
  for (const f of [...region].sort((a, b) => a - b)) k.setFaceRing(f, k.faceVerts(f).map((v) => newVerts.get(v)!));
  // 侧面：顶面绕向 a→b（朝外时从外面看逆时针），侧面 (a, b, b', a') 的右手法向 = (b−a) × (b'−b) 朝外（盒子顶面 y=0 那条边：(1,0,0) × (0,0,1) = (0,−1,0)）
  const sides: number[] = [];
  for (const [a, b, f] of boundary) sides.push(k.addFace([a, b, newVerts.get(b)!, newVerts.get(a)!], k.faceMat[f]));
  return { newVerts, sides };
}
