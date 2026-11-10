// filter kernel 契约（C8 filter 档口）——region filter 的**纯计算面**，从 plugins/ 析出。
//
// 一个 kernel = { id, defaults, bleedRadius?, bake }，零 DOM 零注册副作用：
//   - bake(src, dst, params, mask, w, h)：纯函数 src→dst（同尺寸 RGBA）；mask=null 全图，
//     mask = gray8（Selection.materializeMaskRegion 窄读口产物），mask[i] < 128 → passthrough。
//   - 决定论（ADR-0009）：无时钟无随机（stainedGlass 的抖动 = 确定性 hash）——同 params+src
//     → 同 dst，MCP 回放 / 双 backend 对拍的前提。
// UI 面（title/buildBody/菜单注册）留 src/plugins/ 的 Filter 类，委托本域的 bake/defaults
// ——同一份数学两面消费，不复刻（filters.ts 的 Filter 契约是它的前端穿衣）。
// 注册清单 = ./index.ts FILTER_KERNELS（backend 静态封闭集；插件下载纪元另议）。

export type FilterParams = Record<string, unknown>;

export interface FilterKernel {
  id: string;
  defaults(): FilterParams;
  /** 输出一个像素最多读输入 ±N 邻域（non-local 用）；per-pixel filter 返 0。 */
  bleedRadius(params: FilterParams | null): number;
  bake(
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    params: FilterParams,
    mask: Uint8Array | null,
    w: number,
    h: number,
  ): void;
}

export function clamp8(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }
