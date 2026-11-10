// v0.9.12 lockAlpha 真 source-atop 行为锚（node 无 GL：SoftGl2Port 全链）——2026-08-19 审计修。
// 语义拍板（user 2026-08-19「lockalpha的语义就是改色不动alpha」，对齐 CPU 像素笔 brush.ts _pixelBlendSpan "atop"）：
//   · α 逐字节不变（旧公式 ovA*=base.a 再 source-over 会让半透明 α→α(2−α)，AA 边反复填/画越来越硬）；
//   · α=0 处像素完全不变（不写隐形色——贴图防黑边走导出 defringe，另案）；
//   · erase 不受锁α影响（v242 CPU 像素笔 erase 分支优先；GL 旧行为是被锁衰减擦，也是分叉）。
// 顺带补上审计缺口：fill 像素路径首次进 npm test（此前只在 playwright smoke）。
import { describe, it } from "./runner.mjs";
import assert from "node:assert/strict";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { GlRoom } from "../src/backend/gl/gl-room.ts";
import { RasterService } from "../src/backend/gl/raster-service.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";

const N = 128;
const FILL = [230, 60, 40];

// 三段 α 竖带：全透明 / 半透明 / 实——lockAlpha 的三个语义区一次覆盖。
function makeBase() {
  const pixels = new LayerPixels(N, N);
  const region = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    region[i] = 40 + (x % 100); region[i + 1] = 200 - (y % 90); region[i + 2] = 90;
    region[i + 3] = x < 32 ? 0 : x < 64 ? 128 : 230;
  }
  pixels.putRegion(0, 0, N, N, region);
  return { pixels, region: new Uint8ClampedArray(region) };
}

function fullMask() {
  const m = new Uint8Array(N * N).fill(255);
  return { data: m, ox: 0, oy: 0, ow: N, oh: N };
}

function makeRaster() {
  return new RasterService(new GlRoom(new SoftGl2Port(), 512));
}

function bakeFill(raster, pixels, lockAlpha) {
  const ov = { kind: "fill", color: FILL, bx: 0, by: 0, bw: N, bh: N, layerId: 1, lockAlpha, selMask: fullMask() };
  return raster.bakeStamps(1, pixels, ov, N, N, (px, x, y, w, h) => pixels.applyRegionDiff(x, y, w, h, px));
}

describe("fill lockAlpha · 真 atop（v0.9.12）", () => {
  it("α 平面逐字节不变；α=0 处像素完全不变；α>0 处 RGB = fill 色（±1）", () => {
    const raster = makeRaster();
    const { pixels, region } = makeBase();
    assert.ok(bakeFill(raster, pixels, true), "bake 成功（软域全链）");
    const after = pixels.getRegion(0, 0, N, N);
    let aBad = 0, zeroBad = 0, md = 0;
    for (let p = 0; p < N * N; p++) {
      const i = p * 4, a = region[i + 3];
      if (after[i + 3] !== a) aBad++;
      if (a === 0) {
        // GL merge 外层按 ao 归一：α=0 处 RGB 被规范化为 0（改动前就如此，不是本次引入）。
        // 语义锚 = α 保持 0 且**没被写进 fill 色**（RGB=原值或 0 都算「无隐形色」）。
        const keep = (after[i] === region[i] && after[i + 1] === region[i + 1] && after[i + 2] === region[i + 2]);
        const zeroed = (after[i] === 0 && after[i + 1] === 0 && after[i + 2] === 0);
        if (!keep && !zeroed) zeroBad++;
        continue;
      }
      for (let k = 0; k < 3; k++) md = Math.max(md, Math.abs(after[i + k] - FILL[k]));
    }
    assert.equal(aBad, 0, "α 一个字节都不动（旧公式：半透明带 128→约 191）");
    assert.equal(zeroBad, 0, "α=0 区不写隐形色（原值或规范化 0 之外的 RGB = 泄漏）");
    assert.ok(md <= 1, `α>0 处 RGB 整体换成 fill 色（mask=255 全强度），maxΔ=${md}`);
    pixels.dispose();
  });

  it("重复 fill 三次 α 仍不变（旧公式 α(2−α) 反复变硬的回归锚）", () => {
    const raster = makeRaster();
    const { pixels, region } = makeBase();
    for (let r = 0; r < 3; r++) assert.ok(bakeFill(raster, pixels, true), `第 ${r + 1} 次 bake`);
    const after = pixels.getRegion(0, 0, N, N);
    let aBad = 0;
    for (let p = 0; p < N * N; p++) if (after[p * 4 + 3] !== region[p * 4 + 3]) aBad++;
    assert.equal(aBad, 0, "三次之后 α 平面仍逐字节等于 before");
    pixels.dispose();
  });

  it("非 lock fill 照旧 source-over（半透明带 α 上浮、全透明带被填上）——对照组", () => {
    const raster = makeRaster();
    const { pixels, region } = makeBase();
    assert.ok(bakeFill(raster, pixels, false));
    const after = pixels.getRegion(0, 0, N, N);
    const iZero = (10 * N + 8) * 4, iHalf = (10 * N + 40) * 4;
    assert.equal(region[iZero + 3], 0, "前置：对照点在全透明带");
    assert.equal(after[iZero + 3], 255, "非 lock：全透明带被填成实色");
    assert.equal(after[iHalf + 3], 255, "非 lock：半透明带盖满（fill α=1 source-over）");
    pixels.dispose();
  });

  it("erase 不受锁α影响：锁层上照常全力擦（对齐 CPU 像素笔 erase 分支优先）", () => {
    const raster = makeRaster();
    const { pixels, region } = makeBase();
    // 一颗大 stamp 盖画面中央（覆盖半透明带 x∈[32,64)）；erase + lockAlpha 同时真。
    const ov = {
      stamps: [{ x: 48, y: 64, size: 40, alpha: 1 }],
      shape: { hardness: 0.99, color: [0, 0, 0], buildup: false },
      bx: 24, by: 40, bw: 48, bh: 48, layerId: 1, opacity: 1, erase: true, blendMode: "source-over",
      lockAlpha: true, selMask: null,
    };
    assert.ok(raster.bakeStamps(1, pixels, ov, N, N, (px, x, y, w, h) => pixels.applyRegionDiff(x, y, w, h, px)));
    const after = pixels.getRegion(0, 0, N, N);
    const i = (64 * N + 48) * 4;   // stamp 圆心（半透明带 α=128）
    assert.equal(region[i + 3], 128, "前置：圆心在半透明带");
    assert.equal(after[i + 3], 0, "全力擦到 0（旧 GL 行为：被 ovA*=base.a 衰减只擦到 ~64）");
    pixels.dispose();
  });
});
