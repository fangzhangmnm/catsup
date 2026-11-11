// providers/three/live-image.ts —— 活的图（契约 LiveImage）在渲染器这边的样子：一张专用的显示图（贴图主线 1-3c）。created 2026-11-11 by Claude Opus 5.5
// 画画内核把画合成在同一个显卡画面里的一张图上（那张图归内核：不许改采样设置、不许长期拿着）。渲染器自己备一张显示图：
//   SRGB8_ALPHA8（和 three 给导入的原图建的同一种：采样出来是线性的，导入的图和画走同一条着色器）、全套多级缩小图、放大最近邻 / 缩小三线性、夹边。
//   内核那张的版本变了 → 一遍小着色器 texelFetch 它（字节 = sRGB 编码值）→ 解成线性 → 写进 sRGB 的显示图（显卡写的时候再编码回去）→ 生成缩小图。
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

interface Entry {
  readonly tex: any;                 // THREE.ExternalTexture（仓里 three 的类型是简版）
  disp: WebGLTexture | null;
  w: number; h: number;
  ver: number;                       // 拷过的版本；−1 = 要重拷
}

export class LiveTextures {
  private readonly entries = new Map<LiveImage, Entry>();
  private prog: WebGLProgram | null = null;
  private fbo: WebGLFramebuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uSrc: WebGLUniformLocation | null = null;
  /** 最近一次拷贝（拷 + 生成缩小图）花了多少毫秒（CPU 时间；探针量）。 */
  lastCopyMs = 0;
  constructor(private readonly gl: WebGL2RenderingContext) {}

  get size(): number { return this.entries.size; }

  /** 这张活的图在 three 那边的贴图（同一张图永远是同一个对象）。还没拷过 = 指着空（three 绑 null = 黑；第一帧 update 就拷上）。 */
  textureFor(img: LiveImage): unknown {
    let e = this.entries.get(img);
    if (!e) {
      const tex = new (THREE as any).ExternalTexture(null);
      tex.colorSpace = THREE.SRGBColorSpace;
      e = { tex, disp: null, w: 0, h: 0, ver: -1 };
      this.entries.set(img, e);
    }
    return e.tex;
  }

  /** 每帧开画之前：挨个问 current()，版本变了的拷进显示图。返回 true = 动过显卡（调用的人 resetState 一次）。一张都没有 = 什么都不做。 */
  update(): boolean {
    if (!this.entries.size) return false;
    let touched = false;
    for (const [img, e] of this.entries) {
      const cur = img.current();
      touched = true;   // current() 可能已经让内核合成过（动过显卡）
      if (!cur) continue;
      if (cur.version === e.ver && e.disp && e.w === img.width && e.h === img.height) continue;
      const t0 = performance.now();
      this.copy(e, cur.handle as WebGLTexture, img.width, img.height);
      this.lastCopyMs = performance.now() - t0;
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
    this.prog = null; this.fbo = null; this.vao = null; this.uSrc = null;
    for (const e of this.entries.values()) { e.disp = null; e.ver = -1; e.tex.sourceTexture = null; }
  }

  dispose(): void {
    for (const img of [...this.entries.keys()]) this.drop(img);
    const gl = this.gl;
    if (this.prog) gl.deleteProgram(this.prog);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.prog = null; this.fbo = null; this.vao = null;
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
    this.fbo = gl.createFramebuffer(); this.vao = gl.createVertexArray();
  }

  private copy(e: Entry, src: WebGLTexture, w: number, h: number): void {
    const gl = this.gl;
    this.ensureProgram();
    if (!e.disp || e.w !== w || e.h !== h) {   // 第一次 / 大小变了：重建显示图（不可变大小 + 全套缩小图）
      if (e.disp) gl.deleteTexture(e.disp);
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(Math.max(w, h))) + 1, gl.SRGB8_ALPHA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      e.disp = t; e.w = w; e.h = h; e.tex.sourceTexture = t;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, e.disp, 0);
    gl.viewport(0, 0, w, h);
    for (const cap of [gl.BLEND, gl.DEPTH_TEST, gl.SCISSOR_TEST, gl.CULL_FACE, gl.STENCIL_TEST, gl.RASTERIZER_DISCARD]) gl.disable(cap);
    gl.colorMask(true, true, true, true);
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(this.uSrc, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindTexture(gl.TEXTURE_2D, e.disp);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
