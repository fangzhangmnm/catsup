import type { Gl2Port } from "../../common/gl2-port.ts";
export declare const REGION_PROGRAM_IDS: readonly ["region-load", "region-crop", "smudge-mask", "smudge-absorb", "reduce-weighted", "reduce-sum", "divide", "box3", "upsample-bilinear", "smudge-deposit", "wash-coverage", "wash-premult", "wash-box3", "wash-unpremult", "wash-sharpen", "wash-lerp", "field-copy", "liquify-accumulate", "liquify-warp"];
export type RegionProgramId = typeof REGION_PROGRAM_IDS[number];
/** 确保 id 已在 port 注册（幂等；SoftGl2Port 在此核对 CPU 孪生，缺 = throw）。 */
export declare function ensureRegionProgram(port: Gl2Port, id: RegionProgramId): void;
/** 一次同步注册全部（对表测试 / gl-smoke 入口；产品路径不再在起笔时调——RegionStroke.run 按需 ensure，2026-09-19）。 */
export declare function ensureAllRegionPrograms(port: Gl2Port): void;
/** 非阻塞预编译一个（有 warmProgram 走它，否则退化为同步 program）。分片暖场的原子（GLBoard.warmUp 每个空闲片两个）。 */
export declare function warmRegionProgram(port: Gl2Port, id: RegionProgramId): void;
/** 非阻塞预编译全部（gl-smoke 用；产品路径走 GLBoard.warmUp 分片，不一次全起——user 2026-09-19「启动速度是更重要的」）。 */
export declare function warmAllRegionPrograms(port: Gl2Port): void;
/** 只读：GLSL 源（gl-smoke / 调试）。 */
export declare function regionProgramSource(id: RegionProgramId): {
    vert: string;
    frag: string;
};
