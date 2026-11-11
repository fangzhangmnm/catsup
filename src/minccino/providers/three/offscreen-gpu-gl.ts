// providers/three/offscreen-gpu-gl.ts —— 画进离屏图的那个小显卡接口的真显卡版（契约 contract/offscreen-gpu.ts；贴图主线 1-4b）。created 2026-11-11 by Claude Opus 5.5
// 原始 WebGL2（和 live-image.ts 同一种写法；不经 three 的对象）。离屏图 = RGBA8 贴图 + 帧缓冲；数据图 = R32F 贴图（最近邻、夹边，texelFetch 取）。
// 画：单位方块（两个三角形）× 实例（每实例四个数，divisor 1），drawArraysInstanced；取最大 = blendEquation(MAX)，预乘叠加 = FUNC_ADD + (ONE, ONE_MINUS_SRC_ALPHA)。
// 往 8 位的图里写 = 显卡自己四舍五入（和软件版每次写入四舍五入同一种次序）。
// 换手（三个状态的主人共用一个显卡画面：three、画画内核、这里）：每个动作开头把自己要的状态全设好，结尾把动过的归位到 WebGL 的初始值
//   （混合关、裁剪关、深度 / 剔除 / 模板关、颜色写全开、帧缓冲 / VAO / 程序 / 贴图解绑、上传开关回默认），再调 touched()（render3 = renderer.resetState()）。
import type { OffscreenData, OffscreenDraw, OffscreenGpu, OffscreenImage, OffscreenProgram } from "../../contract/offscreen-gpu.ts";

interface GlImage extends OffscreenImage { tex: WebGLTexture; fbo: WebGLFramebuffer }
interface GlData extends OffscreenData { tex: WebGLTexture }
interface GlProgram { prog: WebGLProgram; uniforms: Map<string, { loc: WebGLUniformLocation; type: number }> }

export class GlOffscreenGpu implements OffscreenGpu {
  private readonly gl: WebGL2RenderingContext;
  private readonly touched: () => void;
  private readonly programs = new Map<string, GlProgram>();
  private vao: WebGLVertexArrayObject | null = null;
  private quad: WebGLBuffer | null = null;
  private instBuf: WebGLBuffer | null = null;
  /** 最近一次 draw 花了多少毫秒（CPU 时间；探针量）。 */
  lastDrawMs = 0;

  constructor(gl: WebGL2RenderingContext, touched: () => void) { this.gl = gl; this.touched = touched; }

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
    const gl = this.gl, tex = gl.createTexture()!, fbo = gl.createFramebuffer()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    this.params();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.restore();
    const im: GlImage = { kind: "offscreen-image", w, h, tex, fbo };
    return im;
  }

  data(w: number, h: number, values: Float32Array): OffscreenData {
    if (values.length !== w * h) throw new Error(`OffscreenGpu.data: ${values.length} values for ${w}x${h}`);
    const gl = this.gl, tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, w, h);
    this.params();
    this.unpackDefaults();
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RED, gl.FLOAT, values);
    this.restore();
    const d: GlData = { kind: "offscreen-data", w, h, tex };
    return d;
  }

  draw(d: OffscreenDraw): void {
    const t0 = performance.now(), gl = this.gl, P = this.programs.get(d.program);
    if (!P) throw new Error(`OffscreenGpu: program ${d.program} is not registered`);
    const tgt = d.target as GlImage;
    this.ensureGeometry();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fbo);
    gl.viewport(0, 0, tgt.w, tgt.h);
    for (const cap of [gl.DEPTH_TEST, gl.CULL_FACE, gl.STENCIL_TEST, gl.RASTERIZER_DISCARD, gl.DITHER]) gl.disable(cap);
    gl.colorMask(true, true, true, true);
    gl.disable(gl.SCISSOR_TEST);
    if (d.clear) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    if (d.scissor) { gl.enable(gl.SCISSOR_TEST); gl.scissor(d.scissor.x, d.scissor.y, d.scissor.w, d.scissor.h); }
    gl.enable(gl.BLEND);
    if (d.accum === "max") { gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE); }
    else { gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
    gl.useProgram(P.prog);
    let unit = 0;
    for (const [name, u] of P.uniforms) {
      if (u.type === gl.SAMPLER_2D) {
        const dd = d.data?.[name] as GlData | undefined;
        if (!dd) throw new Error(`OffscreenGpu ${d.program}: data ${name} not bound`);
        gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, dd.tex); gl.uniform1i(u.loc, unit); unit++;
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

  copy(src: OffscreenImage, dst: OffscreenImage): void {
    if (src.w !== dst.w || src.h !== dst.h) throw new Error("OffscreenGpu.copy: size mismatch");
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, (src as GlImage).fbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, (dst as GlImage).fbo);
    gl.disable(gl.SCISSOR_TEST);
    gl.blitFramebuffer(0, 0, src.w, src.h, 0, 0, dst.w, dst.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    this.restore();
  }

  read(img: OffscreenImage): Uint8Array {
    const gl = this.gl, out = new Uint8Array(img.w * img.h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, (img as GlImage).fbo);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
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
  texture(img: OffscreenImage): WebGLTexture { return (img as GlImage).tex; }

  /** 显卡画面丢了：原始 GL 对象全死了，忘掉（程序要重新登记、图要重建；调用的人负责）。 */
  lost(): void { this.programs.clear(); this.vao = null; this.quad = null; this.instBuf = null; }

  private params(): void {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  private unpackDefaults(): void {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
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
