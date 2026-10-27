// mesh/tri-soup.ts —— 三角汤 ↔ mesh 内核。文件里 kind:"mesh" 的载荷现在还是三角汤（0.14 定的最小形）：M3 换成多边形载荷 CATSUP_mesh 之前的过渡——
// 三角汤存不住 n 边形（四边形存成两个三角形读回来还是两个三角形）。现在没有任何用户入口能造出 mesh 身体（转换指令 M3 一起来），所以没有用户数据经过这条有损路；
// M3 落地前不许接 UI。外来 glb 导入（user 10-27「导入直接成 mesh」）以后也走 meshFromTriangles。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel } from "./mesh-kernel.ts";

export interface TriSoup { positions: Float32Array; indices: Uint32Array; triMaterial?: Uint16Array; }
const NO_MAT = 0xffff;

/** 每个三角形一张面（退化的——两个下标一样 / 越界——跳过并计数，调用方披露）。 */
export function meshFromTriangles(t: TriSoup): { kernel: MeshKernel; skipped: number } {
  const m = new MeshKernel(), n = Math.floor(t.positions.length / 3);
  for (let i = 0; i < n; i++) m.addVertex({ x: t.positions[3 * i], y: t.positions[3 * i + 1], z: t.positions[3 * i + 2] });
  let skipped = 0;
  for (let i = 0; i + 2 < t.indices.length; i += 3) {
    const a = t.indices[i], b = t.indices[i + 1], c = t.indices[i + 2];
    if (a === b || b === c || a === c || a >= n || b >= n || c >= n) { skipped++; continue; }
    const mat = t.triMaterial ? t.triMaterial[i / 3] : NO_MAT;
    m.addFace([a, b, c], mat === NO_MAT ? -1 : mat);
  }
  return { kernel: m, skipped };
}

/** 内核 → 三角汤（顶点紧凑重编；每三角记面的材质槽）。 */
export function meshToTriangles(m: MeshKernel): TriSoup {
  const alive = m.verts(), map = new Map<number, number>();
  const positions = new Float32Array(alive.length * 3);
  alive.forEach((v, i) => { map.set(v, i); positions[3 * i] = m.pos[3 * v]; positions[3 * i + 1] = m.pos[3 * v + 1]; positions[3 * i + 2] = m.pos[3 * v + 2]; });
  const { tris, faceOfTri } = m.triangles();
  const indices = new Uint32Array(tris.length), triMaterial = new Uint16Array(faceOfTri.length);
  for (let i = 0; i < tris.length; i++) indices[i] = map.get(tris[i])!;
  for (let i = 0; i < faceOfTri.length; i++) { const s = m.faceMat[faceOfTri[i]]; triMaterial[i] = s >= 0 ? s : NO_MAT; }
  return { positions, indices, triMaterial };
}
