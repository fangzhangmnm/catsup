// 画板退租（CatsUp 贴图主线 0-3a，统筹 11-11）：原来只有建、没有拆（画画软件一辈子一块画板）；宿主有很多块、会扔，建和拆要成对。
// ① 拆 = 显卡上它建的纹理全删、借的离屏图全还（数 Port 的 createTexture / deleteTexture、borrowFBO / returnFBO）、arena 退租；② 调两次没事；③ 拆了之后再用 = 抛；
// 画画软件自己不调它。（v0.14.76 同时加过的「图块池额度的口」v0.14.77 撤了：池上本来就有 setRawQuotaBytes。）
// 内核自己的测试：只 import 内核和测试工具。created 2026-11-11 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { GLBoard } from "../src/shell/gl-board.ts";

const W = 300, H = 200;   // 跨几块图块
const throws = (fn, re) => { try { fn(); } catch (e) { return re.test(String(e?.message ?? e)); } return false; };
/** 给 Port 装上计数：建 / 删纹理、借 / 还离屏图。 */
function counted(port) {
  const n = { texNew: 0, texDel: 0, fboOut: 0, fboBack: 0 };
  const ct = port.createTexture.bind(port), dt = port.deleteTexture.bind(port), bf = port.borrowFBO.bind(port), rf = port.returnFBO.bind(port);
  port.createTexture = () => { n.texNew++; return ct(); };
  port.deleteTexture = (t) => { n.texDel++; return dt(t); };
  port.borrowFBO = (w, h, p) => { n.fboOut++; return bf(w, h, p); };
  port.returnFBO = (f) => { n.fboBack++; return rf(f); };
  return n;
}
function layers() {
  const a = new LayerPixels(W, H), b = new LayerPixels(W, H);
  const px = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < px.length; i += 4) { px[i] = i & 255; px[i + 1] = 80; px[i + 2] = 200; px[i + 3] = (i >> 2) % 3 ? 255 : 0; }
  a.putRegion(0, 0, W, H, px); b.putRegion(20, 30, 100, 60, px.subarray(0, 100 * 60 * 4));
  const leaf = (id, pixels) => ({ isGroup: false, id, opacity: 1, mode: "source-over", clippingMask: false, visible: true, pixels });
  return { doc: { layers: [leaf(1, a), leaf(2, b)], width: W, height: H }, dispose: () => { a.dispose(); b.dispose(); } };
}

describe("画板退租（GLBoard.dispose）", () => {
  it("合成几次之后拆：建的纹理全删、借的离屏图全还、arena 退租", () => {
    const port = new SoftGl2Port(), n = counted(port), arena0 = port.arenaStats.count, L = layers();
    try {
      const board = new GLBoard(port, 64);
      for (let i = 0; i < 3; i++) { board.markContentDirty(); assert(board.composite(L.doc, [0.2, 0.3, 0.4, 1]) !== null, "合成出来了"); }
      assert(port.arenaStats.count > arena0 && n.fboOut > 0, `真的占了东西（arena ${port.arenaStats.count}，借了 ${n.fboOut} 张离屏图，建了 ${n.texNew} 张纹理）`);
      board.dispose();
      eq(port.arenaStats.count, arena0, "arena 退租");
      eq(n.texDel, n.texNew, "建的纹理全删了");
      eq(n.fboBack, n.fboOut, "借的离屏图全还了");
      assert(board.disposed, "记着拆过了");
    } finally { L.dispose(); }
  });
  it("调两次没事；拆了之后再用 = 抛", () => {
    const port = new SoftGl2Port(), L = layers();
    try {
      const board = new GLBoard(port, 64);
      board.composite(L.doc, [1, 1, 1, 1]);
      board.dispose(); board.dispose();
      assert(throws(() => board.composite(L.doc, [1, 1, 1, 1]), /disposed/), "合成 = 抛");
      assert(throws(() => board.markContentDirty(), /disposed/), "标脏 = 抛");
      assert(throws(() => board.compositeToBytes(L.doc.layers, W, H), /disposed/), "读字节 = 抛");
    } finally { L.dispose(); }
  });
  it("拆了之后 Port 的画面丢了又恢复：不去碰拆掉的那块（不抛）", () => {
    const port = new SoftGl2Port(), L = layers();
    try {
      const board = new GLBoard(port, 64);
      board.composite(L.doc, [1, 1, 1, 1]); board.dispose();
      const p = port;
      if (typeof p.simulateContextLoss === "function") { p.simulateContextLoss(); p.simulateContextRestore?.(); }
      else if (Array.isArray(p._invalidated)) for (const cb of p._invalidated) cb();
      assert(true, "没抛");
    } finally { L.dispose(); }
  });
});
