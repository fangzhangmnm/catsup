// contract/pixel-diff.ts —— 两份 RGBA 字节逐像素比（核对用：画画那一侧比内核合成图、渲染器那一侧比显示图每一级，同一个比法）。created 2026-11-11 by Claude Opus 5.5
// 纯函数、零依赖：引擎和内容层都从这里拿（引擎不 import 内容层）。
/** 两份 RGBA 字节逐像素比：差了几个像素、范围（含两端；没差 = null）。 */
export function diffBox(a: Uint8Array, b: Uint8Array, w: number): { diff: number; box: readonly [number, number, number, number] | null } {
  let diff = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3]) continue;
    diff++; const p = i >> 2, x = p % w, y = (p - x) / w;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { diff, box: diff ? [x0, y0, x1, y1] : null };
}
