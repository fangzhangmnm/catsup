/** 离屏图：RGBA 每通道 8 位（和画画内核二维笔尖的累积图同一种精度），第 0 行 = 画布第 0 行，预乘。 */
export interface OffscreenImage {
    readonly kind: "offscreen-image";
    readonly w: number;
    readonly h: number;
}
/** 数据图（按格子号取，不插值、不缩小）：r32f = 每格一个 32 位浮点；rgba16ui = 每格四个 16 位无符号整数（8 字节的定长表；GLSL 里是 usampler2D，texelFetch 取 uvec4）。 */
export type OffscreenDataFormat = "r32f" | "rgba16ui";
export interface OffscreenData {
    readonly kind: "offscreen-data";
    readonly w: number;
    readonly h: number;
    readonly format: OffscreenDataFormat;
}
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
export interface OffscreenProgram {
    readonly name: string;
    readonly vert: string;
    readonly frag: string;
    readonly cpu: OffscreenCpuProgram;
}
/** 累积：max = 每个通道取最大（淡彩：只攒浓度）；over = 预乘叠加 src + dst·(1 − src.a)（叠色）。 */
export type OffscreenAccum = "max" | "over";
export interface OffscreenDraw {
    readonly program: string;
    readonly target: OffscreenImage;
    /** 画之前把整张清成透明。 */
    readonly clear?: boolean;
    /** 只写这一块（离屏图的格子坐标）；不给 = 整张。 */
    readonly scissor?: {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
    };
    readonly accum: OffscreenAccum;
    /** 每实例四个数（紧密排）。 */
    readonly instances: Float32Array;
    readonly count: number;
    readonly data?: Readonly<Record<string, OffscreenData>>;
    readonly uniforms?: Readonly<Record<string, number | readonly number[]>>;
}
export interface OffscreenGpu {
    /** 离屏图、数据图每边最多多少格（真显卡 = MAX_TEXTURE_SIZE）。image / data 超了 = 抛（不许让显卡静默建出一张空图）。 */
    readonly maxSize: number;
    /** 登记一个程序（同一个名字登记两次 = 抛）。 */
    register(p: OffscreenProgram): void;
    image(w: number, h: number): OffscreenImage;
    /** 建一张数据图：r32f 给 Float32Array（长度 w·h）；rgba16ui 给 Uint16Array（长度 4·w·h）。 */
    data(w: number, h: number, values: Float32Array | Uint16Array, format?: OffscreenDataFormat): OffscreenData;
    draw(d: OffscreenDraw): void;
    /** 把 src 拷到 dst（一样大）：定型层 → 当帧那张。rect = 只拷这一块（格子坐标，同一块拷到同一块）；不给 = 整张。 */
    copy(src: OffscreenImage, dst: OffscreenImage, rect?: {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
    }): void;
    /** 读回（预乘 RGBA 字节，第 0 行 = 第 0 行）。测试 / 探针用。 */
    read(img: OffscreenImage): Uint8Array;
    release(x: OffscreenImage | OffscreenData): void;
}
