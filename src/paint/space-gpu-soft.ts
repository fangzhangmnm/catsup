// paint/space-gpu-soft.ts —— 三维内核显卡接口的软件版（贴图主线 1-4b）：纯计算，一格一格调程序的 JavaScript 版，照同样的累积规则写进数组。created 2026-11-11 by Claude Opus 5.5
// 不 import three、不碰页面。用在不带浏览器的测试里（小画布），不用于整幅三维画面，不追速度。
// 和真显卡版对齐的地方：离屏图每通道 8 位，每次写入后按「四舍五入到 1/255」量化（显卡往 8 位的图里写也是这样）；max = 每通道取最大；
//   over = 预乘叠加 src + dst·(1 − src.a)（混合在 0..1 的浮点里算、写回再量化）；裁剪框外的写入丢掉；清 = 全透明。
import type { SpaceCpuCtx, SpaceData, SpaceDraw, SpaceGpu, SpaceImage, SpaceProgram } from "./space-gpu.ts";

interface SoftImage extends SpaceImage { px: Uint8ClampedArray }
interface SoftData extends SpaceData { v: Float32Array }

const q = (x: number): number => Math.round(Math.max(0, Math.min(1, x)) * 255);

export class SoftSpaceGpu implements SpaceGpu {
  private readonly programs = new Map<string, SpaceProgram>();

  register(p: SpaceProgram): void {
    if (this.programs.has(p.name)) throw new Error(`SpaceGpu: program ${p.name} registered twice`);
    if (typeof p.cpu !== "function") throw new Error(`SpaceGpu: program ${p.name} has no CPU version (programs that write into textures come in pairs)`);
    this.programs.set(p.name, p);
  }
  image(w: number, h: number): SpaceImage { const im: SoftImage = { kind: "space-image", w, h, px: new Uint8ClampedArray(w * h * 4) }; return im; }
  data(w: number, h: number, values: Float32Array): SpaceData {
    if (values.length !== w * h) throw new Error(`SpaceGpu.data: ${values.length} values for ${w}x${h}`);
    const d: SoftData = { kind: "space-data", w, h, v: Float32Array.from(values) };
    return d;
  }
  draw(d: SpaceDraw): void {
    const p = this.programs.get(d.program);
    if (!p) throw new Error(`SpaceGpu: program ${d.program} is not registered`);
    const t = d.target as SoftImage, W = t.w, H = t.h, px = t.px;
    if (d.clear) px.fill(0);
    const sx0 = Math.max(0, d.scissor?.x ?? 0), sy0 = Math.max(0, d.scissor?.y ?? 0);
    const sx1 = Math.min(W, d.scissor ? d.scissor.x + d.scissor.w : W), sy1 = Math.min(H, d.scissor ? d.scissor.y + d.scissor.h : H);
    const datas = d.data ?? {}, max = d.accum === "max";
    const ctx: SpaceCpuCtx = {
      instances: d.instances, count: d.count, uniforms: d.uniforms ?? {},
      data: (name, x, y) => { const dd = datas[name] as SoftData | undefined; if (!dd) throw new Error(`SpaceGpu: data ${name} not bound`); return x < 0 || y < 0 || x >= dd.w || y >= dd.h ? 0 : dd.v[y * dd.w + x]; },
      write: (x, y, r, g, b, a) => {
        if (x < sx0 || y < sy0 || x >= sx1 || y >= sy1) return;
        const o = (y * W + x) * 4;
        if (max) { px[o] = Math.max(px[o], q(r)); px[o + 1] = Math.max(px[o + 1], q(g)); px[o + 2] = Math.max(px[o + 2], q(b)); px[o + 3] = Math.max(px[o + 3], q(a)); return; }
        const k = 1 - a;
        px[o] = q(r + (px[o] / 255) * k); px[o + 1] = q(g + (px[o + 1] / 255) * k); px[o + 2] = q(b + (px[o + 2] / 255) * k); px[o + 3] = q(a + (px[o + 3] / 255) * k);
      },
    };
    p.cpu(ctx);
  }
  copy(src: SpaceImage, dst: SpaceImage): void {
    if (src.w !== dst.w || src.h !== dst.h) throw new Error("SpaceGpu.copy: size mismatch");
    (dst as SoftImage).px.set((src as SoftImage).px);
  }
  read(img: SpaceImage): Uint8Array { return Uint8Array.from((img as SoftImage).px); }
  release(_x: SpaceImage | SpaceData): void { /* 软件版：交给垃圾回收 */ }
  /** 软件版独有：离屏图的像素（交给画画内核的软件显卡当薄层用）。 */
  pixels(img: SpaceImage): Uint8ClampedArray { return (img as SoftImage).px; }
}
