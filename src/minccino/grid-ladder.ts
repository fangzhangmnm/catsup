// minccino/grid-ladder.ts —— 网格进位表怎么挑层（纯函数、零依赖）。created 2026-10-30 by Claude Opus 5.5
// user 10-30「有了你的自动缩放之后显示格距意义不大了……自动缩放grid也要注意不同的进位」「视角放远的时候1m应该变成对应栅格lod的标记」「z轴的interval和格子的细分和格距没有对齐」。
// 进位表 = 一串从细到粗的线距（米；相邻两层整数倍，粗线一定落在细线上），由编辑器按单位制给（公制 ×10、英制 1/16 in … 1 in · 1 ft · 10 ft、D&D 1 ft · 5 ft · 50 ft）。
// 渲染挑「这一刻画哪几层」、编辑器挑「轴上的标记 / 刻度落在哪层」都用这里 → 网格线、标记、刻度永远是同一套线。

/** 第一层在屏上间距 ≥ minPx 的（worldPerPx = 这一处一像素多少米）；都太密 = 最粗那层。 */
export function ladderLevelAt(ladder: readonly number[], worldPerPx: number, minPx: number): number {
  const need = Math.max(worldPerPx, 0) * minPx;
  for (const s of ladder) if (s >= need) return s;
  return ladder[ladder.length - 1] ?? 1;
}
/** 从第一层 ≥ minPx 的起，往上 count 层（不够就重复最粗那层，凑满 count 个，给着色器的固定长数组）。 */
export function ladderWindow(ladder: readonly number[], worldPerPx: number, minPx: number, count: number): number[] {
  const need = Math.max(worldPerPx, 0) * minPx;
  let i = ladder.findIndex((s) => s >= need);
  if (i < 0) i = Math.max(0, ladder.length - 1);
  const out: number[] = [];
  for (let k = 0; k < count; k++) out.push(ladder[Math.min(i + k, ladder.length - 1)] ?? 1);
  return out;
}
