// 落层那一遍只合「这一笔的方框外扩到图块边」那一块（2026-11-12 CatsUp K2，统筹批）：和整张合成的老路比，落进图层的字节、读回报告、落层后显卡图块池里那份（合成出来读回）都逐字节一样。
// 随机场景：画布大小随机（含跨好几个图块的）；落层的东西轮流是薄层的四种——笔尖单子（贴着画布边、一半在画布外）、宿主薄层（带格 / 不带格）、填色（选区外框）、区域（真的 RegionStroke，W 上跑一遍 wash-lerp，= 涂抹 / 液化 / 模糊那条路）；随机橡皮、锁透明、带选区、几种混合方式。
// 守卫：落层那一遍的着色器（compositeFragSource 的 overlay 那一段）是逐点的——取纹理只用当前像素的坐标、没有循环；以后加带半径的取样 = 这里红，方框要按半径外扩或退回整张。
// 内核自己的测试：只 import 内核和测试工具。created 2026-11-12 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { GLBoard } from "../src/shell/gl-board.ts";
import { DirtyCells } from "../src/common/dirty-rects.ts";
import { compositeFragSource } from "../src/backend/gl/blend-glsl.ts";
import { tileAlignedRect } from "../src/backend/gl/raster-service.ts";

const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const MODES = ["source-over", "multiply", "screen", "overlay", "darken", "lighten"];

/** 一个场景：底下那一层（随机内容）+ 要落的东西（宿主薄层 / 笔尖单子）+ 选项。 */
function scene(seed) {
  const R = rng(seed), big = seed % 3 === 0, W = big ? 300 + Math.floor(R() * 500) : 40 + Math.floor(R() * 260), H = big ? 260 + Math.floor(R() * 500) : 30 + Math.floor(R() * 260);
  const base = new Uint8ClampedArray(W * H * 4);
  for (let k = 0; k < 7; k++) {
    const x0 = Math.floor(R() * W), y0 = Math.floor(R() * H), w = 1 + Math.floor(R() * W / 2), h = 1 + Math.floor(R() * H / 2), c = [R() * 255, R() * 255, R() * 255, R() < 0.5 ? 255 : 30 + R() * 200];
    for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = x0; x < Math.min(W, x0 + w); x++) { const i = (y * W + x) * 4; base[i] = c[0]; base[i + 1] = c[1]; base[i + 2] = c[2]; base[i + 3] = c[3]; }
  }
  const erase = R() < 0.2, blendMode = erase ? "source-over" : MODES[Math.floor(R() * MODES.length)], lockAlpha = R() < 0.25;
  let selMask = null;
  if (R() < 0.3) {   // 选区：一块随机的方框蒙版（灰度，有全选、半选、不选）
    const ox = Math.floor(R() * W * 0.6), oy = Math.floor(R() * H * 0.6), ow = 1 + Math.floor(R() * (W - ox)), oh = 1 + Math.floor(R() * (H - oy)), data = new Uint8Array(ow * oh);
    for (let i = 0; i < data.length; i++) data[i] = R() < 0.6 ? 255 : Math.floor(R() * 256);
    selMask = { data, ox, oy, ow, oh };
  }
  const kind = ["host-cells", "host", "fill", "region", "stamps", "stamps"][seed % 6];
  if (kind === "fill") {
    // 填色：选区外框 = 方框（填色只在有选区时存在）；语义钉死 source-over，锁透明跟活动层
    if (!selMask) { const ox = R() < 0.3 ? 0 : Math.floor(R() * W * 0.7), oy = R() < 0.3 ? H - 1 - Math.floor(R() * Math.min(40, H - 1)) : Math.floor(R() * H * 0.7), ow = 1 + Math.floor(R() * (W - ox)), oh = 1 + Math.floor(R() * (H - oy)), data = new Uint8Array(ow * oh); for (let i = 0; i < data.length; i++) data[i] = R() < 0.7 ? 255 : Math.floor(R() * 256); selMask = { data, ox, oy, ow, oh }; }
    return { W, H, base, kind, ov: { kind: "fill", color: [Math.floor(R() * 256), Math.floor(R() * 256), Math.floor(R() * 256)], bx: selMask.ox, by: selMask.oy, bw: selMask.ow, bh: selMask.oh, layerId: 1, lockAlpha, selMask } };
  }
  if (kind === "region") {
    // 区域：W 里一块（可能贴边）用 wash-lerp 混进一张随机目标色，覆盖率随机（有 0）；方框 = 写过的那块（RegionStroke 自己记）
    const x = R() < 0.2 ? 0 : Math.floor(R() * (W - 2)), y = R() < 0.2 ? Math.max(0, H - 1 - Math.floor(R() * 30)) : Math.floor(R() * (H - 2)), w = Math.min(W - x, 1 + Math.floor(R() * 300)), h = Math.min(H - y, 1 + Math.floor(R() * 300));
    const dst = new Float32Array(w * h * 4), cov = new Float32Array(W * H * 4);
    for (let i = 0; i < dst.length; i++) dst[i] = Math.round(R() * 255) / 255;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cov[(yy * W + xx) * 4 + 3] = R() < 0.15 ? 0 : Math.round(R() * 255) / 255;
    return { W, H, base, kind, region: { x, y, w, h, dst, cov, lockAlpha } };
  }
  if (kind === "stamps") {
    // 笔尖：一串沿随机方向走的圆，有的贴着画布边、有的一半在画布外
    const stamps = [], n = 4 + Math.floor(R() * 30), edge = R() < 0.5;
    let x = edge ? (R() < 0.5 ? -4 + R() * 8 : W - 4 + R() * 8) : R() * W, y = R() * H; const dx = (R() - 0.5) * 18, dy = (R() - 0.5) * 18, size = 2 + R() * 40;
    for (let i = 0; i < n; i++) { stamps.push({ x, y, size: size * (0.6 + 0.4 * R()), alpha: 0.3 + 0.7 * R() }); x += dx; y += dy; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of stamps) { const r = s.size / 2 + 1; x0 = Math.min(x0, s.x - r); y0 = Math.min(y0, s.y - r); x1 = Math.max(x1, s.x + r); y1 = Math.max(y1, s.y + r); }
    const bx = Math.max(0, Math.floor(x0)), by = Math.max(0, Math.floor(y0)), bw = Math.min(W, Math.ceil(x1)) - bx, bh = Math.min(H, Math.ceil(y1)) - by;
    if (bw <= 0 || bh <= 0) return scene(seed + 1000);
    const ov = { stamps, shape: { hardness: R(), color: [R(), R(), R()], buildup: R() < 0.5, aspect: 1, rotation: 0 }, bx, by, bw, bh, layerId: 1, opacity: 0.4 + 0.6 * R(), erase, blendMode, lockAlpha, selMask };
    return { W, H, base, kind, ov };
  }
  // 宿主薄层：几块墨（预乘），方框 = 墨的外框（可能贴边）
  const px = new Uint8Array(W * H * 4), cells = new DirtyCells(W, H);
  let bx0 = Infinity, by0 = Infinity, bx1 = -1, by1 = -1;
  for (let k = 0, n = 1 + Math.floor(R() * 6); k < n; k++) {
    const x0 = R() < 0.2 ? 0 : Math.floor(R() * (W - 2)), y0 = R() < 0.2 ? H - 3 : Math.floor(R() * (H - 2)), w = 1 + Math.floor(R() * 40), h = 1 + Math.floor(R() * 40), a = 20 + Math.floor(R() * 235), c = [R(), R(), R()];
    for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = x0; x < Math.min(W, x0 + w); x++) { const i = (y * W + x) * 4; px[i] = Math.round(c[0] * a); px[i + 1] = Math.round(c[1] * a); px[i + 2] = Math.round(c[2] * a); px[i + 3] = a; }
    cells.mark(x0, y0, w, h);
    bx0 = Math.min(bx0, x0); by0 = Math.min(by0, y0); bx1 = Math.max(bx1, Math.min(W, x0 + w)); by1 = Math.max(by1, Math.min(H, y0 + h));
  }
  return { W, H, base, kind, host: { px, cells, box: [bx0, by0, bx1 - bx0, by1 - by0], erase, blendMode, lockAlpha, selMask } };
}

/** 从 src[i] = "(" 起按括号深度切出这一次调用的各个参数（顶层逗号才切）。 */
function callArgs(src, i) {
  let d = 0, cur = "";
  const out = [];
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "(") { if (d++ > 0) cur += c; continue; }
    if (c === ")") { if (--d === 0) { out.push(cur.trim()); return out; } cur += c; continue; }
    if (c === "," && d === 1) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  return out;
}

const hash = (u) => { let h = 2166136261; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };

/** 落一次层（whole = 走整张合成的老路），交出：图层字节、读回报告、落层后从显卡合成出来的整张（白底）、方框外扩到图块边那一块。 */
function bake(sc, whole) {
  const port = new SoftGl2Port(), board = new GLBoard(port, 64), lp = new LayerPixels(sc.W, sc.H);
  lp.putRegion(0, 0, sc.W, sc.H, sc.base);
  board._raster.bakeWhole = whole;
  let ov, rs = null;
  if (sc.kind === "stamps" || sc.kind === "fill") ov = sc.ov;
  else if (sc.kind === "region") {
    const g = sc.region;
    rs = board.openRegion(1, lp, sc.W, sc.H, null, g.lockAlpha, true);
    const dst = rs.upload(g.w, g.h, g.dst), cov = rs.upload(sc.W, sc.H, g.cov);
    rs.run("wash-lerp", "W", { u_W0: "W0", u_dst: dst, u_cov: cov }, { u_docSize: [sc.W, sc.H], u_origin: [g.x, g.y] }, { x: g.x, y: g.y, w: g.w, h: g.h });
    ov = rs.overlay();
  } else {
    const h = sc.host, ext = port.wrapExternal({ pixels: h.px, w: sc.W, h: sc.H, prec: "u8" }), [bx, by, bw, bh] = h.box;
    ov = { kind: "host", tex: ext, bx, by, bw, bh, layerId: 1, opacity: 1, erase: h.erase, blendMode: h.blendMode, lockAlpha: h.lockAlpha, selMask: h.selMask, ...(sc.kind === "host-cells" ? { cells: h.cells } : {}) };
  }
  const ok = board.commitBrushStroke(1, lp, ov, sc.W, sc.H, (px, x, y, w, h) => lp.applyRegionDiff(x, y, w, h, px));
  rs?.dispose();
  const layer = lp.getRegion(0, 0, sc.W, sc.H);
  const f = board.composite({ layers: [{ isGroup: false, id: 1, opacity: 1, mode: "source-over", clippingMask: false, visible: true, pixels: lp }], width: sc.W, height: sc.H }, "#ffffff", [], []);
  const shown = f ? port.readPixels(f, 0, 0, sc.W, sc.H) : null;
  const out = { ok, kind: ov.kind ?? "stamps", layer: hash(layer), bake: JSON.stringify(board.lastBake), shown: shown ? hash(shown) : null, rect: tileAlignedRect(ov.bx, ov.by, ov.bw, ov.bh, sc.W, sc.H) };
  lp.dispose(); board.dispose();
  return out;
}

describe("落层那一遍只合方框外扩到图块边（K2）", () => {
  it("随机场景（薄层四种：笔尖单子 / 宿主 / 填色 / 区域）：限方框和整张合，落进图层的字节、读回报告、落层后显卡那份合出来的整张都逐字节一样；真的有不少场景只合了一部分", () => {
    let partial = 0;
    const kinds = { stamps: 0, host: 0, "host-cells": 0, fill: 0, region: 0 }, landed = { stamps: 0, host: 0, fill: 0, region: 0 };
    for (let seed = 1; seed <= 60; seed++) {
      const sc = scene(seed), a = bake(sc, false), b = bake(sc, true);
      kinds[sc.kind]++;
      const o = sc.ov ?? sc.host ?? sc.region, tag = `种子 ${seed}（${sc.W}×${sc.H}，${sc.kind}，${o.blendMode ?? ""}${o.erase ? "，橡皮" : ""}${o.lockAlpha ? "，锁透明" : ""}${o.selMask ? "，选区" : ""}）`;
      eq(a.ok, b.ok, `${tag}：落没落成一样`);
      eq(a.layer, b.layer, `${tag}：图层逐字节一样`);
      eq(a.bake, b.bake, `${tag}：读回报告一样`);
      eq(a.shown, b.shown, `${tag}：落层后显卡那份合出来的整张一样（图块池没被方框外的垃圾写坏）`);
      if (a.rect && a.rect.w * a.rect.h < sc.W * sc.H) partial++;
      if (a.ok) landed[a.kind]++;
    }
    assert(kinds.stamps >= 15 && kinds.host >= 8 && kinds["host-cells"] >= 8 && kinds.fill >= 8 && kinds.region >= 8, `五种场景都跑到了（${JSON.stringify(kinds)}）`);
    assert(Object.values(landed).every((n) => n >= 8), `薄层的四种都真的落了层（${JSON.stringify(landed)}）`);
    assert(partial >= 15, `60 个场景里只合了一部分的有 ${partial} 个`);
  }, { timeout: 120000 });
  it("方框外扩到图块边：贴边、一半出界夹在画布里；空的 = null", () => {
    eq(JSON.stringify(tileAlignedRect(10, 20, 5, 5, 1000, 1000)), JSON.stringify({ x: 0, y: 0, w: 256, h: 256 }));
    eq(JSON.stringify(tileAlignedRect(250, 250, 20, 20, 1000, 1000)), JSON.stringify({ x: 0, y: 0, w: 512, h: 512 }), "跨图块边 = 两块");
    eq(JSON.stringify(tileAlignedRect(900, 700, 200, 200, 1000, 800)), JSON.stringify({ x: 768, y: 512, w: 232, h: 288 }), "夹在画布里");
    eq(tileAlignedRect(0, 0, 0, 5, 100, 100), null);
  });
  it("守卫：落层那一遍的着色器是逐点的——取纹理只用当前像素的坐标，没有循环（以后加带半径的取样 = 方框要按半径外扩或退回整张）", () => {
    const ALLOWED = /^(v_uv|ovUv|suv|vec3\(local, slice\)|tc)$/;
    for (const mode of MODES) for (const ovMode of MODES) {
      const src = compositeFragSource(mode, "overlay", ovMode);
      assert(!/\b(for|while)\s*\(/.test(src), `${mode} / ${ovMode}：着色器里有循环`);
      let n = 0;
      for (const m of src.matchAll(/\b(texture|texelFetch)\s*\(/g)) {
        const arg = callArgs(src, m.index + m[0].length - 1)[1];
        n++;
        assert(ALLOWED.test(arg), `${mode} / ${ovMode}：取纹理的坐标「${arg}」不是当前像素的——落层那一遍限方框（K2）靠「逐点」；加了带半径的取样就要把 raster-service.ts bakeStamps 的方框按半径外扩或退回整张，再来改这条守卫`);
      }
      assert(n >= 3, `${mode} / ${ovMode}：着色器里认出的取样只有 ${n} 处（守卫自己失灵了？）`);
    }
  });
});
