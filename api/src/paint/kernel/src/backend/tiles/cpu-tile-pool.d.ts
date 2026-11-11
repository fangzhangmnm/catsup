export type TileFormat = "rgba8" | "gray8" | "bit1";
export interface TileBBox {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface TileCodec {
    name: string;
    compress(bytes: Uint8Array): Uint8Array;
    decompress(bytes: Uint8Array, byteLength: number): Uint8Array;
}
export declare function bytesPerTile(format: TileFormat, tileSize: number): number;
interface TileRecord {
    id: number;
    format: TileFormat;
    raw: Uint8Array | null;
    clamped: Uint8ClampedArray | null;
    compressed: Uint8Array | null;
    bbox: TileBBox | null;
    refCount: number;
    freed: boolean;
}
export declare class TileHandle {
    private _rec;
    private _pool;
    private _alive;
    /** 池内部构造；外部只能通过 pool.createTile/allocate/acquire 拿到。 */
    constructor(pool: CpuTilePool, rec: TileRecord);
    get id(): number;
    get format(): TileFormat;
    private _assertAlive;
    /** refcount++，返回**新句柄**（per-owner：谁 acquire 谁 release，UAF 可归责到人）。 */
    acquire(): TileHandle;
    release(): void;
    /** 零拷贝原始字节视图。压缩态同步解压回填。**只读**（红线，见文件头）。 */
    bytes(): Uint8Array;
    /** 同 buffer 的 Uint8ClampedArray 视图（ImageData/Canvas2D 迁移期路径）。同样只读。 */
    clampedView(): Uint8ClampedArray;
    bbox(): TileBBox | null;
    isCompressed(): boolean;
    compressedByteLength(): number;
    refCount(): number;
    get released(): boolean;
}
export declare class CpuTilePool {
    readonly tileSize: number;
    private _rawQuotaBytes;
    private _codec;
    private _onLeak;
    private _records;
    private _nextId;
    private _rawBytes;
    private _compressedBytes;
    private _leakRegistry;
    /** 进程里所有池一共报过几次泄漏（只计数，app 不读）：测试的泄漏门看它——套件中途 GC 报的那些走 app 的上报口只打一行日志，以前不红（家族周账 F-190）。 */
    static leaksSeen: number;
    private _leakTokens;
    constructor(opts: {
        tileSize: number;
        rawQuotaBytes: number;
        codec?: TileCodec | null;
        onLeak?: (info: string) => void;
    });
    /**
     * 收养 adoptBytes（**转移所有权**，调用方之后不得再写/持有），封成只读 tile，返回持有句柄。
     * knownBBox：调用方已算过 bbox 时直通（省一次全 tile 扫描；LayerPixels 写路径用）。
     */
    createTile(format: TileFormat, adoptBytes: Uint8Array, knownBBox?: TileBBox | null): TileHandle;
    /**
     * 零拷贝 GPU 对接：allocate() 给出可写 buffer（readPixels 直接填），
     * 填完 seal() 转不可变句柄；不要了 abort()。seal/abort 前 buffer 不算 tile。
     */
    allocate(format: TileFormat): {
        buffer: Uint8Array;
        seal(): TileHandle;
        abort(): void;
    };
    /**
     * 压缩/瘦身循环体（最古老优先；background-sync-jobs 按 budget 切片调用）。
     * 一次处理若干 tile：已压缩还留 raw 的 → 丢 raw（零成本）；纯 raw 的 → codec 压缩后丢 raw。
     * 返回 "more" = 还有活（预算内没干完），"done" = 当前无可压。
     */
    compactOldest(budgetMs: number): "done" | "more";
    /** 手动全量 compact（保存/切后台/内存压力时 app 酌情调用；同步阻塞）。 */
    compactAll(): void;
    forEachLiveId(cb: (id: number) => void): void;
    stats(): {
        rawBytes: number;
        compressedBytes: number;
        count: number;
        rawQuotaBytes: number;
    };
    setRawQuotaBytes(n: number): void;
    /** codec 热接（S3 boot 顺序解耦用）。tile 只读 → 换 codec 只影响之后的压缩/解压。 */
    setCodec(codec: TileCodec | null): void;
    /** 开新文档 / reload：清空整池。所有存活句柄立即失效（再用即 throw）。 */
    clearAll(): void;
    _materialize(rec: TileRecord): Uint8Array;
    _releaseRecord(rec: TileRecord): void;
    _registerLeakWatch(h: TileHandle, id: number): void;
    _unregisterLeakWatch(h: TileHandle): void;
    private _compactRecord;
    private _enforceRawQuotaBlocking;
}
export declare function computeBBox(format: TileFormat, bytes: Uint8Array, tileSize: number): TileBBox | null;
export {};
