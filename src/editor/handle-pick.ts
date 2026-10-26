// handle-pick.ts —— 场景里的「柄」按下时抓哪个（纯函数、零依赖）。缩放工具先用；柄透视画、透视拾（埋在几何里也点得中）。
// created 2026-10-25 by Claude Opus 5.5（user「缩放的gizmos如果卡几何里面应该能点中」）

/**
 * 按下时抓哪个柄：屏距 d 在 1.5 × 捕获半径内、最近的；屏上叠在一起（屏距差 ≤ ¼ 捕获半径，如正对着看时前后两个面心柄）= 离相机近（z 小）的赢。
 * 没有 → −1。
 */
export function pickHandle(cands: readonly { d: number; z: number }[], hit: number): number {
  const tie = hit * 0.25;
  let best = -1, bd = hit * 1.5, bz = Infinity;
  cands.forEach(({ d, z }, i) => {
    if (d > hit * 1.5) return;
    if (d < bd - tie || (d <= bd + tie && z < bz)) { bd = d; best = i; bz = z; }
  });
  return best;
}
