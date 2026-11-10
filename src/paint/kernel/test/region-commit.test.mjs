// 区域程序提交链集成测（created 2026-09-18 by Claude Fable 5.1）：SoftGl2Port + GlRoom + RasterService 真管线。
//   RegionStroke 写 W → overlay(kind:"region") → bakeStamps（合成 replace 分支 → readPixels → applyRegionDiff → GPU 收养）
//   → 叶像素 == W（新开一笔从叶重装载，逐字节相同）；dirty 外像素不动；没写过的笔 overlayEmpty → 调用方按 no-op。
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { GlRoom, overlayEmpty } from "../src/backend/gl/gl-room.ts";
import { RasterService } from "../src/backend/gl/raster-service.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { RegionStroke } from "../src/backend/gl/region-stroke.ts";

function pattern(w, h) {
  const b = new Uint8ClampedArray(w * h * 4);
  let s = 99;
  for (let i = 0; i < b.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; b[i] = s >>> 24; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; b[i + 3] = 255; }
  for (let y = 30; y < 40; y++) for (let x = 40; x < 50; x++) { const i = (y * w + x) * 4; b[i] = 0; b[i + 1] = 255; b[i + 2] = 0; b[i + 3] = 255; }   // 绿块（当 P 的料）
  return b;
}
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

describe("region-commit · RegionStroke → bakeStamps → 叶像素", () => {
  it("写 W 后提交：叶像素 == W（重装载逐字节相同）；dirty 外不动；dirty 内 = 沉积色", () => {
    const W = 300, H = 280;   // 跨 tile 边界
    const port = new SoftGl2Port(), room = new GlRoom(port, 512), raster = new RasterService(room);
    const pixels = new LayerPixels(W, H);
    const src = pattern(W, H);
    pixels.putRegion(0, 0, W, H, src);
    const rs = new RegionStroke(room, 5, pixels, W, H, null);
    const B = 8;
    const cur = rs.alloc(B, B, "rgba-f32"), mask = rs.alloc(B, B, "rgba-f32"), P = rs.alloc(B, B, "rgba-f32"), avg = rs.alloc(1, 1, "rgba-f32");
    rs.run("region-crop", P, { u_W: "W" }, { u_size: [B, B], u_origin: [41, 31], u_docSize: [W, H] });   // 绿块当出料
    const origin = [260, 250];   // 跨 tile (256) 边界的窗口
    rs.run("region-crop", cur, { u_W: "W" }, { u_size: [B, B], u_origin: origin, u_docSize: [W, H] });
    rs.run("smudge-mask", mask, {}, { u_size: [B, B], u_origin: origin, u_docSize: [W, H], u_center: [264, 254], u_r: 100, u_innerR: 100, u_hasSel: 0, u_selOrigin: [0, 0], u_selSize: [1, 1] });
    rs.run("smudge-deposit", "W", { u_cur: cur, u_mask: mask, u_P: P, u_avg: avg },
      { u_docSize: [W, H], u_origin: origin, u_strength: 1, u_colorRate: 0, u_dilEff: 0, u_lock: 0, u_space: 0, u_Psel: 0, u_paint: [0, 0, 0, 1] },
      { x: 260, y: 250, w: B, h: B });
    const wBytes = rs.readPixels(0, 0, W, H);
    const ov = rs.overlay();
    eq(ov.kind, "region"); eq(ov.bx, 260); eq(ov.by, 250); eq(ov.bw, 8); eq(ov.bh, 8);
    assert(!overlayEmpty(ov), "写过的 overlay 非空");
    const v0 = pixels.contentVersion;
    const ok = raster.bakeStamps(5, pixels, ov, W, H, (px, x, y, w, h) => pixels.applyRegionDiff(x, y, w, h, px));
    assert(ok, "bakeStamps 应落层");
    assert(pixels.contentVersion !== v0, "叶像素版本应变");
    rs.dispose();
    // 叶像素重装载 == 提交前的 W
    const rs2 = new RegionStroke(room, 5, pixels, W, H, null);
    const after = rs2.readPixels(0, 0, W, H);
    assert(same(after, wBytes), "提交后叶像素 ≠ W");
    // dirty 外不动、dirty 内 = 绿
    const at = (buf, x, y) => Array.from(buf.subarray((y * W + x) * 4, (y * W + x) * 4 + 4));
    eq(JSON.stringify(at(after, 10, 10)), JSON.stringify(at(src, 10, 10)), "dirty 外不动");
    eq(JSON.stringify(at(after, 264, 254)), JSON.stringify([0, 255, 0, 255]), "dirty 内 = 沉积的绿");
    rs2.dispose();
    pixels.dispose(); room.dispose();
  });
  it("没写过的笔：overlay bw=bh=0 → overlayEmpty → bakeStamps 返 false（调用方按 no-op，不算失败）", () => {
    const port = new SoftGl2Port(), room = new GlRoom(port, 64), raster = new RasterService(room);
    const pixels = new LayerPixels(32, 32);
    pixels.putRegion(0, 0, 32, 32, pattern(32, 32));
    const rs = new RegionStroke(room, 1, pixels, 32, 32, null);
    const ov = rs.overlay();
    assert(overlayEmpty(ov), "没写过应为空 overlay");
    eq(raster.bakeStamps(1, pixels, ov, 32, 32, () => []), false);
    rs.dispose(); pixels.dispose(); room.dispose();
  });
});
