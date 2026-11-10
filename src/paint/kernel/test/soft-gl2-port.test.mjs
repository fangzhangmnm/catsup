// SoftGl2Port（C8）——迂腐软实现的行为锚。
// 核心主张：**真消费类**（GLStampRasterizer / GLCompositor / GlRoom / RasterService）拿 SoftGl2Port
//   当 Gl2Port，node 无 GL 跑通栅格/合成/笔迹烤定，且结果与解析公式逐位（±量化 ε）一致。
// 对表纪律锚：未登记 shader 响亮 throw；GPU-only shader 软域 draw 响亮 throw。

import { describe, it } from "./runner.mjs";
import assert from "node:assert/strict";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { blendChannel } from "../src/common/blend-modes.ts";
import { GLStampRasterizer } from "../src/backend/gl/gl-stamp.ts";
import { GLCompositor } from "../src/backend/gl/gl-compositor.ts";
import { IndexTexture } from "../src/backend/gl/gpu-tile-pool.ts";
import { TILE_SIZE } from "../src/common/tile-geometry.ts";
import { GlRoom } from "../src/backend/gl/gl-room.ts";
import { RasterService } from "../src/backend/gl/raster-service.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { appTilePool } from "../src/backend/tiles/app-tile-pool.ts";

// ---- 解析参照（gl-smoke harness cpuStampRef 同式：falloff + wash/buildup 累积）----
function shapeAlpha(dist, radius, hardness) {
  const h = Math.max(0, Math.min(0.999, hardness));
  const innerR = h * radius, decayLen = radius - innerR;
  if (dist >= radius) return 0;
  if (decayLen <= 0 || dist <= innerR) return 1;
  const u = (dist - innerR) / decayLen; return 1 - u * u * (3 - 2 * u);
}
function ellipDist(dx, dy, aspect, rotation) {
  const c = Math.cos(rotation), s = Math.sin(rotation), ia = 1 / Math.max(0.01, aspect);
  const dxR = c * dx + s * dy, dyR = (-s * dx + c * dy) * ia;
  return Math.sqrt(dxR * dxR + dyR * dyR);
}
// 预乘字节参照（doc 行序）。
function cpuStampRef(n, stamps, color, hardness, buildup, aspect = 1, rotation = 0) {
  const out = new Uint8ClampedArray(n * n * 4);
  for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
    const i = (py * n + px) * 4;
    if (buildup) {
      let ar = 0, ag = 0, ab = 0, aa = 0;
      for (const s of stamps) {
        const sa = s.alpha * shapeAlpha(ellipDist(px + 0.5 - s.x, py + 0.5 - s.y, aspect, rotation), s.size / 2, hardness);
        if (sa <= 0) continue;
        ar = color[0] * sa + ar * (1 - sa); ag = color[1] * sa + ag * (1 - sa);
        ab = color[2] * sa + ab * (1 - sa); aa = sa + aa * (1 - sa);
      }
      out[i] = Math.round(ar * 255); out[i + 1] = Math.round(ag * 255); out[i + 2] = Math.round(ab * 255); out[i + 3] = Math.round(aa * 255);
    } else {
      let a = 0;
      for (const s of stamps) a = Math.max(a, s.alpha * shapeAlpha(ellipDist(px + 0.5 - s.x, py + 0.5 - s.y, aspect, rotation), s.size / 2, hardness));
      out[i] = Math.round(color[0] * a * 255); out[i + 1] = Math.round(color[1] * a * 255); out[i + 2] = Math.round(color[2] * a * 255); out[i + 3] = Math.round(a * 255);
    }
  }
  return out;
}
function maxDiff(ref, got) {
  let md = 0, at = -1;
  for (let i = 0; i < ref.length; i++) { const d = Math.abs(ref[i] - got[i]); if (d > md) { md = d; at = i; } }
  return { md, at };
}

const STAMPS = [
  { x: 40, y: 40, size: 50, alpha: 0.6 },
  { x: 70, y: 55, size: 40, alpha: 0.5 },
  { x: 55, y: 80, size: 60, alpha: 0.7 },
];

describe("soft-gl2 · 对表纪律", () => {
  it("未登记 shader → program 响亮 throw（缺 CPU 版不许静默）", () => {
    const port = new SoftGl2Port();
    assert.throws(() => port.program("brand-new-shader", "vert", "frag"), /SHADER_NO_CPU_EQUIV:brand-new-shader/);
  });
  it("GPU-only shader（present-affine）→ draw 响亮 throw", () => {
    const port = new SoftGl2Port();
    port.program("present-affine", "v", "f");   // 显式登记过 → 注册可过
    const f = port.borrowFBO(4, 4, "u8");
    assert.throws(() => port.draw({ program: "present-affine", target: f }), /GPU_ONLY_SHADER/);
  });
  it("readPixels/uploadTexture 字节 round-trip", () => {
    const port = new SoftGl2Port();
    const f = port.borrowFBO(2, 2, "u8");
    port.clearFBO(f, [1, 0.5, 0, 1]);
    const px = port.readPixels(f, 0, 0, 2, 2);
    assert.equal(px[0], 255); assert.equal(px[1], 128); assert.equal(px[2], 0); assert.equal(px[3], 255);
  });
  it("arena upload/copySlice round-trip", () => {
    const port = new SoftGl2Port();
    const arena = port.createTileArena(TILE_SIZE, 4);
    const bytes = new Uint8Array(TILE_SIZE * TILE_SIZE * 4);
    bytes[0] = 12; bytes[1] = 34; bytes[2] = 56; bytes[3] = 78;
    arena.uploadSlice(2, bytes);
    const f = port.borrowFBO(8, 8, "u8");
    port.clearFBO(f, [0.2, 0.4, 0.6, 1]);
    arena.copySlice(f, 0, 0, 0, 8, 8);
    // 观测口（soft 实现形）
    const s0 = arena.sliceBytes(0), s2 = arena.sliceBytes(2);
    assert.deepEqual([s2[0], s2[1], s2[2], s2[3]], [12, 34, 56, 78]);
    assert.deepEqual([s0[0], s0[1], s0[2], s0[3]], [51, 102, 153, 255]);
  });
});

describe("soft-gl2 · GLStampRasterizer 真类跑通（GPU 栅格域软兜底）", () => {
  const N = 128;
  const color = [0.2, 0.6, 0.9];
  for (const buildup of [false, true]) {
    it(`${buildup ? "buildup" : "wash"} vs 解析公式 逐位 ±1`, () => {
      const port = new SoftGl2Port();
      const ras = new GLStampRasterizer(port);
      const fbo = ras.rasterize(STAMPS, { hardness: 0.3, color, buildup }, 0, 0, N, N);
      const got = port.readPixels(fbo, 0, 0, N, N);
      port.returnFBO(fbo);
      const ref = cpuStampRef(N, STAMPS, color, 0.3, buildup);
      const { md, at } = maxDiff(ref, got);
      assert.ok(md <= 1, `maxΔ=${md} @${at}（u8 逐写量化 ±1 内）`);
    });
  }
  it("椭圆（aspect+rotation）vs 解析公式", () => {
    const port = new SoftGl2Port();
    const ras = new GLStampRasterizer(port);
    const fbo = ras.rasterize(STAMPS, { hardness: 0.4, color, buildup: false, aspect: 2.2, rotation: 0.6 }, 0, 0, N, N);
    const got = port.readPixels(fbo, 0, 0, N, N);
    port.returnFBO(fbo);
    const ref = cpuStampRef(N, STAMPS, color, 0.4, false, 2.2, 0.6);
    const { md } = maxDiff(ref, got);
    assert.ok(md <= 1, `maxΔ=${md}`);
  });
  it("scissor 等价：左半==无 scissor / 右半清透明", () => {
    const port = new SoftGl2Port();
    const ras = new GLStampRasterizer(port);
    const fFull = ras.rasterize(STAMPS, { hardness: 0.3, color, buildup: false }, 0, 0, N, N);
    const full = port.readPixels(fFull, 0, 0, N, N); port.returnFBO(fFull);
    const fScis = ras.rasterize(STAMPS, { hardness: 0.3, color, buildup: false }, 0, 0, N, N, { x: 0, y: 0, w: 64, h: N });
    const scis = port.readPixels(fScis, 0, 0, N, N); port.returnFBO(fScis);
    let mdL = 0, maxAR = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      if (x < 64) { for (let c = 0; c < 4; c++) mdL = Math.max(mdL, Math.abs(full[i + c] - scis[i + c])); }
      else maxAR = Math.max(maxAR, scis[i + 3]);
    }
    assert.ok(mdL === 0 && maxAR === 0, `左maxΔ=${mdL} 右maxA=${maxAR}`);
  });
});

// straight 域单 pass 合成参照（compositeFragSource 主干同式 + u8 量化）。
function refPass(dstBytes, srcBytes, mode, opacity, n) {
  const out = new Uint8ClampedArray(n * n * 4);
  for (let i = 0; i < n * n * 4; i += 4) {
    const Cs = [srcBytes[i] / 255, srcBytes[i + 1] / 255, srcBytes[i + 2] / 255];
    const srcA = srcBytes[i + 3] / 255;
    const Cb = [dstBytes[i] / 255, dstBytes[i + 1] / 255, dstBytes[i + 2] / 255];
    const ab = dstBytes[i + 3] / 255;
    const as = srcA * opacity;
    const ao = as + ab * (1 - as);
    for (let k = 0; k < 3; k++) {
      const Csb = (1 - ab) * Cs[k] + ab * blendChannel(mode, Cb[k], Cs[k]);
      const Po = as * Csb + Cb[k] * ab * (1 - as);
      out[i + k] = Math.round((ao > 0 ? Po / ao : 0) * 255);
    }
    out[i + 3] = Math.round(ao * 255);
  }
  return out;
}

describe("soft-gl2 · GLCompositor 真类合成（tiled pass + blend 公式）", () => {
  const n = TILE_SIZE;
  const mkBytes = (fn) => {
    const a = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const [r, g, b, al] = fn(x, y); const i = (y * n + x) * 4;
      a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al;
    }
    return a;
  };
  const bd = mkBytes((x, y) => [8 + (x % 240), 8 + (y % 240), 8 + ((x + y) % 240), 160 + ((x * 7) % 80)]);
  const src = mkBytes((x, y) => [247 - (y % 240), 8 + (x % 240), 8 + ((x * y) % 240), 48 + ((y * 5) % 192)]);
  for (const mode of ["source-over", "multiply", "color-dodge", "soft-light"]) {
    it(`blend:${mode} opacity 0.8 vs W3C 公式（straight 域，±1）`, () => {
      const port = new SoftGl2Port();
      const comp = new GLCompositor(port, "f32");   // f32 累积（免中间量化，参照免疫多 pass 累计误差）
      const arena = port.createTileArena(TILE_SIZE, 4);
      arena.uploadSlice(0, bd); arena.uploadSlice(1, src);
      const i0 = new IndexTexture(port, n, n); i0.setSlice(0, 0, 0);
      const i1 = new IndexTexture(port, n, n); i1.setSlice(0, 0, 1);
      comp.begin(n, n);
      const acc = comp.newAcc(n, n);
      comp.pass(arena, "tiled", i0, null, "source-over", 1, null, acc, n, n);
      comp.pass(arena, "tiled", i1, null, mode, 0.8, null, acc, n, n);
      const res = comp.finishAcc(acc);
      // straight 累积器 → present 到 u8 读回
      const out = port.borrowFBO(n, n, "u8");
      comp.presentTo(res, out, n, n);
      const got = port.readPixels(out, 0, 0, n, n);
      port.returnFBO(out); port.returnFBO(res);
      comp.end();
      const ref = refPass(refPass(new Uint8ClampedArray(n * n * 4), bd, "source-over", 1, n), src, mode, 0.8, n);
      const { md, at } = maxDiff(ref, got);
      assert.ok(md <= 1, `maxΔ=${md} @${at}`);
      i0.dispose(); i1.dispose();
    });
  }
});

describe("soft-gl2 · RasterService.bakeStamps headless（笔迹烤定全链，无 GL）", () => {
  it("透明底 wash 笔迹 bake → 层字节 = 解析 stamp（预乘域 ±4）", () => {
    const N = 256;
    const port = new SoftGl2Port();
    const room = new GlRoom(port, 512);
    const raster = new RasterService(room);
    const pixels = new LayerPixels(N, N);
    const stamps = [];
    for (let i = 0; i < 6; i++) stamps.push({ x: 50 + i * 20, y: 60 + i * 16, size: 44, alpha: 0.8 });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of stamps) { const r = s.size / 2 + 1; x0 = Math.min(x0, s.x - r); y0 = Math.min(y0, s.y - r); x1 = Math.max(x1, s.x + r); y1 = Math.max(y1, s.y + r); }
    const bx = Math.max(0, Math.floor(x0)), by = Math.max(0, Math.floor(y0));
    const bw = Math.min(N, Math.ceil(x1)) - bx, bh = Math.min(N, Math.ceil(y1)) - by;
    const ov = {
      stamps, shape: { hardness: 0.5, color: [0.9, 0.3, 0.2], buildup: false },
      bx, by, bw, bh, layerId: 1, opacity: 1, erase: false, blendMode: "source-over",
      lockAlpha: false, selMask: null,
    };
    const ok = raster.bakeStamps(1, pixels, ov, N, N, (px, x, y, w, h) => pixels.applyRegionDiff(x, y, w, h, px));
    assert.ok(ok, "bake 成功（软域全链跑通）");
    // 解析参照：预乘 stamp → straight（透明底 source-over op1 = 笔迹本身的 straight 形）
    const pre = cpuStampRef(N, stamps, [0.9, 0.3, 0.2], 0.5, false);
    const got = new Uint8ClampedArray(N * N * 4);
    pixels.forEachTile((tx, ty, data) => {
      for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) {
        const gx = tx * TILE_SIZE + x, gy = ty * TILE_SIZE + y;
        if (gx >= N || gy >= N) continue;
        const si = (y * TILE_SIZE + x) * 4, di = (gy * N + gx) * 4;
        got[di] = data[si]; got[di + 1] = data[si + 1]; got[di + 2] = data[si + 2]; got[di + 3] = data[si + 3];
      }
    });
    // 预乘域对比（gl-smoke maxPremulDiff 同法）：straight 低 alpha 处 unpremult 病态放大量化误差，
    //   预乘域才是视觉等价的度量。α 直接比；RGB 比 got.rgb·got.a vs 解析预乘。
    let md = 0;
    for (let p = 0; p < N * N; p++) {
      const i = p * 4;
      md = Math.max(md, Math.abs(pre[i + 3] - got[i + 3]));
      const ga = got[i + 3] / 255;
      for (let k = 0; k < 3; k++) md = Math.max(md, Math.abs(got[i + k] * ga - pre[i + k]));
    }
    assert.ok(md <= 4, `premult maxΔ=${md}（多级 u8 量化 ±4）`);
    pixels.dispose();
    appTilePool().assertNoLeaks?.();
  });
  it("selMask 裁剪：mask 外层字节零变化", () => {
    const N = 256;
    const port = new SoftGl2Port();
    const room = new GlRoom(port, 512);
    const raster = new RasterService(room);
    const pixels = new LayerPixels(N, N);
    const stamps = [{ x: 100, y: 100, size: 80, alpha: 1 }];
    const bx = 56, by = 56, bw = 90, bh = 90;
    const selData = new Uint8Array(bw * bh);   // 左半 255 右半 0
    for (let y = 0; y < bh; y++) for (let x = 0; x < Math.floor(bw / 2); x++) selData[y * bw + x] = 255;
    const ov = {
      stamps, shape: { hardness: 0.9, color: [0, 0, 1], buildup: false },
      bx, by, bw, bh, layerId: 2, opacity: 1, erase: false, blendMode: "source-over",
      lockAlpha: false, selMask: { data: selData, ox: bx, oy: by, ow: bw, oh: bh },
    };
    const ok = raster.bakeStamps(2, pixels, ov, N, N, (px, x, y, w, h) => pixels.applyRegionDiff(x, y, w, h, px));
    assert.ok(ok);
    let leftPainted = 0, rightPainted = 0;
    pixels.forEachTile((tx, ty, data) => {
      for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) {
        const gx = tx * TILE_SIZE + x, gy = ty * TILE_SIZE + y;
        const a = data[(y * TILE_SIZE + x) * 4 + 3];
        if (a === 0) continue;
        if (gx < bx + bw / 2) leftPainted++;
        else rightPainted++;
      }
    });
    assert.ok(leftPainted > 0, "mask 内有笔迹");
    assert.equal(rightPainted, 0, "mask 外零像素");
    pixels.dispose();
  });
});

describe("soft-gl2 · arena 租户记账（C8 ⑥）", () => {
  it("createTileArena 记账 / dispose 退租 / 用死租约响亮 throw", () => {
    const port = new SoftGl2Port();
    assert.deepEqual(port.arenaStats, { count: 0, bytes: 0 });
    const a = port.createTileArena(256, 4);
    const b = port.createTileArena(256, 8);
    assert.equal(port.arenaStats.count, 2);
    assert.equal(port.arenaStats.bytes, (4 + 8) * 256 * 256 * 4);
    a.recreate(16);   // grow 后记账按现容量现算
    assert.equal(port.arenaStats.bytes, (16 + 8) * 256 * 256 * 4);
    a.dispose();
    assert.equal(port.arenaStats.count, 1);
    assert.equal(port.arenaStats.bytes, 8 * 256 * 256 * 4);
    a.dispose();   // 幂等
    assert.equal(port.arenaStats.count, 1);
    assert.throws(() => a.uploadSlice(0, new Uint8Array(256 * 256 * 4)), /ARENA_DISPOSED/);
    assert.throws(() => a.recreate(4), /ARENA_DISPOSED/);
    b.dispose();
    assert.deepEqual(port.arenaStats, { count: 0, bytes: 0 });
  });
  it("GlRoom.dispose 退租（arena 归还 Port 记账）；FBO 池不被清（跨租户共享）", () => {
    const port = new SoftGl2Port();
    const roomA = new GlRoom(port, 512);
    const roomB = new GlRoom(port, 512);
    assert.equal(port.arenaStats.count, 2);
    const f = port.borrowFBO(64, 64, "u8");
    port.returnFBO(f);
    const pooledBefore = port.fboPoolStats.count;
    roomA.dispose();
    assert.equal(port.arenaStats.count, 1, "A 退租，B 的 arena 还在");
    assert.equal(port.fboPoolStats.count, pooledBefore, "共享 FBO 池不被邻居 dispose 清空");
    roomB.dispose();
    assert.equal(port.arenaStats.count, 0);
  });
});
