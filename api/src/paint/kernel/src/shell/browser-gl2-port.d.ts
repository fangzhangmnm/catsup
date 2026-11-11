import type { Gl2Port, Gl2Caps, FBOPrec, PooledFBO, Gl2Texture, Gl2TileArena, Gl2DrawSpec, TexUploadFormat } from "../common/gl2-port.ts";
export declare class BrowserTileArena implements Gl2TileArena {
    readonly kind: "arena";
    readonly tileSize: number;
    private _gl;
    private _tex;
    private _capacity;
    private _disposed;
    private _onDisposed;
    /** 共用画面时：每次碰 GL 前把依赖的状态设回默认（BrowserGl2Port._ensureBase）；自己的 context = 不传。 */
    private _ensure;
    constructor(gl: WebGL2RenderingContext, tileSize: number, initialSlices: number, onDisposed?: () => void, ensureBase?: () => void);
    get capacity(): number;
    get texture(): WebGLTexture;
    private _aliveGuard;
    private _alloc;
    recreate(newCapacity: number): void;
    uploadSlice(slice: number, pixels: Uint8Array): void;
    copySlice(from: PooledFBO, slice: number, srcX: number, srcY: number, w: number, h: number): void;
    dispose(): void;
}
export declare class BrowserGl2Port implements Gl2Port {
    readonly canvas: HTMLCanvasElement | OffscreenCanvas;
    readonly gl: WebGL2RenderingContext;
    readonly caps: Gl2Caps;
    private _programs;
    private _programSrc;
    private _pending;
    private _pendingTimer;
    private _warmFailed;
    private _parallelExt;
    private _fboPool;
    private _quad;
    private _instVao;
    private _instBuf;
    private _ph2d;
    private _phArr;
    private _invalidated;
    private _lost;
    private _gen;
    /** 建在别人的画面上（fromContext）：每个碰 GL 的入口先 _ensureBase()。 */
    readonly shared: boolean;
    /** 建在宿主已有的 WebGL2 context 上（CatsUp = three 的画面）。context 的属性归宿主（不再要 alpha:false / preserveDrawingBuffer 这些）；
     *  本模块只往自己借的 FBO 里画，target = "screen" 时画进的是宿主的默认画面。丢失 / 恢复照旧听这张画布（宿主也在听，两边都 preventDefault，各自重建）。 */
    static fromContext(gl: WebGL2RenderingContext): BrowserGl2Port;
    constructor(canvas: HTMLCanvasElement | OffscreenCanvas, sharedGl?: WebGL2RenderingContext);
    get isLost(): boolean;
    get generation(): number;
    onInvalidated(cb: () => void): void;
    /**
     * 共用画面时把本模块依赖、却从不自己设的状态设回默认（自己的 context = 什么都不做）。
     * 逐条的来历（宿主 = three 会留下的）：深度测试 / 背面剔除（three 常开；方向还会被负缩放翻成 CW）/ 模板 / 多边形偏移 / alpha-to-coverage
     * （材质选项）——都会让本模块画进自己 FBO 的三角形被剔掉或写不进；颜色写（three 有 colorWrite:false 的材质）——关着连 clear 都没效果；
     * UNPACK_FLIP_Y（three 给贴图上传时按 texture.flipY 设、不复原）——WebGL2 里 texImage3D / texSubImage3D 收 typed array 时它必须是 false，否则 INVALID_OPERATION；
     * 其余 pixelStore（对齐、按行跳过、行长）和 PIXEL_PACK / UNPACK_BUFFER 绑定（three 的异步读回用 PBO）——上传 / 读回按默认值解释字节。
     * 本模块自己会设并复原的（目标、视口、裁剪框、混合、program、VAO、贴图单元）不在这里。
     * 本文件只上传字节数组（typed array / null），**不从页面元素（图片 / 画布 / 视频 / ImageBitmap）上传**，所以 UNPACK_COLORSPACE_CONVERSION_WEBGL
     * 不在单子里；哪天加了那种上传，这里要补它（守卫 test/gl-port-shared-guard.test.mjs：没有页面元素上传 + 碰 GL 的方法先归位）。
     */
    private _ensureBase;
    /** 壳侧（off-contract，backend 摸不到）：一张 FBO / 2D 纹理背后的 WebGLTexture。共用画面时宿主拿它当自己的贴图采样（不读回）。
     *  context 恢复后旧句柄作废：等 onInvalidated 之后重新合成、重新取。 */
    glTextureOf(src: PooledFBO | Gl2Texture): WebGLTexture;
    program(name: string, vert?: string, frag?: string): void;
    warmProgram(name: string, vert: string, frag: string): void;
    private _schedulePendingPoll;
    private _pollPending;
    private _meta;
    private _compile;
    private _startLink;
    private _finishLink;
    private _shader;
    fboPoolHas(w: number, h: number, prec: FBOPrec): boolean;
    get fboPoolBudgetBytes(): number;
    borrowFBO(w: number, h: number, prec?: FBOPrec): PooledFBO;
    returnFBO(f: PooledFBO): void;
    private _fboBytes;
    private _poolBytes;
    get fboPoolStats(): {
        count: number;
        bytes: number;
    };
    clearPool(): void;
    clearFBO(f: PooledFBO, rgba: [number, number, number, number]): void;
    private _createFBO;
    private _quadVAO;
    private _instancedVAO;
    draw(spec: Gl2DrawSpec): void;
    drawInstanced(spec: Gl2DrawSpec, instances: Float32Array, count: number): void;
    private _drawCommon;
    private _setUniforms;
    private _bindTextures;
    private _resolve2d;
    private _placeholder2d;
    private _placeholderArr;
    readPixels(src: PooledFBO, x: number, y: number, w: number, h: number): Uint8Array;
    createTexture(): Gl2Texture;
    uploadTexture(tex: Gl2Texture, format: TexUploadFormat, w: number, h: number, data: ArrayBufferView): void;
    deleteTexture(tex: Gl2Texture): void;
    private _arenas;
    createTileArena(tileSize: number, initialSlices: number): Gl2TileArena;
    get arenaStats(): {
        count: number;
        bytes: number;
    };
    private _rebuildAfterRestore;
}
