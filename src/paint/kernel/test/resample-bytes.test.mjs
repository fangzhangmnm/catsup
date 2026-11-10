// 轴对齐字节重采样（src/resample-bytes.ts）验收：面积平均整数比=严格 box、alpha 加权不拖暗、
// 最近邻/恒等、双三次限幅。裁剪模板模式 commit 与 resize 的引擎。
import { describe, it, assert, eq } from "./runner.mjs";
import { areaResampleBytes, nearestResampleBytes, bicubicResampleBytes, resampleBytes } from "../src/backend/algorithms/resample-bytes.ts";

const mk = (w, h, fn) => {
  const b = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b.set(fn(x, y), (y * w + x) * 4);
  return b;
};

describe("resample-bytes · 面积平均", () => {
  it("÷8 整数比 = 严格 8×8 块均值（1024草稿→像素画的鲁棒性）", () => {
    // 16×16 → 2×2：每块 8×8。左上块全 (80,160,240,255)，其余 0
    const src = mk(16, 16, (x, y) => (x < 8 && y < 8) ? [80, 160, 240, 255] : [0, 0, 0, 0]);
    const out = areaResampleBytes(src, 16, 16, 2, 2);
    eq(out[0], 80); eq(out[1], 160); eq(out[2], 240); eq(out[3], 255, "左上块 = 纯色均值");
    eq(out[7], 0, "右上块全透明");
  });
  it("alpha 加权：透明像素 RGB 不拖暗（premult 口径）", () => {
    // 2×1 → 1×1：左红不透明 + 右透明黑 → 颜色仍纯红、alpha 减半
    const src = new Uint8ClampedArray([200, 0, 0, 255, 0, 0, 0, 0]);
    const out = areaResampleBytes(src, 2, 1, 1, 1);
    eq(out[0], 200, "红不被透明黑拖暗");
    eq(out[3], 128, "alpha = 覆盖率均值");
  });
  it("非整数比：覆盖积分守恒（3→2 缩，权重 1.5 像素/格）", () => {
    const src = mk(3, 1, (x) => [x * 100, 0, 0, 255]);   // 0,100,200
    const out = areaResampleBytes(src, 3, 1, 2, 1);
    // 格0 = (0*1 + 100*0.5)/1.5 = 33.3；格1 = (100*0.5 + 200*1)/1.5 = 166.7
    assert(Math.abs(out[0] - 33) <= 1 && Math.abs(out[4] - 167) <= 1, `实得 ${out[0]},${out[4]}`);
  });
});

describe("resample-bytes · 最近邻/双三次/入口", () => {
  it("nearest：像素中心取样；恒等尺寸原样返回", () => {
    const src = mk(4, 4, (x, y) => [x * 60, y * 60, 0, 255]);
    const out = nearestResampleBytes(src, 4, 4, 2, 2);
    eq(out[0], 60, "取 (1,1)（中心 (0.5+0.5)*4/2=1 → floor）");
    const same = resampleBytes(src, 4, 4, 4, 4, "auto");
    assert(src.every((v, i) => v === same[i]), "恒等尺寸逐字节");
  });
  it("nearest 整数倍放大：逐像素等值块复制（像素画 upscale 完美还原）", () => {
    const src = mk(2, 2, (x, y) => [x * 100, y * 100, 50, 255]);
    const out = nearestResampleBytes(src, 2, 2, 6, 6);   // ×3
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      const sx = Math.floor(x / 3), sy = Math.floor(y / 3);
      const o = (y * 6 + x) * 4, p = (sy * 2 + sx) * 4;
      for (let c = 0; c < 4; c++) eq(out[o + c], src[p + c], `(${x},${y}) 通道 ${c} 应等于源块`);
    }
  });
  it("nearest 非整数倍放大：尺寸正确、只含源色（无混色缝）", () => {
    const src = mk(2, 1, (x) => x === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255]);
    const out = nearestResampleBytes(src, 2, 1, 5, 3);   // ×2.5 / ×3
    eq(out.length, 5 * 3 * 4, "输出尺寸 5×3");
    for (let i = 0; i < 15; i++) {
      const r = out[i * 4], b = out[i * 4 + 2];
      assert((r === 255 && b === 0) || (r === 0 && b === 255), `像素 ${i} 必是纯红或纯蓝，无中间混色`);
    }
  });
  it("bicubic 放大：α 台阶不因负瓣过冲（限幅生效）", () => {
    const src = mk(8, 4, (x) => x < 4 ? [200, 40, 40, 128] : [0, 0, 0, 0]);
    const out = bicubicResampleBytes(src, 8, 4, 24, 12);
    let maxA = 0;
    for (let i = 3; i < out.length; i += 4) if (out[i] > maxA) maxA = out[i];
    assert(maxA <= 129, `放大后 α 峰值 ${maxA} ≤128(+1)`);
  });
  it("auto：双轴缩→area；放大→bicubic", () => {
    const src = mk(8, 8, () => [10, 20, 30, 255]);
    const dn = resampleBytes(src, 8, 8, 4, 4, "auto");
    eq(dn[0], 10, "缩：纯色不变");
    const up = resampleBytes(src, 8, 8, 16, 16, "auto");
    eq(up[0], 10, "放：纯色不变");
  });
});
