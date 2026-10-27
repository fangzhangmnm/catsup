// migrate/mesh.ts —— CATSUP_mesh 的老形读法（持久化立宪 §7：老文件永远能开；迁移代码住 migrate/）。created 2026-10-27 by Claude Fable 5.1
// 0.14（2026-10-24 契约的最小形）的 mesh 载荷 = 三角汤：positions（f32 xyz）/ indices（u32 三角）/ 可选 triMaterial（u16，0xffff = 默认），没有拍子、没有多边形。
// 读成 CATSUP_mesh 1.0.0 的多边形形：每个三角形一张面（退化的跳过）、没有边标记、没有隐藏面。重存就是多边形载荷。
// 注意：这一步需要二进制（不是纯 JSON 变换），所以不走 STEPS 表，由 mesh-payload.ts 在「没有 faceStart 键」时调。
import type { MeshDoc } from "../document.ts";

const NO_MAT = 0xffff;

export function polygonsFromTriangles(positions: Float32Array, indices: Uint32Array, triMaterial?: Uint16Array): { doc: MeshDoc; skipped: number } {
  const nV = Math.floor(positions.length / 3);
  const faceStart: number[] = [], faceLen: number[] = [], loopVert: number[] = [], faceMat: number[] = [];
  let skipped = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    if (a === b || b === c || a === c || a >= nV || b >= nV || c >= nV) { skipped++; continue; }
    const mat = triMaterial ? triMaterial[i / 3] : NO_MAT;
    faceStart.push(loopVert.length); faceLen.push(3); loopVert.push(a, b, c); faceMat.push(mat === NO_MAT ? -1 : mat);
  }
  const pos = new Float64Array(nV * 3);
  for (let i = 0; i < nV * 3; i++) pos[i] = positions[i];
  return {
    doc: { positions: pos, faceStart: Int32Array.from(faceStart), faceLen: Int32Array.from(faceLen), loopVert: Int32Array.from(loopVert), faceMat: Int32Array.from(faceMat), faceFlags: new Uint8Array(faceStart.length), edgePairs: new Int32Array(0), edgeFlags: new Uint8Array(0) },
    skipped,
  };
}
