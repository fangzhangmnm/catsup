// mesh/free-ids.ts —— 空出来的编号：每次取最小的那个（小顶堆）。属性地基轮之后的快慢补丁（统筹 11-13，规程第九½节末）。created 2026-11-13 by Claude Opus 5.5
// 以前是一个从大到小排好的数组，放回一个就整张重排、取最后一个（= 最小）。分到的编号和以前逐位一样（取的永远是集合里最小的那个；以前也从不在没排好时取），
// 只是放回不用整张重排：成批删（对称化、删面、整理）从随元素数平方涨变成 n log n。
// 堆里的摆法不唯一：要比两份空位表，按集合比（sorted()），不逐位比 items。
export class FreeIds {
  private h: number[];
  private constructor(h: number[]) { this.h = h; }
  static empty(): FreeIds { return new FreeIds([]); }
  get length(): number { return this.h.length; }
  /** 放回一个空出来的编号。 */
  push(x: number): void {
    const h = this.h; let i = h.length; h.push(x);
    while (i > 0) { const p = (i - 1) >> 1; if (h[p] <= x) break; h[i] = h[p]; i = p; }
    h[i] = x;
  }
  /** 取走最小的那个（空 = undefined）。 */
  pop(): number | undefined {
    const h = this.h; if (!h.length) return undefined;
    const top = h[0], last = h.pop()!;
    if (h.length) {
      let i = 0; const n = h.length;
      for (;;) { const l = 2 * i + 1, r = l + 1; let c = i, cv = last;
        if (l < n && h[l] < cv) { c = l; cv = h[l]; }
        if (r < n && h[r] < cv) { c = r; cv = h[r]; }
        if (c === i) break; h[i] = h[c]; i = c; }
      h[i] = last;
    }
    return top;
  }
  clone(): FreeIds { return new FreeIds(this.h.slice()); }
  /** 从小到大（比集合、调试用）。 */
  sorted(): number[] { return [...this.h].sort((a, b) => a - b); }
}
