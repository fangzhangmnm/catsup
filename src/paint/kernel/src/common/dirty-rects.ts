// dirty-rects —— 一帧里改到的地方记成「脏格子位图」：画布划成 DIRTY_CELL 见方的小格，报来的方框碰到的格标上；画的时候每行连着的脏格并成一段（行段）当几何。
// created 2026-11-11 by Claude Opus 5.5（CatsUp 贴图主线 1-4d 第 6 条：外来薄层报块 → 内核只在这些格里重合；三维的显示图 / 缩小图也按同一张位图只拷这些格）。
// 为什么是位图不是方框单子（统筹 11-11，user「也许需要不限块数？think critically」之后）：
//   · 天生两两不相交、不用合并到不动点（方框单子要并：斜着的一串小方框会连环并成大方框，那段逻辑也容易错）；
//   · 没有要调的块数上限：数量上界 = 格子总数，算这张图的时间随碰到的格数涨；
//   · 缩小图下一级的脏格 = 这张位图 2×2 或起来（half），直接可用；行段是纯粹的行程合并，不会出相交。
// 量出来（真模型 wip2021 两档 + 小红帽、跨片的长笔、每帧；CatsUp probe-paint-scale J 段）：8 格见方 = 每帧总面积中位 0.44–1.28%、第 90 百分位 1.1–4.4%，
//   行段中位 8–101、最多约 2000；16 格见方中位到 2.3%、第 90 百分位到 7%。所以取 8。总面积过半 = 这一帧整张（一张位图不如一次整张）。
// runs / half 只扫标过的行 / 列范围（v0.14.80）：花费随碰到的范围涨，不随画布涨（1024×4096 的画上每帧扫整张位图要 0.2–0.3 毫秒）。
// 纯逻辑、零依赖；内核（render-tree）和三维（显示图）用同一份。

export interface DirtyRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** 小格边长（像素 / 格；2 的幂）。 */
export const DIRTY_CELL = 8;
/** 总面积超过画布的这么多 = 整张。 */
export const RECT_FULL_FRACTION = 0.5;

/** 一张画布（w × h）上的脏格子位图。格子边长 cell（缩小图每一级都用同样的 cell：下一级的一格 = 这一级的 2×2 格）。 */
export class DirtyCells {
  readonly w: number; readonly h: number; readonly cell: number;
  readonly cols: number; readonly rows: number;
  private readonly bits: Uint8Array;
  private n = 0;
  /** 标过的格所在的行 / 列范围（runs / half 只扫这一块：花费随碰到的范围涨，不随画布涨）。 */
  private r0 = Infinity; private r1 = -1; private c0 = Infinity; private c1 = -1;
  constructor(w: number, h: number, cell = DIRTY_CELL) {
    if (!(w >= 1 && h >= 1 && cell >= 1 && Number.isInteger(w) && Number.isInteger(h) && Number.isInteger(cell))) throw new Error(`DirtyCells: bad size ${w}x${h} cell ${cell}`);
    this.w = w; this.h = h; this.cell = cell;
    this.cols = Math.ceil(w / cell); this.rows = Math.ceil(h / cell);
    this.bits = new Uint8Array(this.cols * this.rows);
  }
  /** 标上这个方框碰到的格（夹进画布；空的不标）。 */
  mark(x: number, y: number, w: number, h: number): void {
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y)), x1 = Math.min(this.w, Math.ceil(x + w)), y1 = Math.min(this.h, Math.ceil(y + h));
    if (x1 <= x0 || y1 <= y0) return;
    const c = this.cell, c0 = Math.floor(x0 / c), c1 = Math.floor((x1 - 1) / c), r0 = Math.floor(y0 / c), r1 = Math.floor((y1 - 1) / c);
    if (r0 < this.r0) this.r0 = r0; if (r1 > this.r1) this.r1 = r1; if (c0 < this.c0) this.c0 = c0; if (c1 > this.c1) this.c1 = c1;
    for (let r = r0; r <= r1; r++) {
      const row = r * this.cols;
      for (let k = c0; k <= c1; k++) if (!this.bits[row + k]) { this.bits[row + k] = 1; this.n++; }
    }
  }
  /** 标了几格。 */
  get count(): number { return this.n; }
  get empty(): boolean { return this.n === 0; }
  /** 脏格盖住的像素占画布多少（边上的格只算画布里的那部分）。 */
  fraction(): number {
    let px = 0;
    for (const r of this.runs()) px += r.w * r.h;
    return px / (this.w * this.h);
  }
  /** 每行连着的脏格并成一段（夹在画布里）：两两不相交，按行、再按 x 排。 */
  runs(): DirtyRect[] {
    const out: DirtyRect[] = [], c = this.cell, kEnd = this.c1 + 1;
    for (let r = this.r0; r <= this.r1; r++) {
      const row = r * this.cols, y = r * c, hh = Math.min(this.h, y + c) - y;
      let k = this.c0;
      while (k < kEnd) {
        if (!this.bits[row + k]) { k++; continue; }
        const start = k;
        while (k < kEnd && this.bits[row + k]) k++;
        const x = start * c;
        out.push({ x, y, w: Math.min(this.w, k * c) - x, h: hh });
      }
    }
    return out;
  }
  /** 下一级缩小图（w >> 1、h >> 1，至少 1）的脏格：这一级 2×2 格或起来（同样的 cell）。 */
  half(): DirtyCells {
    const nx = new DirtyCells(Math.max(1, this.w >> 1), Math.max(1, this.h >> 1), this.cell);
    for (let r = this.r0; r <= this.r1; r++) for (let k = this.c0; k <= this.c1; k++) {
      if (!this.bits[r * this.cols + k]) continue;
      const R = Math.min(nx.rows - 1, r >> 1), K = Math.min(nx.cols - 1, k >> 1), i = R * nx.cols + K;
      if (!nx.bits[i]) { nx.bits[i] = 1; nx.n++; if (R < nx.r0) nx.r0 = R; if (R > nx.r1) nx.r1 = R; if (K < nx.c0) nx.c0 = K; if (K > nx.c1) nx.c1 = K; }
    }
    return nx;
  }
}

/** 一帧报来的方框 → 行段（两两不相交），或 "full"（总面积过半）。空 = []。 */
export function dirtyRuns(input: readonly DirtyRect[], W: number, H: number): DirtyRect[] | "full" {
  const d = new DirtyCells(W, H);
  for (const r of input) d.mark(r.x, r.y, r.w, r.h);
  if (d.empty) return [];
  const runs = d.runs();
  let px = 0;
  for (const r of runs) px += r.w * r.h;
  return px > RECT_FULL_FRACTION * W * H ? "full" : runs;
}

/** 断言：单子两两不相交（只给测试和 debug 用；O(n²)）。 */
export function assertDisjoint(rects: readonly DirtyRect[]): void {
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) throw new Error(`DIRTY_RECTS_OVERLAP:${JSON.stringify(a)}~${JSON.stringify(b)}`);
  }
}
/** 行段的断言（线性）：按行、再按 x 排、同一行不重叠、行带不交错。内核画之前查（违反 = 抛，不悄悄画两遍）。 */
export function assertRuns(runs: readonly DirtyRect[]): void {
  for (let i = 1; i < runs.length; i++) {
    const a = runs[i - 1], b = runs[i];
    if (b.y === a.y) { if (b.h !== a.h || b.x < a.x + a.w) throw new Error(`DIRTY_RUNS_OVERLAP:${JSON.stringify(a)}~${JSON.stringify(b)}`); }
    else if (b.y < a.y + a.h) throw new Error(`DIRTY_RUNS_ROWS:${JSON.stringify(a)}~${JSON.stringify(b)}`);
  }
}
