// 外面的图进内核的门（wrapExternal；2026-11-11 CatsUp 贴图主线 1-4b，统筹定的形状）：宿主画好的薄层包成内核的纹理对象交给档口。
// 同一份预乘像素，放在内核池子里的离屏图里走 vs 包进来走：合成（只合成不上屏）和落层的结果逐像素相同；大小不对 / 形态不对 / 精度不对 / 长度不对 = 抛；包进来的不许删。
// 内核自己的测试：只 import 内核和测试工具。created 2026-11-11 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { GlRoom } from "../src/backend/gl/gl-room.ts";
import { RasterService } from "../src/backend/gl/raster-service.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { GLBoard } from "../src/shell/gl-board.ts";

const W = 48, H = 32;
const throws = (fn, re) => { try { fn(); } catch (e) { return re.test(String(e?.message ?? e)); } return false; };
/** 底下那一层：每格一个不同的不透明颜色。 */
function base() { const b = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; b[i] = (x * 5) & 255; b[i + 1] = (y * 7) & 255; b[i + 2] = 90; b[i + 3] = 255; } return b; }
/** 宿主的薄层：预乘、中间一块半透明的色、外面全零（范围 bx..bx+bw）。 */
const BB = { bx: 10, by: 6, bw: 20, bh: 14 };
function overlayBytes() { const p = new Uint8Array(W * H * 4); for (let y = BB.by; y < BB.by + BB.bh; y++) for (let x = BB.bx; x < BB.bx + BB.bw; x++) { const i = (y * W + x) * 4, a = 40 + ((x * 13 + y * 7) % 200); p[i] = Math.round(0.9 * a); p[i + 1] = Math.round(0.3 * a); p[i + 2] = Math.round(0.1 * a); p[i + 3] = a; } return p; }
/** 同一份像素放进池子里的离屏图（上传一张纹理、原样拷过去）。 */
function pooled(port, room, px) { const t = port.createTexture(); port.uploadTexture(t, "rgba8", W, H, px); const f = port.borrowFBO(W, H, "u8"); room.comp.presentTo(t, f, W, H, false); return f; }
const hostOv = (tex, layerId) => ({ kind: "host", tex, ...BB, layerId, opacity: 1, erase: false, blendMode: "source-over", lockAlpha: false, selMask: null });
function bake(port, tex) {
  const room = new GlRoom(port, 64), raster = new RasterService(room), lp = new LayerPixels(W, H); lp.putRegion(0, 0, W, H, base());
  try {
    const ok = raster.bakeStamps(1, lp, hostOv(tex, 1), W, H, (px, x, y, w, h) => lp.applyRegionDiff(x, y, w, h, px));
    assert(ok, "落层成功"); return lp.getRegion(0, 0, W, H);
  } finally { lp.dispose(); }
}
function compose(port, tex) {
  const board = new GLBoard(port, 64), lp = new LayerPixels(W, H); lp.putRegion(0, 0, W, H, base());
  try {
    const f = board.composite({ layers: [{ isGroup: false, id: 1, opacity: 1, mode: "source-over", clippingMask: false, visible: true, pixels: lp }], width: W, height: H }, "#ffffff", [], [hostOv(tex, 1)]);
    return port.readPixels(f, 0, 0, W, H);
  } finally { lp.dispose(); }   // 图块句柄还回去（漏检门：每次合成一个，不还 = 漏）
}
const same = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };

describe("外面的图进内核的门（wrapExternal）", () => {
  it("同一份薄层：包进来走 = 放在池子里走（合成、落层逐像素相同），而且确实画上了", () => {
    const px = overlayBytes();
    const a = new SoftGl2Port(), roomA = new GlRoom(a, 64), fA = pooled(a, roomA, px);
    const b = new SoftGl2Port(), ext = b.wrapExternal({ pixels: px, w: W, h: H, prec: "u8" });
    const ca = compose(a, fA), cb = compose(b, ext);
    assert(same(ca, cb), "合成一样");
    const ba = bake(a, fA), bb = bake(b, ext);
    assert(same(ba, bb), "落层一样");
    let changed = 0; const b0 = base(); for (let i = 0; i < bb.length; i++) if (bb[i] !== b0[i]) changed++;
    assert(changed > 500, `落层确实改了像素（${changed}）`);
  });
  it("包进来的按引用读：宿主改了像素，下一次合成看得见（不拷贝）", () => {
    const px = overlayBytes(), port = new SoftGl2Port(), ext = port.wrapExternal({ pixels: px, w: W, h: H, prec: "u8" }), c1 = compose(port, ext);
    px.fill(0); const c2 = compose(port, ext), c0 = compose(port, port.wrapExternal({ pixels: new Uint8Array(W * H * 4), w: W, h: H, prec: "u8" }));
    assert(!same(c1, c2) && same(c2, c0), "改成全零之后 = 没有薄层");
  });
  it("要抛的：大小和画布不一样、给错形态、精度不是 u8、像素长度不对、删包进来的", () => {
    const port = new SoftGl2Port(), px = overlayBytes();
    const small = port.wrapExternal({ pixels: new Uint8Array(10 * 10 * 4), w: 10, h: 10, prec: "u8" });
    assert(throws(() => compose(port, small), /HOST_OVERLAY_SIZE:10x10/), "大小不对");
    assert(throws(() => port.wrapExternal({ gl: {}, w: W, h: H, prec: "u8" }), /WRAP_EXTERNAL_FORM/), "软件显卡不收显卡贴图");
    assert(throws(() => port.wrapExternal({ pixels: px, w: W, h: H, prec: "f16" }), /WRAP_EXTERNAL_PREC/), "精度");
    assert(throws(() => port.wrapExternal({ pixels: px, w: W, h: H + 1, prec: "u8" }), /WRAP_EXTERNAL_LENGTH/), "长度");
    assert(throws(() => port.wrapExternal({ pixels: px, w: 0, h: H, prec: "u8" }), /WRAP_EXTERNAL_SIZE/), "宽高");
    const ext = port.wrapExternal({ pixels: px, w: W, h: H, prec: "u8" });
    assert(throws(() => port.deleteTexture(ext), /DELETE_EXTERNAL_TEXTURE/), "不许删");
    eq(px[ (BB.by * W + BB.bx) * 4 + 3 ] > 0, true, "宿主的像素没被动");
  });
});
