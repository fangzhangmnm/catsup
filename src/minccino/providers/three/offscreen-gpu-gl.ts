// providers/three/offscreen-gpu-gl.ts —— 画进离屏图的那个小显卡接口的真显卡版（契约 contract/offscreen-gpu.ts；贴图主线 1-4b）。created 2026-11-11 by Claude Opus 5.5
// 原始 WebGL2（和 live-image.ts 同一种写法；不经 three 的对象）。离屏图 = RGBA8 贴图 + 帧缓冲；数据图 = R32F / RGBA16UI 贴图（最近邻、夹边，texelFetch 取）。
// 画：单位方块（两个三角形）× 实例（每实例四个数，divisor 1），drawArraysInstanced；取最大 = blendEquation(MAX)，预乘叠加 = FUNC_ADD + (ONE, ONE_MINUS_SRC_ALPHA)。
// 往 8 位的图里写 = 显卡自己四舍五入（和软件版每次写入四舍五入同一种次序）。
// 换手的规矩（统筹 11-11 定的一句话）：共用一个显卡画面的三方（three、画画内核、这里），**进门的人自己把要用的状态全设好，不假设别人留下了什么**；
//   three 因为有状态缓存，别人动过之后要叫它作废。所以每个动作开头 enter()（开关、颜色写、读写缓冲、上传 / 读回开关全设好；画的时候贴图槽上的采样器解开），
//   结尾把动过的归位到 WebGL 的初始值，再调 touched()（render3 = renderer.resetState()）。别人（比如画画内核合成之后）留下的贴图槽 / 顶点缓冲绑定是允许的：不许假设第 0 个贴图槽是空的。
import type { OffscreenData, OffscreenDraw, OffscreenGpu, OffscreenImage, OffscreenProgram } from "../../contract/offscreen-gpu.ts";

interface GlImage extends OffscreenImage { tex: WebGLTexture; fbo: WebGLFramebuffer }
/** copyRects：每个实例一块（格子坐标 x, y, w, h），片元按自己的格子坐标 texelFetch 源图同一格、原样写。 */
const COPY_VS = `#version 300 es
in vec2 a_quad; in vec4 a_inst; uniform vec2 u_size;
void main() { vec2 p = a_inst.xy + a_quad * a_inst.zw; gl_Position = vec4(p / u_size * 2.0 - 1.0, 0.0, 1.0); }`;
const COPY_FS = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D u_src; out vec4 o;
void main() { o = texelFetch(u_src, ivec2(gl_FragCoord.xy), 0); }`;
interface GlData extends OffscreenData { tex: WebGLTexture }
interface GlProgram { prog: WebGLProgram; uniforms: Map<string, { loc: WebGLUniformLocation; type: number }> }

export class GlOffscreenGpu implements OffscreenGpu {
  private readonly gl: WebGL2RenderingContext;
  private readonly touched: () => void;
  private readonly programs = new Map<string, GlProgram>();
  private vao: WebGLVertexArrayObject | null = null;
  private quad: WebGLBuffer | null = null;
  private instBuf: WebGLBuffer | null = null;
  /** copyRects 的小程序（内部的，不进登记表：拷贝没有软件 / 显卡两份要对拍，软件版就是逐块拷字节）。 */
  private copyProg: { prog: WebGLProgram; src: WebGLUniformLocation; size: WebGLUniformLocation } | null = null;
  /** 最近一次 draw 花了多少毫秒（CPU 时间；探针量）。 */
  lastDrawMs = 0;

  /** 每边最多多少格（MAX_TEXTURE_SIZE；契约 maxSize）。 */
  readonly maxSize: number;
  constructor(gl: WebGL2RenderingContext, touched: () => void) { this.gl = gl; this.touched = touched; this.maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number; }
  private fits(w: number, h: number): void { if (!(w >= 1 && h >= 1 && w <= this.maxSize && h <= this.maxSize)) throw new Error(`OffscreenGpu: ${w}x${h} is outside 1..${this.maxSize} per side (MAX_TEXTURE_SIZE)`); }

  register(p: OffscreenProgram): void {
    if (this.programs.has(p.name)) throw new Error(`OffscreenGpu: program ${p.name} registered twice`);
    if (typeof p.cpu !== "function") throw new Error(`OffscreenGpu: program ${p.name} has no CPU version (programs that write into textures come in pairs)`);
    const gl = this.gl, sh = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`OffscreenGpu ${p.name} shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const prog = gl.createProgram()!, v = sh(gl.VERTEX_SHADER, p.vert), f = sh(gl.FRAGMENT_SHADER, p.frag);
    gl.attachShader(prog, v); gl.attachShader(prog, f);
    gl.bindAttribLocation(prog, 0, "a_quad"); gl.bindAttribLocation(prog, 1, "a_inst");
    gl.linkProgram(prog); gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`OffscreenGpu ${p.name} link: ${gl.getProgramInfoLog(prog)}`);
    const uniforms = new Map<string, { loc: WebGLUniformLocation; type: number }>(), n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(prog, i)!, loc = gl.getUniformLocation(prog, u.name); if (loc) uniforms.set(u.name.replace(/\[0\]$/, ""), { loc, type: u.type }); }
    this.programs.set(p.name, { prog, uniforms });
  }

  image(w: number, h: number): OffscreenImage {
    this.fits(w, h);
    const gl = this.gl, tex = gl.createTexture()!, fbo = gl.createFramebuffer()!;
    this.enter();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    this.params();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.restore();
    const im: GlImage = { kind: "offscreen-image", w, h, tex, fbo };
    return im;
  }

  data(w: number, h: number, values: Float32Array | Uint16Array, format: "r32f" | "rgba16ui" = "r32f"): OffscreenData {
    this.fits(w, h);
    const u16 = format === "rgba16ui";
    if (values.length !== w * h * (u16 ? 4 : 1)) throw new Error(`OffscreenGpu.data: ${values.length} values for ${w}x${h} ${format}`);
    if (u16 !== (values instanceof Uint16Array)) throw new Error(`OffscreenGpu.data: ${format} needs ${u16 ? "Uint16Array" : "Float32Array"}`);
    const gl = this.gl, tex = gl.createTexture()!;
    this.enter();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, u16 ? gl.RGBA16UI : gl.R32F, w, h);
    this.params();
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, u16 ? gl.RGBA_INTEGER : gl.RED, u16 ? gl.UNSIGNED_SHORT : gl.FLOAT, values);
    this.restore();
    const d: GlData = { kind: "offscreen-data", w, h, format, tex };
    return d;
  }

  draw(d: OffscreenDraw): void {
    const t0 = performance.now(), gl = this.gl, P = this.programs.get(d.program);
    if (!P) throw new Error(`OffscreenGpu: program ${d.program} is not registered`);
    const tgt = d.target as GlImage;
    this.enter();
    this.ensureGeometry();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fbo);
    gl.viewport(0, 0, tgt.w, tgt.h);
    if (d.clear) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    if (d.count === 0) { this.restore(); this.lastDrawMs = performance.now() - t0; return; }   // 只清、不画（软件版同样：没有实例就什么都不写）
    if (d.scissor) { gl.enable(gl.SCISSOR_TEST); gl.scissor(d.scissor.x, d.scissor.y, d.scissor.w, d.scissor.h); }
    gl.enable(gl.BLEND);
    if (d.accum === "max") { gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE); }
    else { gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
    gl.useProgram(P.prog);
    let unit = 0;
    for (const [name, u] of P.uniforms) {
      if (u.type === gl.SAMPLER_2D || u.type === gl.UNSIGNED_INT_SAMPLER_2D) {
        const dd = d.data?.[name] as GlData | undefined;
        if (!dd) throw new Error(`OffscreenGpu ${d.program}: data ${name} not bound`);
        gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, dd.tex); gl.bindSampler(unit, null); gl.uniform1i(u.loc, unit); unit++;   // 别人绑在这个槽上的采样器会盖掉贴图自己的取样设置（整数贴图配线性 = 读成 0）
        continue;
      }
      const v = d.uniforms?.[name];
      if (v === undefined) continue;
      const a = typeof v === "number" ? [v] : (v as readonly number[]);
      if (u.type === gl.INT) gl.uniform1i(u.loc, a[0]);
      else if (u.type === gl.FLOAT) gl.uniform1f(u.loc, a[0]);
      else if (u.type === gl.FLOAT_VEC2) gl.uniform2f(u.loc, a[0], a[1]);
      else if (u.type === gl.FLOAT_VEC3) gl.uniform3f(u.loc, a[0], a[1], a[2]);
      else if (u.type === gl.FLOAT_VEC4) gl.uniform4f(u.loc, a[0], a[1], a[2], a[3]);
      else throw new Error(`OffscreenGpu ${d.program}: uniform ${name} has an unsupported type`);
    }
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, d.instances.subarray(0, d.count * 4), gl.STREAM_DRAW);
    if (d.count > 0) gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, d.count);
    this.restore(unit);
    this.lastDrawMs = performance.now() - t0;
  }

  copy(src: OffscreenImage, dst: OffscreenImage, rect?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }): void {
    if (src.w !== dst.w || src.h !== dst.h) throw new Error("OffscreenGpu.copy: size mismatch");
    const gl = this.gl;
    const x0 = Math.max(0, rect?.x ?? 0), y0 = Math.max(0, rect?.y ?? 0), x1 = Math.min(src.w, rect ? rect.x + rect.w : src.w), y1 = Math.min(src.h, rect ? rect.y + rect.h : src.h);
    if (x1 <= x0 || y1 <= y0) return;
    this.enter();
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, (src as GlImage).fbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, (dst as GlImage).fbo);
    gl.blitFramebuffer(x0, y0, x1, y1, x0, y0, x1, y1, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    this.restore();
  }

  copyRects(src: OffscreenImage, dst: OffscreenImage, rects: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[]): void {
    if (src.w !== dst.w || src.h !== dst.h) throw new Error("OffscreenGpu.copyRects: size mismatch");
    if (!rects.length) return;
    const gl = this.gl;
    this.enter();
    this.ensureGeometry();
    if (!this.copyProg) {
      const sh = (type: number, s: string): WebGLShader => { const o = gl.createShader(type)!; gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(`OffscreenGpu copyRects shader: ${gl.getShaderInfoLog(o)}`); return o; };
      const p = gl.createProgram()!, v = sh(gl.VERTEX_SHADER, COPY_VS), f = sh(gl.FRAGMENT_SHADER, COPY_FS);
      gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, "a_quad"); gl.bindAttribLocation(p, 1, "a_inst"); gl.linkProgram(p); gl.deleteShader(v); gl.deleteShader(f);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`OffscreenGpu copyRects link: ${gl.getProgramInfoLog(p)}`);
      this.copyProg = { prog: p, src: gl.getUniformLocation(p, "u_src")!, size: gl.getUniformLocation(p, "u_size")! };
    }
    const inst = new Float32Array(rects.length * 4);
    rects.forEach((r, k) => { inst[4 * k] = r.x; inst[4 * k + 1] = r.y; inst[4 * k + 2] = r.w; inst[4 * k + 3] = r.h; });
    gl.bindFramebuffer(gl.FRAMEBUFFER, (dst as GlImage).fbo);
    gl.viewport(0, 0, dst.w, dst.h);
    gl.useProgram(this.copyProg.prog);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, (src as GlImage).tex); gl.bindSampler(0, null);
    gl.uniform1i(this.copyProg.src, 0); gl.uniform2f(this.copyProg.size, dst.w, dst.h);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, inst, gl.STREAM_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, rects.length);   // 没开混合（enter 关了）= 原样写
    this.restore();
  }

  read(img: OffscreenImage): Uint8Array {
    const gl = this.gl, out = new Uint8Array(img.w * img.h * 4);
    this.enter();
    gl.bindFramebuffer(gl.FRAMEBUFFER, (img as GlImage).fbo);
    gl.readPixels(0, 0, img.w, img.h, gl.RGBA, gl.UNSIGNED_BYTE, out);
    this.restore();
    return out;
  }

  release(x: OffscreenImage | OffscreenData): void {
    const gl = this.gl;
    if (x.kind === "offscreen-image") { gl.deleteFramebuffer((x as GlImage).fbo); gl.deleteTexture((x as GlImage).tex); }
    else gl.deleteTexture((x as GlData).tex);
  }

  /** 真显卡版独有：离屏图的贴图句柄（交给画画内核的 wrapExternal）。 */
  glTexture(img: OffscreenImage): WebGLTexture { return (img as GlImage).tex; }

  /** 显卡画面丢了：原始 GL 对象全死了，忘掉（程序要重新登记、图要重建；调用的人负责）。 */
  lost(): void { this.programs.clear(); this.vao = null; this.quad = null; this.instBuf = null; }

  private params(): void {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  /** 进门：这里要用到的显卡状态全设好，不假设别人留下了什么（见文件头的换手规矩）。帧缓冲、视口、程序、VAO、贴图由各动作自己绑。 */
  private enter(): void {
    const gl = this.gl;
    for (const cap of [gl.BLEND, gl.SCISSOR_TEST, gl.DEPTH_TEST, gl.CULL_FACE, gl.STENCIL_TEST, gl.RASTERIZER_DISCARD, gl.DITHER, gl.POLYGON_OFFSET_FILL, gl.SAMPLE_ALPHA_TO_COVERAGE, gl.SAMPLE_COVERAGE]) gl.disable(cap);
    gl.colorMask(true, true, true, true);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 4); gl.pixelStorei(gl.PACK_ROW_LENGTH, 0); gl.pixelStorei(gl.PACK_SKIP_ROWS, 0); gl.pixelStorei(gl.PACK_SKIP_PIXELS, 0);
  }
  private ensureGeometry(): void {
    if (this.vao) return;
    const gl = this.gl;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(0, 0);
    this.instBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
  }
  /** 归位到 WebGL 的初始值（见文件头），再告诉 three。 */
  private restore(units = 1): void {
    const gl = this.gl;
    gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ZERO);
    gl.disable(gl.SCISSOR_TEST); gl.enable(gl.DITHER); gl.colorMask(true, true, true, true);
    for (let i = units - 1; i >= 0; i--) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, null); }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.touched();
  }
}
