// paint-flood.ts —— 油漆桶各模式「涂哪些面」的纯函数（零 DOM，node 直测）。
// created 2026-10-21 by Claude Fable 5.1（0.9 QoL：工具配置 + 油漆桶模式）。
// 规则：从点到的面出发，按模式决定能跨过哪些边——
//   single    不跨（只这一张）
//   smooth    只跨 smooth 边（= 平滑组）
//   sharp     只跨两膜夹角 ≤ sharpDeg 的边（锐角 = 墙）
//   connected 跨任何边（连通体）
//   pool      本池全部面（「整个组 / 组件」；点到子池时由编辑器把池换成那个池）
import type { Kernel } from "../kernel/kernel.ts";
import type { FaceId } from "../kernel/kernel.ts";
import type { PaintMode } from "./tool-config.ts";

/** 曲面（0.10，设计稿 §4.2）：从一张面出发沿**软边**泛洪的面集 = SU 的 Surface（soft 决定成不成一张面来选，smooth 只管着色）。派生态，不存。 */
export function surfaceFaces(k: Pick<Kernel, "face" | "isSoft" | "graph">, seed: FaceId): FaceId[] {
  if (!k.face(seed)) return [];
  const seen = new Set<FaceId>([seed]);
  const stack: FaceId[] = [seed];
  while (stack.length) {
    const fid = stack.pop()!;
    const f = k.face(fid);
    if (!f) continue;
    for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) {
      if (!k.isSoft(d.edge)) continue;
      for (const g of k.graph.edge(d.edge).faceLinks) if (!seen.has(g) && k.face(g)) { seen.add(g); stack.push(g); }
    }
  }
  return [...seen];
}

export function facesForPaint(k: Kernel, seed: FaceId, mode: PaintMode, sharpDeg: number): FaceId[] {
  if (!k.face(seed)) return [];
  if (mode === "single") return [seed];
  if (mode === "pool") return k.faces().map((f) => f.id);
  const crosses = (eid: number): boolean => {
    if (mode === "connected") return true;
    if (mode === "smooth") return k.isSmooth(eid);
    const d = k.dihedralDeg(eid);
    return d !== null && d <= sharpDeg;
  };
  const seen = new Set<FaceId>([seed]);
  const stack: FaceId[] = [seed];
  while (stack.length) {
    const fid = stack.pop()!;
    const f = k.face(fid);
    if (!f) continue;
    for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) {
      if (!crosses(d.edge)) continue;
      for (const g of k.graph.edge(d.edge).faceLinks) if (!seen.has(g) && k.face(g)) { seen.add(g); stack.push(g); }
    }
  }
  return [...seen];
}
