// dsu.ts —— 并查集（2026-10-26 Claude Opus 5.5，纪元账本 DT93）。
// 收拢四份抄写（render3 平滑法线 / format bake 平滑法线 / face-lifecycle 擦边并组 / solver 共线边链），它们都没做路径压缩：
// 光滑球全部膜一个平滑组 → 合并成一条长链 → 每次 find 走到底 = 平方级（1.2 万面的球，拖动时每帧重建几何 1.2 s）。
// 合并约定不变：a 的根挂到 b 的根下、两端都登记——代表是谁、keys() 的顺序都和旧抄写逐字相同，调用方按代表分组 / 取 id 的结果不变。

export class DisjointSet<T> {
  private parent = new Map<T, T>();

  /** 没登记过的元素自成一组（find 返回它自己），不登记。 */
  find(x: T): T {
    let r = x;
    for (let p = this.parent.get(r); p !== undefined && p !== r; p = this.parent.get(r)) r = p;
    for (let c = x; c !== r; ) { const n = this.parent.get(c)!; this.parent.set(c, r); c = n; }   // 路径压缩（只改值，不改 keys 顺序）
    return r;
  }
  union(a: T, b: T): void {
    if (!this.parent.has(a)) this.parent.set(a, a);
    if (!this.parent.has(b)) this.parent.set(b, b);
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
  has(x: T): boolean { return this.parent.has(x); }
  /** 登记过的元素，按第一次登记的顺序。 */
  keys(): IterableIterator<T> { return this.parent.keys(); }
  get size(): number { return this.parent.size; }
}
