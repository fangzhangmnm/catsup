// 画板睡和醒 + 几块画板合用一个图块池（CatsUp 施工单十九第 2 刀；提案 = CatsUp ai-docs/20261112-kernel-shared-pool-and-sleep-proposal.md）。
// 睡 = 显卡那一半还回去、内存那一半不碰；醒 = 下一帧从内存那份重建。合用池 = 几块画板的图块在同一个图组里，池按总数长。
// 八条：① 睡醒前后逐字节一样、醒后再画一笔和没睡过的一样 ② 两块合用一个池交替合成 = 各自单独合成（含池长大）③ 睡着时池承诺的显存降、醒来回来
//   ④ 睡着时合成 / 画 = 抛 ⑤ 睡着时显卡画面丢了、醒来照样逐字节一样 ⑥ 开着一笔时睡 = 抛；浮着的一块睡醒不变
//   ⑦ 100 块合用一个池、全退租 → 池里没有使用者、Port 上挂的回调回到原数 ⑧ 睡醒各两次没事、睡着时退租不抛、池先退了再用画板 = 抛并说清原因。
// 画画软件不用这些口（它一次只开一张画）。内核自己的测试：只 import 内核和测试工具。created 2026-11-12 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { GLBoard } from "../src/shell/gl-board.ts";
import { createSharedTilePool } from "../src/backend/gl/shared-tile-pool.ts";

const W = 300, H = 200;   // 一层 2 × 1 = 2 块图块
const BG = [0.2, 0.3, 0.4, 1];
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const throws = (fn, re) => { try { fn(); } catch (e) { return re.test(String(e?.message ?? e)); } return false; };

/** 一张画：n 层，每层随机几块（不透明 / 半透明），铺满整层让每块图块都有东西。 */
function makeDoc(seed, n = 3) {
  const R = rng(seed), leaves = [];
  for (let k = 0; k < n; k++) {
    const lp = new LayerPixels(W, H), px = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < px.length; i += 4) { px[i] = (i * 7 + k * 31) & 255; px[i + 1] = 40 + k * 10; px[i + 2] = 200 - k * 5; px[i + 3] = 6; }
    for (let b = 0; b < 4; b++) {
      const x0 = Math.floor(R() * W), y0 = Math.floor(R() * H), w = 1 + Math.floor(R() * W / 2), h = 1 + Math.floor(R() * H / 2);
      const c = [R() * 255, R() * 255, R() * 255, R() < 0.5 ? 255 : 30 + R() * 200];
      for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = x0; x < Math.min(W, x0 + w); x++) { const i = (y * W + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3]; }
    }
    lp.putRegion(0, 0, W, H, px);
    leaves.push(lp);
  }
  const leaf = (id, pixels) => ({ isGroup: false, id, opacity: 1, mode: "source-over", clippingMask: false, visible: true, pixels });
  return { doc: { layers: leaves.map((p, i) => leaf(i + 1, p)), width: W, height: H }, leaves, dispose: () => { for (const p of leaves) p.dispose(); } };
}
/** 合成一帧（合成树那条路）读回字节。 */
const frame = (port, board, d, floats = []) => { const f = board.composite(d.doc, BG, floats); assert(f !== null, "合成出来了"); return Array.from(port.readPixels(f, 0, 0, W, H)); };
/** 一次性合成那条路（存盘 / 导出用的）。 */
const bytesOf = (board, d) => Array.from(board.compositeToBytes(d.doc.layers, W, H).data);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
/** 在第 1 层上落一笔（宿主画好的薄层，预乘），返回落层后第 1 层的字节。 */
function stroke(port, board, d, seed) {
  const R = rng(seed), ov = new Uint8Array(W * H * 4);
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  for (let k = 0; k < 3; k++) {
    const x0 = Math.floor(R() * (W - 20)), y0 = Math.floor(R() * (H - 20)), w = 4 + Math.floor(R() * 16), h = 4 + Math.floor(R() * 16), a = 60 + Math.floor(R() * 195);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * W + x) * 4; ov[i] = a; ov[i + 1] = Math.round(a * 0.5); ov[i + 2] = 0; ov[i + 3] = a; }
    bx0 = Math.min(bx0, x0); by0 = Math.min(by0, y0); bx1 = Math.max(bx1, x0 + w); by1 = Math.max(by1, y0 + h);
  }
  const lp = d.leaves[0], tex = port.wrapExternal({ pixels: ov, w: W, h: H, prec: "u8" });
  const desc = { kind: "host", tex, bx: bx0, by: by0, bw: bx1 - bx0, bh: by1 - by0, layerId: 1, opacity: 1, erase: false, blendMode: "source-over", lockAlpha: false, selMask: null };
  assert(board.commitBrushStroke(1, lp, desc, W, H, (px, x, y, w, h) => lp.applyRegionDiff(x, y, w, h, px)), "落层成了");
  board.markContentDirty();
  return Array.from(lp.getRegion(0, 0, W, H));
}

describe("画板睡和醒（GLBoard.sleep / wake）", () => {
  it("① 睡醒前后合成逐字节一样（合成树 / 一次性两条路）；醒后再画一笔 = 没睡过的画板画同一笔", () => {
    const port = new SoftGl2Port(), A = makeDoc(11), B = makeDoc(11);
    try {
      const a = new GLBoard(port, 64), b = new GLBoard(port, 64);
      const f0 = frame(port, a, A), c0 = bytesOf(a, A);
      a.sleep(); assert(a.asleep, "睡着了");
      a.markContentDirty();   // 睡着也能标脏
      a.wake(); assert(!a.asleep, "醒了");
      assert(same(frame(port, a, A), f0), "合成树那条路逐字节一样");
      assert(same(bytesOf(a, A), c0), "一次性合成那条路逐字节一样");
      frame(port, b, B);
      const la = stroke(port, a, A, 5), lb = stroke(port, b, B, 5);
      assert(same(la, lb), "落层后的图层字节一样");
      assert(same(frame(port, a, A), frame(port, b, B)), "落层后的合成一样");
      a.dispose(); b.dispose();
    } finally { A.dispose(); B.dispose(); }
  });

  it("② 两块画板合用一个池：交替合成、中间睡醒，各自 = 单独一块画板合成；池按总数长大", () => {
    const port = new SoftGl2Port(), A = makeDoc(21, 20), B = makeDoc(22, 20);   // 一张 40 块图块，两张 80 > 起步 64 片
    try {
      const soloA = new GLBoard(port, 4096), soloB = new GLBoard(port, 4096);
      const fa = frame(port, soloA, A), fb = frame(port, soloB, B);
      soloA.dispose(); soloB.dispose();
      const pool = createSharedTilePool(port, 4096);
      const a = new GLBoard(port, 4096, { pool }), b = new GLBoard(port, 4096, { pool });
      eq(pool.stats.users, 2, "两个使用者");
      for (let round = 0; round < 3; round++) {
        assert(same(frame(port, a, A), fa), `第 ${round + 1} 轮 A = 单独合成`);
        assert(same(frame(port, b, B), fb), `第 ${round + 1} 轮 B = 单独合成`);
        if (round === 1) { a.sleep(); eq(pool.stats.users, 1, "A 睡了，剩一个使用者"); assert(same(frame(port, b, B), fb), "A 睡着时 B 照样对"); a.wake(); }
      }
      assert(pool.stats.slices > 64, `池长大了（${pool.stats.slices} 片）`);
      a.dispose(); b.dispose(); pool.dispose();
    } finally { A.dispose(); B.dispose(); }
  });

  it("③ 自己开池的画板睡着时承诺的显存降到 1 片，醒来合一帧回来；合用池里睡 = 片让出来给别人", () => {
    const port = new SoftGl2Port(), A = makeDoc(31, 40);   // 80 块：池长到 128 片
    try {
      const a = new GLBoard(port, 4096), f0 = frame(port, a, A);
      const awake = port.arenaStats.bytes;
      a.sleep();
      const asleep = port.arenaStats.bytes;
      assert(asleep < awake / 50, `睡着时降了（${awake} → ${asleep} 字节）`);
      a.wake();
      assert(same(frame(port, a, A), f0), "醒来合一帧逐字节一样");
      assert(port.arenaStats.bytes > asleep, `醒来显存回来了（${port.arenaStats.bytes} 字节）`);
      a.dispose();
      const pool = createSharedTilePool(port, 4096), p = new GLBoard(port, 4096, { pool }), q = new GLBoard(port, 4096, { pool });
      frame(port, p, A);
      const used = pool.stats.slices;
      p.sleep();
      const B = makeDoc(32, 40);
      try { frame(port, q, B); assert(pool.stats.slices === used, `q 用的是 p 让出来的片，池没再长（${used} 片）`); }
      finally { B.dispose(); }
      p.dispose(); q.dispose(); pool.dispose();
    } finally { A.dispose(); }
  });

  it("④ 睡着时合成 / 一次性合成 / 落一笔 / 吸色 = 抛，说清先 wake()", () => {
    const port = new SoftGl2Port(), A = makeDoc(41);
    try {
      const a = new GLBoard(port, 64); frame(port, a, A); a.sleep();
      assert(throws(() => a.composite(A.doc, BG), /asleep/), "合成 = 抛");
      assert(throws(() => a.compositeToBytes(A.doc.layers, W, H), /asleep/), "一次性合成 = 抛");
      assert(throws(() => a.pickColor(A.doc, null, 1, 1), /asleep/), "吸色 = 抛");
      assert(throws(() => stroke(port, a, A, 3), /asleep/), "落一笔 = 抛");
      a.wake(); frame(port, a, A); a.dispose();
    } finally { A.dispose(); }
  });

  it("⑤ 睡着时显卡画面丢了（Port 广播）、醒来合成逐字节一样，不留旧片号", () => {
    const port = new SoftGl2Port(), A = makeDoc(51, 6);
    try {
      for (const shared of [false, true]) {
        const pool = shared ? createSharedTilePool(port, 4096) : null;
        const a = new GLBoard(port, 4096, pool ? { pool } : undefined), f0 = frame(port, a, A);
        a.sleep();
        for (const cb of [...port._invalidated]) cb();   // 画面丢了又恢复
        a.wake();
        assert(same(frame(port, a, A), f0), `${shared ? "合用池" : "自己的池"}：醒来逐字节一样`);
        a.markContentDirty();
        assert(same(frame(port, a, A), f0), `${shared ? "合用池" : "自己的池"}：再合一帧还一样`);
        a.dispose(); pool?.dispose();
      }
    } finally { A.dispose(); }
  });

  it("⑥ 开着一笔（这一帧装了正在画的那一笔）时睡 = 抛、什么都没动；清掉之后能睡；浮着的一块睡醒不变", () => {
    const port = new SoftGl2Port(), A = makeDoc(61);
    try {
      const a = new GLBoard(port, 64);
      const ov = new Uint8Array(W * H * 4); for (let i = 0; i < 40 * 4; i += 4) { ov[i] = 255; ov[i + 3] = 255; }
      const tex = port.wrapExternal({ pixels: ov, w: W, h: H, prec: "u8" });
      const desc = { kind: "host", tex, bx: 0, by: 0, bw: 40, bh: 1, layerId: 1, opacity: 1, erase: false, blendMode: "source-over", lockAlpha: false, selMask: null };
      const withStroke = a.composite(A.doc, BG, [], [desc]); assert(withStroke !== null, "带着一笔合成了");
      assert(throws(() => a.sleep(), /stroke is open/), "开着一笔睡 = 抛");
      assert(!a.asleep, "没睡下去");
      a.composite(A.doc, BG, [], []);   // 一笔画完，宿主下一帧不再递
      a.sleep(); assert(a.asleep, "清掉之后能睡"); a.wake();
      const fpx = new Uint8ClampedArray(30 * 20 * 4); for (let i = 0; i < fpx.length; i += 4) { fpx[i] = 10; fpx[i + 1] = 250; fpx[i + 2] = 90; fpx[i + 3] = 200; }
      // 浮着的一块：30×20 摆在 (40, 50)；hinv = 画布坐标 → 源的单位方格
      const floats = [{ layerId: 2, srcW: 30, srcH: 20, hinv: [1 / 30, 0, -40 / 30, 0, 1 / 20, -50 / 20, 0, 0, 1], mode: 0, u8Plane: { data: fpx, w: 30, h: 20 } }];
      const plain = frame(port, a, A), f0 = frame(port, a, A, floats);
      assert(!same(plain, f0), "浮着的一块真的画上去了");
      a.sleep(); a.wake();
      assert(same(frame(port, a, A, floats), f0), "浮着的一块睡醒不变");
      a.dispose();
    } finally { A.dispose(); }
  });

  it("⑦ 100 块画板合用一个池、轮流合成后全退租：池里没有使用者，Port 上挂的「画面丢了」回调回到原数", () => {
    const port = new SoftGl2Port(), A = makeDoc(71, 1), base = port.invalidatedListenerCount;
    try {
      const pool = createSharedTilePool(port, 4096), boards = [];
      for (let i = 0; i < 100; i++) { const b = new GLBoard(port, 4096, { pool }); boards.push(b); if (i % 10 === 0) frame(port, b, A); if (i % 3 === 0) b.sleep(); }
      eq(port.invalidatedListenerCount, base + 100, "每块挂了一个");
      for (const b of boards) b.dispose();
      eq(pool.stats.users, 0, "池里没有使用者");
      eq(port.invalidatedListenerCount, base, "Port 上挂的回调回到原数");
      pool.dispose(); pool.dispose();
      assert(pool.disposed, "池退租了（两次没事）");
    } finally { A.dispose(); }
  });

  it("⑧ 睡、醒各调两次没事；睡着时退租不抛；池先退了再用画板 = 抛并说清是顺序错了", () => {
    const port = new SoftGl2Port(), A = makeDoc(81);
    try {
      const a = new GLBoard(port, 64), f0 = frame(port, a, A);
      a.sleep(); a.sleep(); a.wake(); a.wake();
      assert(same(frame(port, a, A), f0), "睡醒两次之后照样对");
      a.sleep(); a.dispose(); a.dispose(); assert(a.disposed, "睡着时退租不抛");
      assert(throws(() => a.wake(), /disposed/), "退租之后醒 = 抛");
      const pool = createSharedTilePool(port, 4096), b = new GLBoard(port, 4096, { pool });
      frame(port, b, A);
      pool.dispose();
      assert(throws(() => b.composite(A.doc, BG), /shared tile pool was disposed/), "醒着合成 = 抛并说清");
      b.dispose();   // 池已退，画板退租照样不抛
      assert(b.disposed, "画板退租了");
    } finally { A.dispose(); }
  });
});
