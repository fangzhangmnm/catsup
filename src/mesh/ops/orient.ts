// mesh/ops/orient.ts —— 法向一致化（Blender「重算法向」）：同一连通块里相邻面过共享边的方向相反；封闭壳一律朝外（有向体积为正）。
// 单面网格的正面 = 环的绕向，所以朝向就是数据，不是渲染选项；brep → mesh 转换最后一步调它（brep 的平面法向是规范化符号的，不是朝外）。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel } from "../mesh-kernel.ts";
import type { Pt3 } from "../../kernel/geom.ts";
import { flipFaces } from "./geometry.ts";

const triple = (a: Pt3, b: Pt3, c: Pt3): number => a.x * (b.y * c.z - b.z * c.y) + a.y * (b.z * c.x - b.x * c.z) + a.z * (b.x * c.y - b.y * c.x);

/**
 * 每个连通块从一张种子面出发（种子的朝向不动），沿流形边（恰两张面）传播：邻面过共享边必须和自己反向，不反就记一笔翻；
 * 块封闭（每条边恰两张面）且 outside ≠ false → 有向体积 < 0 时整块翻。翻的决定先全算完、最后一次 flipFaces（邻接只重建一次）。
 */
export function recalcNormals(k: MeshKernel, opts: { outside?: boolean } = {}): { flipped: number; components: number } {
  const faces = k.faces();
  if (!faces.length) return { flipped: 0, components: 0 };
  const seen = new Uint8Array(Math.max(...faces) + 1), flip = new Uint8Array(seen.length);
  let components = 0;
  for (const seed of faces) {
    if (seen[seed]) continue;
    components++; seen[seed] = 1;
    const comp = [seed], stack = [seed];
    let closed = true;
    while (stack.length) {
      const f = stack.pop()!, vs = k.faceVerts(f), fSign = flip[f] ? -1 : 1;
      for (let i = 0; i < vs.length; i++) {
        const a = vs[i], b = vs[(i + 1) % vs.length], fl = k.eFaces(k.edgeOf(a, b));
        if (fl.length !== 2) { closed = false; continue; }   // 边界 / 非流形：不传播，块不算封闭
        const g = fl[0] === f ? fl[1] : fl[0];
        if (seen[g]) continue;
        const gv = k.faceVerts(g), j = gv.indexOf(b), gOrig = gv[(j + 1) % gv.length] === a ? -1 : 1;   // g 原环走 b→a = 和 f 的 a→b 反向
        flip[g] = fSign * gOrig > 0 ? 1 : 0;   // 有效方向要相反
        seen[g] = 1; comp.push(g); stack.push(g);
      }
    }
    if (closed && opts.outside !== false) {
      let vol = 0;
      for (const f of comp) { const p = k.facePts(f), s = flip[f] ? -1 : 1; for (let i = 1; i + 1 < p.length; i++) vol += s * triple(p[0], p[i], p[i + 1]); }
      if (vol < 0) for (const f of comp) flip[f] ^= 1;
    }
  }
  const fs = faces.filter((f) => flip[f]);
  if (fs.length) flipFaces(k, fs);
  return { flipped: fs.length, components };
}
