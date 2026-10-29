// mesh/soft-select.ts —— 软选择（比例编辑；Blender 的 O）的权重：选中的点 = 1，离选区越远越小，到半径外 = 0。created 2026-10-28 by Claude Opus 5.5
// user 10-28 夜「3 和沿法向移动的几个不同的软编辑擦边sculpt的笔刷居然忘了做」「为什么不先做软选择」；更早 10-27「lasso和软trs，这个其实在二次元绘制调整大型里面是day2的necessity」
// （纪元账本 FM1 / FM6 / FM20–FM22）。纯函数：零 DOM / 编辑器；变换工具（tools/mesh-transform.ts）按下时算一次距离、每帧按当前半径取权重（半径拖动中能改）。
// 距离 = 世界坐标里到最近一个选中点的直线距离（Blender 默认那一档；「只沿连着的」以后要再加一档）。曲线 = Blender 的 Smooth：x = 1 − d / R，w = 3x² − 2x³。
import type { Pt3 } from "../kernel/geom.ts";

/** 选区外每个点到选区的距离（世界）：只留 maxD 以内的（maxD 给半径滑条的上限，滑大了也够用）。O(点数 × 选中点数)，低模几千点以内零点几毫秒。 */
export function softDistances(verts: Iterable<number>, picked: ReadonlySet<number>, world: (v: number) => Pt3, maxD = Infinity): Map<number, number> {
  const P = [...picked].map(world), out = new Map<number, number>();
  if (!P.length) return out;
  for (const v of verts) {
    if (picked.has(v)) continue;
    const q = world(v);
    let d = Infinity;
    for (const p of P) { const dd = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z); if (dd < d) d = dd; }
    if (d < maxD) out.set(v, d);
  }
  return out;
}

/** 平滑衰减：d = 0 → 1，d ≥ R → 0（Blender Smooth）。 */
export function softFalloff(d: number, R: number): number {
  if (!(R > 0) || d >= R) return 0;
  const x = 1 - d / R;
  return x * x * (3 - 2 * x);
}

/** 当前半径下的权重表（只含 > 0 的）。 */
export function softWeights(dist: ReadonlyMap<number, number>, R: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const [v, d] of dist) { const w = softFalloff(d, R); if (w > 0) out.set(v, w); }
  return out;
}
