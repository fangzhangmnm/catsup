// 组当剪贴蒙版底（总账 #79；created 2026-10-13 by Claude Fable 5.1）：SoftGl2Port + GlRoom + RasterService 真管线。
//   ADR-0002（2026-06-14）组可当底；user 2026-10-10「图层组逻辑上就是一个图层」。此前 render-plan 只给叶底 clipBaseId，
//   底是组 → null → 剪贴层整层照画（2D 参照 reference-2d 一直支持组底，GPU 没跟上）。
//   锚：[组{A}, B(剪贴)] 与 [A, B(剪贴)] 逐字节相同（单叶组 = 那片叶）；穿透 / 隔离两种组模式都对；导出同一条路。
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { GlRoom } from "../src/backend/gl/gl-room.ts";
import { RasterService } from "../src/backend/gl/raster-service.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";

const W = 32, H = 32;
const solid = (w, h, c) => { const b = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) b.set(c, i * 4); return b; };
const leaf = (id, pixels, o = {}) => ({ isGroup: false, id, opacity: o.opacity ?? 1, mode: o.mode ?? "source-over", clippingMask: !!o.clip, visible: true, pixels });
const group = (id, children, o = {}) => ({ isGroup: true, id, opacity: o.opacity ?? 1, mode: o.mode ?? "pass-through", clippingMask: false, visible: true, children });
const at = (buf, x, y) => Array.from(buf.subarray((y * W + x) * 4, (y * W + x) * 4 + 4)).join(",");
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

function mk() {
  const port = new SoftGl2Port(), room = new GlRoom(port, 64), raster = new RasterService(room);
  const A = new LayerPixels(W, H); A.putRegion(4, 4, 8, 8, solid(8, 8, [255, 0, 0, 255]));     // 红方块 = 底的内容
  const B = new LayerPixels(W, H); B.putRegion(0, 0, W, H, solid(W, H, [0, 0, 255, 255]));    // 蓝满幅 = 剪贴层
  const dispose = () => { A.dispose(); B.dispose(); room.dispose(); };
  return { raster, A, B, dispose };
}

describe("gl · 剪贴蒙版以组为底（#79）", () => {
  it("穿透组{A} + B(剪贴)：B 只在 A 有像素处显；与叶底 [A, B(剪贴)] 逐字节相同", () => {
    const { raster, A, B, dispose } = mk();
    const viaGroup = raster.compositeToBytes([group(5, [leaf(1, A)]), leaf(2, B, { clip: true })], W, H).data;
    eq(at(viaGroup, 8, 8), "0,0,255,255", "A 有像素处：B 盖在上面（蓝）");
    eq(at(viaGroup, 20, 20), "0,0,0,0", "A 没像素处：B 被裁掉（透明）");
    const viaLeaf = raster.compositeToBytes([leaf(1, A), leaf(2, B, { clip: true })], W, H).data;
    assert(same(viaGroup, viaLeaf), "组底 == 叶底（单叶组）");
    dispose();
  });
  it("隔离组（normal 模式、opacity 0.5）{A} + B(剪贴)：蒙版用组体 alpha（不带组 opacity），B 照样满强度盖住 A 的范围", () => {
    const { raster, A, B, dispose } = mk();
    const out = raster.compositeToBytes([group(5, [leaf(1, A)], { mode: "source-over", opacity: 0.5 }), leaf(2, B, { clip: true })], W, H).data;
    eq(at(out, 8, 8), "0,0,255,255", "B 在 A 的范围内满强度（组 opacity 只影响组自身的显示）");
    eq(at(out, 20, 20), "0,0,0,0", "范围外透明");
    dispose();
  });
  it("组里两叶：蒙版 = 两叶并集", () => {
    const { raster, A, B, dispose } = mk();
    const C = new LayerPixels(W, H); C.putRegion(20, 20, 4, 4, solid(4, 4, [0, 255, 0, 255]));
    const out = raster.compositeToBytes([group(5, [leaf(1, A), leaf(3, C)]), leaf(2, B, { clip: true })], W, H).data;
    eq(at(out, 8, 8), "0,0,255,255", "A 处"); eq(at(out, 21, 21), "0,0,255,255", "C 处"); eq(at(out, 28, 28), "0,0,0,0", "都没有处");
    C.dispose(); dispose();
  });
  it("空组当底 = 没有基底：B 不画（与规划器 clipNoBase 同语义）", () => {
    const { raster, B, dispose } = mk();
    const E = new LayerPixels(W, H);   // 空叶
    const out = raster.compositeToBytes([group(5, [leaf(1, E)]), leaf(2, B, { clip: true })], W, H).data;
    eq(at(out, 8, 8), "0,0,0,0", "无基底 → 剪贴层不画");
    E.dispose(); dispose();
  });
});
