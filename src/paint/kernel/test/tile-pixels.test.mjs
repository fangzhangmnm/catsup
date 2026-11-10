// LayerPixels 纯核心测试（图层像素新 SoT，bbox-free 稀疏 tile）。Canvas2D facade 在 smoke 验。
import { describe, it, assert } from "./runner.mjs";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";

const W = 1024, H = 1024;   // 4×4 tile

// 造 flat RGBA 区域：fn(x,y) 在 doc 坐标（区域左上 = ox,oy）。
function region(ox, oy, w, h, fn) {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, al] = fn(ox + x, oy + y); const i = (y * w + x) * 4;
    a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = al;
  }
  return a;
}
function eqRegion(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

// 测试卫生：统一释放（防 tile-pool FR 泄漏 assert 刷屏；见 shape-brush.test.mjs 同款）
const _lps = [], _snaps = [];
const mkLp = () => { const lp = new LayerPixels(W, H); _lps.push(lp); return lp; };

describe("LayerPixels · put/get round-trip", () => {
  it("单 tile 内写读一致", () => {
    const lp = mkLp();
    const src = region(10, 20, 30, 40, (x, y) => [x % 256, y % 256, (x + y) % 256, 255]);
    lp.putRegion(10, 20, 30, 40, src);
    assert(eqRegion(lp.getRegion(10, 20, 30, 40), src), "往返一致");
  });

  it("跨多 tile 的大区域写读一致", () => {
    const lp = mkLp();
    const src = region(200, 200, 400, 400, (x, y) => [x & 255, y & 255, 128, 200]);   // 跨 (0,0)-(2,2) tile
    lp.putRegion(200, 200, 400, 400, src);
    assert(eqRegion(lp.getRegion(200, 200, 400, 400), src), "跨 tile 往返");
    assert(lp.tileCount >= 4, `应分配多 tile，实 ${lp.tileCount}`);
  });

  it("读未写区域 = 全透明", () => {
    const lp = mkLp();
    const out = lp.getRegion(500, 500, 50, 50);
    assert(out.every((v) => v === 0), "空 = 透明");
  });

  it("部分覆盖 tile：只改交集，其余不变", () => {
    const lp = mkLp();
    lp.putRegion(0, 0, 256, 256, region(0, 0, 256, 256, () => [9, 9, 9, 255]));    // 填满 tile(0,0)
    lp.putRegion(0, 0, 10, 10, region(0, 0, 10, 10, () => [50, 60, 70, 255]));      // 改左上角 10×10
    const out = lp.getRegion(0, 0, 256, 256);
    assert(out[0] === 50 && out[1] === 60, "角已改");
    const farI = (200 * 256 + 200) * 4;
    assert(out[farI] === 9, "远处不变");
  });
});

describe("LayerPixels · 稀疏 / 回收", () => {
  it("全透明 putRegion 不分配 tile", () => {
    const lp = mkLp();
    lp.putRegion(300, 300, 100, 100, region(300, 300, 100, 100, () => [0, 0, 0, 0]));
    assert(lp.tileCount === 0, "透明不占 tile");
  });

  it("把 tile 全擦透明 → 回收", () => {
    const lp = mkLp();
    lp.putRegion(0, 0, 256, 256, region(0, 0, 256, 256, () => [9, 9, 9, 255]));
    assert(lp.tileCount === 1, "占 1");
    lp.putRegion(0, 0, 256, 256, region(0, 0, 256, 256, () => [0, 0, 0, 0]));    // 全擦
    assert(lp.tileCount === 0, "回收");
  });

  it("稀疏：远隔两点只占 2 tile", () => {
    const lp = mkLp();
    lp.putRegion(0, 0, 4, 4, region(0, 0, 4, 4, () => [1, 1, 1, 255]));
    lp.putRegion(900, 900, 4, 4, region(900, 900, 4, 4, () => [2, 2, 2, 255]));
    assert(lp.tileCount === 2, "只 2 tile（16 格里）");
  });
});

describe("LayerPixels · contentBounds（bbox 替代）", () => {
  it("空层 → null", () => { assert(mkLp().contentBounds() === null, "空 null"); });

  it("tile 粒度并集", () => {
    const lp = mkLp();
    lp.putRegion(300, 300, 10, 10, region(300, 300, 10, 10, () => [5, 5, 5, 255]));   // tile (1,1)
    const b = lp.contentBounds(false);
    assert(b.x === 256 && b.y === 256 && b.w === 256 && b.h === 256, "tile (1,1) 框");
  });

  it("tight 扫 alpha 收紧到像素", () => {
    const lp = mkLp();
    lp.putRegion(300, 310, 10, 20, region(300, 310, 10, 20, () => [5, 5, 5, 255]));
    const b = lp.contentBounds(true);
    assert(b.x === 300 && b.y === 310 && b.w === 10 && b.h === 20, `紧框 = 内容，实 ${JSON.stringify(b)}`);
  });

  it("tight 全透明（有空 tile 残留也）→ null", () => {
    const lp = mkLp();
    lp.putTile(0, 0, new Uint8ClampedArray(256 * 256 * 4));   // 全透明 tile 经 putTile 不会留（回收）
    assert(lp.contentBounds(true) === null, "全透明 null");
  });
});

describe("LayerPixels · sampleAt / putTile / getTile", () => {
  it("sampleAt 取点", () => {
    const lp = mkLp();
    lp.putRegion(100, 100, 1, 1, new Uint8ClampedArray([11, 22, 33, 44]));
    assert(JSON.stringify(lp.sampleAt(100, 100)) === "[11,22,33,44]", "取到");
    assert(JSON.stringify(lp.sampleAt(500, 500)) === "[0,0,0,0]", "空透明");
    assert(JSON.stringify(lp.sampleAt(-1, 0)) === "[0,0,0,0]", "越界透明");
  });

  it("putTile/getTile 整 tile + 全透明回收", () => {
    const lp = mkLp();
    const t = new Uint8ClampedArray(256 * 256 * 4); t[0] = 7; t[3] = 255;
    lp.putTile(2, 3, t);
    assert(lp.getTile(2, 3)[0] === 7, "存取");
    lp.putTile(2, 3, new Uint8ClampedArray(256 * 256 * 4));    // 全透明
    assert(lp.getTile(2, 3) === null && lp.tileCount === 0, "透明回收");
  });
});

describe("LayerPixels · snapshot/restore", () => {
  it("snapshot/restore 像素一致且独立", () => {
    const lp = mkLp();
    lp.putRegion(50, 50, 20, 20, region(50, 50, 20, 20, () => [9, 8, 7, 255]));
    const snap = lp.snapshot(); _snaps.push(snap);
    lp.putRegion(50, 50, 20, 20, region(50, 50, 20, 20, () => [1, 1, 1, 255]));   // 改
    lp.restore(snap);
    assert(lp.sampleAt(55, 55)[0] === 9, "还原");
    // 独立：改 lp 不影响 snap
    lp.clear();
    const lp2 = mkLp(); lp2.restore(snap);
    assert(lp2.sampleAt(55, 55)[0] === 9, "snap 未被污染");
  });


  it("clear 清空", () => {
    const lp = mkLp();
    lp.putRegion(0, 0, 300, 300, region(0, 0, 300, 300, () => [1, 2, 3, 255]));
    lp.clear();
    assert(lp.tileCount === 0, "清空");
  });
});

// ── v0.4：底层换 cpu-tile-pool 句柄后的新契约 ──────────────────────────────────
import { disposePixelsSnapshot } from "../src/backend/tiles/tile-layer.ts";
import { appTilePool } from "../src/backend/tiles/app-tile-pool.ts";

describe("LayerPixels · v0.4 句柄语义（零拷贝快照 + dispose）", () => {
  it("snapshot 与活层共享同一批 tile（零拷贝：句柄指同 id）", () => {
    const lp = mkLp();
    lp.putRegion(10, 10, 4, 4, region(10, 10, 4, 4, () => [5, 5, 5, 255]));
    const liveId = lp.getTileHandle(0, 0).id;
    const snap = lp.snapshot();
    assert(snap.tiles.length === 1 && snap.tiles[0][1].id === liveId, "快照句柄与活层同 tile id（没拷贝）");
    // copy-on-write：改活层 → 活层换新 tile，快照仍指旧 tile
    lp.putRegion(10, 10, 1, 1, new Uint8ClampedArray([1, 1, 1, 255]));
    assert(lp.getTileHandle(0, 0).id !== liveId, "写后活层是新 tile");
    assert(snap.tiles[0][1].id === liveId, "快照不受写影响");
    disposePixelsSnapshot(snap);
    lp.dispose();
  });

  it("restore 装 acquire 副本：快照可反复 restore，最后 dispose 一次", () => {
    const lp = mkLp();
    lp.putRegion(0, 0, 2, 2, region(0, 0, 2, 2, () => [9, 0, 0, 255]));
    const snap = lp.snapshot();
    lp.clear();
    lp.restore(snap);
    lp.clear();
    lp.restore(snap);   // 第二次 restore 依旧可用
    assert(lp.sampleAt(0, 0)[0] === 9, "反复 restore 内容还在");
    disposePixelsSnapshot(snap);
    assert(lp.sampleAt(0, 0)[0] === 9, "快照释放后活层仍持有自己的引用");
    lp.dispose();
  });

  it("dispose 释放池引用（池 count 回落）", () => {
    const before = appTilePool().stats().count;
    const lp = mkLp();
    lp.putRegion(0, 0, 300, 300, region(0, 0, 300, 300, () => [1, 2, 3, 4]));   // 跨 4 tile
    assert(appTilePool().stats().count === before + 4, "池里多 4 tile");
    lp.dispose();
    assert(appTilePool().stats().count === before, "dispose 全还回去");
  });

  it("Layer.setPixels 场景：换 pixels 后旧实例 dispose 不影响新实例（内容已拷贝）", () => {
    const lp = mkLp();
    lp.putRegion(100, 100, 8, 8, region(100, 100, 8, 8, () => [7, 7, 7, 255]));
    const flipped = lp.flippedHorizontal();
    lp.dispose();
    assert(flipped.sampleAt(W - 1 - 100, 100)[0] === 7, "纯变换结果独立于旧实例");
    flipped.dispose();
  });
});

// ---- S8 applyRegionDiff：brush GPU commit 的落盘口（只封真变 tile）----
describe("LayerPixels · applyRegionDiff（S8 tile-diff 落盘）", () => {
  it("语义同 putRegion：整块替换（含透明写入），往返一致", () => {
    const lp = mkLp();
    const src = region(100, 100, 300, 300, (x, y) => [x & 255, y & 255, 7, 200]);
    lp.applyRegionDiff(100, 100, 300, 300, src);
    assert(eqRegion(lp.getRegion(100, 100, 300, 300), src), "往返一致");
  });

  it("未变 tile 不封新 tile（句柄身份不换、contentVersion 不涨）", () => {
    const lp = mkLp();
    const src = region(0, 0, 512, 256, (x, y) => [x & 255, y & 255, 1, 255]);   // 恰覆盖 tile(0,0)(1,0)
    lp.putRegion(0, 0, 512, 256, src);
    const h00 = lp.getTileHandle(0, 0), h10 = lp.getTileHandle(1, 0);
    const v0 = lp.contentVersion;
    // 重放同样内容：全部相同 → 零变更
    const changed = lp.applyRegionDiff(0, 0, 512, 256, src);
    assert(changed.length === 0, `无变更应返空，实 ${changed.length}`);
    assert(lp.getTileHandle(0, 0) === h00 && lp.getTileHandle(1, 0) === h10, "句柄身份不换");
    assert(lp.contentVersion === v0, "contentVersion 不涨");
    // 只改右半 tile 一个像素 → 只有 (1,0) 换
    const src2 = src.slice();
    src2[(0 * 512 + 300) * 4] ^= 0xff;
    const changed2 = lp.applyRegionDiff(0, 0, 512, 256, src2);
    assert(changed2.length === 1 && changed2[0].tx === 1 && changed2[0].ty === 0, "只报真变的 tile");
    assert(lp.getTileHandle(0, 0) === h00, "未变 tile 句柄不动");
    assert(lp.getTileHandle(1, 0) !== h10, "变更 tile 换新句柄");
  });

  it("部分覆盖 tile：区域外像素保留（与旧字节先合再比）", () => {
    const lp = mkLp();
    lp.putRegion(0, 0, 256, 256, region(0, 0, 256, 256, () => [9, 9, 9, 255]));
    // 只替换 tile 内一小块
    lp.applyRegionDiff(10, 10, 20, 20, region(10, 10, 20, 20, () => [1, 2, 3, 255]));
    const out = lp.getRegion(0, 0, 256, 256);
    const at = (x, y) => out.subarray((y * 256 + x) * 4, (y * 256 + x) * 4 + 4);
    assert(at(15, 15)[0] === 1 && at(15, 15)[3] === 255, "区域内被替换");
    assert(at(5, 5)[0] === 9 && at(200, 200)[0] === 9, "区域外原样保留");
  });

  it("擦空整 tile → 格回收 + 报为变更", () => {
    const lp = mkLp();
    lp.putRegion(0, 0, 256, 256, region(0, 0, 256, 256, () => [9, 9, 9, 255]));
    const changed = lp.applyRegionDiff(0, 0, 256, 256, new Uint8ClampedArray(256 * 256 * 4));
    assert(changed.length === 1, "擦空报变更");
    assert(lp.getTileHandle(0, 0) === null && lp.tileCount === 0, "格被回收");
  });

  it("对空层写全透明区域：零变更零分配", () => {
    const lp = mkLp();
    const changed = lp.applyRegionDiff(0, 0, 512, 512, new Uint8ClampedArray(512 * 512 * 4));
    assert(changed.length === 0 && lp.tileCount === 0, "空对空 = 无事发生");
  });
});

// 测试卫生：统一释放（防 tile-pool FR 泄漏 assert 刷屏；见 shape-brush.test.mjs 同款）
describe("tile-pixels 收尾", () => {
  it("释放本文件的 LayerPixels/快照", () => {
    for (const s of _snaps) disposePixelsSnapshot(s);
    for (const lp of _lps) lp.dispose();
    _lps.length = 0; _snaps.length = 0;
    assert(true, "disposed");
  });
});
