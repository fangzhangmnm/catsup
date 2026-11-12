// paint/open-memory.ts —— 打开一张 n × n 的画、在画画工作台里画的时候，显卡上固定占多少（施工单十五第三节：选大小的面板每行第二个数）。created 2026-11-11 by Claude Opus 5.5
// user 11-11 看了「每层最多占多少（没压缩）」之后：「为什么不默认压缩……png本来就是ssot啊」→ 那个数只会误导；改成打开这张画时实际要开的东西（不是估的）。
// 这张清单是在测试页里给 WebGL 的建图 / 删图记账量出来的（test/probes/probe-paint-open-memory.mjs 每次对一遍：公式 = 实际开的，五档逐字节相同）：
//   · 给渲染器的显示图：n × n RGBA8 连同整条缩小图（n²·4 + (n/2)²·4 + … + 1·4）；
//   · 画画内核的合成目标：n × n RGBA8；内核预借的一张画布大小的帧缓冲（落第一笔不用现建）：n × n RGBA8；
//   · 第一笔之后内核池子里另外留着的两张画布大小的帧缓冲：2 × n × n RGBA8（画过就一直在；五档量下来都是两张）；
//   · 每格的表（只在画画工作台里，space-prep.ts）：n × n × 8 字节；
//   · 一笔正在画的时候另外两张薄层（定型层 + 当帧那张，space-layer.ts）：2 × n × n RGBA8，抬笔就还。
//   · 内核的显卡图块池（一张 2D 图组）：施工单十九第 3 刀起一份文件合用一个（第一张画开的时候建，起步 64 片 × 256 见方 × 4 字节 = 16 MB，跟画布大小无关；
//     只有正在编辑的画板醒着占片，所以这一项是「这份文件第一次开画」的数，再开别的画不另开一个——清单照第一次的上沿报，不减）；
//     第一笔之后按工作集长（内核 frame-demand.ts：段缓存 + 画到的那层的图块；在额度里按两倍长）：清单按上沿算 = 两层画布那么多的图块（2048 见方 = 128 片 32 MB，1024 及以下不长）；
//   · 每张图层一张索引小图（格子坐标 → 图块池里第几片；R32F，每格 4 字节；新开的画 = 两张）+ 内核一张 1 × 1 的填色图；
//   · 面表 / 三角形表（只在画画工作台里，space-prep.ts 缓存的）：每张面 2 个数、每个三角形 TRI_STRIDE 个数，按 DATA_W 宽折成 R32F 数据图——跟物件走、不跟画布走；
// 施工单十九第 1 刀（2026-11-12）：探针改成数全部显卡分配（含图组），清单上没有的 = 红；以上三样是那次补上的（以前清单说「几张小数据图不算」，图块池那 16 MB 也漏了）。
// 不在这里的：画上去的东西多了图块池再长的那部分（在额度里长，见 tile-jobs.ts / gl-room.ts 的额度）。
import { TILE_SIZE } from "./kernel/src/common/tile-geometry.ts";
import { DATA_W, TRI_STRIDE } from "./space-layer.ts";
/** 图块池起步几片（内核 gl-room.ts 构造函数里的 min(64, maxSlices)；三维给的 maxSlices 按额度算、总是 ≥ 64）。内核改了这个数，probe-paint-open-memory 逐字节对不上会红。 */
export const TILE_ARENA_START_SLICES = 64;
/** 画哪些面（面表 / 三角形表跟着它）：面数、三角形数（网格体的面 = 一圈 v 个点 → v − 2 个三角形）。不给 = 一张面一个三角形（表的最小那一份）。 */
export interface PaintTargetSize { readonly faces: number; readonly tris: number }
export interface OpenMemory {
  readonly display: number; readonly kernel: number; readonly cells: number;
  /**
   * 内核的显卡图块池：起步那一份 / 第一笔之后（画的时候的工作集：两层画布那么多图块）/ 上沿（存盘或画板睡前那一次整张合成：两层的图块 + 带底色的整张段的
   * 拷贝目标（全画布那么多格，内核 frame-demand.ts）同时驻留 = 三层画布那么多；施工单十九第 3 刀量出来的：2048 见方长到 256 片 = 64 MB，1024 及以下起步那 64 片装得下）。
   */
  readonly arena: number; readonly arenaAfterStroke: number; readonly arenaPeak: number;
  /** 每张图层一张索引小图（新开的画两张）+ 内核的 1 × 1 填色图。 */
  readonly index: number;
  /** 面表 + 三角形表（跟物件走）。 */
  readonly tables: number;
  /** 打开、画过一笔、存过一次以后一直占着的上沿（显示图 + 内核四张 + 图块池的上沿 + 每格的表 + 面表三角形表 + 索引小图）。还没落笔时少两张、图块池是起步那份（opened）。 */
  readonly fixed: number;
  /** 刚开始画、还没落笔时占着的。 */
  readonly opened: number;
  /** 一笔正在画的时候另外再多的（两张薄层）。 */
  readonly stroke: number;
}
const dataBytes = (values: number): number => DATA_W * Math.max(1, Math.ceil(values / DATA_W)) * 4;
/** n × hgt（缺 = 见方；补面加高过的画布比宽高，施工单十六的画布小窗按实际宽高报）；target = 画哪些面（缺 = 最小那一份）。 */
export function openMemory(n: number, hgt = n, target: PaintTargetSize = { faces: 1, tris: 1 }): OpenMemory {
  let display = 0;
  for (let w = n, h = hgt; ; w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) { display += w * h * 4; if (w === 1 && h === 1) break; }
  const one = n * hgt * 4, kernel = 4 * one, cells = n * hgt * 8, slice = TILE_SIZE * TILE_SIZE * 4;
  const tiles = Math.ceil(n / TILE_SIZE) * Math.ceil(hgt / TILE_SIZE);
  const arena = TILE_ARENA_START_SLICES * slice;
  let after = TILE_ARENA_START_SLICES; while (after < 2 * tiles) after *= 2;
  let peak = after; while (peak < 3 * tiles) peak *= 2;   // 整张合成那一次（存盘 / 画板睡前）：在第一笔之后那份上按两倍长到装得下三层画布的图块
  const arenaAfterStroke = after * slice, arenaPeak = peak * slice, index = 2 * tiles * 4 + 4, tables = dataBytes(2 * target.faces) + dataBytes(TRI_STRIDE * target.tris);
  const common = display + cells + tables + index;
  return { display, kernel, cells, arena, arenaAfterStroke, arenaPeak, index, tables, fixed: common + kernel + arenaPeak, opened: common + 2 * one + arena, stroke: 2 * one };
}
/** 网格体上这几张面的大小（面表 / 三角形表跟着它）。 */
export function paintTargetSize(k: { faceVerts(f: number): readonly number[] }, faces: Iterable<number>): PaintTargetSize {
  let n = 0, tris = 0;
  for (const f of faces) { n++; tris += Math.max(1, k.faceVerts(f).length - 2); }
  return { faces: Math.max(1, n), tris: Math.max(1, tris) };
}
export function bytesSay(n: number): string { return n >= 1 << 20 ? `${Number((n / (1 << 20)).toFixed(n >= 10 << 20 ? 0 : 1))} MB` : `${Math.max(1, Math.round(n / 1024))} KB`; }
