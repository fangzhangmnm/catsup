// providers/three/live-image.ts —— 活的图（契约 LiveImage）在渲染器这边的样子：一张专用的显示图（贴图主线 1-3c）。created 2026-11-11 by Claude Opus 5.5
// 画画内核把画合成在同一个显卡画面里的一张图上（那张图归内核：不许改采样设置、不许长期拿着）。渲染器自己备一张显示图：
//   SRGB8_ALPHA8（和 three 给导入的原图建的同一种：采样出来是线性的，导入的图和画走同一条着色器）、全套多级缩小图、放大最近邻 / 缩小三线性、夹边。
//   内核那张的版本变了 → 一遍小着色器 texelFetch 它（字节 = sRGB 编码值）→ 解成线性 → 写进 sRGB 的显示图（显卡写的时候再编码回去）→ 生成缩小图。
//   只拷变了的那一块（1-4d 第 6 条，2026-11-11 Claude Opus 5.5）：图给了 changedSince（画画 = 合成图的变化史）就只拷那一块；缩小图每一级只重做那一块牵涉到的格子
//   （自己的 2×2 平均着色器，不用 generateMipmap——那个只能整套重做；整张和一块用的是同一个着色器，所以一块一块做出来的和整套重做的逐格一样）。
//   第 0 行拷到第 0 行（不翻转：画布第 0 行 = 贴图第 0 行）。
// three 那边用 ExternalTexture 包这张显示图：three r185 绑它时只认 sourceTexture、不碰采样设置（three.module.js setTexture2D），所以不用改 vendor。
// 这里只用原始 GL；动完显卡由调用的人统一 renderer.resetState() 一次。
import * as THREE from "three";
import type { LiveImage } from "../../contract/stream.ts";

const VS = `#version 300 es
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
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
/** 一块格子 [x0, x1) × [y0, y1)。 */
interface Box { x0: number; y0: number; x1: number; y1: number }

interface Entry {
  readonly tex: any;                 // THREE.ExternalTexture（仓里 three 的类型是简版）
  disp: WebGLTexture | null;
  w: number; h: number;
  ver: number;                       // 拷过的版本；−1 = 要重拷
  /** 缩小图落后于第 0 级（只在「画的时候不做缩小图」那种量法里会有）。 */
  mipsStale: boolean;
}

export class LiveTextures {
  private readonly entries = new Map<LiveImage, Entry>();
  private prog: WebGLProgram | null = null;
  private fbo: WebGLFramebuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uSrc: WebGLUniformLocation | null = null;
  private ds: WebGLProgram | null = null;
  private dsSrc: WebGLUniformLocation | null = null;
  private dsSize: WebGLUniformLocation | null = null;
  /**
   * 缩小图怎么跟（1-4d 第 6 条要量两种做法）："region" = 每次只重做变了的那一块牵涉到的格子（默认）；
   * "defer" = 画的时候只拷第 0 级、缩小图等不再变了（有一帧没有新版本）再整套做一次——只给探针量，缩小着看会看不到正在画的那一笔；
   * "full" = 不看变化史、每次整张（改之前的做法，只给探针当对照量）。
   */
  mipMode: "region" | "defer" | "full" = "region";
  /** 最近一次拷了多大一块（第 0 级的格子数；探针量）。 */
  lastCopyCells = 0;
  /** 最近一次拷贝（拷 + 生成缩小图）花了多少毫秒（CPU 时间；探针量）。 */
  lastCopyMs = 0;
  /** 这一帧拷了多久（每次 update 从 0 记起；没拷 = 0）。 */
  frameCopyMs = 0;
  private readonly gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext) { this.gl = gl; }

  get size(): number { return this.entries.size; }

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
    this.frameCopyMs = 0;
    if (!this.entries.size) return false;
    let touched = false;
    for (const [img, e] of this.entries) {
      const cur = img.current();   // 只读准备好的结果（合成在编辑器的「准备」里，1-4b）
      if (!cur) continue;
      if (cur.version === e.ver && e.disp && e.w === img.width && e.h === img.height) {
        if (e.mipsStale) { const t0 = performance.now(); this.mips(e, { x0: 0, y0: 0, x1: e.w, y1: e.h }); e.mipsStale = false; touched = true; this.frameCopyMs += performance.now() - t0; }   // defer：不再变了，整套补上
        continue;
      }
      const t0 = performance.now();
      // 从上次拷过的版本到现在变了哪一块：没给口 / 第一次 / 大小变了 / 说不清 = 整张
      const fresh = !e.disp || e.w !== img.width || e.h !== img.height || e.ver < 0;
      const ch = fresh || !img.changedSince || this.mipMode === "full" ? "all" : img.changedSince(e.ver);
      const box: Box = ch === "all" ? { x0: 0, y0: 0, x1: img.width, y1: img.height } : { x0: Math.max(0, ch.x), y0: Math.max(0, ch.y), x1: Math.min(img.width, ch.x + ch.w), y1: Math.min(img.height, ch.y + ch.h) };
      this.copy(e, cur.gpuImage as WebGLTexture, img.width, img.height, box);
      touched = true;
      this.lastCopyMs = performance.now() - t0;
      this.frameCopyMs += this.lastCopyMs;
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
    this.prog = null; this.fbo = null; this.vao = null; this.uSrc = null; this.ds = null;
    for (const e of this.entries.values()) { e.disp = null; e.ver = -1; e.tex.sourceTexture = null; }
  }

  dispose(): void {
    for (const img of [...this.entries.keys()]) this.drop(img);
    const gl = this.gl;
    if (this.prog) gl.deleteProgram(this.prog);
    if (this.ds) gl.deleteProgram(this.ds);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.prog = null; this.fbo = null; this.vao = null; this.ds = null;
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
    this.fbo = gl.createFramebuffer(); this.vao = gl.createVertexArray();
  }

  /** 内核那张的 box 那一块拷进显示图第 0 级（第一次 / 大小变了 = 重建显示图、整张），再跟缩小图。 */
  private copy(e: Entry, src: WebGLTexture, w: number, h: number, box: Box): void {
    const gl = this.gl;
    this.ensureProgram();
    if (!e.disp || e.w !== w || e.h !== h) {   // 第一次 / 大小变了：重建显示图（不可变大小 + 全套缩小图）
      if (e.disp) gl.deleteTexture(e.disp);
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, levelsOf(w, h), gl.SRGB8_ALPHA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      e.disp = t; e.w = w; e.h = h; e.tex.sourceTexture = t;
      box = { x0: 0, y0: 0, x1: w, y1: h };
    }
    this.lastCopyCells = Math.max(0, box.x1 - box.x0) * Math.max(0, box.y1 - box.y0);
    if (box.x1 <= box.x0 || box.y1 <= box.y0) return;   // 版本变了但一格都没变
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, e.disp, 0);
    gl.viewport(0, 0, w, h);
    for (const cap of [gl.BLEND, gl.DEPTH_TEST, gl.SCISSOR_TEST, gl.CULL_FACE, gl.STENCIL_TEST, gl.RASTERIZER_DISCARD]) gl.disable(cap);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
    gl.colorMask(true, true, true, true);
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(this.uSrc, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (this.mipMode === "defer") e.mipsStale = true;
    else this.mips(e, box);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * 缩小图：第 0 级的 box 那一块变了 → 一级一级往下，每一级只重做被它牵涉到的格子（上一级 [x0, x1) → 这一级 [⌊x0/2⌋, ⌈x1/2⌉)）。
   * 画第 l 级时显示图只开着第 l − 1 级（BASE = MAX = l − 1：读的和写的不是同一级，不算读写打架）；做完恢复成整套。
   */
  private mips(e: Entry, box: Box): void {
    const gl = this.gl, n = levelsOf(e.w, e.h);
    this.ensureProgram();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    for (const cap of [gl.BLEND, gl.DEPTH_TEST, gl.CULL_FACE, gl.STENCIL_TEST, gl.RASTERIZER_DISCARD]) gl.disable(cap);
    gl.enable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, true);
    gl.useProgram(this.ds);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, e.disp);
    gl.uniform1i(this.dsSrc, 0);
    let b = box, pw = e.w, ph = e.h;
    for (let l = 1; l < n; l++) {
      const lw = Math.max(1, e.w >> l), lh = Math.max(1, e.h >> l);
      b = { x0: Math.min(lw, b.x0 >> 1), y0: Math.min(lh, b.y0 >> 1), x1: Math.min(lw, (b.x1 + 1) >> 1), y1: Math.min(lh, (b.y1 + 1) >> 1) };
      if (b.x1 <= b.x0 || b.y1 <= b.y0) break;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, l - 1);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, l - 1);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, e.disp, l);
      gl.viewport(0, 0, lw, lh);
      gl.scissor(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      gl.uniform2i(this.dsSize, pw, ph);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      pw = lw; ph = lh;
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, n - 1);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

/** 显示图有几级（第 0 级 + 缩小图）。 */
const levelsOf = (w: number, h: number): number => Math.floor(Math.log2(Math.max(w, h))) + 1;
