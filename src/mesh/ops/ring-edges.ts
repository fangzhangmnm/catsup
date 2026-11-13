// mesh/ops/ring-edges.ts —— 加面 / 改环之前，把环上还没有的边按来历造好（属性地基轮 3c；规程第九½节：一条边的值在它被造出来的那一刻按来历填好，
// 不许「加面时顺手造一条空边、回头再补标记」）。created 2026-11-13 by Claude Opus 5.5
// 按环的先后造：和「加面 / 改环时顺手补」分到的编号一模一样（金样逐位对得上）；originOf 给 null = 新长（全是缺省值）。
// 边已经在：两张面共用一条新边时，第二张面的环碰到的就是第一张刚照同一个来历造好的那条，跳过是对的；但要是那条边是前面加面时顺手造出来的空边、
// 这里才申报它是一份，跳过 = 悄悄放过一个错。所以（统筹 11-13，规程第九½节末）：已经在、这次又给了来历 = 照这个来历算出该有的值
// （和内核造边同一个规矩：一份 / 一块 = 旧样子里的值，别的走 columns.ts edgeColumnValues；MeshKernel.edgeDisagrees），和它身上的逐列比，不一样 = 抛（哪一对点、哪一列）。没有边上的列时没什么可比。
import type { EdgeOrigin, EdgeShape, MeshKernel } from "../mesh-kernel.ts";
import { GROWN_EDGE } from "../columns.ts";

export function declareRingEdges(k: MeshKernel, ring: readonly number[], originOf: (a: number, b: number) => EdgeOrigin | null): void {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], have = k.edgeOf(a, b), origin = originOf(a, b);
    if (have < 0) { k.addEdge(a, b, origin ?? GROWN_EDGE); continue; }
    if (!origin) continue;
    const bad = k.edgeDisagrees(have, origin);   // 内核里逐列比（一份 / 一块直接比数组里的值，不新开对象）；没有边上的列 = null
    if (bad) throw new Error(`declareRingEdges: edge ${a}-${b} already exists with ${bad.id} = ${bad.have}, but the declared origin (${origin.kind}) gives ${bad.want} — it was made before its origin was declared`);
  }
}
/** 一对点的键（不分先后；和内核的边索引同一种算法：小的 × 2^26 + 大的）。 */
export const pairKey = (a: number, b: number): number => (a < b ? a * 67108864 + b : b * 67108864 + a);
/** 一张「新的一对点 → 原来哪条边的旧样子」的表 → declareRingEdges 要的 originOf（一份 / 一块）。 */
export const fromShapes = (m: ReadonlyMap<number, EdgeShape>, kind: "copy" | "piece"): ((a: number, b: number) => EdgeOrigin | null) => (a, b) => { const s = m.get(pairKey(a, b)); return s ? { kind, of: s } : null; };
