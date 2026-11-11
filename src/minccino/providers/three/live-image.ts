// providers/three/live-image.ts —— 活的图（契约 LiveImage）在渲染器这边的样子：一张专用的显示图（贴图主线 1-3c）。created 2026-11-11 by Claude Opus 5.5
// 画画内核把画合成在同一个显卡画面里的一张图上（那张图归内核：不许改采样设置、不许长期拿着）。渲染器自己备一张显示图：
//   SRGB8_ALPHA8（和 three 给导入的原图建的同一种：采样出来是线性的，导入的图和画走同一条着色器）、全套多级缩小图、放大最近邻 / 缩小三线性、夹边。
//   内核那张的版本变了 → 一遍小着色器 texelFetch 它（字节 = sRGB 编码值）→ 解成线性 → 写进 sRGB 的显示图（显卡写的时候再编码回去）→ 生成缩小图。
//   只拷变了的那些格（1-4d 第 6 条，2026-11-11 Claude Opus 5.5）：图给了 changedSince（画画 = 合成图的变化史 = 内核的脏格子位图）就只拷那些格，
//   缩小图每一级的脏格 = 上一级的位图减半；每一级都把行段当实例一次画完（几百段也是一次显卡调用）。2×2 平均着色器代替 generateMipmap（那个只能整套重做），
//   整张和几格用的是同一个着色器，所以一格一格做出来的和整套重做的逐格一样。
//   第 0 行拷到第 0 行（不翻转：画布第 0 行 = 贴图第 0 行）。
// 画的合成图（冷的画，1-8b）也在这里建显示图（fromBitmap）：解好的位图传进第 0 级、缩小图走同一个 mips()。冷的和解开后热的要逐像素一样（换着显示不许闪），
//   three 的 generateMipmap 怎么平均归各家显卡，和这里的 2×2 平均对不上：v0.19.35 换成自家缩小图之后 probe-paint-scale「冷的 = 热的」在缩小着看时红了，
//   同一张画只许有一份缩小算法（2026-11-11 Claude Opus 5.5 修）。
// three 那边用 ExternalTexture 包这张显示图：three r185 绑它时只认 sourceTexture、不碰采样设置（three.module.js setTexture2D），所以不用改 vendor。
// 这里只用原始 GL；动完显卡由调用的人统一 renderer.resetState() 一次。
import * as THREE from "three";
import type { LiveImage, ChangedCells } from "../../contract/stream.ts";
import { diffBox } from "../../contract/pixel-diff.ts";

/** 每个实例一个方框（这一级视口里 [0,1] 的 x, y, w, h）：只拷 / 只重做这些格（1-4d 第 6 条）；整张 = 一个实例 (0, 0, 1, 1)。六个顶点拼一个方块。 */
const VS = `#version 300 es
layout(location=0) in vec4 aRect;
void main() {
  int i = gl_VertexID;
  vec2 q = vec2((i == 1 || i == 4 || i == 5) ? 1.0 : 0.0, (i == 2 || i == 3 || i == 5) ? 1.0 : 0.0);
  vec2 p = aRect.xy + q * aRect.zw;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const FS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uSrc;
out vec4 o;
float dec(float c) { return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
void main() { vec4 t = texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0); o = vec4(dec(t.r), dec(t.g), dec(t.b), t.a); }`;
/** 缩小图的一级：上一级（采样时只开着那一级）的 2×2 个格子取平均（sRGB 的图读出来是线性的、写回去再编码 = 在线性里平均）；上一级是单数边时最后一行 / 列夹住。 */
const DS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uSrc;
uniform ivec2 uSrcSize;
out vec4 o;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy) * 2, m = uSrcSize - 1;
  o = (texelFetch(uSrc, min(p, m), 0) + texelFetch(uSrc, min(p + ivec2(1, 0), m), 0) + texelFetch(uSrc, min(p + ivec2(0, 1), m), 0) + texelFetch(uSrc, min(p + ivec2(1, 1), m), 0)) * 0.25;
}`;

interface Entry {
  readonly tex: any;                 // THREE.ExternalTexture（仓里 three 的类型是简版）
  disp: WebGLTexture | null;
  w: number; h: number;
  ver: number;                       // 拷过的版本；−1 = 要重拷
  /** 缩小图落后于第 0 级（只在「画的时候不做缩小图」那种量法里会有）。 */
  mipsStale: boolean;
}

/** 画的合成图（冷的画）那张显示图：位图留着（显卡画面丢了恢复后从它重传）。 */
interface StaticEntry {
  readonly tex: any;
  readonly bmp: ImageBitmap;
  readonly w: number; readonly h: number;
  disp: WebGLTexture | null;
}

export class LiveTextures {
  private readonly entries = new Map<LiveImage, Entry>();
  private readonly statics = new Set<StaticEntry>();
  private prog: WebGLProgram | null = null;
  private fbo: WebGLFramebuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private buf: WebGLBuffer | null = null;
  private uSrc: WebGLUniformLocation | null = null;
  private ds: WebGLProgram | null = null;
  private dsSrc: WebGLUniformLocation | null = null;
  private dsSize: WebGLUniformLocation | null = null;
  /**
   * 缩小图怎么跟（1-4d 第 6 条要量两种做法）："region" = 每次只重做变了的那一块牵涉到的格子（默认）；
   * "defer" = 画的时候只拷第 0 级、缩小图等不再变了（有一帧没有新版本）再整套做一次——只给探针量，缩小着看会看不到正在画的那一笔；
   * "full" = 不看变化史、每次整张（同一个着色器；读数角标「强制整张」、探针当对照量）；
   * "driver" = 每次整张、缩小图交给驱动的 generateMipmap（= 改之前那条路；读数角标「测量用」，只为量会不会负优化——远看的颜色可能和冷的合成图差一点）。
   * 换做法用 setMipMode（换了 = 下一帧整张重拷，两种算法的缩小图不混在一张图里）。
   */
  mipMode: "region" | "defer" | "full" | "driver" = "region";
  setMipMode(m: "region" | "defer" | "full" | "driver"): void {
    if (m === this.mipMode) return;
    this.mipMode = m;
    for (const e of this.entries.values()) e.ver = -1;
  }
  /** 最近一次拷了多少格（第 0 级的像素数）、几段（实例数）（探针量）。 */
  lastCopyCells = 0;
  lastCopyRuns = 0;
  /** 最近一次拷贝（拷 + 生成缩小图）花了多少毫秒（CPU 时间；探针量）。 */
  lastCopyMs = 0;
  /** 这一帧拷第 0 级花了多久（不含缩小图；每次 update 从 0 记起；没拷 = 0）。 */
  frameCopyMs = 0;
  /** 这一帧做缩小图花了多久（读数角标单列：缩小图每级一趟，真机上占多少要一眼看得见；统筹 11-11）。 */
  frameMipsMs = 0;
  private readonly gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext) { this.gl = gl; }

  get size(): number { return this.entries.size; }
  /** 显示图常驻多少字节（活的 + 冷的合成图；第 0 级 × 4/3 算上缩小图）。 */
  bytes(): number {
    let b = 0;
    for (const e of this.entries.values()) if (e.disp) b += e.w * e.h * 4;
    for (const s of this.statics) if (s.disp) b += s.w * s.h * 4;
    return Math.round(b * 4 / 3);
  }

  /**
   * 画的合成图（冷的画）的显示图：位图传进第 0 级（字节原样，不翻、不预乘——ImageBitmap 不看那几个 UNPACK 开关，和 three 传它时一样），缩小图走 mips()。
   * 同一张显示图的设置和活的图一样（SRGB8_ALPHA8、放大最近邻 / 缩小三线性、夹边）。动了显卡：调用的人 resetState() 一次。
   */
  fromBitmap(bmp: ImageBitmap): unknown {
    const tex = new (THREE as any).ExternalTexture(null);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData = { paint: true };
    const s: StaticEntry = { tex, bmp, w: bmp.width, h: bmp.height, disp: null };
    this.statics.add(s);
    this.upload(s);
    return tex;
  }

  private upload(s: StaticEntry): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    this.ensureProgram();
    const t = this.makeDisplay(s.w, s.h);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, s.bmp);
    s.disp = t; s.tex.sourceTexture = t;
    this.mips(t, s.w, s.h, "all");
  }

  /** 新建一张显示图（不可变大小 + 全套缩小图），绑在 TEXTURE_2D 上返回。 */
  private makeDisplay(w: number, h: number): WebGLTexture {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, levelsOf(w, h), gl.SRGB8_ALPHA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /** 这张活的图在 three 那边的贴图（同一张图永远是同一个对象）。还没拷过 = 指着空（three 绑 null = 黑；第一帧 update 就拷上）。 */
  textureFor(img: LiveImage): unknown {
    let e = this.entries.get(img);
    if (!e) {
      const tex = new (THREE as any).ExternalTexture(null);
      tex.colorSpace = THREE.SRGBColorSpace;
      e = { tex, disp: null, w: 0, h: 0, ver: -1, mipsStale: false };
      this.entries.set(img, e);
    }
    return e.tex;
  }

  /** 画的时候：挨个问 current()（只读准备好的），版本变了的拷进显示图。返回 true = 拷过（调用的人 resetState 一次）。一张都没有 = 什么都不做。 */
  update(): boolean {
    this.frameCopyMs = 0; this.frameMipsMs = 0;
    if (!this.entries.size && !this.statics.size) return false;
    let touched = false;
    for (const s of this.statics) if (!s.disp && !this.gl.isContextLost()) { this.upload(s); touched = true; }   // 显卡画面丢过：从位图重传
    for (const [img, e] of this.entries) {
      const cur = img.current();   // 只读准备好的结果（合成在编辑器的「准备」里，1-4b）
      if (!cur) continue;
      if (cur.version === e.ver && e.disp && e.w === img.width && e.h === img.height) {
        if (e.mipsStale) { this.mips(e.disp, e.w, e.h, "all"); e.mipsStale = false; touched = true; }   // defer：不再变了，整套补上
        continue;
      }
      const t0 = performance.now(), m0 = this.frameMipsMs;
      // 从上次拷过的版本到现在变了哪些格：没给口 / 第一次 / 大小变了 / 说不清 / 强制整张的两种做法 = 整张
      const fresh = !e.disp || e.w !== img.width || e.h !== img.height || e.ver < 0;
      const ch = fresh || !img.changedSince || this.mipMode === "full" || this.mipMode === "driver" ? "all" : img.changedSince(e.ver);
      this.copy(e, cur.gpuImage as WebGLTexture, img.width, img.height, ch !== "all" && (ch.w !== img.width || ch.h !== img.height) ? "all" : ch);
      touched = true;
      this.lastCopyMs = performance.now() - t0;   // 拷 + 缩小图（探针量的口径）
      this.frameCopyMs += this.lastCopyMs - (this.frameMipsMs - m0);
      e.ver = cur.version;
    }
    return touched;
  }

  /** 不再用的图：放掉显示图。 */
  drop(img: LiveImage): void {
    const e = this.entries.get(img);
    if (!e) return;
    if (e.disp) this.gl.deleteTexture(e.disp);
    e.tex.dispose?.();
    this.entries.delete(img);
  }
  /** 现在登记着的图（render3 按「这一帧还有没有块用它」回收）。 */
  images(): LiveImage[] { return [...this.entries.keys()]; }

  /** 显卡画面丢了：原始 GL 对象全死了，忘掉；恢复后第一帧按需重建、全部重拷。 */
  lost(): void {
    this.prog = null; this.fbo = null; this.vao = null; this.uSrc = null; this.ds = null; this.buf = null;
    for (const e of this.entries.values()) { e.disp = null; e.ver = -1; e.tex.sourceTexture = null; }
    for (const s of this.statics) { s.disp = null; s.tex.sourceTexture = null; }
  }

  dispose(): void {
    for (const img of [...this.entries.keys()]) this.drop(img);
    const gl = this.gl;
    for (const s of this.statics) { if (s.disp) gl.deleteTexture(s.disp); s.tex.dispose?.(); }
    this.statics.clear();
    if (this.prog) gl.deleteProgram(this.prog);
    if (this.ds) gl.deleteProgram(this.ds);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.buf) gl.deleteBuffer(this.buf);
    this.prog = null; this.fbo = null; this.vao = null; this.ds = null; this.buf = null;
  }

  private ensureProgram(): void {
    if (this.prog) return;
    const gl = this.gl, sh = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`live-image shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const p = gl.createProgram()!, v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`live-image program: ${gl.getProgramInfoLog(p)}`);
    this.prog = p; this.uSrc = gl.getUniformLocation(p, "uSrc");
    const q = gl.createProgram()!, v2 = sh(gl.VERTEX_SHADER, VS), f2 = sh(gl.FRAGMENT_SHADER, DS);
    gl.attachShader(q, v2); gl.attachShader(q, f2); gl.linkProgram(q);
    gl.deleteShader(v2); gl.deleteShader(f2);
    if (!gl.getProgramParameter(q, gl.LINK_STATUS)) throw new Error(`live-image downsample program: ${gl.getProgramInfoLog(q)}`);
    this.ds = q; this.dsSrc = gl.getUniformLocation(q, "uSrc"); this.dsSize = gl.getUniformLocation(q, "uSrcSize");
    this.fbo = gl.createFramebuffer();
    // 方框的实例缓冲：location 0 = 每个实例一个 vec4（divisor 1），每次画重填
    this.vao = gl.createVertexArray(); this.buf = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /** 把这些段（这一级的像素；"all" = 整张一个）当实例一次画完：每个段一个方块。返回画了几段。 */
  private drawRuns(runs: "all" | readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[], lw: number, lh: number): number {
    const gl = this.gl, n = runs === "all" ? 1 : runs.length;
    if (!n) return 0;
    const a = new Float32Array(n * 4);
    if (runs === "all") { a[2] = 1; a[3] = 1; }
    else for (let i = 0; i < n; i++) { const r = runs[i]; a[4 * i] = r.x / lw; a[4 * i + 1] = r.y / lh; a[4 * i + 2] = r.w / lw; a[4 * i + 3] = r.h / lh; }
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, a, gl.STREAM_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
    return n;
  }

  /** 内核那张变了的那些格拷进显示图第 0 级（第一次 / 大小变了 = 重建显示图、整张；一次画完），再跟缩小图。 */
  private copy(e: Entry, src: WebGLTexture, w: number, h: number, ch: ChangedCells | "all"): void {
    const gl = this.gl;
    this.ensureProgram();
    if (!e.disp || e.w !== w || e.h !== h) {   // 第一次 / 大小变了：重建显示图（不可变大小 + 全套缩小图）
      if (e.disp) gl.deleteTexture(e.disp);
      const t = this.makeDisplay(w, h);
      e.disp = t; e.w = w; e.h = h; e.tex.sourceTexture = t;
      ch = "all";
    }
    if (ch !== "all" && ch.empty) { this.lastCopyCells = 0; this.lastCopyRuns = 0; return; }   // 版本变了但一格都没变
    const runs = ch === "all" ? "all" : ch.runs();
    let cells = 0;
    if (runs === "all") cells = w * h; else for (const r of runs) cells += r.w * r.h;
    this.lastCopyCells = cells;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, e.disp, 0);
    gl.viewport(0, 0, w, h);
    for (const cap of [gl.BLEND, gl.DEPTH_TEST, gl.SCISSOR_TEST, gl.CULL_FACE, gl.STENCIL_TEST, gl.RASTERIZER_DISCARD]) gl.disable(cap);
    gl.colorMask(true, true, true, true);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(this.uSrc, 0);
    this.lastCopyRuns = this.drawRuns(runs, w, h);
    if (this.mipMode === "defer") e.mipsStale = true;
    else if (this.mipMode === "driver") { const t0 = performance.now(); gl.bindTexture(gl.TEXTURE_2D, e.disp); gl.generateMipmap(gl.TEXTURE_2D); this.frameMipsMs += performance.now() - t0; }
    else this.mips(e.disp!, e.w, e.h, ch);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * 缩小图：第 0 级变了的那些格（"all" = 整张）→ 一级一级往下，每一级的脏格 = 上一级的位图减半（half：2×2 格或起来，不会漏），每一级一次画完。
   * 画第 l 级时显示图只开着第 l − 1 级（BASE = MAX = l − 1：读的和写的不是同一级，不算读写打架）；做完恢复成整套。
   */
  private mips(disp: WebGLTexture, w: number, h: number, ch: ChangedCells | "all"): void {
    const gl = this.gl, n = levelsOf(w, h), t0 = performance.now();
    this.ensureProgram();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    for (const cap of [gl.BLEND, gl.DEPTH_TEST, gl.SCISSOR_TEST, gl.CULL_FACE, gl.STENCIL_TEST, gl.RASTERIZER_DISCARD]) gl.disable(cap);
    gl.colorMask(true, true, true, true);
    gl.useProgram(this.ds);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, disp);
    gl.uniform1i(this.dsSrc, 0);
    let cur = ch, pw = w, ph = h;
    for (let l = 1; l < n; l++) {
      const lw = Math.max(1, w >> l), lh = Math.max(1, h >> l);
      if (cur !== "all") { cur = cur.half(); if (cur.empty) break; }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, l - 1);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, l - 1);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, disp, l);
      gl.viewport(0, 0, lw, lh);
      gl.uniform2i(this.dsSize, pw, ph);
      this.drawRuns(cur === "all" ? "all" : cur.runs(), lw, lh);
      pw = lw; ph = lh;
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, n - 1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.frameMipsMs += performance.now() - t0;
  }

  /**
   * 核对（读数角标「核对」开着时；统筹 11-11）：每张活的图的显示图每一级读回 → 按现在的做法整张重拷（同一张合成图）→ 再读回，逐字节比。
   * 整张那份留下来当现在的显示图（对不上时它才是对的）。读回会等显卡做完：只在核对那一帧做。动了显卡：调用的人 resetState() 一次。
   */
  verify(): { w: number; h: number; levels: { level: number; diff: number; box: readonly [number, number, number, number] | null }[] }[] {
    const out: ReturnType<LiveTextures["verify"]> = [];
    for (const [img, e] of this.entries) {
      const cur = img.current();
      if (!cur || !e.disp || e.w !== img.width || e.h !== img.height) continue;
      const before = this.readLevels(e.disp, e.w, e.h);
      const saved = this.lastCopyCells, savedRuns = this.lastCopyRuns, m0 = this.frameMipsMs;
      this.copy(e, cur.gpuImage as WebGLTexture, e.w, e.h, "all");
      this.lastCopyCells = saved; this.lastCopyRuns = savedRuns; this.frameMipsMs = m0;   // 核对那一下不算进这一帧的读数
      e.ver = cur.version;
      const after = this.readLevels(e.disp, e.w, e.h);
      out.push({ w: e.w, h: e.h, levels: before.map((a, l) => ({ level: l, ...diffBox(a.px, after[l].px, a.w) })) });
    }
    return out;
  }
  private readLevels(disp: WebGLTexture, w: number, h: number): { w: number; h: number; px: Uint8Array }[] {
    const gl = this.gl, n = levelsOf(w, h), out: { w: number; h: number; px: Uint8Array }[] = [];
    this.ensureProgram();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    for (let l = 0; l < n; l++) {
      const lw = Math.max(1, w >> l), lh = Math.max(1, h >> l), px = new Uint8Array(lw * lh * 4);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, disp, l);
      gl.readPixels(0, 0, lw, lh, gl.RGBA, gl.UNSIGNED_BYTE, px);
      out.push({ w: lw, h: lh, px });
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  }
}

/** 显示图有几级（第 0 级 + 缩小图）。 */
const levelsOf = (w: number, h: number): number => Math.floor(Math.log2(Math.max(w, h))) + 1;
