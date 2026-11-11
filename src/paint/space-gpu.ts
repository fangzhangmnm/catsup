// paint/space-gpu.ts —— 三维内核自己的显卡接口（贴图主线 1-4b；统筹 11-11 定的：画画内核的显卡那一层是它的内部零件，三维另开一套）。created 2026-11-11 by Claude Opus 5.5
// 越小越好：五个动作——登记一个程序（GLSL + JavaScript 版一对）、建一张离屏图、建一张数据图、画（一批实例 + 几张数据图 + 一个程序 → 一张离屏图，
//   取最大 / 预乘叠加两种累积、裁剪框）、读回。两份实现：真显卡版在渲染器那半边（three 只在 minccino/providers/three/），软件版在 src/paint/space-gpu-soft.ts（纯计算）。
// 规矩：凡是「往贴图里写数据」的程序都成对（GLSL + JavaScript 版）；软件版里用到没有 JavaScript 版的程序 = 抛。往屏幕上画的（显示、画风）不走这个接口。
// 和画画内核无关：不 import 它的显卡那一层；两个内核之间只交一张画好的薄层（真显卡上是 WebGLTexture，软件版里是一块像素）。

/** 离屏图：RGBA 每通道 8 位（和画画内核二维笔尖的累积图同一种精度），第 0 行 = 画布第 0 行，预乘。 */
export interface SpaceImage { readonly kind: "space-image"; readonly w: number; readonly h: number }
/** 数据图：每格一个 32 位浮点（单通道），按格子号取（不插值、不缩小）。 */
export interface SpaceData { readonly kind: "space-data"; readonly w: number; readonly h: number }

/** 程序的 JavaScript 版：拿到这一批实例，自己决定每个实例覆盖哪些格、每格写什么（write 按累积规则混进离屏图；裁剪框外的写入被丢掉）。 */
export interface SpaceCpuCtx {
  readonly instances: Float32Array;
  readonly count: number;
  readonly uniforms: Readonly<Record<string, number | readonly number[]>>;
  /** 数据图第 (x, y) 格的值（越界 = 0）。 */
  data(name: string, x: number, y: number): number;
  /** 往第 (x, y) 格写一个预乘的 RGBA（0..1），按这次 draw 的累积方式混进去。 */
  write(x: number, y: number, r: number, g: number, b: number, a: number): void;
}
export type SpaceCpuProgram = (ctx: SpaceCpuCtx) => void;

/**
 * 一个程序 = 一对。GLSL：顶点着色器收 `layout(location=0) in vec2 a_quad`（单位方块 0..1）和 `layout(location=1) in vec4 a_inst`（每实例四个数），
 * 自己算这个实例在离屏图上盖哪一块；片元着色器输出预乘 RGBA。数据图是 `uniform highp sampler2D <名字>`（texelFetch 取 .r）。
 */
export interface SpaceProgram { readonly name: string; readonly vert: string; readonly frag: string; readonly cpu: SpaceCpuProgram }

/** 累积：max = 每个通道取最大（淡彩：只攒浓度）；over = 预乘叠加 src + dst·(1 − src.a)（叠色）。 */
export type SpaceAccum = "max" | "over";

export interface SpaceDraw {
  readonly program: string;
  readonly target: SpaceImage;
  /** 画之前把整张清成透明。 */
  readonly clear?: boolean;
  /** 只写这一块（离屏图的格子坐标）；不给 = 整张。 */
  readonly scissor?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly accum: SpaceAccum;
  /** 每实例四个数（紧密排）。 */
  readonly instances: Float32Array;
  readonly count: number;
  readonly data?: Readonly<Record<string, SpaceData>>;
  readonly uniforms?: Readonly<Record<string, number | readonly number[]>>;
}

export interface SpaceGpu {
  /** 登记一个程序（同一个名字登记两次 = 抛）。 */
  register(p: SpaceProgram): void;
  image(w: number, h: number): SpaceImage;
  /** 建 / 换一张数据图（values 长度 = w·h）。 */
  data(w: number, h: number, values: Float32Array): SpaceData;
  draw(d: SpaceDraw): void;
  /** 把 src 整张拷到 dst（一样大）：定型层 → 当帧那张。 */
  copy(src: SpaceImage, dst: SpaceImage): void;
  /** 读回（预乘 RGBA 字节，第 0 行 = 第 0 行）。测试 / 探针用。 */
  read(img: SpaceImage): Uint8Array;
  release(x: SpaceImage | SpaceData): void;
}
