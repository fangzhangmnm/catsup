// BrowserGl2Port —— Gl2Port 的真 WebGL2 实现体（壳侧；C1 落地，C8 动词面收编）。
// getContext 全仓唯一创建点在此（造 context 需要 DOM/OffscreenCanvas；用 gl 对象不需要）——
// WebGL2 quirk 一律不出壳（ADR-0009）。壳造好递入 backend，backend 只见 Gl2Port（无 `gl` 裸口）。
//
// 职责（窄接口后面藏掉的脏活）：
//   - 取 WebGL2 context（无则响亮失败，由 caller 给「需要 WebGL2」提示——不留 2D 回退）。
//   - 能力探测：max texture size / max array layers / float 颜色缓冲 / 纹理单元数。
//   - shader program 编译 + 缓存（按 name 复用）+ **uniform/sampler 反射**（getActiveUniform）：
//     draw 按名设 uniform（类型分派、mat3 row-major 自转置）、sampler 按声明序固定单元、
//     未提供的 sampler 绑占位纹理（未绑 sampler 默认落单元 0 与 sampler2DArray 类型冲突
//     = INVALID_OPERATION(0x502)——经典 quirk，收进实现体）。
//   - FBO 池：按尺寸借/还离屏渲染目标（合成 ping-pong / 笔刷 stroke FBO 复用）。
//   - draw/drawInstanced：每 draw 自带全部状态（target/viewport/clear/scissor/blend），画完还原。
//   - tile arena：TEXTURE_2D_ARRAY 仓（immutable storage；copySlice 零 readback 入池）。
//   - **context-loss 生命周期（结构自愈契约）**：listen lost(preventDefault)+restored(重编 program/
//     重建 FBO 池/generation++ → onInvalidated 广播 → backend 下帧从 CPU tile 池全量重传)。
//     iOS Safari/PWA 后台必丢 → 这是命门。
//
// 验证边界：本模块全是 gl.* 调用，node DOM-shim 下是 no-op → **node 测不了**，GL smoke
//   （Playwright + SwiftShader）+ 真机批验证。故刻意只放标准、可读、无分支魔法的 GL 样板。

import type {
  Gl2Port, Gl2Caps, FBOPrec, PooledFBO, Gl2Texture, Gl2TileArena,
  Gl2DrawSpec, Gl2TexSource, TexUploadFormat,
} from "../common/gl2-port.ts";

// FBO 池上界（防泄露）。count 主防"许多不同尺寸的一次性 FBO"（commit/warp 每笔一张）累积；
//   bytes 是兜底显存天花板。doc 尺寸热 FBO 每帧复用、是 MRU，不会被驱逐 → 不抖。
const FBO_POOL_MAX_COUNT = 48;
const FBO_POOL_BUDGET_BYTES = 384 * 1024 * 1024;

// 池化 FBO 的实现形（契约句柄 + 壳侧真 GL 对象）。
interface BrowserFBO extends PooledFBO {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
}

interface BrowserTexture extends Gl2Texture {
  tex: WebGLTexture;
}

// program 反射元数据（link 时一次；draw 按名分派）。
interface ProgMeta {
  prog: WebGLProgram;
  uniforms: Map<string, { loc: WebGLUniformLocation; type: number }>;
  samplers: { name: string; unit: number; type: number }[];   // type: SAMPLER_2D | SAMPLER_2D_ARRAY
}

export class BrowserTileArena implements Gl2TileArena {
  readonly kind = "arena" as const;
  readonly tileSize: number;
  private _gl: WebGL2RenderingContext;
  private _tex: WebGLTexture | null = null;
  private _capacity: number;
  private _disposed = false;
  private _onDisposed: (() => void) | null;

  constructor(gl: WebGL2RenderingContext, tileSize: number, initialSlices: number, onDisposed?: () => void) {
    this._gl = gl;
    this.tileSize = tileSize;
    this._capacity = initialSlices;
    this._onDisposed = onDisposed ?? null;
    this._alloc();
  }

  get capacity(): number { return this._capacity; }
  // 壳侧/smoke harness 读回用（off-contract：backend 只见 Gl2TileArena）。
  get texture(): WebGLTexture { return this._tex!; }

  // 退租后动词 = 响亮 throw（契约：用死租约是结构 bug——真 GL 里 bind null 纹理会静默 no-op，
  //   比 throw 危险得多，所以门口挡）。
  private _aliveGuard(): void {
    if (this._disposed) throw new Error("ARENA_DISPOSED (used after teardown — owner already disposed this arena)");
  }

  private _alloc(): void {
    const gl = this._gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("CREATE_ARRAY_TEX_FAILED");
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    // immutable storage：1 mip、RGBA8（straight——预乘概念不进 tile 存储，spec:246）。
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, this.tileSize, this.tileSize, this._capacity);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    this._tex = tex;
  }

  // 先删旧 → flush（催 GPU 真回收）→ 再建（防显存双峰，spec:175）。context-loss 后旧句柄已死，删除无害。
  recreate(newCapacity: number): void {
    this._aliveGuard();
    const gl = this._gl;
    if (this._tex) { try { gl.deleteTexture(this._tex); } catch { /* context 已丢，无害 */ } }
    gl.flush();
    this._capacity = newCapacity;
    this._alloc();
  }

  uploadSlice(slice: number, pixels: Uint8Array): void {
    this._aliveGuard();
    const gl = this._gl;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._tex);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, slice, this.tileSize, this.tileSize, 1,
      gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  }

  copySlice(from: PooledFBO, slice: number, srcX: number, srcY: number, w: number, h: number): void {
    this._aliveGuard();
    const gl = this._gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, (from as BrowserFBO).fbo);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._tex);
    gl.copyTexSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, slice, srcX, srcY, w, h);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  dispose(): void {
    if (this._disposed) return;   // 幂等
    this._disposed = true;
    if (this._tex) { this._gl.deleteTexture(this._tex); this._tex = null; }
    this._onDisposed?.();
    this._onDisposed = null;
  }
}

export class BrowserGl2Port implements Gl2Port {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  // 壳侧/smoke harness 直用（off-contract：Gl2Port 接口无此口，backend 摸不到）。
  readonly gl: WebGL2RenderingContext;
  readonly caps: Gl2Caps;

  private _programs = new Map<string, ProgMeta>();
  private _programSrc = new Map<string, { vert: string; frag: string }>();   // 重建用
  // 预编译中（warmProgram 起的链接，尚未查状态/反射）；轮询收尾。context 重建时整表作废（旧句柄死）。
  private _pending = new Map<string, { p: WebGLProgram; vs: WebGLShader; fs: WebGLShader }>();
  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private _warmFailed = new Map<string, string>();   // 预编译失败的名 → 错误（program() 使用时再抛，不在空闲轮询里炸）
  private _parallelExt: { COMPLETION_STATUS_KHR: number } | null | undefined = undefined;   // 懒取；null = 无扩展
  private _fboPool: BrowserFBO[] = [];      // 已归还、待复用
  private _quad: WebGLVertexArrayObject | null = null;
  // drawInstanced 的持久 VAO（loc0=单位 quad static + loc1=vec4/实例 dynamic）。
  private _instVao: WebGLVertexArrayObject | null = null;
  private _instBuf: WebGLBuffer | null = null;
  // 占位纹理（未提供的 sampler 绑它，防单元 0 类型冲突）。
  private _ph2d: WebGLTexture | null = null;
  private _phArr: WebGLTexture | null = null;

  private _invalidated: (() => void)[] = [];
  private _lost = false;
  private _gen = 0;   // restore 代际：每次 context 恢复 +1。

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.canvas = canvas;
    const attrs: WebGLContextAttributes = {
      alpha: false,              // 板背景不透明（与现 board {alpha:false} 一致）
      antialias: false,          // 我们自己控合成，不要 MSAA
      depth: false,
      stencil: false,
      premultipliedAlpha: true,  // 合成走预乘 alpha（blend 数学的前提，见 compositor）
      // board 是**按需渲染**（非每帧）：preserveDrawingBuffer:true 让空闲时上一帧内容保留，
      //   否则浏览器合成后清空 buffer → 闲置/重合成时画布变黑。代价是每帧一次拷贝，可忽略。
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    };
    const gl = canvas.getContext("webgl2", attrs) as WebGL2RenderingContext | null;
    if (!gl) throw new Error("WEBGL2_UNAVAILABLE");   // caller 给中文「需要 WebGL2」提示
    this.gl = gl;

    // float 颜色缓冲：WebGL2 多数原生，部分要 EXT_color_buffer_float。两路都试。
    const floatExt = gl.getExtension("EXT_color_buffer_float");
    this.caps = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      maxArrayLayers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number,
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
      floatColorBuffer: !!floatExt,
    };

    // context-loss 生命周期。lost 必 preventDefault 才有机会 restored。
    const el = canvas as { addEventListener?: (t: string, cb: (e: Event) => void) => void };
    el.addEventListener?.("webglcontextlost", (e: Event) => {
      e.preventDefault();
      this._lost = true;
    });
    el.addEventListener?.("webglcontextrestored", () => {
      this._lost = false;
      this._rebuildAfterRestore();
      // 广播失效（结构已重建、generation 已 ++）→ backend 标脏，下帧从 CPU tile 池重传。
      for (const cb of this._invalidated) cb();
    });
  }

  get isLost(): boolean { return this._lost; }
  get generation(): number { return this._gen; }

  onInvalidated(cb: () => void): void { this._invalidated.push(cb); }

  // ---- shader program 缓存 + 反射 ----
  program(name: string, vert?: string, frag?: string): void {
    if (this._programs.has(name)) return;
    const pend = this._pending.get(name);
    if (pend) {   // 预编译已起：当场收尾（LINK_STATUS 查询会等链接完成，但编译早已在后台跑了）
      this._pending.delete(name);
      this._programs.set(name, this._finishLink(name, pend.p, pend.vs, pend.fs));
      return;
    }
    const failed = this._warmFailed.get(name);
    if (failed) { this._warmFailed.delete(name); throw new Error(failed); }
    if (vert == null || frag == null) throw new Error(`PROGRAM_NOT_BUILT:${name}`);
    this._programSrc.set(name, { vert, frag });
    this._programs.set(name, this._compile(vert, frag, name));
  }

  // 非阻塞预编译（契约见 gl2-port.ts）：起编译+链接不查状态，轮询 KHR_parallel_shader_compile 收尾。
  warmProgram(name: string, vert: string, frag: string): void {
    if (this._programs.has(name) || this._pending.has(name)) return;
    if (this.isLost) return;   // 丢失期不起；restore 后按需同步编译
    this._programSrc.set(name, { vert, frag });
    try {
      this._pending.set(name, this._startLink(vert, frag, name));
    } catch (e) {   // compileShader 本身不抛（状态查询才抛）；这里只可能是 create* 失败
      this._warmFailed.set(name, String((e as { message?: unknown })?.message ?? e));
      return;
    }
    this._schedulePendingPoll();
  }

  private _schedulePendingPoll(): void {
    if (this._pendingTimer != null) return;
    this._pendingTimer = setTimeout(() => { this._pendingTimer = null; this._pollPending(); }, 40);
  }

  private _pollPending(): void {
    if (this.isLost) return;
    const gl = this.gl;
    if (this._parallelExt === undefined) this._parallelExt = gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;
    // 有扩展：只收尾已完成的（查询不阻塞）；无扩展：每拍最多同步收尾**一个**（把等待切碎，主线程单次停顿 ≤ 一个 program 的链接）
    //   ——user 2026-09-19「启动速度是更重要的」：暖场不许攒成一次大停顿。
    let budget = this._parallelExt ? Infinity : 1;
    for (const [name, pend] of [...this._pending]) {
      if (budget <= 0) break;
      const done = this._parallelExt ? !!gl.getProgramParameter(pend.p, this._parallelExt.COMPLETION_STATUS_KHR) : true;
      if (!done) continue;
      this._pending.delete(name);
      budget--;
      try { this._programs.set(name, this._finishLink(name, pend.p, pend.vs, pend.fs)); }
      catch (e) { this._warmFailed.set(name, String((e as { message?: unknown })?.message ?? e)); }
    }
    if (this._pending.size) this._schedulePendingPoll();
  }

  private _meta(name: string): ProgMeta {
    const m = this._programs.get(name);
    if (!m) throw new Error(`PROGRAM_NOT_BUILT:${name}`);
    return m;
  }

  private _compile(vert: string, frag: string, name: string): ProgMeta {
    const { p, vs, fs } = this._startLink(vert, frag, name);
    return this._finishLink(name, p, vs, fs);
  }

  // 起编译 + 链接，不查任何状态（查状态才会等驱动；warmProgram 靠这点把等待挪到空闲轮询）。
  private _startLink(vert: string, frag: string, name: string): { p: WebGLProgram; vs: WebGLShader; fs: WebGLShader } {
    const gl = this.gl;
    const vs = this._shader(gl.VERTEX_SHADER, vert, name);
    const fs = this._shader(gl.FRAGMENT_SHADER, frag, name);
    const p = gl.createProgram();
    if (!p) throw new Error("CREATE_PROGRAM_FAILED");
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    return { p, vs, fs };
  }

  // 收尾：查 LINK_STATUS（编译错也在这里冒——_shader 不再单独查 COMPILE_STATUS，见其注）+ 反射 uniform/sampler。
  private _finishLink(name: string, p: WebGLProgram, vs: WebGLShader, fs: WebGLShader): ProgMeta {
    const gl = this.gl;
    // link 错只在 !LINK_STATUS 时拉 log（getProgramInfoLog 同步 stall，故守门后取）。
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const vlog = gl.getShaderInfoLog(vs), flog = gl.getShaderInfoLog(fs), log = gl.getProgramInfoLog(p);
      throw new Error(`LINK_FAILED:${name}:${log}${vlog ? " vert:" + vlog : ""}${flog ? " frag:" + flog : ""}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    // 反射：uniform 名 → {loc,type}；sampler 按声明序固定单元（link 后设一次 uniform1i，不再变）。
    const uniforms = new Map<string, { loc: WebGLUniformLocation; type: number }>();
    const samplers: ProgMeta["samplers"] = [];
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    gl.useProgram(p);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      if (!info) continue;
      const uname = info.name.replace(/\[0\]$/, "");
      const loc = gl.getUniformLocation(p, uname);
      if (!loc) continue;
      if (info.type === gl.SAMPLER_2D || info.type === gl.SAMPLER_2D_ARRAY) {
        const unit = samplers.length;
        samplers.push({ name: uname, unit, type: info.type });
        gl.uniform1i(loc, unit);
      } else {
        uniforms.set(uname, { loc, type: info.type });
      }
    }
    gl.useProgram(null);
    return { prog: p, uniforms, samplers };
  }

  // 只起编译不查 COMPILE_STATUS（查了就同步等驱动，预编译白做）；编译错在 _finishLink 的 LINK_STATUS 失败时连 shader log 一起抛。
  private _shader(type: number, src: string, _name: string): WebGLShader {
    const gl = this.gl;
    const s = gl.createShader(type);
    if (!s) throw new Error("CREATE_SHADER_FAILED");
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  // ---- FBO 池 ----
  fboPoolHas(w: number, h: number, prec: FBOPrec): boolean {
    return this._fboPool.some((f) => f.w === w && f.h === h && f.prec === prec);
  }
  get fboPoolBudgetBytes(): number { return FBO_POOL_BUDGET_BYTES; }

  borrowFBO(w: number, h: number, prec: FBOPrec = "u8"): PooledFBO {
    for (let i = 0; i < this._fboPool.length; i++) {
      const f = this._fboPool[i];
      if (f.w === w && f.h === h && f.prec === prec) {
        this._fboPool.splice(i, 1);
        return f;
      }
    }
    return this._createFBO(w, h, prec);
  }

  // 归还到池末尾（= MRU）。**有界**：超字节预算或数量上限 → 从队首（LRU）驱逐并真正删 GL 资源。
  returnFBO(f: PooledFBO): void {
    this._fboPool.push(f as BrowserFBO);
    while ((this._poolBytes() > FBO_POOL_BUDGET_BYTES || this._fboPool.length > FBO_POOL_MAX_COUNT) && this._fboPool.length > 1) {
      const e = this._fboPool.shift()!;   // 队首 = 最久未用
      this.gl.deleteFramebuffer(e.fbo);
      this.gl.deleteTexture(e.tex);
    }
  }

  private _fboBytes(f: PooledFBO): number {
    return f.w * f.h * (f.prec === "f32" ? 16 : f.prec === "f16" ? 8 : 4);
  }
  private _poolBytes(): number {
    let b = 0; for (const f of this._fboPool) b += this._fboBytes(f); return b;
  }
  get fboPoolStats(): { count: number; bytes: number } { return { count: this._fboPool.length, bytes: this._poolBytes() }; }

  clearPool(): void {
    for (const f of this._fboPool) { this.gl.deleteFramebuffer(f.fbo); this.gl.deleteTexture(f.tex); }
    this._fboPool = [];
  }

  clearFBO(f: PooledFBO, rgba: [number, number, number, number]): void {
    const gl = this.gl;
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, (f as BrowserFBO).fbo);
    gl.clearColor(rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private _createFBO(w: number, h: number, prec: FBOPrec): BrowserFBO {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("CREATE_TEXTURE_FAILED");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // 精度档 → internalformat + type。f16/f32 线性过滤给视口缩放采样用。
    const internal = prec === "f32" ? gl.RGBA32F : prec === "f16" ? gl.RGBA16F : gl.RGBA8;
    const type = prec === "f32" ? gl.FLOAT : prec === "f16" ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
    // NEAREST：累积器/中间 FBO 全是 1:1 采样（v_uv 对齐像素网格），不需要 LINEAR。
    //   且 RGBA32F + LINEAR 需 OES_texture_float_linear（iPad/SwiftShader 不保证）→ 纹理不完整、
    //   采样返回 (0,0,0,1)。视口缩放的屏幕 present 用 draw spec 的 filter 选项单独切。
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error("CREATE_FRAMEBUFFER_FAILED");
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    // 完整性检查（真机易错点：float 目标在某些设备非 color-renderable）。
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`FBO_INCOMPLETE:0x${status.toString(16)}:prec=${prec}`);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { fbo, tex, w, h, prec };
  }

  // ---- 单位 quad（两个三角形覆盖 [0,1]²；位置即 uv）----
  private _quadVAO(): WebGLVertexArrayObject {
    if (this._quad) return this._quad;
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("CREATE_VAO_FAILED");
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this._quad = vao;
    return vao;
  }

  // drawInstanced 的持久 VAO：loc0 单位 quad（static）+ loc1 vec4/实例（divisor 1，每 draw 重填）。
  private _instancedVAO(): WebGLVertexArrayObject {
    if (this._instVao) return this._instVao;
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("CREATE_VAO_FAILED");
    gl.bindVertexArray(vao);
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const instBuf = gl.createBuffer();
    if (!instBuf) throw new Error("CREATE_BUFFER_FAILED");
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this._instVao = vao; this._instBuf = instBuf;
    return vao;
  }

  // ---- 绘制动词 ----
  draw(spec: Gl2DrawSpec): void {
    this._drawCommon(spec, null, 0);
  }

  drawInstanced(spec: Gl2DrawSpec, instances: Float32Array, count: number): void {
    this._drawCommon(spec, instances, count);
  }

  private _drawCommon(spec: Gl2DrawSpec, instances: Float32Array | null, count: number): void {
    const gl = this.gl;
    const meta = this._meta(spec.program);

    // 目标 + viewport
    if (spec.target === "screen") {
      if (!spec.viewport) throw new Error("SCREEN_DRAW_NEEDS_VIEWPORT");
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(...spec.viewport);
    } else {
      const f = spec.target as BrowserFBO;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
      const vp = spec.viewport ?? [0, 0, f.w, f.h];
      gl.viewport(vp[0], vp[1], vp[2], vp[3]);
    }

    // clear（全幅，scissor 之外也清）→ scissor → blend
    gl.disable(gl.SCISSOR_TEST);
    if (spec.clear) {
      gl.clearColor(spec.clear[0], spec.clear[1], spec.clear[2], spec.clear[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    if (spec.scissor) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(spec.scissor.x, spec.scissor.y, spec.scissor.w, spec.scissor.h);
    }
    const blend = spec.blend ?? "none";
    if (blend === "none") {
      gl.disable(gl.BLEND);
    } else if (blend === "premult-over") {
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    } else {   // max-alpha：src/dst factor 被 MAX 方程忽略
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.MAX);
      gl.blendFunc(gl.ONE, gl.ONE);
    }

    gl.useProgram(meta.prog);
    if (spec.uniforms) this._setUniforms(meta, spec.uniforms);
    this._bindTextures(meta, spec.textures);

    if (instances) {
      gl.bindVertexArray(this._instancedVAO());
      gl.bindBuffer(gl.ARRAY_BUFFER, this._instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, instances.subarray(0, count * 4), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
    } else {
      gl.bindVertexArray(this._quadVAO());
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // 状态还原（无 ambient 状态泄漏到下一个 draw / 外部代码）。
    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private _setUniforms(meta: ProgMeta, uniforms: NonNullable<Gl2DrawSpec["uniforms"]>): void {
    const gl = this.gl;
    for (const name of Object.keys(uniforms)) {
      const u = meta.uniforms.get(name);
      if (!u) continue;   // 未声明/被编译器裁掉 → 静默跳过（契约：null-location 语义）
      const v = uniforms[name];
      switch (u.type) {
        case gl.FLOAT: gl.uniform1f(u.loc, v as number); break;
        case gl.INT:
        case gl.BOOL: gl.uniform1i(u.loc, typeof v === "boolean" ? (v ? 1 : 0) : (v as number)); break;
        case gl.FLOAT_VEC2: { const a = v as number[]; gl.uniform2f(u.loc, a[0], a[1]); break; }
        case gl.FLOAT_VEC3: { const a = v as number[]; gl.uniform3f(u.loc, a[0], a[1], a[2]); break; }
        case gl.FLOAT_VEC4: { const a = v as number[]; gl.uniform4f(u.loc, a[0], a[1], a[2], a[3]); break; }
        // 契约：mat3 一律 row-major 9 元素 → transpose=true 上传。
        case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, true, v as Float32Array | number[]); break;
        default: throw new Error(`UNIFORM_TYPE_UNSUPPORTED:${name}:0x${u.type.toString(16)}`);
      }
    }
  }

  private _bindTextures(meta: ProgMeta, textures: Gl2DrawSpec["textures"]): void {
    const gl = this.gl;
    for (const s of meta.samplers) {
      const entry = textures?.[s.name];
      let src: Gl2TexSource | undefined;
      let filter: "nearest" | "linear" | undefined;
      if (entry) {
        if ("kind" in entry || "prec" in entry) src = entry as Gl2TexSource;
        else { src = entry.src; filter = entry.filter; }
      }
      gl.activeTexture(gl.TEXTURE0 + s.unit);
      if (s.type === gl.SAMPLER_2D_ARRAY) {
        const tex = src ? (src as BrowserTileArena).texture : this._placeholderArr();
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
      } else {
        const tex = src ? this._resolve2d(src) : this._placeholder2d();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (filter) {
          const f = filter === "linear" ? gl.LINEAR : gl.NEAREST;
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
        }
      }
    }
    gl.activeTexture(gl.TEXTURE0);
  }

  private _resolve2d(src: Gl2TexSource): WebGLTexture {
    if ("kind" in src) {
      if (src.kind === "tex2d") return (src as BrowserTexture).tex;
      throw new Error("ARENA_BOUND_TO_SAMPLER2D");   // arena 只能进 sampler2DArray
    }
    return (src as BrowserFBO).tex;   // PooledFBO 颜色附件
  }

  private _placeholder2d(): WebGLTexture {
    if (this._ph2d) return this._ph2d;
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this._ph2d = tex;
    return tex;
  }

  private _placeholderArr(): WebGLTexture {
    if (this._phArr) return this._phArr;
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 1, 1, 1);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    this._phArr = tex;
    return tex;
  }

  // ---- 读回 ----
  readPixels(src: PooledFBO, x: number, y: number, w: number, h: number): Uint8Array {
    const gl = this.gl;
    const out = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, (src as BrowserFBO).fbo);
    gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  }

  // ---- 2D 纹理 ----
  createTexture(): Gl2Texture {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("CREATE_TEXTURE_FAILED");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    const h: BrowserTexture = { kind: "tex2d", tex };
    return h;
  }

  uploadTexture(tex: Gl2Texture, format: TexUploadFormat, w: number, h: number, data: ArrayBufferView): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, (tex as BrowserTexture).tex);
    // typed array 上传字节 verbatim 上卡（premult 转换 flag 对 typed array 无效，防御性关掉）。
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (format === "r8") gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (format === "rgba8") {
      const bytes = data instanceof Uint8Array ? data
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    } else if (format === "rgba16f") {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, data as Float32Array);
    } else if (format === "r8") {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, data as Uint8Array);
    } else {   // r32f
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, data as Float32Array);
    }
    if (format === "r8") gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  deleteTexture(tex: Gl2Texture): void {
    this.gl.deleteTexture((tex as BrowserTexture).tex);
  }

  // ---- tile arena ----
  private _arenas = new Set<BrowserTileArena>();

  createTileArena(tileSize: number, initialSlices: number): Gl2TileArena {
    const a: BrowserTileArena = new BrowserTileArena(this.gl, tileSize, initialSlices, () => this._arenas.delete(a));
    this._arenas.add(a);
    return a;
  }

  // 租户记账：活 arena 数 + 承诺显存（capacity 现值求和——recreate/grow 自动跟上）。
  get arenaStats(): { count: number; bytes: number } {
    let bytes = 0;
    for (const a of this._arenas) bytes += a.capacity * a.tileSize * a.tileSize * 4;
    return { count: this._arenas.size, bytes };
  }

  // context restored 后：旧 GL 对象句柄全失效 → 重编所有 program、清空 FBO 池（按需重建）、
  // 丢 quad/instanced VAO/占位纹理。tile 纹理由 onInvalidated 回调链重传（backend 标脏 →
  // syncAll 从 CPU tile 池；本模块不持 tile）。arena 由持有者经 pool.clearAll → recreate 重建。
  private _rebuildAfterRestore(): void {
    this._gen++;   // 旧 program/FBO/VAO 句柄全废 → 代际 +1，持久对象 holder 据此重建
    this._programs.clear();
    this._pending.clear(); this._warmFailed.clear();   // 预编译中的旧句柄同废；下面按源同步重编（含预编译过的名）
    for (const [name, src] of this._programSrc) {
      this._programs.set(name, this._compile(src.vert, src.frag, name));
    }
    this._fboPool = [];   // 旧 fbo/tex 句柄已废；池清空，borrow 时重建
    this._quad = null;
    this._instVao = null; this._instBuf = null;
    this._ph2d = null; this._phArr = null;
  }
}
