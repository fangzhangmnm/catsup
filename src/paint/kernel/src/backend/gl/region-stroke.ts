// RegionStroke —— 区域程序的窄服务（created 2026-09-18 by Claude Fable 5.1）。
//
// 提案：ai-docs/20260918-region-programs-formalism-and-gpu-contract.md §3（user 2026-09-18「目的是一个很窄的gpu的接口加速」）。
// 一笔一个：构造时把叶的 tile（straight u8）整幅装进 **W**（doc 尺寸 u8 FBO，池命中零 malloc——与 overlay 路径同尺寸），
//   之后引擎只用 4 个动词：alloc（状态纹理）/ run（唯一算子）/ overlay（显示 + 提交共用）/ dispose。
//   program 是封闭枚举（region-programs.ts），SoftGl2Port 上每个名都有 CPU 孪生（ADR-0009 决定 5）。
// 显示 / 提交：W 当 overlay（kind:"region"，合成 ovMode "replace"）；bbox = 累计写过 W 的矩形（dirty），
//   预览零 CPU 往返，提交走 RasterService.bakeStamps 的写回链（readPixels → applyRegionDiff → copyBatchFrom）。
// 精度契约（doc §3.4）：W = straight u8（逐 dab 量化 = 旧 CPU 引擎 ImageData 语义）；状态纹理 f32。
//   要求 caps.floatColorBuffer（EXT_color_buffer_float）——缺席 = 构造响亮 throw（user 09-18「要求 floatColorBuffer + 一条 caps 守卫」定；
//   不做 SoftGl 回退，逃生口 = f32 打包 RGBA8 记录在案不做）。
// 数据安全：W 会在提交时**整块替换**叶像素，所以装载必须是叶的真像素——syncLeafSafe 返回 false（显存不够、rec 可能陈旧/部分）
//   时构造响亮 throw，绝不带着陈旧 W 起笔（瑞士奶酪：每层承重）。
// StrokeTarget 面（filters.ts）：docW/docH/bbox 真值；两个 ImageData 方法**不实现**（响亮 throw）——GPU 手指 / wash 不调它们，
//   CPU 读写只有 readPixels / upload 显式慢路径（液化 spline 起笔预滤波用一次），不在这里偷偷回读。

import type { Gl2Port, PooledFBO, Gl2Texture, Gl2TexSource, Gl2Blend } from "../../common/gl2-port.ts";
import type { GlRoom } from "./gl-room.ts";
import type { LayerPixels } from "../tiles/tile-layer.ts";
import { ensureRegionProgram, type RegionProgramId } from "./region-programs.ts";

export type RegionTexFormat = "rgba-f32" | "rgba-u8" | "rgba16f-tex";   // *-tex = 只读上传纹理（upload），不能当 dst
export interface RegionTex { readonly w: number; readonly h: number; readonly format: RegionTexFormat; }
interface RegionTexImpl extends RegionTex { fbo: PooledFBO | null; tex: Gl2Texture | null; alive: boolean; }

/** run 的写靶：状态纹理，或 "W"（工作区域本体；配 scissor 只写窗口）。 */
export type RegionDst = RegionTex | "W";
/** run 的采样源：状态纹理 / "W" / "W0"（起笔快照，构造时 snapshot:true 才有）/ "selection"（选区 r8 平面）。 */
export type RegionTexRef = RegionTex | "W" | "W0" | "selection";
export type RegionRect = { x: number; y: number; w: number; h: number };
export type Rect = [number, number, number, number];   // x0,y0,x1,y1（exclusive）
export interface SelMaskPlane { data: Uint8Array; ox: number; oy: number; ow: number; oh: number; }
export type RegionUniforms = Record<string, number | boolean | number[] | Float32Array>;

/** 显示 + 提交共用：W 当 overlay（doc 尺寸纹理，ox/oy=0）；bx..bh = 累计写过的矩形（提交 readback 范围）；bw=bh=0 = 还没写过。 */
export interface RegionOverlayInput {
  kind: "region";
  tex: PooledFBO;
  layerId: number;
  bx: number; by: number; bw: number; bh: number;
}

export class RegionStroke {
  readonly leafId: number;
  readonly docW: number;
  readonly docH: number;
  private readonly _room: GlRoom;
  private readonly _port: Gl2Port;
  private _W: PooledFBO | null;
  private _W0: PooledFBO | null = null;
  private _sel: { tex: Gl2Texture; ox: number; oy: number; ow: number; oh: number } | null = null;
  private _texes: RegionTexImpl[] = [];
  private _dirty: Rect | null = null;
  private _disposed = false;
  /** 叶的锁 α（引擎读；同 StrokeShadow.lockAlpha）。 */
  readonly lockAlpha: boolean;
  /** 起笔时叶的紧内容框 [x0,y0,x1,y1)（pixels.contentBounds(true)，逐 tile 缓存，µs 级）；null = 空叶。液化的源矩形 / spline 预滤波范围。 */
  readonly contentBounds: Rect | null;

  constructor(room: GlRoom, leafId: number, pixels: LayerPixels, docW: number, docH: number, selMask: SelMaskPlane | null, opts?: { snapshot?: boolean; lockAlpha?: boolean }) {
    if (!room.glctx.caps.floatColorBuffer) {
      throw new Error("REGION_NO_FLOAT_FBO (device cannot render to RGBA32F; finger/wash tools unavailable here — see ai-docs/20260918-region-programs-formalism-and-gpu-contract.md §3.7)");
    }
    this._room = room;
    this._port = room.glctx;
    this.leafId = leafId;
    this.docW = docW;
    this.docH = docH;
    this.lockAlpha = !!opts?.lockAlpha;
    const cb = pixels.contentBounds(true);
    this.contentBounds = cb ? [cb.x, cb.y, cb.x + cb.w, cb.y + cb.h] : null;
    ensureRegionProgram(this._port, "region-load");   // 其余 program 在 run() 按需注册（只编当前 variant 要的；预编译见 warmAllRegionPrograms）
    this._W = this._port.borrowFBO(docW, docH, "u8");
    this._load(this._W, pixels);
    if (opts?.snapshot) { this._W0 = this._port.borrowFBO(docW, docH, "u8"); this._load(this._W0, pixels); }
    if (selMask && selMask.ow > 0 && selMask.oh > 0) {
      const tex = this._port.createTexture();
      this._port.uploadTexture(tex, "r8", selMask.ow, selMask.oh, selMask.data);
      this._sel = { tex, ox: selMask.ox, oy: selMask.oy, ow: selMask.ow, oh: selMask.oh };
    }
  }

  // 叶 tile → target（program region-load，整幅）。真像素才准起笔（见文件头）。
  private _load(target: PooledFBO, pixels: LayerPixels): void {
    const ok = this._room.syncLeafSafe(this.leafId, pixels, this.docW, this.docH);
    if (!ok) throw new Error("REGION_GPU_POOL_EXHAUSTED (leaf not fully GPU-resident; refusing to start a stroke on stale pixels)");
    const rec = this._room.leaves.get(this.leafId);
    if (!rec) { this._port.clearFBO(target, [0, 0, 0, 0]); return; }
    this._port.draw({
      program: "region-load", target,
      uniforms: { u_docSize: [this.docW, this.docH] },
      textures: { u_arr: this._room.arena, u_srcIndex: rec.index.tex },
    });
  }

  private _alive(): void { if (this._disposed) throw new Error("REGION_DISPOSED (RegionStroke used after dispose)"); }

  /** 选区平面（smudge-mask 的 u_selOrigin/u_selSize 用）；null = 无选区。 */
  get selection(): { ox: number; oy: number; ow: number; oh: number } | null {
    return this._sel ? { ox: this._sel.ox, oy: this._sel.oy, ow: this._sel.ow, oh: this._sel.oh } : null;
  }
  /** 累计写过 W 的矩形（x0,y0,x1,y1）；null = 还没写。 */
  get dirty(): Rect | null { return this._dirty ? [this._dirty[0], this._dirty[1], this._dirty[2], this._dirty[3]] : null; }

  /** 状态纹理（借自 FBO 池，清零；dispose 归还）。 */
  alloc(w: number, h: number, format: RegionTexFormat): RegionTex {
    this._alive();
    const fbo = this._port.borrowFBO(w, h, format === "rgba-u8" ? "u8" : "f32");
    this._port.clearFBO(fbo, [0, 0, 0, 0]);
    const t: RegionTexImpl = { w, h, format, fbo, tex: null, alive: true };
    this._texes.push(t);
    return t;
  }

  /** 上传只读纹理（spline 系数平面 rgba16f：CPU 预滤波产物；不能当 run 的 dst）。dispose / free 删除。 */
  upload(w: number, h: number, data: Float32Array): RegionTex {
    this._alive();
    const tex = this._port.createTexture();
    this._port.uploadTexture(tex, "rgba16f", w, h, data);
    const t: RegionTexImpl = { w, h, format: "rgba16f-tex", fbo: null, tex, alive: true };
    this._texes.push(t);
    return t;
  }

  /** 提前归还一张状态纹理（区域尺寸的临时件按 flush 借还；不调也会在 dispose 归还）。 */
  free(t: RegionTex): void {
    const impl = t as RegionTexImpl;
    if (!impl.alive) return;
    impl.alive = false;
    if (impl.fbo) this._port.returnFBO(impl.fbo); else if (impl.tex) this._port.deleteTexture(impl.tex);
    this._texes = this._texes.filter((x) => x !== impl);
  }

  /** 唯一算子：跑一个 program。dst 与任一采样源同一张 = 响亮 throw（读写冲突，GL 未定义行为）。写 W 时按 scissor 记 dirty。 */
  run(program: RegionProgramId, dst: RegionDst, textures: Record<string, RegionTexRef>, uniforms?: RegionUniforms, scissor?: RegionRect, blend?: Gl2Blend): void {
    this._alive();
    if (dst !== "W" && !(dst as RegionTexImpl).fbo) throw new Error(`REGION_DST_NOT_RENDERABLE (${program}: upload textures are read-only)`);
    const target = this._resolve(dst) as PooledFBO;
    const texs: Record<string, Gl2TexSource> = {};
    for (const k of Object.keys(textures)) {
      const src = this._resolve(textures[k]);
      if (src === target) throw new Error(`REGION_READ_WRITE_HAZARD (${program}: sampler ${k} is the draw target)`);
      texs[k] = src;
    }
    ensureRegionProgram(this._port, program);   // 幂等：已注册 = Map 查一次；预编译过 = 当场收尾；否则同步编译
    this._port.draw({ program, target, uniforms, textures: texs, scissor, blend });
    if (dst === "W") this._markDirty(scissor ?? { x: 0, y: 0, w: this.docW, h: this.docH });
  }

  private _resolve(ref: RegionTexRef | RegionDst): Gl2TexSource {
    if (ref === "W") { if (!this._W) throw new Error("REGION_DISPOSED"); return this._W; }
    if (ref === "W0") { if (!this._W0) throw new Error("REGION_NO_SNAPSHOT (construct with { snapshot: true } to use W0)"); return this._W0; }
    if (ref === "selection") { if (!this._sel) throw new Error("REGION_NO_SELECTION (no selection plane on this stroke)"); return this._sel.tex; }
    const t = ref as RegionTexImpl;
    if (!t.alive) throw new Error("REGION_TEX_FREED");
    return (t.fbo ?? t.tex)!;
  }

  private _markDirty(r: RegionRect): void {
    const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y);
    const x1 = Math.min(this.docW, r.x + r.w), y1 = Math.min(this.docH, r.y + r.h);
    if (x1 <= x0 || y1 <= y0) return;
    const d = this._dirty;
    if (!d) this._dirty = [x0, y0, x1, y1];
    else { d[0] = Math.min(d[0], x0); d[1] = Math.min(d[1], y0); d[2] = Math.max(d[2], x1); d[3] = Math.max(d[3], y1); }
  }

  /** W 当 overlay（显示每帧 + 收口提交都用它）。 */
  overlay(): RegionOverlayInput {
    this._alive();
    const d = this._dirty;
    return { kind: "region", tex: this._W!, layerId: this.leafId, bx: d ? d[0] : 0, by: d ? d[1] : 0, bw: d ? d[2] - d[0] : 0, bh: d ? d[3] - d[1] : 0 };
  }

  /** 显式慢路径：读回 W 的一块（straight RGBA8）。测试 / 诊断用；产品路径的提交走 bakeStamps。 */
  readPixels(x0: number, y0: number, w: number, h: number): Uint8Array {
    this._alive();
    return this._port.readPixels(this._W!, x0, y0, w, h);
  }

  /** 归还全部 FBO / 纹理；之后任何动词 throw。幂等。 */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    for (const t of this._texes) { if (t.alive) { t.alive = false; if (t.fbo) this._port.returnFBO(t.fbo); else if (t.tex) this._port.deleteTexture(t.tex); } }
    this._texes = [];
    if (this._W) { this._port.returnFBO(this._W); this._W = null; }
    if (this._W0) { this._port.returnFBO(this._W0); this._W0 = null; }
    if (this._sel) { this._port.deleteTexture(this._sel.tex); this._sel = null; }
  }

  // ---- StrokeTarget 面（filters.ts）：bbox = 整 doc（保守）；CPU 字节读写口不实现（响亮）----
  get bboxX(): number { return 0; }
  get bboxY(): number { return 0; }
  get bboxW(): number { return this.docW; }
  get bboxH(): number { return this.docH; }
  getImageData(_docX: number, _docY: number, _w: number, _h: number): ImageData {
    throw new Error("REGION_TARGET_NO_CPU_IO (RegionStroke is GPU-resident; use run()/readPixels() explicitly)");
  }
  putImageData(_docX: number, _docY: number, _img: ImageData): void {
    throw new Error("REGION_TARGET_NO_CPU_IO (RegionStroke is GPU-resident; use run() explicitly)");
  }
}
