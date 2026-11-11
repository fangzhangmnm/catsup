// minccino/contract/offscreen-gpu.ts —— 画进离屏图的那个小显卡接口（贴图主线 1-4b：三维内核的空间层用它画薄层；created 2026-11-11 by Claude Opus 5.5）。
// 渲染器那半边实现它（真显卡版 providers/three/offscreen-gpu-gl.ts）；软件版在 src/paint/space-gpu-soft.ts（纯计算）。引擎不认识「画」：这里只有实例、数据图、程序、离屏图。
// 五个动作：登记一个程序（GLSL + JavaScript 版一对）、建离屏图、建数据图、画（一批实例 + 几张数据图 + 一个程序 → 一张离屏图；取最大 / 预乘叠加两种累积、裁剪框）、读回；copy 给定型层用。
// 规矩：凡是往贴图里写数据的程序都成对；软件版里用到没有 JavaScript 版的 = 抛。往屏幕上画的（显示、画风）不走这个接口。
// 换手：每个动作开头把自己要的显卡状态全设好，结尾把动过的归位（混合、裁剪、绑定、上传开关），再由调用的人通知 three 作废它的状态缓存。

/** 离屏图：RGBA 每通道 8 位（和画画内核二维笔尖的累积图同一种精度），第 0 行 = 画布第 0 行，预乘。 */
export interface OffscreenImage { readonly kind: "offscreen-image"; readonly w: number; readonly h: number }
/** 数据图：每格一个 32 位浮点（单通道），按格子号取（不插值、不缩小）。 */
export interface OffscreenData { readonly kind: "offscreen-data"; readonly w: number; readonly h: number }

/** 程序的 JavaScript 版：拿到这一批实例，自己决定每个实例覆盖哪些格、每格写什么（write 按累积规则混进离屏图；裁剪框外的写入被丢掉）。 */
export interface OffscreenCpuCtx {
  readonly instances: Float32Array;
  readonly count: number;
  readonly uniforms: Readonly<Record<string, number | readonly number[]>>;
  /** 数据图第 (x, y) 格的值（越界 = 0）。 */
  data(name: string, x: number, y: number): number;
  /** 往第 (x, y) 格写一个预乘的 RGBA（0..1），按这次 draw 的累积方式混进去。 */
  write(x: number, y: number, r: number, g: number, b: number, a: number): void;
}
export type OffscreenCpuProgram = (ctx: OffscreenCpuCtx) => void;

/**
 * 一个程序 = 一对。GLSL：顶点着色器收 `layout(location=0) in vec2 a_quad`（单位方块 0..1）和 `layout(location=1) in vec4 a_inst`（每实例四个数），
 * 自己算这个实例在离屏图上盖哪一块；片元着色器输出预乘 RGBA。数据图是 `uniform highp sampler2D <名字>`（texelFetch 取 .r）。
 */
export interface OffscreenProgram { readonly name: string; readonly vert: string; readonly frag: string; readonly cpu: OffscreenCpuProgram }

/** 累积：max = 每个通道取最大（淡彩：只攒浓度）；over = 预乘叠加 src + dst·(1 − src.a)（叠色）。 */
export type OffscreenAccum = "max" | "over";

export interface OffscreenDraw {
  readonly program: string;
  readonly target: OffscreenImage;
  /** 画之前把整张清成透明。 */
  readonly clear?: boolean;
  /** 只写这一块（离屏图的格子坐标）；不给 = 整张。 */
  readonly scissor?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly accum: OffscreenAccum;
  /** 每实例四个数（紧密排）。 */
  readonly instances: Float32Array;
  readonly count: number;
  readonly data?: Readonly<Record<string, OffscreenData>>;
  readonly uniforms?: Readonly<Record<string, number | readonly number[]>>;
}

export interface OffscreenGpu {
  /** 登记一个程序（同一个名字登记两次 = 抛）。 */
  register(p: OffscreenProgram): void;
  image(w: number, h: number): OffscreenImage;
  /** 建 / 换一张数据图（values 长度 = w·h）。 */
  data(w: number, h: number, values: Float32Array): OffscreenData;
  draw(d: OffscreenDraw): void;
  /** 把 src 整张拷到 dst（一样大）：定型层 → 当帧那张。 */
  copy(src: OffscreenImage, dst: OffscreenImage): void;
  /** 读回（预乘 RGBA 字节，第 0 行 = 第 0 行）。测试 / 探针用。 */
  read(img: OffscreenImage): Uint8Array;
  release(x: OffscreenImage | OffscreenData): void;
}
