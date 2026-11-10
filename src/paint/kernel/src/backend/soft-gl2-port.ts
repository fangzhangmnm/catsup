// SoftGl2Port —— Gl2Port 的迂腐纯软实现（C8；ADR-0009 决定 4「SoftGl2Port 兜底」）。
//
// 【域】测试 / MCP / headless backend 专用——**不是用户路径**：浏览器 runtime 无 WebGL2 照旧
//   响亮失败（「CPU 性能不可接受」维持原判，handoff §2 地雷 1）。
// 【语义】照 GL 规范公式实现我们用的子集（迂腐模拟）：
//   - draw = 单位 quad 光栅化到 viewport∩scissor，fragment 中心 +0.5，CPU 程序逐像素跑
//     （对表 = src/backend/soft-shaders.ts，每 shader 名一份逐行镜像 GLSL 的实现）；
//   - blend 三态逐写生效（premult-over / max-alpha），**u8 目标逐写量化**（round(v·255)/255，
//     与 GPU「blend 后立即存 u8」一致——wash/buildup 逐 dab 量化次序逐位对齐）；
//   - clear 无视 scissor 清整个 target（本实现 draw spec 的 clear 语义即如此）；
//   - 纹理 NEAREST + CLAMP_TO_EDGE（本引擎唯一参数组合；draw spec 的 filter 选项在软域忽略
//     ——LINEAR 只用于屏显 present，软域无屏）。
//   不复刻的硬件细节（golden ±ε 吸收）：f16 存储舍入（按 f32 算）、instancing 机制（顺序循环，
//   实例序 = 数组序——与契约承诺一致）、GPU 光栅化 tie-break（quad 边缘像素中心恰在界上）。
// 【决定论】同一动词序列 → 同一字节输出（无时钟无随机无硬件方差）——ADR-0009 回放/对拍前提。

import type {
  Gl2Port, Gl2Caps, FBOPrec, PooledFBO, Gl2Texture, Gl2TileArena,
  Gl2DrawSpec, Gl2TexSource, TexUploadFormat,
} from "../common/gl2-port.ts";
import type { CpuDraw, CpuDrawCtx, SoftTexRead, SoftArenaRead } from "./soft-shaders.ts";
import { resolveCpuProgram } from "./soft-shaders.ts";

// ---- 软句柄实现形 ----

interface SoftFBO extends PooledFBO {
  data: Float32Array;          // RGBA f32 平面（u8 档逐写量化后也存这里）
}

interface SoftTexture extends Gl2Texture {
  format: TexUploadFormat | null;
  w: number;
  h: number;
  data: Float32Array | Uint8Array | null;   // u8 档存字节（fetch 归一），float 档存 f32 raw
}

class SoftTileArena implements Gl2TileArena {
  readonly kind = "arena" as const;
  readonly tileSize: number;
  private _slices: Uint8Array[] = [];
  private _disposed = false;
  private _onDisposed: (() => void) | null;
  constructor(tileSize: number, initialSlices: number, onDisposed?: () => void) {
    this.tileSize = tileSize;
    this._onDisposed = onDisposed ?? null;
    this._alloc(initialSlices);
  }
  private _alloc(n: number): void {
    this._slices = [];
    for (let i = 0; i < n; i++) this._slices.push(new Uint8Array(this.tileSize * this.tileSize * 4));
  }
  // 退租后动词 = 响亮 throw（契约语义，与 BrowserTileArena 同）。
  private _aliveGuard(): void {
    if (this._disposed) throw new Error("ARENA_DISPOSED (used after teardown — owner already disposed this arena)");
  }
  get capacity(): number { return this._slices.length; }
  recreate(newCapacity: number): void { this._aliveGuard(); this._alloc(newCapacity); }
  uploadSlice(slice: number, pixels: Uint8Array): void {
    this._aliveGuard();
    this._slices[slice].set(pixels.subarray(0, this._slices[slice].length));
  }
  copySlice(from: PooledFBO, slice: number, srcX: number, srcY: number, w: number, h: number): void {
    this._aliveGuard();
    const f = from as SoftFBO;
    const dst = this._slices[slice];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((srcY + y) * f.w + (srcX + x)) * 4;
        const di = (y * this.tileSize + x) * 4;
        // RGBA8 目标：float 源量化成字节（u8 源已量化 → 无损往返）
        dst[di] = Math.min(255, Math.max(0, Math.round(f.data[si] * 255)));
        dst[di + 1] = Math.min(255, Math.max(0, Math.round(f.data[si + 1] * 255)));
        dst[di + 2] = Math.min(255, Math.max(0, Math.round(f.data[si + 2] * 255)));
        dst[di + 3] = Math.min(255, Math.max(0, Math.round(f.data[si + 3] * 255)));
      }
    }
  }
  dispose(): void {
    if (this._disposed) return;   // 幂等
    this._disposed = true;
    this._slices = [];            // 弃引用交 GC（软域无显存句柄）
    this._onDisposed?.();
    this._onDisposed = null;
  }
  // 测试观测口（off-contract）：slice 原始字节。
  sliceBytes(slice: number): Uint8Array { this._aliveGuard(); return this._slices[slice]; }
}

// SoftTexRead 适配（2D sampler 源：纹理 / FBO 颜色面）。
function texReadOf(src: Gl2TexSource): SoftTexRead {
  if ("kind" in src && src.kind === "tex2d") {
    const t = src as SoftTexture;
    const { format, w, h, data } = t;
    return {
      w, h,
      fetch(x, y, out) {
        if (!data) { out.fill(0); return; }
        const cx = Math.min(w - 1, Math.max(0, x)), cy = Math.min(h - 1, Math.max(0, y));
        if (format === "rgba8") {
          const i = (cy * w + cx) * 4;
          out[0] = (data as Uint8Array)[i] / 255; out[1] = (data as Uint8Array)[i + 1] / 255;
          out[2] = (data as Uint8Array)[i + 2] / 255; out[3] = (data as Uint8Array)[i + 3] / 255;
        } else if (format === "rgba16f") {
          const i = (cy * w + cx) * 4;
          out[0] = (data as Float32Array)[i]; out[1] = (data as Float32Array)[i + 1];
          out[2] = (data as Float32Array)[i + 2]; out[3] = (data as Float32Array)[i + 3];
        } else if (format === "r8") {
          const i = cy * w + cx;
          out[0] = (data as Uint8Array)[i] / 255; out[1] = 0; out[2] = 0; out[3] = 1;   // R8 采样 = (r,0,0,1)
        } else {   // r32f
          const i = cy * w + cx;
          out[0] = (data as Float32Array)[i]; out[1] = 0; out[2] = 0; out[3] = 1;
        }
      },
    };
  }
  const f = src as SoftFBO;
  return {
    w: f.w, h: f.h,
    fetch(x, y, out) {
      const cx = Math.min(f.w - 1, Math.max(0, x)), cy = Math.min(f.h - 1, Math.max(0, y));
      const i = (cy * f.w + cx) * 4;
      out[0] = f.data[i]; out[1] = f.data[i + 1]; out[2] = f.data[i + 2]; out[3] = f.data[i + 3];
    },
  };
}

function arenaReadOf(a: SoftTileArena): SoftArenaRead {
  return {
    tileSize: a.tileSize,
    fetch(layer, x, y, out) {
      const s = a.sliceBytes(layer);
      if (!s) { out.fill(0); return; }
      const i = (y * a.tileSize + x) * 4;
      out[0] = s[i] / 255; out[1] = s[i + 1] / 255; out[2] = s[i + 2] / 255; out[3] = s[i + 3] / 255;
    },
  };
}

export class SoftGl2Port implements Gl2Port {
  readonly caps: Gl2Caps = {
    maxTextureSize: 16384,
    maxArrayLayers: 2048,
    maxTextureUnits: 16,
    floatColorBuffer: true,
  };
  readonly isLost = false;
  readonly generation = 0;   // 软域无 context-loss（结构自愈契约恒稳态）
  private _invalidated: (() => void)[] = [];
  private _programs = new Map<string, CpuDraw | "gpu-only">();
  private _fboPool: SoftFBO[] = [];

  onInvalidated(cb: () => void): void { this._invalidated.push(cb); }

  // ---- program：注册即对表核验（CPU 版缺席响亮 throw，ADR-0009 决定 5）----
  warmProgram(name: string, vert: string, frag: string): void { this.program(name, vert, frag); }   // 软域无编译成本：同义
  program(name: string, _vert?: string, _frag?: string): void {
    if (this._programs.has(name)) return;
    const cpu = resolveCpuProgram(name);
    if (cpu === null) throw new Error(`SHADER_NO_CPU_EQUIV:${name} (missing in soft-shaders.ts table — add a CPU version or register as GPU_ONLY)`);
    this._programs.set(name, cpu);
  }

  // ---- FBO 池（借还语义同 BrowserGl2Port：复用不清空——内容 stale 与 GPU 池一致）----
  borrowFBO(w: number, h: number, prec: FBOPrec = "u8"): PooledFBO {
    for (let i = 0; i < this._fboPool.length; i++) {
      const f = this._fboPool[i];
      if (f.w === w && f.h === h && f.prec === prec) {
        this._fboPool.splice(i, 1);
        return f;
      }
    }
    const fbo: SoftFBO = { w, h, prec, data: new Float32Array(w * h * 4) };
    return fbo;
  }
  returnFBO(f: PooledFBO): void { this._fboPool.push(f as SoftFBO); }
  fboPoolHas(w: number, h: number, prec: FBOPrec): boolean { return this._fboPool.some((f) => f.w === w && f.h === h && f.prec === prec); }
  get fboPoolBudgetBytes(): number { return Infinity; }
  clearPool(): void { this._fboPool = []; }
  get fboPoolStats(): { count: number; bytes: number } {
    let b = 0;
    for (const f of this._fboPool) b += f.w * f.h * (f.prec === "f32" ? 16 : f.prec === "f16" ? 8 : 4);
    return { count: this._fboPool.length, bytes: b };
  }

  clearFBO(f: PooledFBO, rgba: [number, number, number, number]): void {
    const sf = f as SoftFBO;
    const q = sf.prec === "u8";
    const v = rgba.map((x) => q ? Math.min(255, Math.max(0, Math.round(x * 255))) / 255 : x);
    for (let i = 0; i < sf.data.length; i += 4) {
      sf.data[i] = v[0]; sf.data[i + 1] = v[1]; sf.data[i + 2] = v[2]; sf.data[i + 3] = v[3];
    }
  }

  // ---- 绘制 ----
  draw(spec: Gl2DrawSpec): void { this._drawCommon(spec, null, 0); }
  drawInstanced(spec: Gl2DrawSpec, instances: Float32Array, count: number): void {
    this._drawCommon(spec, instances, count);
  }

  private _drawCommon(spec: Gl2DrawSpec, instances: Float32Array | null, count: number): void {
    const prog = this._programs.get(spec.program);
    if (!prog) throw new Error(`PROGRAM_NOT_BUILT:${spec.program}`);
    if (prog === "gpu-only") throw new Error(`GPU_ONLY_SHADER:${spec.program} (soft domain has no present pass)`);
    if (spec.target === "screen") throw new Error("SOFT_NO_SCREEN (headless — present goes through FBO + readPixels)");
    const target = spec.target as SoftFBO;
    const vp = spec.viewport ?? [0, 0, target.w, target.h];
    if (vp[0] !== 0 || vp[1] !== 0) throw new Error("SOFT_VIEWPORT_OFFSET_UNSUPPORTED");   // 本引擎全部 pass 视口原点 0
    const vw = vp[2], vh = vp[3];
    const quant = target.prec === "u8";
    const blend = spec.blend ?? "none";

    if (spec.clear) {
      this.clearFBO(target, spec.clear);
    }
    const sc = spec.scissor ?? null;
    // 像素域 = viewport ∩ scissor ∩ target（quad 铺满 viewport）。
    const x0 = Math.max(0, sc ? sc.x : 0), y0 = Math.max(0, sc ? sc.y : 0);
    const x1 = Math.min(vw, target.w, sc ? sc.x + sc.w : vw);
    const y1 = Math.min(vh, target.h, sc ? sc.y + sc.h : vh);

    const data = target.data;
    const writePx = (px: number, py: number, rgba: Float32Array): void => {
      if (px < x0 || px >= x1 || py < y0 || py >= y1) return;   // scissor（实例路径自查）
      const i = (py * target.w + px) * 4;
      let r: number, g: number, b: number, a: number;
      if (blend === "none") {
        r = rgba[0]; g = rgba[1]; b = rgba[2]; a = rgba[3];
      } else if (blend === "premult-over") {
        const ia = 1 - rgba[3];
        r = rgba[0] + data[i] * ia; g = rgba[1] + data[i + 1] * ia;
        b = rgba[2] + data[i + 2] * ia; a = rgba[3] + data[i + 3] * ia;
      } else {   // max-alpha：MAX 方程逐通道
        r = Math.max(rgba[0], data[i]); g = Math.max(rgba[1], data[i + 1]);
        b = Math.max(rgba[2], data[i + 2]); a = Math.max(rgba[3], data[i + 3]);
      }
      if (quant) {   // u8 目标逐写量化（GPU blend→store 同步语义）
        r = Math.min(255, Math.max(0, Math.round(r * 255))) / 255;
        g = Math.min(255, Math.max(0, Math.round(g * 255))) / 255;
        b = Math.min(255, Math.max(0, Math.round(b * 255))) / 255;
        a = Math.min(255, Math.max(0, Math.round(a * 255))) / 255;
      }
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    };

    // 纹理解析（filter 选项软域忽略——NEAREST 唯一语义）。
    const texEntries = spec.textures ?? {};
    const resolveSrc = (name: string): Gl2TexSource | null => {
      const e = texEntries[name];
      if (!e) return null;
      if ("kind" in e || "prec" in e) return e as Gl2TexSource;
      return e.src;
    };
    const ctx: CpuDrawCtx = {
      vw, vh,
      uniforms: spec.uniforms ?? {},
      tex: (name) => {
        const s = resolveSrc(name);
        if (!s) return null;
        if ("kind" in s && s.kind === "arena") throw new Error(`ARENA_BOUND_TO_SAMPLER2D:${name}`);
        return texReadOf(s);
      },
      arena: (name) => {
        const s = resolveSrc(name);
        if (!s) return null;
        if (!("kind" in s) || s.kind !== "arena") throw new Error(`SAMPLER2DARRAY_NEEDS_ARENA:${name}`);
        return arenaReadOf(s as SoftTileArena);
      },
      forEachPixel: (frag) => {
        const out = new Float32Array(4);
        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            if (frag(px, py, out)) writePx(px, py, out);
          }
        }
      },
      instances,
      count,
      writePixel: writePx,
    };
    (prog as CpuDraw)(ctx);
  }

  // ---- 读回 ----
  readPixels(src: PooledFBO, x: number, y: number, w: number, h: number): Uint8Array {
    const f = src as SoftFBO;
    const out = new Uint8Array(w * h * 4);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const si = ((y + py) * f.w + (x + px)) * 4;
        const di = (py * w + px) * 4;
        out[di] = Math.min(255, Math.max(0, Math.round(f.data[si] * 255)));
        out[di + 1] = Math.min(255, Math.max(0, Math.round(f.data[si + 1] * 255)));
        out[di + 2] = Math.min(255, Math.max(0, Math.round(f.data[si + 2] * 255)));
        out[di + 3] = Math.min(255, Math.max(0, Math.round(f.data[si + 3] * 255)));
      }
    }
    return out;
  }

  // ---- 2D 纹理 ----
  createTexture(): Gl2Texture {
    const t: SoftTexture = { kind: "tex2d", format: null, w: 0, h: 0, data: null };
    return t;
  }
  uploadTexture(tex: Gl2Texture, format: TexUploadFormat, w: number, h: number, data: ArrayBufferView): void {
    const t = tex as SoftTexture;
    t.format = format; t.w = w; t.h = h;
    if (format === "rgba8") {
      const n = w * h * 4;
      t.data = new Uint8Array(n);
      t.data.set(new Uint8Array(data.buffer, data.byteOffset, Math.min(n, data.byteLength)));
    } else if (format === "r8") {
      const n = w * h;
      t.data = new Uint8Array(n);
      t.data.set(new Uint8Array(data.buffer, data.byteOffset, Math.min(n, data.byteLength)));
    } else {   // rgba16f / r32f：f32 raw 拷贝（f16 舍入不复刻）
      const n = w * h * (format === "rgba16f" ? 4 : 1);
      const src = new Float32Array(data.buffer, data.byteOffset, n);
      t.data = new Float32Array(n);
      t.data.set(src);
    }
  }
  deleteTexture(tex: Gl2Texture): void {
    const t = tex as SoftTexture;
    t.data = null; t.format = null; t.w = 0; t.h = 0;
  }

  // ---- tile arena ----
  private _arenas = new Set<SoftTileArena>();

  createTileArena(tileSize: number, initialSlices: number): Gl2TileArena {
    const a: SoftTileArena = new SoftTileArena(tileSize, initialSlices, () => this._arenas.delete(a));
    this._arenas.add(a);
    return a;
  }

  // 租户记账（与 BrowserGl2Port 同形；软域「显存」= JS heap 承诺量）。
  get arenaStats(): { count: number; bytes: number } {
    let bytes = 0;
    for (const a of this._arenas) bytes += a.capacity * a.tileSize * a.tileSize * 4;
    return { count: this._arenas.size, bytes };
  }
}
