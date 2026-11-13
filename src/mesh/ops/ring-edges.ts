// mesh/ops/ring-edges.ts —— 加面 / 改环之前，把环上还没有的边按来历造好（属性地基轮 3c；规程第九½节：一条边的值在它被造出来的那一刻按来历填好，
// 不许「加面时顺手造一条空边、回头再补标记」）。created 2026-11-13 by Claude Opus 5.5
// 按环的先后造：和「加面 / 改环时顺手补」分到的编号一模一样（金样逐位对得上）；已经在的边不碰（来历只在造的时候申报，对已经在的边申报 = 内核抛）；
// originOf 给 null = 新长（全是缺省值）。先造了新长的边、后面又想申报它是一份 = 来不及了：调用的地方得先申报（漏了由探针列那条测试抓）。
import type { EdgeOrigin, EdgeShape, MeshKernel } from "../mesh-kernel.ts";
import { GROWN_EDGE } from "../columns.ts";

export function declareRingEdges(k: MeshKernel, ring: readonly number[], originOf: (a: number, b: number) => EdgeOrigin | null): void {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if (k.edgeOf(a, b) >= 0) continue;
    k.addEdge(a, b, originOf(a, b) ?? GROWN_EDGE);
  }
}
/** 一对点的键（不分先后）。 */
export const pairKey = (a: number, b: number): string => (a < b ? `${a},${b}` : `${b},${a}`);
/** 一张「新的一对点 → 原来哪条边的旧样子」的表 → declareRingEdges 要的 originOf（一份 / 一块）。 */
export const fromShapes = (m: ReadonlyMap<string, EdgeShape>, kind: "copy" | "piece"): ((a: number, b: number) => EdgeOrigin | null) => (a, b) => { const s = m.get(pairKey(a, b)); return s ? { kind, of: s } : null; };
