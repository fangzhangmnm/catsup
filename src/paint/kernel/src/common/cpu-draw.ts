// common/cpu-draw.ts —— 软件显卡里程序的写法（类型；原来住 backend/soft-shaders.ts，2026-11-11 搬来：显卡接口 Gl2Port.registerProgram 要用，common 不许 import backend）。
// 内核自己的程序（soft-shaders.ts 那张表）和宿主登记的程序（registerProgram 的 cpu）都是这一种写法。moved 2026-11-11 by Claude Opus 5.5

export interface SoftTexRead {
  readonly w: number;
  readonly h: number;
  // texel 直读（越界 clamp-to-edge；float 纹理 raw 值，u8 归一 0..1）。out 长度 4。
  fetch(x: number, y: number, out: Float32Array): void;
}

export interface SoftArenaRead {
  readonly tileSize: number;
  // (layer, x, y) 点采（u8 归一）。
  fetch(layer: number, x: number, y: number, out: Float32Array): void;
}

export interface CpuDrawCtx {
  // viewport（目标像素域；scissor 已并进 forEachPixel 的遍历域）。
  vw: number; vh: number;
  uniforms: Record<string, number | boolean | number[] | Float32Array>;
  tex: (name: string) => SoftTexRead | null;         // 2D sampler（缺省 null = 未提供，视作透明占位）
  arena: (name: string) => SoftArenaRead | null;     // sampler2DArray
  // 遍历 viewport∩scissor 的每个像素；frag 返回 false = discard（不写不 blend）。
  forEachPixel(frag: (px: number, py: number, out: Float32Array) => boolean): void;
  // drawInstanced 专用：实例数据（stride 4）+ 数量；实例覆盖域内逐像素（GL 光栅化语义：
  //   像素中心落在实例 quad 内才着色）。soft-gl2-port 保证实例序 = 数组序。
  instances: Float32Array | null;
  count: number;
  // 实例路径专用写口（同一像素可被多实例先后写，逐写 blend+量化——与 GPU 逐 fragment blend 等价）。
  writePixel(px: number, py: number, rgba: Float32Array): void;
}

export type CpuDraw = (ctx: CpuDrawCtx) => void;
