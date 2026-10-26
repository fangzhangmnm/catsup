// change-log.ts —— 内核改动日志（纪元账本 DT96，2026-10-26 Claude Opus 5.5；user「做，可以按照初中甚至高中需要的标准需要的算法的思路做」）。
// 只记编号、不改行为：每一次顶点 / 边 / 膜 / 边层 / 面层的变化追加一条（种类 + id）。消费方（渲染的池网格、以后的预演回滚）记下自己看到第几号，
// 下次问「从第 n 号起改过哪些」——只碰改过的那些，不扫全模型（WeebPaint「每次画只更新最少的图层」的 3D 版）。
// 不知道的时候说不知道：装载（fromBrep）/ 日志截断之前的号 → since() 返回 null = 消费方全量重建。
// 记账的口子尽量少、尽量在底层：顶点表 / 边表 / 膜表 / 层的集合都换成带记账的 Map / Set（谁从哪里增删都记得到）；
// 只有原地改坐标 / 改端点 / 原地改环的几处显式记（topology.ts relocate*、mergeVertex，settle 溶解时的 spliceRing）。

export const LOG_V = 0, LOG_E = 1, LOG_F = 2;

export interface ChangeSet { readonly verts: Set<number>; readonly edges: Set<number>; readonly faces: Set<number>; }

/** 日志太长就丢掉前一半（消费方每帧都同步，用不到很老的号；问到丢掉的 = 全量重建）。 */
const MAX_ENTRIES = 1 << 20;

export class ChangeLog {
  private kinds: number[] = [];
  private ids: number[] = [];
  /** kinds[0] 的号。 */
  private base: number;
  /** 早于它的改动不知道。 */
  private floor: number;
  constructor(start = 0) { this.base = start; this.floor = start; }
  /** 下一条会拿到的号 = 到目前为止的「版本」。 */
  get seq(): number { return this.base + this.ids.length; }
  touch(kind: number, id: number): void {
    this.kinds.push(kind); this.ids.push(id);
    if (this.ids.length > MAX_ENTRIES) {
      const drop = this.ids.length >> 1;
      this.kinds.splice(0, drop); this.ids.splice(0, drop);
      this.base += drop; this.floor = Math.max(this.floor, this.base);
    }
  }
  v(id: number): void { this.touch(LOG_V, id); }
  e(id: number): void { this.touch(LOG_E, id); }
  f(id: number): void { this.touch(LOG_F, id); }
  /** 整批换掉（装载 / 整体重建）：之前的号一律「不知道」。 */
  invalidate(): void { this.kinds = []; this.ids = []; this.base = this.floor = this.seq; }
  /** [from, to) 之间改过的编号；from 早于还记得的 → null（全量重建）。to 缺 = 到现在。 */
  since(from: number, to = this.seq): ChangeSet | null {
    if (from < this.floor) return null;
    const out: ChangeSet = { verts: new Set(), edges: new Set(), faces: new Set() };
    const a = Math.max(0, from - this.base), b = Math.min(this.ids.length, to - this.base);
    for (let i = a; i < b; i++) { const k = this.kinds[i], id = this.ids[i]; (k === LOG_V ? out.verts : k === LOG_E ? out.edges : out.faces).add(id); }
    return out;
  }
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
