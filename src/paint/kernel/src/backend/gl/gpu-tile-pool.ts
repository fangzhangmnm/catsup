// gpu-tile-pool —— GPU tile 池（S7；spec: journal/20260721 Architecture.md :160-177）。
//
// 契约（与 cpu-tile-pool 对偶，但**永不承诺 pin**）：
//   - gpu tile = {id, slice}：id 全局单调**不复用**；slice 是 TEXTURE_2D_ARRAY 里的物理位。
//   - gpu tile 只是 render-tree 的**缓存**，随时可 evict/invalid；CPU 恒为 SSoT，丢了自愈重建。
//   - 用死 id 取 slice 立刻 throw（`slotOf`）；自愈判定走 `isAlive`（不 throw 的探测口）。
//   - **batch-only 创建**（无单个创建入口）；同一批内先分配的绝不为后分配的让位，且上一批
//     在下次 allocBatch 前受保护（spec:169）。
//   - 使用者注册 pin 回调（required/preferred 两档）。frameMaintain 每帧：evict 两档都不在的
//     孤儿；allocBatch 空间不够时先扔 preferred（LRU），required 不扔。
//   - **allocBatch 永不 grow**——容量增长只走 reserve()（帧首预检）：先删旧纹理 → flush →
//     新建更大（quota 内翻倍），**全部现存 id 作废**（不留 cpu tmp 防 RAM spike，spec:175；
//     CPU SSoT 兜底重传）。绘制中不建新 tile（commit 才建）→ 全量作废的感知成本可接受。
//   - 开新文档/reload/context-loss：clearAll()（context-loss 另加 backend.recreate）。
//
// 分层：GpuTilePool 纯记账（node 全测，fake backend）；真 GL 承载 = Gl2TileArena（C8 起归 Port
//   所有——多 tab 公共资源，port.createTileArena 造，结构上满足 GpuTileBackend）；
//   IndexTexture（tile 坐标→slice 的 R32F 小纹理，原 tile-index.ts 并入）是池的寻址伴侣——
//   合成 shader 按 doc 坐标查它拿 slice（-1=透明），再进 array 池采像素。

import { TILE_SIZE, tilesAcross, tilesDown } from "../../common/tile-geometry.ts";
import type { Gl2Port, Gl2Texture, PooledFBO } from "../../common/gl2-port.ts";

export const GPU_TILE_BYTES = TILE_SIZE * TILE_SIZE * 4;

// 池的 GL 承载面（fake backend 即 node 全测；真实现 = Gl2TileArena，Port 造）。
export interface GpuTileBackend {
  readonly capacity: number;                              // slices
  // 重建为 newCapacity 的全新空存储（先删旧 + flush 再建，防显存双峰）。旧内容全丢。
  recreate(newCapacity: number): void;
  uploadSlice(slice: number, pixels: Uint8Array): void;
  // 从 from 的颜色附件拷 (srcX,srcY) 起 w×h（≤256²）进 slice 左上（segment 缓存零
  //   readback 入池；doc 边缘 tile 不足 256 → 部分拷贝，slice 余下 texel 是旧值但永不被采样——
  //   sampleTiled 的 docPos < docSize 保证 local uv 不越进 padding）。
  copySlice(from: PooledFBO, slice: number, srcX: number, srcY: number, w: number, h: number): void;
}

export interface PinSets { required: Set<number>; preferred: Set<number> }

export class GpuTilePool {
  private _backend: GpuTileBackend;
  private _maxSlices: number;
  private _slot = new Map<number, number>();       // id → slice（在表=alive）
  private _sliceOwner: (number | null)[] = [];     // slice → id
  private _free: number[] = [];
  private _nextId = 1;
  private _frame = 0;
  private _lastUse = new Map<number, number>();    // id → 最近使用帧（preferred 驱逐的 LRU 依据）
  private _lastBatch = new Set<number>();          // 上一批（下次 allocBatch 前免驱逐，spec:169）
  private _pinProviders: (() => PinSets)[] = [];
  // 统计（HUD/测试）：evictions 含孤儿+压力驱逐；recreations = grow/context-loss 次数。
  readonly stats = { evictions: 0, recreations: 0, uploads: 0, copies: 0 };

  constructor(backend: GpuTileBackend, maxSlices: number) {
    this._backend = backend;
    this._maxSlices = Math.max(backend.capacity, maxSlices);
    this._initSlices(backend.capacity);
  }

  private _initSlices(capacity: number): void {
    this._sliceOwner = new Array(capacity).fill(null);
    this._free = [];
    for (let s = capacity - 1; s >= 0; s--) this._free.push(s);
  }

  get capacity(): number { return this._backend.capacity; }
  // 代号：每次 recreate（grow/context-loss/clearAll）+1。使用者缓存「我上次同步时的代」，
  //   代变了 = 手里全部 gpu id 已死，别走快路径。
  get generation(): number { return this.stats.recreations; }
  get maxSlices(): number { return this._maxSlices; }
  get allocatedCount(): number { return this._slot.size; }
  get committedBytes(): number { return this._backend.capacity * GPU_TILE_BYTES; }
  get quotaBytes(): number { return this._maxSlices * GPU_TILE_BYTES; }

  registerPinProvider(fn: () => PinSets): void { this._pinProviders.push(fn); }

  isAlive(id: number): boolean { return this._slot.has(id); }

  // 死 id 立刻 throw（leaky-GPU 红线，spec:163）。活 id 顺手记最近使用帧。
  slotOf(id: number): number {
    const s = this._slot.get(id);
    if (s === undefined) throw new Error(`GPU_TILE_DEAD:${id}`);
    this._lastUse.set(id, this._frame);
    return s;
  }

  // 帧首预检：保证容量 ≥ totalSlices（= 调用方算好的本帧工作集 tile 总数）。
  // 不够就在 quota 内 grow（翻倍且 ≥ 需求）。grow = recreate：**全部现存 id 作废**
  // （调用方在此之后重新 sync/校验）。放不下（到 quota 顶）→ false，调用方降级
  // （如：跳过 segment 缓存、只保 live 叶）。
  reserve(totalSlices: number): boolean {
    if (totalSlices <= this._backend.capacity) return true;
    if (totalSlices > this._maxSlices) return false;
    let cap = this._backend.capacity;
    while (cap < totalSlices) cap = Math.min(this._maxSlices, cap * 2);
    this._recreate(cap);
    return true;
  }

  private _recreate(cap: number): void {
    this._backend.recreate(cap);
    this.stats.recreations++;
    this._slot.clear();
    this._lastUse.clear();
    this._lastBatch.clear();
    this._initSlices(cap);
  }

  // context-loss / 开新文档：全部作废。keepCapacity=false（默认）时回落到当前容量重建
  //   （context-loss 后底层纹理本来就没了，必须 recreate；新文档同路径顺便归零）。
  clearAll(): void { this._recreate(this._backend.capacity); }

  // batch-only 分配。**不 grow**（grow 只在 reserve）；空间不够按 孤儿 → preferred(LRU) 驱逐，
  //   required / 本批 / 上一批 绝不动。还不够 → throw GPU_POOL_EXHAUSTED（调用方降级）。
  allocBatch(n: number): number[] {
    this._lastBatch.clear();                       // 新批开始，上一批保护解除
    if (n <= 0) return [];
    if (this._free.length < n) this._evictForSpace(n - this._free.length, this._lastBatch);
    if (this._free.length < n) throw new Error(`GPU_POOL_EXHAUSTED:need=${n},free=${this._free.length}`);
    const ids: number[] = [];
    for (let i = 0; i < n; i++) {
      const slice = this._free.pop()!;
      const id = this._nextId++;
      this._slot.set(id, slice);
      this._sliceOwner[slice] = id;
      this._lastUse.set(id, this._frame);
      this._lastBatch.add(id);
      ids.push(id);
    }
    return ids;
  }

  // 分配 + 上传一批 CPU tile 字节。返回 gpu id（与 items 对齐）。
  uploadBatch(items: { bytes: Uint8Array }[]): number[] {
    const ids = this.allocBatch(items.length);
    for (let i = 0; i < items.length; i++) {
      this._backend.uploadSlice(this._slot.get(ids[i])!, items[i].bytes);
      this.stats.uploads++;
    }
    return ids;
  }

  // 分配 + 从 src 的颜色附件拷一批区域（segment 缓存入池；边缘 tile 传 clamp 后的 w/h）。
  copyBatchFrom(src: PooledFBO, items: { srcX: number; srcY: number; w: number; h: number }[]): number[] {
    const ids = this.allocBatch(items.length);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      this._backend.copySlice(src, this._slot.get(ids[i])!, it.srcX, it.srcY, it.w, it.h);
      this.stats.copies++;
    }
    return ids;
  }

  evict(id: number): void {
    const slice = this._slot.get(id);
    if (slice === undefined) return;               // 已死，幂等
    this._slot.delete(id);
    this._lastUse.delete(id);
    this._sliceOwner[slice] = null;
    this._free.push(slice);
    this.stats.evictions++;
  }

  // 每帧维护（spec:174）：evict 两档 pin 都不在的孤儿（上一批除外）。帧计数 +1。
  frameMaintain(): void {
    this._frame++;
    const pins = this._collectPins();
    for (const id of [...this._slot.keys()]) {
      if (pins.required.has(id) || pins.preferred.has(id) || this._lastBatch.has(id)) continue;
      this.evict(id);
    }
  }

  private _collectPins(): PinSets {
    const required = new Set<number>();
    const preferred = new Set<number>();
    for (const fn of this._pinProviders) {
      const p = fn();
      for (const id of p.required) required.add(id);
      for (const id of p.preferred) preferred.add(id);
    }
    return { required, preferred };
  }

  // 压力驱逐：孤儿先走，然后 preferred 按 LRU；required/protected 绝不动。
  // **本帧不变式**：本帧（frameMaintain 之后）touch 过的 tile 不驱逐——它的 slice 可能已被
  //   某张 index 纹理引用，帧内易主 = 采到别人的像素（一帧视觉污染）。帧间驱逐无此问题
  //   （使用者每帧先 isAlive 校验再采）。
  private _evictForSpace(need: number, protectedIds: Set<number>): void {
    const pins = this._collectPins();
    const orphans: number[] = [];
    const preferred: number[] = [];
    for (const id of this._slot.keys()) {
      if (pins.required.has(id) || protectedIds.has(id) || this._lastBatch.has(id)) continue;
      if (this._lastUse.get(id) === this._frame) continue;   // 本帧用过 → 不动
      (pins.preferred.has(id) ? preferred : orphans).push(id);
    }
    preferred.sort((a, b) => (this._lastUse.get(a) ?? 0) - (this._lastUse.get(b) ?? 0));
    for (const id of [...orphans, ...preferred]) {
      if (need <= 0) return;
      this.evict(id);
      need--;
    }
  }
}

// ---- IndexTexture（原 tile-index.ts 并入）：某「源」（叶层/段）的 tile 坐标 → 池 slice ----
// R32F across×down；texelFetch 点采；-1=空=透明。整图极小，整传。

export class IndexTexture {
  private _port: Gl2Port;
  readonly tex: Gl2Texture;
  readonly across: number;
  readonly down: number;
  private _data: Float32Array;

  constructor(glctx: Gl2Port, docW: number, docH: number) {
    this._port = glctx;
    this.across = tilesAcross(docW);
    this.down = tilesDown(docH);
    this._data = new Float32Array(this.across * this.down).fill(-1);
    this.tex = glctx.createTexture();
    this._upload();
  }

  // 从 (tileKey → gpuId) 映射全量重建；slotOf 把 id 翻成 slice（死 id 在这以前就该被换掉）。
  rebuild(byKey: Map<number, number>, pool: GpuTilePool): void {
    this._data.fill(-1);
    byKey.forEach((gpuId, key) => { this._data[key] = pool.slotOf(gpuId); });
    this._upload();
  }

  // 直接置单格 slice（-1=清空）。测试构造/一次性合成用；常规路径走 rebuild。
  setSlice(tx: number, ty: number, slice: number): void {
    this._data[ty * this.across + tx] = slice;
    this._upload();
  }

  dispose(): void { this._port.deleteTexture(this.tex); }

  private _upload(): void {
    this._port.uploadTexture(this.tex, "r32f", this.across, this.down, this._data);
  }
}
