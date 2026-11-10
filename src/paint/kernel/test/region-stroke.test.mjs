// RegionStroke 单测（created 2026-09-18 by Claude Fable 5.1）：SoftGl2Port + GlRoom + LayerPixels 真管线。
//   装载 W = 叶像素逐字节往返（tile → arena → region-load → readPixels）；空叶 → 全透明；选区平面可采；
//   写 W 记 dirty → overlay bbox；caps 守卫；读写冲突 throw；dispose 后 throw；StrokeTarget 的 CPU 口响亮不实现。
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { GlRoom } from "../src/backend/gl/gl-room.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { RegionStroke } from "../src/backend/gl/region-stroke.ts";

function pattern(w, h, seed = 3) {
  const b = new Uint8ClampedArray(w * h * 4);
  let s = seed >>> 0;
  for (let i = 0; i < b.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; b[i] = s >>> 24; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x >= w - 8) b[(y * w + x) * 4 + 3] = 0;   // 右缘透明带
  return b;
}
// 测试卫生：setup 建的叶像素统一登记、文件末尾释放（以前只 dispose rs，叶像素被 GC = tile-pool 报泄漏；家族周账 F-190）
const _pixels = [];
function setup(w = 70, h = 40, opts) {
  const port = new SoftGl2Port();
  const room = new GlRoom(port, 512);
  const pixels = new LayerPixels(w, h);
  _pixels.push(pixels);
  const bytes = pattern(w, h);
  pixels.putRegion(0, 0, w, h, bytes);
  const rs = new RegionStroke(room, 7, pixels, w, h, opts?.sel ?? null, opts);
  return { port, room, pixels, bytes, rs, w, h };
}
function same(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

describe("region-stroke · 装载 / 快照 / 空叶", () => {
  it("构造后 W = 叶像素逐字节相同（跨 tile 边界 256 的 doc 也一样）", () => {
    const { rs, bytes, w, h } = setup(300, 270);
    const got = rs.readPixels(0, 0, w, h);
    // straight 字节往返：alpha=0 像素 GL 侧 RGB 照原样（tile 存 straight，无预乘概念）
    assert(same(new Uint8Array(bytes.buffer), got), "W ≠ 叶像素");
    rs.dispose();
  });
  it("snapshot:true → W0 是起笔快照：改了 W 之后从 W0 取窗口再放回 = 原像素；未开快照时引用 W0 响亮 throw", () => {
    const { rs, w, h, bytes } = setup(40, 30, { snapshot: true });
    const B = 4, origin = [10, 10];
    const cur = rs.alloc(B, B, "rgba-f32"), mask = rs.alloc(B, B, "rgba-f32"), zero = rs.alloc(B, B, "rgba-f32"), avg = rs.alloc(1, 1, "rgba-f32");
    const dep = { u_docSize: [w, h], u_origin: origin, u_strength: 1, u_colorRate: 0, u_dilEff: 0, u_lock: 0, u_space: 0, u_Psel: 0, u_paint: [0, 0, 0, 1] };
    rs.run("smudge-mask", mask, {}, { u_size: [B, B], u_origin: origin, u_docSize: [w, h], u_center: [12, 12], u_r: 100, u_innerR: 100, u_hasSel: 0, u_selOrigin: [0, 0], u_selSize: [1, 1] });
    // 1) 把 W 的窗口抹成透明（P = zero）
    rs.run("region-crop", cur, { u_W: "W" }, { u_size: [B, B], u_origin: origin, u_docSize: [w, h] });
    rs.run("smudge-deposit", "W", { u_cur: cur, u_mask: mask, u_P: zero, u_avg: avg }, dep, { x: 10, y: 10, w: B, h: B });
    assert(rs.readPixels(10, 10, B, B).every((v) => v === 0), "W 窗口已抹透明");
    // 2) 从 W0 取原窗口当 P 放回 → W 恢复原像素（证明 W0 没被 1) 动过）
    const fromW0 = rs.alloc(B, B, "rgba-f32");
    rs.run("region-crop", fromW0, { u_W: "W0" }, { u_size: [B, B], u_origin: origin, u_docSize: [w, h] });
    rs.run("region-crop", cur, { u_W: "W" }, { u_size: [B, B], u_origin: origin, u_docSize: [w, h] });
    rs.run("smudge-deposit", "W", { u_cur: cur, u_mask: mask, u_P: fromW0, u_avg: avg }, dep, { x: 10, y: 10, w: B, h: B });
    const got = rs.readPixels(10, 10, B, B);
    for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) for (let c = 0; c < 4; c++) {
      const a = bytes[((10 + j) * w + 10 + i) * 4 + 3];
      const want = a === 0 ? 0 : bytes[((10 + j) * w + 10 + i) * 4 + c];   // α=0 像素 premult 往返后 RGB 归 0（straight 语义）
      assert(Math.abs(got[(j * B + i) * 4 + c] - want) <= 1, `W0 放回后 (${10 + i},${10 + j}) ch${c}: ${got[(j * B + i) * 4 + c]} vs ${want}`);
    }
    rs.dispose();
    const { rs: rs2 } = setup(20, 20);
    let threw = false;
    try { rs2.run("region-crop", rs2.alloc(2, 2, "rgba-f32"), { u_W: "W0" }, { u_size: [2, 2], u_origin: [0, 0], u_docSize: [20, 20] }); } catch (e) { threw = /REGION_NO_SNAPSHOT/.test(String(e)); }
    assert(threw, "W0 未开快照应 throw");
    rs2.dispose();
  });
  it("空叶（无 tile）→ W 全透明", () => {
    const port = new SoftGl2Port();
    const room = new GlRoom(port, 64);
    const pixels = new LayerPixels(50, 50);
    const rs = new RegionStroke(room, 1, pixels, 50, 50, null);
    const got = rs.readPixels(0, 0, 50, 50);
    assert(got.every((v) => v === 0), "空叶应全 0");
    rs.dispose();
  });
});

describe("region-stroke · 选区 / dirty / overlay / 守卫", () => {
  it("选区平面：smudge-mask 采 selection；无选区时引用 selection 响亮 throw", () => {
    const sel = { data: new Uint8Array(10 * 10).fill(255), ox: 5, oy: 5, ow: 10, oh: 10 };
    sel.data[0] = 0;   // (5,5) 选区外
    const { rs, w, h, bytes } = setup(30, 30, { sel });
    eq(rs.selection.ox, 5);
    const mask = rs.alloc(30, 30, "rgba-f32"), cur = rs.alloc(30, 30, "rgba-f32"), zero = rs.alloc(30, 30, "rgba-f32"), avg = rs.alloc(1, 1, "rgba-f32");
    rs.run("smudge-mask", mask, { u_sel: "selection" }, {
      u_size: [30, 30], u_origin: [0, 0], u_docSize: [w, h], u_center: [10, 10], u_r: 100, u_innerR: 100,
      u_hasSel: 1, u_selOrigin: [rs.selection.ox, rs.selection.oy], u_selSize: [rs.selection.ow, rs.selection.oh],
    });
    rs.run("region-crop", cur, { u_W: "W" }, { u_size: [30, 30], u_origin: [0, 0], u_docSize: [w, h] });
    rs.run("smudge-deposit", "W", { u_cur: cur, u_mask: mask, u_P: zero, u_avg: avg },
      { u_docSize: [w, h], u_origin: [0, 0], u_strength: 1, u_colorRate: 0, u_dilEff: 0, u_lock: 0, u_space: 0, u_Psel: 0, u_paint: [0, 0, 0, 1] },
      { x: 0, y: 0, w: 30, h: 30 });
    const got = rs.readPixels(0, 0, 30, 30);
    const at = (x, y) => got.subarray((y * 30 + x) * 4, (y * 30 + x) * 4 + 4);
    assert(at(8, 8).every((v) => v === 0), "选区内（255）被抹透明");
    assert(same(at(5, 5), bytes.subarray((5 * 30 + 5) * 4, (5 * 30 + 5) * 4 + 4)), "选区值 0 的像素不动");
    assert(same(at(2, 2), bytes.subarray((2 * 30 + 2) * 4, (2 * 30 + 2) * 4 + 4)), "选区 bbox 外不动");
    rs.dispose();
    const { rs: rs2 } = setup(20, 20);
    let threw = false;
    try { rs2.run("smudge-mask", rs2.alloc(2, 2, "rgba-f32"), { u_sel: "selection" }, {}); } catch (e) { threw = /REGION_NO_SELECTION/.test(String(e)); }
    assert(threw, "无选区应 throw");
    rs2.dispose();
  });
  it("写 W（带 scissor）累计 dirty → overlay bbox；没写过 bw=bh=0", () => {
    const { rs, w, h } = setup(64, 32);
    const ov0 = rs.overlay();
    eq(ov0.kind, "region"); eq(ov0.layerId, 7); eq(ov0.bw, 0); eq(ov0.bh, 0);
    const cur = rs.alloc(8, 8, "rgba-f32"), mask = rs.alloc(8, 8, "rgba-f32"), P = rs.alloc(8, 8, "rgba-f32"), avg = rs.alloc(1, 1, "rgba-f32");
    rs.run("region-crop", cur, { u_W: "W" }, { u_size: [8, 8], u_origin: [10, 10], u_docSize: [w, h] });
    rs.run("smudge-mask", mask, {}, { u_size: [8, 8], u_origin: [10, 10], u_docSize: [w, h], u_center: [14, 14], u_r: 10, u_innerR: 10, u_hasSel: 0, u_selOrigin: [0, 0], u_selSize: [1, 1] });
    rs.run("smudge-deposit", "W", { u_cur: cur, u_mask: mask, u_P: P, u_avg: avg },
      { u_docSize: [w, h], u_origin: [10, 10], u_strength: 1, u_colorRate: 0, u_dilEff: 0, u_lock: 0, u_space: 0, u_Psel: 0, u_paint: [0, 0, 0, 1] },
      { x: 10, y: 10, w: 8, h: 8 });
    eq(JSON.stringify(rs.dirty), "[10,10,18,18]");
    rs.run("smudge-deposit", "W", { u_cur: cur, u_mask: mask, u_P: P, u_avg: avg },
      { u_docSize: [w, h], u_origin: [10, 10], u_strength: 1, u_colorRate: 0, u_dilEff: 0, u_lock: 0, u_space: 0, u_Psel: 0, u_paint: [0, 0, 0, 1] },
      { x: 60, y: 28, w: 8, h: 8 });   // 越 doc 的 scissor 夹回
    eq(JSON.stringify(rs.dirty), "[10,10,64,32]");
    const ov = rs.overlay();
    eq(ov.bx, 10); eq(ov.by, 10); eq(ov.bw, 54); eq(ov.bh, 22);
    // P 全 0（alloc 清零）→ 写进去的是透明（strength 1 → cur 被 P 完全替换）
    const got = rs.readPixels(10, 10, 8, 8);
    assert(got.every((v) => v === 0), "窗口被 P（透明）替换");
    rs.dispose();
  });
  it("caps.floatColorBuffer=false → 构造响亮 throw；读写冲突 throw；dispose 后 throw；CPU 口不实现", () => {
    const port = new SoftGl2Port();
    port.caps.floatColorBuffer = false;
    const room = new GlRoom(port, 64);
    const pixels = new LayerPixels(8, 8);
    let threw = false;
    try { new RegionStroke(room, 1, pixels, 8, 8, null); } catch (e) { threw = /REGION_NO_FLOAT_FBO/.test(String(e)); }
    assert(threw, "无浮点 FBO 应 throw");
    const { rs, w, h, port: port2 } = setup(16, 16);
    const t = rs.alloc(4, 4, "rgba-f32");
    let hazard = false;
    try { rs.run("smudge-absorb", t, { u_A: t, u_cur: t }, { u_size: [4, 4], u_origin: [0, 0], u_docSize: [w, h], u_clip: 0, u_space: 0, u_rho: 0.5 }); } catch (e) { hazard = /REGION_READ_WRITE_HAZARD/.test(String(e)); }
    assert(hazard, "dst = 采样源应 throw");
    let cpu = 0;
    try { rs.getImageData(0, 0, 1, 1); } catch (e) { if (/REGION_TARGET_NO_CPU_IO/.test(String(e))) cpu++; }
    try { rs.putImageData(0, 0, new ImageData(1, 1)); } catch (e) { if (/REGION_TARGET_NO_CPU_IO/.test(String(e))) cpu++; }
    eq(cpu, 2, "StrokeTarget 的两个 CPU 口都响亮");
    eq(rs.bboxW, 16); eq(rs.bboxH, 16);
    const before = port2.fboPoolStats.count;
    rs.dispose(); rs.dispose();
    assert(port2.fboPoolStats.count >= before + 2, "dispose 归还 FBO 进池（W + 状态纹理）");
    let dead = false;
    try { rs.alloc(1, 1, "rgba-f32"); } catch (e) { dead = /REGION_DISPOSED/.test(String(e)); }
    assert(dead, "dispose 后 alloc 应 throw");
  });
});

describe("region-stroke 收尾", () => {
  it("释放本文件 setup 建的叶像素", () => {
    for (const p of _pixels) p.dispose();
    _pixels.length = 0;
    assert(true, "disposed");
  });
});
