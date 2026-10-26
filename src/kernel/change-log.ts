// change-log.ts —— 内核改动日志（纪元账本 DT96，2026-10-26 Claude Opus 5.5；user「做，可以按照初中甚至高中需要的标准需要的算法的思路做」）。
// 只记编号、不改行为：每一次顶点 / 边 / 膜 / 边层 / 面层的变化追加一条（种类 + id）。消费方（渲染的池网格、以后的预演回滚）记下自己看到第几号，
// 下次问「从第 n 号起改过哪些」——只碰改过的那些，不扫全模型（WeebPaint「每次画只更新最少的图层」的 3D 版）。
// 不知道的时候说不知道：装载（fromBrep）/ 日志截断之前的号 → since() 返回 null = 消费方全量重建。
// 记账的口子尽量少、尽量在底层：顶点表 / 边表 / 膜表 / 层的集合都换成带记账的 Map / Set（谁从哪里增删都记得到）；
// 只有原地改坐标 / 改端点 / 原地改环的几处显式记（topology.ts relocate*、mergeVertex，settle 溶解时的 spliceRing）。
//
// 族谱（同日改；user「JS记录过于肥大……最好都是像numpy数组一样」）：拷贝（Kernel.clone）的日志 fork 自原件，
// 只记「祖先那几份日志的**数据**（LogData）+ 分叉那一号」，最多 16 代——不引用内核、不引用祖先自己的族谱表，所以一个副本最多拽住 16 张小数组。
// 以前用 WeakRef 指着上一份内核：WeakRef 的目标至少活到当前这段同步代码跑完，导入修复一口气拷几百份内核 = 全都放不掉
// （炮塔零件按厘米导入峰值 770 MB，让出一次事件循环降到 33 MB；本机压测量到的）。

export const LOG_V = 0, LOG_E = 1, LOG_F = 2;

export interface ChangeSet { readonly verts: Set<number>; readonly edges: Set<number>; readonly faces: Set<number>; }

/** 日志太长就丢掉前一半（消费方每帧都同步，用不到很老的号；问到丢掉的 = 全量重建）。量纲：条。 */
const MAX_ENTRIES = 1 << 16;
/** 族谱最多记几代（渲染找共同祖先只看这么深；撤销快照 → 原件通常 2–3 代）。 */
const MAX_DEPTH = 16;
/** id × 4 + 种类要装进 int32。 */
const MAX_ID = 1 << 29;

/** 一份日志的记录本体：一张挤紧的 Int32Array（每条 = id × 4 + 种类，4 字节），只有数字。族谱里的后代只拽住它。 */
export class LogData {
  private buf = new Int32Array(64);
  private n = 0;
  /** buf[0] 的号。 */
  private base: number;
  /** 早于它的改动不知道。 */
  private floor: number;
  /** 这份日志从第几号开始记（= 从祖先分出来的那一号）。 */
  readonly start: number;
  constructor(start: number) { this.base = this.floor = this.start = start; }
  get seq(): number { return this.base + this.n; }
  push(kind: number, id: number): void {
    if (id < 0 || id >= MAX_ID) { this.invalidate(); return; }   // 装不下的 id：之前的一律不知道（不会出现；守着）
    if (this.n === this.buf.length) {
      if (this.n >= MAX_ENTRIES) {
        const drop = this.n >> 1;
        this.buf.copyWithin(0, drop, this.n); this.n -= drop;
        this.base += drop; this.floor = Math.max(this.floor, this.base);
      } else { const b = new Int32Array(this.buf.length * 2); b.set(this.buf); this.buf = b; }
    }
    this.buf[this.n++] = id * 4 + kind;
  }
  invalidate(): void { this.base = this.floor = this.seq; this.n = 0; this.buf = new Int32Array(64); }
  /** [from, to) 之间改过的编号；from 早于还记得的 → null（全量重建）。 */
  since(from: number, to = this.seq): ChangeSet | null {
    if (from < this.floor) return null;
    const out: ChangeSet = { verts: new Set(), edges: new Set(), faces: new Set() };
    const a = Math.max(0, from - this.base), b = Math.min(this.n, to - this.base);
    for (let i = a; i < b; i++) { const x = this.buf[i], k = x & 3, id = x >> 2; (k === LOG_V ? out.verts : k === LOG_E ? out.edges : out.faces).add(id); }
    return out;
  }
}

/** 族谱里的一格：哪份日志数据 + 到第几号（本身 = 现在；祖先 = 分叉那一号）。 */
export interface Lineage { readonly data: LogData; readonly seq: number; }

export class ChangeLog {
  readonly data: LogData;
  private anc: readonly Lineage[];
  /** parent = 从谁拷来的（clone）：从它现在的号起记，族谱 = [它, 它的祖先…]（最多 MAX_DEPTH 代）。 */
  constructor(start = 0, parent: ChangeLog | null = null) {
    this.data = new LogData(parent ? parent.seq : start);
    this.anc = parent ? [{ data: parent.data, seq: parent.seq }, ...parent.anc].slice(0, MAX_DEPTH) : [];
  }
  /** 拷贝用：一份从现在的号起记、祖先是自己的新日志。 */
  fork(): ChangeLog { return new ChangeLog(0, this); }
  /** 下一条会拿到的号 = 到目前为止的「版本」。 */
  get seq(): number { return this.data.seq; }
  /** 这份日志从第几号起记（拷贝 = 拷的那一刻）。 */
  get start(): number { return this.data.start; }
  /** 族谱：[自己到现在, 父亲到分叉那号, 祖父…]。 */
  lineage(): Lineage[] { return [{ data: this.data, seq: this.seq }, ...this.anc]; }
  touch(kind: number, id: number): void { this.data.push(kind, id); }
  v(id: number): void { this.touch(LOG_V, id); }
  e(id: number): void { this.touch(LOG_E, id); }
  f(id: number): void { this.touch(LOG_F, id); }
  /** 整批换掉（装载 / 整体重建）：之前的号一律「不知道」，族谱也断。 */
  invalidate(): void { this.data.invalidate(); this.anc = []; }
  /** [from, to) 之间改过的编号；from 早于还记得的 → null（全量重建）。to 缺 = 到现在。 */
  since(from: number, to = this.seq): ChangeSet | null { return this.data.since(from, to); }
}

/** 带记账的 Set（层的边集）：真改了才记（add 了原来没有的 / delete 了原来有的）。 */
export class LoggedSet<T extends number> extends Set<T> {
  private readonly onTouch: (id: T) => void;
  constructor(onTouch: (id: T) => void, init?: Iterable<T>) { super(); this.onTouch = onTouch; if (init) for (const x of init) super.add(x); }
  override add(v: T): this { if (!this.has(v)) { super.add(v); this.onTouch(v); } return this; }
  override delete(v: T): boolean { const r = super.delete(v); if (r) this.onTouch(v); return r; }
  override clear(): void { const all = [...this]; super.clear(); for (const v of all) this.onTouch(v); }
}
/** 带记账的 Map（顶点表 / 边表 / 膜表 / 面层）：set / delete 都记（set 同一个键 = 改了它）。 */
export class LoggedMap<K extends number, V> extends Map<K, V> {
  private readonly onTouch: (id: K) => void;
  constructor(onTouch: (id: K) => void, init?: Iterable<readonly [K, V]>) { super(); this.onTouch = onTouch; if (init) for (const [k, v] of init) super.set(k, v); }
  override set(k: K, v: V): this { super.set(k, v); this.onTouch(k); return this; }
  override delete(k: K): boolean { const r = super.delete(k); if (r) this.onTouch(k); return r; }
  override clear(): void { const all = [...this.keys()]; super.clear(); for (const k of all) this.onTouch(k); }
}
