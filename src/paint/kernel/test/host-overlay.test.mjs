// 宿主画好的薄层（贴图主线 0-5，施工单 CatsUp ai-docs/20261110-paint-workorders-6.md 第二节）。created 2026-11-10 by Claude Opus 5.5
//   A：宿主的薄层和二维笔尖走同一条路——同一串笔尖，内核自己画成薄层（rasterize 的结果）当「宿主画好的」交回去，
//      预览合成（一次性合成 + 显示那一侧的合成）和落层之后图层的像素，与直接把笔尖交给内核逐像素相同。
//   B：只合成的那张图（GLBoard.composite）= 现有一次性合成（compositeOnce）读回，连着几帧（改图层、挂薄层、撤薄层、换底色）每帧都相同。
//   C：档口 host 方式——一步撤销、撤销重做像素对、取消无痕、落层失败令牌取消抛错图层不变、空的薄层不算失败。
//   D：宿主借的那张图从头到尾没被内核归还过、没被改过采样设置。
// 内核自己的测试：只 import 内核（src/backend、src/common、src/shell/gl-board.ts）和测试工具，不读仓里的文件。软件显卡（SoftGl2Port）全链。
import { describe, it, assert, eq } from "./runner.mjs";
import { seedWrite } from "./helpers.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { GlRoom } from "../src/backend/gl/gl-room.ts";
import { RenderTree } from "../src/backend/gl/render-tree.ts";
import { RasterService } from "../src/backend/gl/raster-service.ts";
import { GLStampRasterizer } from "../src/backend/gl/gl-stamp.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { GLBoard } from "../src/shell/gl-board.ts";
import { UndoStack } from "../src/backend/workpiece/undo-stack.ts";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { PaintingView } from "../src/backend/workpiece/painting-view.ts";
import { StrokeSession } from "../src/backend/stroke-session.ts";
import { Selection } from "../src/backend/selection.ts";
import { RegionStroke } from "../src/backend/gl/region-stroke.ts";

const W = 96, H = 80;
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
function firstDiff(a, b) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { const p = i >> 2; return `@(${p % W},${Math.floor(p / W)}) ch${i & 3}: ${a[i]} vs ${b[i]}`; } return "none"; }

/** 底图：渐变 + 一部分全透明 + 一部分半透明（锁透明 / 橡皮有东西可锁可擦）。 */
function baseBytes(seed = 0) {
  const b = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    b[i] = 60 + ((x * 3 + seed) % 150); b[i + 1] = 90 + ((y * 2 + seed) % 120); b[i + 2] = 140 + (seed % 40);
    b[i + 3] = (x + y + seed) % 5 === 0 ? 0 : x < 30 ? 120 : 230;
  }
  return b;
}
function pixelsOf(bytes) { const p = new LayerPixels(W, H); p.putRegion(0, 0, W, H, bytes); return p; }
const leaf = (id, pixels, o = {}) => ({ isGroup: false, id, opacity: o.opacity ?? 1, mode: o.mode ?? "source-over", clippingMask: !!o.clip, visible: true, pixels });

// 一串笔尖（斜跨画面）+ 和 collectStamps 同式的范围
const STAMPS = Array.from({ length: 7 }, (_, i) => ({ x: 20 + i * 9, y: 18 + i * 7, size: 22, alpha: 0.8 }));
function bboxOf(stamps) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of stamps) { const r = s.size / 2 + 1; x0 = Math.min(x0, s.x - r); y0 = Math.min(y0, s.y - r); x1 = Math.max(x1, s.x + r); y1 = Math.max(y1, s.y + r); }
  const bx = Math.max(0, Math.floor(x0)), by = Math.max(0, Math.floor(y0));
  return { bx, by, bw: Math.min(W, Math.ceil(x1)) - bx, bh: Math.min(H, Math.ceil(y1)) - by };
}
const BB = bboxOf(STAMPS);
/** 选区：范围左边三分之一 0、中间 128、右边 255（硬边 + 半透明边都验）。 */
function selMaskOf({ bx, by, bw, bh }) {
  const data = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) data[y * bw + x] = x < bw / 3 ? 0 : x < (2 * bw) / 3 ? 128 : 255;
  return { data, ox: bx, oy: by, ow: bw, oh: bh };
}

const WASH = { hardness: 0.6, color: [0.9, 0.3, 0.2], buildup: false };
const CASES = [
  { name: "普通（淡彩）", shape: WASH },
  { name: "叠色", shape: { ...WASH, buildup: true } },
  { name: "橡皮", shape: WASH, erase: true },
  { name: "锁透明 + 正片叠底", shape: WASH, blendMode: "multiply", lockAlpha: true },
  { name: "锁透明 + 橡皮", shape: WASH, erase: true, lockAlpha: true },
  { name: "带选区", shape: WASH, sel: true },
  { name: "滤色", shape: WASH, blendMode: "screen" },
  { name: "叠加", shape: WASH, blendMode: "overlay" },
  { name: "浓度 0.55", shape: WASH, opacity: 0.55 },
  { name: "椭圆笔尖 + 选区 + 浓度 0.7", shape: { ...WASH, aspect: 0.4, rotation: 0.5 }, sel: true, opacity: 0.7 },
];
const params = (c, layerId) => ({ ...BB, layerId, opacity: c.opacity ?? 1, erase: !!c.erase, blendMode: c.blendMode ?? "source-over", lockAlpha: !!c.lockAlpha, selMask: c.sel ? selMaskOf(BB) : null });

/** 盯着宿主借的图：内核有没有归还过它、有没有在画的时候改它的采样设置（D）。 */
function watchPort(port) {
  const returned = [], filtered = [];
  const ret = port.returnFBO.bind(port), draw = port.draw.bind(port), drawI = port.drawInstanced.bind(port);
  const scan = (spec) => { for (const v of Object.values(spec.textures ?? {})) if (v && typeof v === "object" && "filter" in v) filtered.push(v.src); };
  port.returnFBO = (f) => { returned.push(f); ret(f); };
  port.draw = (spec) => { scan(spec); draw(spec); };
  port.drawInstanced = (spec, inst, n) => { scan(spec); drawI(spec, inst, n); };
  return { returned, filtered };
}

describe("宿主的薄层和二维笔尖走同一条路（0-5 A）", () => {
  for (const c of CASES) it(`${c.name}：预览合成（一次性 + 显示那一侧）和落层逐像素相同`, () => {
    const port = new SoftGl2Port(), room = new GlRoom(port, 64), raster = new RasterService(room), tree = new RenderTree(room);
    const base = baseBytes(3);
    const p2d = pixelsOf(base), pHost = pixelsOf(base);
    const ov2d = { stamps: STAMPS, shape: c.shape, ...params(c, 1) };
    // 宿主「自己画好的」：就是内核把这串笔尖画成的那张薄层（和画布一样大、预乘、只着色这一笔的范围）
    const tex = room.rasterizer.rasterize(STAMPS, c.shape, 0, 0, W, H, { x: BB.bx, y: BB.by, w: BB.bw, h: BB.bh });
    const ovHost = { kind: "host", tex, ...params(c, 2) };
    const watch = watchPort(port);

    // 预览：一次性合成（吸管 / 导出那一条）
    const once = (nodes, ovs) => { const f = raster.compositeOnce(nodes, W, H, undefined, [], ovs); const px = port.readPixels(f, 0, 0, W, H); port.returnFBO(f); return px; };
    const a1 = once([leaf(1, p2d)], [ov2d]), b1 = once([leaf(2, pHost)], [ovHost]);
    assert(!same(a1, once([leaf(1, p2d)], [])), "薄层真的显示出来了（和不挂薄层不同）");
    assert(same(a1, b1), `一次性合成逐像素相同 ${firstDiff(a1, b1)}`);
    // 预览：显示那一侧（RenderTree 合成那一半）
    const a2 = port.readPixels(tree.compositeFrame([leaf(1, p2d)], W, H, undefined, [], [ov2d], [], null), 0, 0, W, H);
    const b2 = port.readPixels(tree.compositeFrame([leaf(2, pHost)], W, H, undefined, [], [ovHost], [], null), 0, 0, W, H);
    assert(same(a2, b2), `显示那一侧逐像素相同 ${firstDiff(a2, b2)}`);
    assert(same(a1, a2), "显示那一侧 = 一次性合成（同一份薄层）");

    // 落层（bakeStamps 写回链）
    const apply = (px) => (d, x, y, w, h) => px.applyRegionDiff(x, y, w, h, d);
    assert(raster.bakeStamps(1, p2d, ov2d, W, H, apply(p2d)), "二维笔尖落层成功");
    assert(raster.bakeStamps(2, pHost, ovHost, W, H, apply(pHost)), "宿主薄层落层成功");
    const la = p2d.getRegion(0, 0, W, H), lb = pHost.getRegion(0, 0, W, H);
    assert(!same(la, base), "图层真的变了");
    assert(same(la, lb), `落层后图层逐像素相同 ${firstDiff(la, lb)}`);

    // D：宿主的图内核没归还、没改采样
    assert(!watch.returned.includes(tex), "宿主借的图没被内核归还过");
    assert(!watch.filtered.includes(tex), "宿主借的图没被改过采样设置");
    port.returnFBO(tex);   // 宿主自己还
    p2d.dispose(); pHost.dispose(); room.dispose();
  });
});

describe("只合成、不上屏的那张图是对的（0-5 B）", () => {
  it("GLBoard.composite 每一帧 = compositeOnce 读回（改图层、挂宿主薄层 + 二维笔尖、撤薄层、几种底色、实时叶）", () => {
    const port = new SoftGl2Port(), board = new GLBoard(port, 64);
    const refPort = new SoftGl2Port(), refRoom = new GlRoom(refPort, 64), ref = new RasterService(refRoom);
    const A = leaf(1, pixelsOf(baseBytes(0))), M = leaf(2, pixelsOf(baseBytes(7)), { mode: "multiply", opacity: 0.8 });
    const B = leaf(3, pixelsOf(baseBytes(11))), C = leaf(4, pixelsOf(baseBytes(19)), { clip: true });
    const grp = { isGroup: true, id: 5, opacity: 0.85, mode: "source-over", clippingMask: false, visible: true, children: [B, C] };
    const D = leaf(6, pixelsOf(baseBytes(23)), { opacity: 0.9 });
    const doc = { layers: [A, M, grp, D], width: W, height: H };
    // 宿主两边各画一张同样的薄层（宿主拿自己的画笔画到自己借的图上；这里用同一个光栅器）
    const hostTex = new GLStampRasterizer(port).rasterize(STAMPS, WASH, 0, 0, W, H, { x: BB.bx, y: BB.by, w: BB.bw, h: BB.bh });
    const refTex = refRoom.rasterizer.rasterize(STAMPS, WASH, 0, 0, W, H, { x: BB.bx, y: BB.by, w: BB.bw, h: BB.bh });
    const hostOv = (tex) => ({ kind: "host", tex, ...BB, layerId: 3, opacity: 0.9, erase: false, blendMode: "multiply", lockAlpha: false, selMask: null });
    const stampOv = { stamps: STAMPS.map((s) => ({ ...s, x: s.x + 6 })), shape: { ...WASH, color: [0.1, 0.5, 0.9] }, ...bboxOf(STAMPS.map((s) => ({ ...s, x: s.x + 6 }))), layerId: 6, opacity: 1, erase: false, blendMode: "source-over", lockAlpha: false, selMask: null };
    const watch = watchPort(port);
    const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, 1];
    let n = 0, prevFbo = null;
    const frame = (label, bg, ovs, live = null) => {
      const f = board.composite(doc, bg, [], ovs.map((o) => o === "host" ? hostOv(hostTex) : o), live);
      assert(f && f.w === W && f.h === H, `${label}：拿到一张和画布一样大的图`);
      const got = port.readPixels(f, 0, 0, W, H);
      const refBg = Array.isArray(bg) ? bg : bg === "checker" ? "checker" : typeof bg === "string" ? hex(bg) : undefined;
      const r = ref.compositeOnce(doc.layers, W, H, refBg, [], ovs.map((o) => o === "host" ? hostOv(refTex) : o));
      const want = refPort.readPixels(r, 0, 0, W, H); refPort.returnFBO(r);
      assert(same(got, want), `${label}：和 compositeOnce 逐像素相同 ${firstDiff(got, want)}`);
      n++; const was = prevFbo; prevFbo = f;
      return { got, f, was };
    };
    const f1 = frame("第 1 帧（干净）", null, []);
    const f2 = frame("第 2 帧（什么都没变）", null, []);
    eq(f2.f, f1.f, "什么都没变 = 同一张图（快路径，不重合成）");
    const f3 = frame("挂上宿主薄层", null, ["host"]);
    assert(!same(f3.got, f1.got), "挂上薄层画面变了");
    frame("宿主薄层 + 二维笔尖（两层各一张）", null, ["host", stampOv]);
    seedWrite(A.pixels, () => A.pixels.putRegion(10, 10, 20, 20, new Uint8ClampedArray(20 * 20 * 4).fill(200)));
    board.markContentDirty();
    frame("改了底下的图层（markContentDirty）", null, ["host"]);
    const f6 = frame("撤掉薄层", null, []);
    assert(!same(f6.got, f3.got), "撤掉薄层画面变回去");
    const opaque = frame("不透明底色（材质底色）", [0.2, 0.3, 0.4, 1], ["host"]);
    let minA = 255; for (let i = 3; i < opaque.got.length; i += 4) minA = Math.min(minA, opaque.got[i]);
    eq(minA, 255, "给了不透明底色，交出去的图处处不透明");
    frame("底色写成 #336699", "#336699", []);
    frame("棋盘格底", "checker", ["host"]);
    seedWrite(B.pixels, () => B.pixels.putRegion(40, 30, 16, 16, new Uint8ClampedArray(16 * 16 * 4).fill(90)));
    frame("实时叶（B 在画，没 markContentDirty）", null, ["host"], B);
    eq(n, 10, "十帧都比过");
    assert(!watch.returned.includes(hostTex), "宿主借的图没被内核归还过");
    assert(!watch.filtered.includes(hostTex), "宿主借的图没被改过采样设置");
    port.returnFBO(hostTex); refPort.returnFBO(refTex);
    for (const l of [A, M, B, C, D]) l.pixels.dispose();
    refRoom.dispose();
  });
});

// ---- C：档口 host 方式（真工件 + 真写回链）----
const _rigs = [];
function rig() {
  const port = new SoftGl2Port(), room = new GlRoom(port, 64), raster = new RasterService(room);
  const undo = new UndoStack({ maxQuotaBytes: 1 << 30 });
  const wp2 = new PaintingWorkpiece({ undo, tree: { width: W, height: H }, onTokenLeak: () => {} });
  const doc = new PaintingView(wp2);
  { const t = wp2.begin("seed"); wp2.layerTree.addLayer("L2"); t.commit(); }
  const r = { port, room, raster, undo, wp2, doc, selection: null, shown: [], commits: [], failOn: null, throwOn: null, invalidations: 0 };
  r.layers = () => doc.layers.filter((l) => !l.isGroup);
  r.layers().forEach((l, i) => seedWrite(l, () => l.pixels.putRegion(0, 0, W, H, baseBytes(5 + i * 13))));
  r.deps = {
    begin: (label) => wp2.begin(label),
    tokenChanged: (id) => wp2.layerTiles.tokenChanged(id),
    tokenBeforeImage: (id) => wp2.layerTiles.tokenBeforeImage(id),
    getSelection: () => r.selection,
    commitStamps: () => false,
    invalidate: () => { r.invalidations++; },
    setShadows: () => {},
    openRegion: () => { throw new Error("no region in this rig"); },
    setRegions: () => {},
    commitRegion: () => false,
    setHostOverlays: (list) => { r.shown = list.slice(); },
    commitHost: (ov) => {
      r.commits.push(ov.layerId);
      if (r.throwOn === ov.layerId) throw new Error("HOST_TEST_BOOM");
      if (r.failOn === ov.layerId) return false;
      const l = r.layers().find((x) => x.id === ov.layerId);
      return raster.bakeStamps(ov.layerId, l.pixels, ov, W, H, (px, x, y, w, h) => l.applyRegionDiff(x, y, w, h, px));
    },
  };
  r.tex = () => room.rasterizer.rasterize(STAMPS, WASH, 0, 0, W, H, { x: BB.bx, y: BB.by, w: BB.bw, h: BB.bh });
  r.bytes = (l) => l.pixels.getRegion(0, 0, W, H);
  _rigs.push(r);
  return r;
}
const ENGINE = () => ({ extendStroke() {}, endStroke() { return null; }, cancelStroke() {}, flushDirty() { return null; } });
const SPEC_H = { historyType: "stroke", finalize: true };
const hostIn = (tex, layerId, o = {}) => ({ tex, ...BB, layerId, opacity: o.opacity ?? 1, erase: !!o.erase, blendMode: o.blendMode ?? "source-over", ...(o.bb ?? {}) });
/** 不经档口、直接把同一张薄层落到一份拷贝上：档口落的结果应当和它一样。 */
function expectedAfter(r, l, ov) {
  const p = pixelsOf(r.bytes(l));
  r.raster.bakeStamps(9000 + l.id, p, { kind: "host", ...ov }, W, H, (px, x, y, w, h) => p.applyRegionDiff(x, y, w, h, px));
  const out = p.getRegion(0, 0, W, H); p.dispose(); return out;
}

describe("一笔的档口：host 方式（0-5 C）", () => {
  it("一笔 = 一步撤销；每帧换薄层只显示最新的；落层 = 直接落那张；撤销、重做像素对", () => {
    const r = rig(), [L1] = r.layers(), before = r.bytes(L1), d0 = r.undo.depth();
    const s = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");
    const t1 = r.tex(), t2 = r.tex();
    s.setHostLayers([hostIn(t1, L1.id, { opacity: 0.6 })]);
    eq(r.shown.length, 1, "第一帧交给显示那一侧"); eq(r.shown[0].tex, t1);
    eq(r.shown[0].lockAlpha, false, "锁透明由档口按图层补上"); eq(r.shown[0].selMask, null, "没选区 = null");
    s.setHostLayers([hostIn(t2, L1.id, { opacity: 0.8, blendMode: "multiply" })]);
    eq(r.shown.length, 1, "下一帧整个换掉，不累加"); eq(r.shown[0].tex, t2);
    const want = expectedAfter(r, L1, { ...r.shown[0] });
    eq(r.bytes(L1).join(), before.join(), "画的过程中图层一个字节没动");
    s.end();
    eq(r.shown.length, 0, "抬笔撤掉显示");
    eq(r.undo.depth(), d0 + 1, "一步撤销");
    const after = r.bytes(L1);
    assert(!same(after, before), "图层变了");
    assert(same(after, want), `落的 = 直接落那张 ${firstDiff(after, want)}`);
    r.undo.undo(); assert(same(r.bytes(L1), before), "撤销回到笔前");
    r.undo.redo(); assert(same(r.bytes(L1), after), "重做回到笔后");
    r.port.returnFBO(t1); r.port.returnFBO(t2);
  });

  it("一笔画两个图层（各一张）：一步撤销两个都回去", () => {
    const r = rig(), [L1, L2] = r.layers(), b1 = r.bytes(L1), b2 = r.bytes(L2), d0 = r.undo.depth();
    const s = new StrokeSession(r.deps, ENGINE(), [L1, L2], SPEC_H, "host");
    const t1 = r.tex(), t2 = r.tex();
    s.setHostLayers([hostIn(t1, L1.id), hostIn(t2, L2.id, { erase: true })]);
    s.end();
    eq(r.undo.depth(), d0 + 1, "两个图层一步");
    assert(!same(r.bytes(L1), b1) && !same(r.bytes(L2), b2), "两个都变了");
    r.undo.undo();
    assert(same(r.bytes(L1), b1) && same(r.bytes(L2), b2), "一步撤销两个都回去");
    r.port.returnFBO(t1); r.port.returnFBO(t2);
  });

  it("取消：撤掉显示、图层零痕迹、不占步、下一笔照常", () => {
    const r = rig(), [L1] = r.layers(), before = r.bytes(L1), d0 = r.undo.depth();
    const s = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");
    const t = r.tex();
    s.setHostLayers([hostIn(t, L1.id)]);
    s.cancel();
    eq(r.shown.length, 0, "撤掉显示");
    assert(same(r.bytes(L1), before), "图层零痕迹");
    eq(r.undo.depth(), d0, "不占步");
    eq(r.commits.length, 0, "一张都没落");
    const s2 = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");   // 令牌已收口
    s2.setHostLayers([hostIn(t, L1.id)]); s2.end();
    eq(r.undo.depth(), d0 + 1, "下一笔照常");
    r.port.returnFBO(t);
  });

  for (const how of ["返回没落成", "落层那一步自己抛"]) it(`落层失败（${how}）：整笔取消令牌、响亮地抛、已落的那张也回去、显示撤掉、下一笔照常`, () => {
    const r = rig(), [L1, L2] = r.layers(), b1 = r.bytes(L1), b2 = r.bytes(L2), d0 = r.undo.depth();
    if (how === "返回没落成") r.failOn = L2.id; else r.throwOn = L2.id;
    const s = new StrokeSession(r.deps, ENGINE(), [L1, L2], SPEC_H, "host");
    const t1 = r.tex(), t2 = r.tex();
    s.setHostLayers([hostIn(t1, L1.id), hostIn(t2, L2.id)]);
    let err = null; try { s.end(); } catch (e) { err = e; }
    assert(err, "抛了");
    assert(how === "返回没落成" ? /HOST_COMMIT_FAILED \(1\/2/.test(err.message) : err.message === "HOST_TEST_BOOM", `错误文案：${err?.message}`);
    eq(r.commits.join(), `${L1.id},${L2.id}`, "第一张真的落过");
    assert(same(r.bytes(L1), b1), "已落的那张跟着令牌回滚");
    assert(same(r.bytes(L2), b2), "没落成的那张没变");
    eq(r.undo.depth(), d0, "不占步");
    eq(r.shown.length, 0, "显示撤掉");
    assert(r.invalidations > 0, "通知重画");
    r.failOn = r.throwOn = null;
    const s2 = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");   // 没有开着的令牌挡路
    s2.setHostLayers([hostIn(t1, L1.id)]); s2.end();
    eq(r.undo.depth(), d0 + 1, "下一笔照常");
    r.port.returnFBO(t1); r.port.returnFBO(t2);
  });

  it("锁透明和选区由档口补上（图层的锁透明、现在的选区），落的结果 = 带着它们直接落", () => {
    const r = rig(), [L1] = r.layers();
    { const t = r.wp2.begin("prop"); r.wp2.layerTree.setLayerProp(L1.id, "lockAlpha", true); t.commit(); }
    const sm = selMaskOf(BB);
    r.selection = Selection.fromGray8Region(sm.ox, sm.oy, sm.ow, sm.oh, sm.data);
    const s = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");
    const t = r.tex();
    s.setHostLayers([hostIn(t, L1.id, { blendMode: "overlay" })]);
    eq(r.shown[0].lockAlpha, true, "锁透明 = 图层的");
    const m = r.selection.bboxMask();
    assert(r.shown[0].selMask && r.shown[0].selMask.ox === m.x && r.shown[0].selMask.ow === m.w && r.shown[0].selMask.data === m.data, "选区 = 现在的选区（bboxMask）");
    const before = r.bytes(L1), want = expectedAfter(r, L1, { ...r.shown[0] });
    s.end();
    const after = r.bytes(L1);
    assert(!same(after, before), "落了");
    assert(same(after, want), `= 带着锁透明和选区直接落 ${firstDiff(after, want)}`);
    let aBad = 0; for (let i = 3; i < after.length; i += 4) if (after[i] !== before[i]) aBad++;
    eq(aBad, 0, "锁透明：透明度一个像素都没变");
    r.port.returnFBO(t);
  });

  it("空的薄层（范围宽或高为零）不算没落成；什么都没交 = 不占步", () => {
    const r = rig(), [L1] = r.layers(), d0 = r.undo.depth();
    const t = r.tex();
    const s = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");
    s.setHostLayers([hostIn(t, L1.id, { bb: { bw: 0 } })]);
    s.end();
    eq(r.commits.length, 0, "空的不去落"); eq(r.undo.depth(), d0, "不占步");
    const s2 = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");
    s2.end();
    eq(r.undo.depth(), d0, "什么都没交 = 不占步");
    r.port.returnFBO(t);
  });

  it("响亮拒绝：不是这一笔的图层 / 同一图层两张 / 不是 host 方式 / 档口不支持 host（先于开令牌）/ 收口后再交", () => {
    const r = rig(), [L1, L2] = r.layers(), t = r.tex();
    const throws = (fn, re, msg) => { try { fn(); } catch (e) { assert(re.test(String(e.message)), `${msg}：${e.message}`); return; } throw new Error(`${msg}：应当抛`); };
    const s = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");
    throws(() => s.setHostLayers([hostIn(t, L2.id)]), /not a target/, "不是这一笔的图层");
    throws(() => s.setHostLayers([hostIn(t, L1.id), hostIn(t, L1.id)]), /more than one/, "同一图层两张");
    s.cancel();
    throws(() => s.setHostLayers([hostIn(t, L1.id)]), /closed/, "收口后再交");
    const so = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "overlay");
    throws(() => so.setHostLayers([hostIn(t, L1.id)]), /only for preview "host"/, "不是 host 方式");
    so.cancel();
    const { setHostOverlays, ...noHost } = r.deps; void setHostOverlays;
    throws(() => new StrokeSession(noHost, ENGINE(), [L1], SPEC_H, "host"), /needs deps\.setHostOverlays/, "档口不支持 host");
    const s3 = new StrokeSession(r.deps, ENGINE(), [L1], SPEC_H, "host");   // 上面那次没开令牌
    s3.cancel();
    r.port.returnFBO(t);
  });

  it("区域笔那一支（0-5 审后补）：落层那一步自己抛 → 令牌取消、已落的那片叶回滚、抛原错误、下一笔能正常开始", () => {
    const r = rig(), [L1, L2] = r.layers(), b1 = r.bytes(L1), b2 = r.bytes(L2), d0 = r.undo.depth(), leafOf = new Map();
    let landed = 0;
    const deps = {
      ...r.deps,
      openRegion: (leaf, opts) => { const rs = new RegionStroke(r.room, leaf.id, leaf.pixels, W, H, null, { lockAlpha: false, snapshot: !!opts?.snapshot }); leafOf.set(rs, leaf); return rs; },
      commitRegion: (rs) => {
        if (landed) throw new Error("REGION_TEST_BOOM");
        const l = leafOf.get(rs), px = l.pixels.getRegion(0, 0, W, H);
        for (let i = 0; i < px.length; i += 4) { px[i] = 255 - px[i]; px[i + 3] = 255; }   // 当作第一片叶落成了：在令牌里真写一遍
        l.applyRegionDiff(0, 0, W, H, px); landed++;
        return true;
      },
    };
    const s = new StrokeSession(deps, ENGINE(), [L1, L2], SPEC_H, "region");
    let err = null; try { s.end(); } catch (e) { err = e; }
    eq(err?.message, "REGION_TEST_BOOM", "抛的是原错误");
    eq(landed, 1, "第一片叶真的落过");
    assert(same(r.bytes(L1), b1), "已落的那片叶跟着令牌回滚");
    assert(same(r.bytes(L2), b2), "第二片没变");
    eq(r.undo.depth(), d0, "不占步");
    landed = 0;
    const s2 = new StrokeSession({ ...deps, commitRegion: () => true }, ENGINE(), [L1], SPEC_H, "region");   // 没有开着的令牌挡路
    s2.end();
    eq(r.undo.depth(), d0, "下一笔正常开始、正常收口（没写东西 = 不占步）");
  });

  it("收尾：释放工件；小块池泄漏为零", async () => {
    const { CpuTilePool } = await import("../src/backend/tiles/cpu-tile-pool.ts");
    const l0 = CpuTilePool.leaksSeen;
    for (const r of _rigs) {
      r.undo.clear();
      r.wp2.load({ width: 4, height: 4, nodes: [{ name: "空", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }] });
      r.room.dispose();
    }
    _rigs.length = 0;
    globalThis.gc?.();
    for (let i = 0; i < 5; i++) await new Promise((res) => setTimeout(res, 0));
    eq(CpuTilePool.leaksSeen, l0, "没有句柄没释放就被回收");
  });
});
