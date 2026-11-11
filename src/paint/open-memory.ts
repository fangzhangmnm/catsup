// paint/open-memory.ts —— 打开一张 n × n 的画、在画画工作台里画的时候，显卡上固定占多少（施工单十五第三节：选大小的面板每行第二个数）。created 2026-11-11 by Claude Opus 5.5
// user 11-11 看了「每层最多占多少（没压缩）」之后：「为什么不默认压缩……png本来就是ssot啊」→ 那个数只会误导；改成打开这张画时实际要开的东西（不是估的）。
// 这张清单是在测试页里给 WebGL 的建图 / 删图记账量出来的（test/probes/probe-paint-open-memory.mjs 每次对一遍：公式 = 实际开的，五档逐字节相同）：
//   · 给渲染器的显示图：n × n RGBA8 连同整条缩小图（n²·4 + (n/2)²·4 + … + 1·4）；
//   · 画画内核的合成目标：n × n RGBA8；内核预借的一张画布大小的帧缓冲（落第一笔不用现建）：n × n RGBA8；
//   · 第一笔之后内核池子里留着的一张画布大小的帧缓冲：n × n RGBA8（画过就一直在）；
//   · 每格的表（只在画画工作台里，space-prep.ts）：n × n × 8 字节；
//   · 一笔正在画的时候另外两张薄层（定型层 + 当帧那张，space-layer.ts）：2 × n × n RGBA8，抬笔就还。
// 不在这里的：画上去的内容（内核按图块存，画多少占多少，不随画布大小固定）；几张小数据图（几 KB）。
export interface OpenMemory {
  readonly display: number; readonly kernel: number; readonly cells: number;
  /** 打开、画过一笔以后一直占着的（显示图 + 内核三张 + 每格的表）。 */
  readonly fixed: number;
  /** 一笔正在画的时候另外再多的。 */
  readonly stroke: number;
}
export function openMemory(n: number): OpenMemory {
  let display = 0;
  for (let w = n, h = n; ; w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) { display += w * h * 4; if (w === 1 && h === 1) break; }
  const one = n * n * 4, kernel = 3 * one, cells = n * n * 8;
  return { display, kernel, cells, fixed: display + kernel + cells, stroke: 2 * one };
}
/** 字节念成 MB / KB。 */
export function bytesSay(n: number): string { return n >= 1 << 20 ? `${Number((n / (1 << 20)).toFixed(n >= 10 << 20 ? 0 : 1))} MB` : `${Math.max(1, Math.round(n / 1024))} KB`; }
