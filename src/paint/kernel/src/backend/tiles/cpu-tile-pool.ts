// cpu-tile-pool —— 不可变、引用计数的 CPU tile 池（0.4 纪元底座，spec: journal/20260721 Architecture.md §cpu-tile-pool）。
//
// 契约（红线级）：
//   - tile 一经创建**只读**。bytes()/clampedView() 返回零拷贝视图，调用方**绝不能写**——
//     要改就合成新 bytes 走 createTile()/allocate()。undo/渲染缓存的正确性全押在这条上。
//   - CPU 是 SSoT：每个 tile 在池里以 raw 或 compressed 至少一种形态存在；GPU 侧永远只是缓存。
//   - 句柄显式 acquire()/release()（js 没有析构函数）。用已释放句柄立刻 throw。
//     FinalizationRegistry 只当泄漏 assert（onLeak 上报），**不当析构**。
//   - tileSize 注入 ctor（app 唯一定义在 tiles/tile-geometry.ts 的 TILE_SIZE）。
//   - 开新文档 / reload 必须 clearAll()。
//
// 压缩（协作方 tiles/cpu-tile-compression.ts，S3 接入）：
//   - codec 同步双向（compress/decompress 都是 sync）——bytes() 是同步读，解压不能 await；
//     「后台化」由 background-sync-jobs 按 budgetMs 切片调用 compactOldest() 实现，不靠异步 codec。
//   - 按创建顺序从最古老到最新压缩（tile 只读，所以任何 tile 随时可压）。
//   - raw 超 quota 时 createTile 阻塞式 compact（宁愿卡顿不愿 OOM）。
//   - 解压后 raw 缓存回池（可能被反复读，如 GPU 上传）；compressed 保留不重复劳动，
//     下次 compact 对「已压缩还留 raw」的 tile 直接丢 raw，零成本。

export type TileFormat = "rgba8" | "gray8" | "bit1";

// tile 内部坐标的内容包围盒，{x,y,w,h} 约定与全仓一致（对齐 tile-geometry 头注释）。
// null = 全透明 tile。全局 bbox = 对各 tile bbox（平移到 doc 坐标后）求 aabb。
export interface TileBBox { x: number; y: number; w: number; h: number }

// 同步双向 codec。compressed 里不含元数据（format/bbox 池里已记）；
// decompress 需要知道原长，由池传入。
export interface TileCodec {
  name: string;
  compress(bytes: Uint8Array): Uint8Array;
  decompress(bytes: Uint8Array, byteLength: number): Uint8Array;
}

export function bytesPerTile(format: TileFormat, tileSize: number): number {
  switch (format) {
    case "rgba8": return tileSize * tileSize * 4;
    case "gray8": return tileSize * tileSize;
    case "bit1":  return (tileSize * tileSize) >> 3;   // 行优先 bit-pack；tileSize 需为 8 的倍数
  }
}

interface TileRecord {
  id: number;
  format: TileFormat;
  raw: Uint8Array | null;              // null = 只剩压缩形态（读时同步解压回填）
  clamped: Uint8ClampedArray | null;   // raw 的同 buffer 视图缓存（Canvas2D 迁移期用）
  compressed: Uint8Array | null;
  bbox: TileBBox | null;
  refCount: number;
  freed: boolean;
}

export class TileHandle {
  private _rec: TileRecord;
  private _pool: CpuTilePool;
  private _alive = true;

  /** 池内部构造；外部只能通过 pool.createTile/allocate/acquire 拿到。 */
  constructor(pool: CpuTilePool, rec: TileRecord) {
    this._pool = pool;
    this._rec = rec;
    pool._registerLeakWatch(this, rec.id);
  }

  get id(): number { return this._rec.id; }
  get format(): TileFormat { return this._rec.format; }

  private _assertAlive(): void {
    if (!this._alive) throw new Error(`TileHandle: use after release (tile#${this._rec.id})`);
    if (this._rec.freed) throw new Error(`TileHandle: tile#${this._rec.id} already freed (pool cleared?)`);
  }

  /** refcount++，返回**新句柄**（per-owner：谁 acquire 谁 release，UAF 可归责到人）。 */
  acquire(): TileHandle {
    this._assertAlive();
    this._rec.refCount++;
    return new TileHandle(this._pool, this._rec);
  }

  // release 只查双 release（_alive），不查 rec.freed：clearAll 之后的迟到 release 是
  // 正常清理路径（undo history 清栈晚于池 clear），静默无事即可。
  release(): void {
    if (!this._alive) throw new Error(`TileHandle: double release (tile#${this._rec.id})`);
    this._alive = false;
    this._pool._unregisterLeakWatch(this);
    this._pool._releaseRecord(this._rec);
  }

  /** 零拷贝原始字节视图。压缩态同步解压回填。**只读**（红线，见文件头）。 */
  bytes(): Uint8Array {
    this._assertAlive();
    return this._pool._materialize(this._rec);
  }

  /** 同 buffer 的 Uint8ClampedArray 视图（ImageData/Canvas2D 迁移期路径）。同样只读。 */
  clampedView(): Uint8ClampedArray {
    this._assertAlive();
    const rec = this._rec;
    this._pool._materialize(rec);
    if (!rec.clamped) rec.clamped = new Uint8ClampedArray(rec.raw!.buffer, rec.raw!.byteOffset, rec.raw!.byteLength);
    return rec.clamped;
  }

  bbox(): TileBBox | null { this._assertAlive(); return this._rec.bbox; }
  isCompressed(): boolean { this._assertAlive(); return this._rec.raw === null && this._rec.compressed !== null; }
  compressedByteLength(): number { this._assertAlive(); return this._rec.compressed ? this._rec.compressed.byteLength : 0; }
  refCount(): number { this._assertAlive(); return this._rec.refCount; }
  get released(): boolean { return !this._alive; }
}

export class CpuTilePool {
  readonly tileSize: number;
  private _rawQuotaBytes: number;
  private _codec: TileCodec | null;
  private _onLeak: ((info: string) => void) | null;

  private _records = new Map<number, TileRecord>();
  private _nextId = 1;
  private _rawBytes = 0;
  private _compressedBytes = 0;

  // 泄漏 assert：句柄没 release 就被 GC = 某处拿了 tile 忘了放（refCount 永久虚高）。
  // 只上报，不代行 release（FR 时机不可靠，不能当析构）。
  private _leakRegistry: FinalizationRegistry<number> | null;
  /** 进程里所有池一共报过几次泄漏（只计数，app 不读）：测试的泄漏门看它——套件中途 GC 报的那些走 app 的上报口只打一行日志，以前不红（家族周账 F-190）。 */
  static leaksSeen = 0;
  private _leakTokens = new WeakMap<TileHandle, object>();

  constructor(opts: {
    tileSize: number;
    rawQuotaBytes: number;
    codec?: TileCodec | null;
    onLeak?: (info: string) => void;
  }) {
    this.tileSize = opts.tileSize;
    this._rawQuotaBytes = opts.rawQuotaBytes;
    this._codec = opts.codec ?? null;
    this._onLeak = opts.onLeak ?? null;
    this._leakRegistry = typeof FinalizationRegistry === "function"
      ? new FinalizationRegistry((id: number) => {
          if (this._records.has(id)) { CpuTilePool.leaksSeen++; this._onLeak?.(`TileHandle for tile#${id} GC'd without release() — refCount leaked`); }
        })
      : null;
  }

  /**
   * 收养 adoptBytes（**转移所有权**，调用方之后不得再写/持有），封成只读 tile，返回持有句柄。
   * knownBBox：调用方已算过 bbox 时直通（省一次全 tile 扫描；LayerPixels 写路径用）。
   */
  createTile(format: TileFormat, adoptBytes: Uint8Array, knownBBox?: TileBBox | null): TileHandle {
    const expect = bytesPerTile(format, this.tileSize);
    if (adoptBytes.byteLength !== expect) {
      throw new Error(`CpuTilePool.createTile: ${format} expects ${expect} bytes, got ${adoptBytes.byteLength}`);
    }
    const rec: TileRecord = {
      id: this._nextId++,
      format,
      raw: adoptBytes,
      clamped: null,
      compressed: null,
      bbox: knownBBox !== undefined ? knownBBox : computeBBox(format, adoptBytes, this.tileSize),
      refCount: 1,
      freed: false,
    };
    this._records.set(rec.id, rec);
    this._rawBytes += expect;
    this._enforceRawQuotaBlocking();
    return new TileHandle(this, rec);
  }

  /**
   * 零拷贝 GPU 对接：allocate() 给出可写 buffer（readPixels 直接填），
   * 填完 seal() 转不可变句柄；不要了 abort()。seal/abort 前 buffer 不算 tile。
   */
  allocate(format: TileFormat): { buffer: Uint8Array; seal(): TileHandle; abort(): void } {
    const buf = new Uint8Array(bytesPerTile(format, this.tileSize));
    let done = false;
    const pool = this;
    return {
      buffer: buf,
      seal(): TileHandle {
        if (done) throw new Error("CpuTilePool.allocate: seal/abort already called");
        done = true;
        return pool.createTile(format, buf);
      },
      abort(): void {
        if (done) throw new Error("CpuTilePool.allocate: seal/abort already called");
        done = true;
      },
    };
  }

  /**
   * 压缩/瘦身循环体（最古老优先；background-sync-jobs 按 budget 切片调用）。
   * 一次处理若干 tile：已压缩还留 raw 的 → 丢 raw（零成本）；纯 raw 的 → codec 压缩后丢 raw。
   * 返回 "more" = 还有活（预算内没干完），"done" = 当前无可压。
   */
  compactOldest(budgetMs: number): "done" | "more" {
    if (!this._codec) return "done";
    const t0 = now();
    for (const rec of this._records.values()) {          // Map 迭代序 = 插入序 = 创建序
      if (rec.raw === null) continue;                    // 已是纯压缩态
      if (now() - t0 > budgetMs) return "more";
      this._compactRecord(rec);
    }
    return "done";
  }

  /** 手动全量 compact（保存/切后台/内存压力时 app 酌情调用；同步阻塞）。 */
  compactAll(): void {
    if (!this._codec) return;
    for (const rec of this._records.values()) {
      if (rec.raw !== null) this._compactRecord(rec);
    }
  }

  forEachLiveId(cb: (id: number) => void): void {
    for (const id of this._records.keys()) cb(id);
  }

  stats(): { rawBytes: number; compressedBytes: number; count: number; rawQuotaBytes: number } {
    return { rawBytes: this._rawBytes, compressedBytes: this._compressedBytes, count: this._records.size, rawQuotaBytes: this._rawQuotaBytes };
  }

  setRawQuotaBytes(n: number): void {
    this._rawQuotaBytes = n;
    this._enforceRawQuotaBlocking();
  }

  /** codec 热接（S3 boot 顺序解耦用）。tile 只读 → 换 codec 只影响之后的压缩/解压。 */
  setCodec(codec: TileCodec | null): void {
    this._codec = codec;
  }

  /** 开新文档 / reload：清空整池。所有存活句柄立即失效（再用即 throw）。 */
  clearAll(): void {
    for (const rec of this._records.values()) rec.freed = true;
    this._records.clear();
    this._rawBytes = 0;
    this._compressedBytes = 0;
  }

  // ---- 内部（TileHandle 协作面；下划线开头，外部勿用） ----

  _materialize(rec: TileRecord): Uint8Array {
    if (rec.raw !== null) return rec.raw;
    if (!rec.compressed) throw new Error(`CpuTilePool: tile#${rec.id} has neither raw nor compressed bytes`);
    if (!this._codec) throw new Error(`CpuTilePool: tile#${rec.id} compressed but no codec to decompress`);
    const raw = this._codec.decompress(rec.compressed, bytesPerTile(rec.format, this.tileSize));
    rec.raw = raw;
    rec.clamped = null;
    this._rawBytes += raw.byteLength;                    // 回填计入 raw 池；超额留给下次 compact 收拾
    return raw;
  }

  _releaseRecord(rec: TileRecord): void {
    if (rec.freed) return;                               // clearAll 之后的迟到 release：无事可做
    rec.refCount--;
    if (rec.refCount > 0) return;
    if (rec.refCount < 0) throw new Error(`CpuTilePool: tile#${rec.id} refCount went negative`);
    rec.freed = true;
    this._records.delete(rec.id);
    if (rec.raw) this._rawBytes -= rec.raw.byteLength;
    if (rec.compressed) this._compressedBytes -= rec.compressed.byteLength;
    rec.raw = null; rec.clamped = null; rec.compressed = null;
  }

  _registerLeakWatch(h: TileHandle, id: number): void {
    if (!this._leakRegistry) return;
    const token = {};
    this._leakTokens.set(h, token);
    this._leakRegistry.register(h, id, token);
  }

  _unregisterLeakWatch(h: TileHandle): void {
    if (!this._leakRegistry) return;
    const token = this._leakTokens.get(h);
    if (token) this._leakRegistry.unregister(token);
  }

  private _compactRecord(rec: TileRecord): void {
    if (rec.compressed === null) {
      rec.compressed = this._codec!.compress(rec.raw!);
      this._compressedBytes += rec.compressed.byteLength;
    }
    this._rawBytes -= rec.raw!.byteLength;
    rec.raw = null;
    rec.clamped = null;
  }

  private _enforceRawQuotaBlocking(): void {
    if (!this._codec || this._rawBytes <= this._rawQuotaBytes) return;
    // 阻塞式：最古老优先压到 quota 之内（跳过没有 raw 的）。宁卡顿不 OOM（spec line 116）。
    for (const rec of this._records.values()) {
      if (this._rawBytes <= this._rawQuotaBytes) break;
      if (rec.raw !== null) this._compactRecord(rec);
    }
  }
}

// ---- 纯函数 ----

// 内容包围盒：非零即内容（rgba8 看 alpha 通道）。null = 全透明。
export function computeBBox(format: TileFormat, bytes: Uint8Array, tileSize: number): TileBBox | null {
  let minX = tileSize, minY = tileSize, maxX = -1, maxY = -1;
  if (format === "rgba8") {
    for (let y = 0; y < tileSize; y++) {
      const rowOff = y * tileSize * 4;
      for (let x = 0; x < tileSize; x++) {
        if (bytes[rowOff + x * 4 + 3] !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (maxY < y) maxY = y;
        }
      }
    }
  } else if (format === "gray8") {
    for (let y = 0; y < tileSize; y++) {
      const rowOff = y * tileSize;
      for (let x = 0; x < tileSize; x++) {
        if (bytes[rowOff + x] !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (maxY < y) maxY = y;
        }
      }
    }
  } else {
    const rowBytes = tileSize >> 3;
    for (let y = 0; y < tileSize; y++) {
      const rowOff = y * rowBytes;
      for (let b = 0; b < rowBytes; b++) {
        const v = bytes[rowOff + b];
        if (v === 0) continue;
        for (let bit = 0; bit < 8; bit++) {
          if (v & (0x80 >> bit)) {
            const x = (b << 3) + bit;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (maxY < y) maxY = y;
          }
        }
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
