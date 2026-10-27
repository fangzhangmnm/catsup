// kernel/id-table.ts —— 内核表的数组制度（Fable 账单 O3；user 10-27「如果map难的话，要不要直接一口气做成数组制度的？」）。created 2026-10-27 by Claude Fable 5.1
// 内核里按 id 存东西的表（顶点 / 边 / 膜 / 平面 / 曲线 / 边层 / 面层 / 顶点的星）以前是 Map / Set：遍历顺序 = 插入顺序 = 和增删历史绑死——
// 删了再插回同一个 id 会挪到表尾，于是「退回到拷贝时的样子」做不到逐字相同（拖动预演设计稿 (R2)），结算机铸膜的顺序、环追踪的起点也跟着历史走。
// 这里换成**按 id 下标的表**：get / set / has / delete O(1)；遍历永远按 id 升序，和历史无关；id 单调不复用，所以表只长不缩，clone = 一次 slice。
// 两个类都长成 Map<number, V> / Set<number> 的样子（结构上满足 es2022 的接口），调用方一行不改；可选的 onTouch = 改动日志（原来 LoggedMap / LoggedSet 的活）。

/** 稀疏数组表：下标 = id。values 不能是 undefined（内核里的记录都是对象 / 数字）。 */
export class IdMap<V> implements Map<number, V> {
  private items: (V | undefined)[] = [];
  private n = 0;
  private readonly onTouch: ((id: number) => void) | undefined;
  readonly [Symbol.toStringTag] = "IdMap";
  constructor(onTouch?: (id: number) => void, init?: Iterable<readonly [number, V]>) {
    this.onTouch = onTouch;
    if (init) for (const [k, v] of init) { if (this.items[k] === undefined) this.n++; this.items[k] = v; }
  }
  get size(): number { return this.n; }
  get(k: number): V | undefined { return this.items[k]; }
  has(k: number): boolean { return this.items[k] !== undefined; }
  set(k: number, v: V): this {
    if (v === undefined) throw new Error("IdMap: value must not be undefined");
    if (this.items[k] === undefined) this.n++;
    this.items[k] = v;
    this.onTouch?.(k);
    return this;
  }
  delete(k: number): boolean {
    if (this.items[k] === undefined) return false;
    this.items[k] = undefined; this.n--;
    this.onTouch?.(k);
    return true;
  }
  clear(): void {
    const all = [...this.keys()];
    this.items = []; this.n = 0;
    if (this.onTouch) for (const k of all) this.onTouch(k);
  }
  *keys(): Generator<number, undefined, unknown> { const a = this.items; for (let i = 0; i < a.length; i++) if (a[i] !== undefined) yield i; }
  *values(): Generator<V, undefined, unknown> { const a = this.items; for (let i = 0; i < a.length; i++) { const v = a[i]; if (v !== undefined) yield v; } }
  *entries(): Generator<[number, V], undefined, unknown> { const a = this.items; for (let i = 0; i < a.length; i++) { const v = a[i]; if (v !== undefined) yield [i, v]; } }
  [Symbol.iterator](): Generator<[number, V], undefined, unknown> { return this.entries(); }
  forEach(cb: (value: V, key: number, map: Map<number, V>) => void, thisArg?: unknown): void { for (const [k, v] of this.entries()) cb.call(thisArg, v, k, this); }
  /** 最大的 id + 1（表的长度；遍历成本随它涨，不随活的个数）。 */
  get capacity(): number { return this.items.length; }
}

/** 有序小集合：升序数组 + 二分；末尾追加 O(1)（id 单调时的常态），中间插 O(n)。遍历用快照（删着遍历不会跳元素）。 */
export class IdSet implements Set<number> {
  private a: number[] = [];
  private readonly onTouch: ((id: number) => void) | undefined;
  readonly [Symbol.toStringTag] = "IdSet";
  constructor(init?: Iterable<number>, onTouch?: (id: number) => void) {
    this.onTouch = onTouch;
    if (init) for (const x of init) this.insert(x);
  }
  get size(): number { return this.a.length; }
  private lower(x: number): number { let lo = 0, hi = this.a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (this.a[m] < x) lo = m + 1; else hi = m; } return lo; }
  private insert(x: number): boolean {
    const a = this.a;
    if (!a.length || x > a[a.length - 1]) { a.push(x); return true; }
    const i = this.lower(x);
    if (a[i] === x) return false;
    a.splice(i, 0, x);
    return true;
  }
  has(x: number): boolean { const a = this.a; if (!a.length || x > a[a.length - 1] || x < a[0]) return false; return a[this.lower(x)] === x; }
  add(x: number): this { if (this.insert(x)) this.onTouch?.(x); return this; }
  delete(x: number): boolean {
    const a = this.a;
    if (!a.length || x > a[a.length - 1] || x < a[0]) return false;
    const i = this.lower(x);
    if (a[i] !== x) return false;
    a.splice(i, 1);
    this.onTouch?.(x);
    return true;
  }
  clear(): void { const all = this.a; this.a = []; if (this.onTouch) for (const x of all) this.onTouch(x); }
  values(): Generator<number, undefined, unknown> { return (function* (snap: readonly number[]): Generator<number, undefined, unknown> { for (const x of snap) yield x; })(this.a.slice()); }
  keys(): Generator<number, undefined, unknown> { return this.values(); }
  *entries(): Generator<[number, number], undefined, unknown> { for (const x of this.a.slice()) yield [x, x]; }
  [Symbol.iterator](): Generator<number, undefined, unknown> { return this.values(); }
  forEach(cb: (value: number, value2: number, set: Set<number>) => void, thisArg?: unknown): void { for (const x of this.a.slice()) cb.call(thisArg, x, x, this); }
  /** 只读视图（不拷）：热路径按下标扫。 */
  get sorted(): readonly number[] { return this.a; }
}
