// tile-geometry 纯函数测试（自 tile-store.test.mjs 迁出——S7 里 TilePool/LayerTileMap 死，几何长存）。
import { describe, it, assert } from "./runner.mjs";
import {
  tilesAcross, tilesDown, tileCount,
  tileKey, tileCoord, tileDocOrigin, tileRangeForRect, forEachTileInRect,
} from "../src/common/tile-geometry.ts";

describe("tile-geometry · 网格换算", () => {
  it("tilesAcross/Down 向上取整，最小 1", () => {
    assert(tilesAcross(2048) === 8, "2048/256=8");
    assert(tilesAcross(2732) === 11, "2732/256=10.67→11");
    assert(tilesAcross(1) === 1 && tilesDown(0) === 1, "下限 1");
    assert(tileCount(2048, 2048) === 64, "满幅 2K = 64 tile");
  });

  it("tileKey ↔ tileCoord 互逆", () => {
    const across = 8;
    for (const [tx, ty] of [[0, 0], [7, 0], [0, 7], [3, 5], [7, 7]]) {
      const k = tileKey(tx, ty, across);
      const c = tileCoord(k, across);
      assert(c.tx === tx && c.ty === ty, `(${tx},${ty}) 往返`);
    }
    assert(tileKey(3, 5, 8) === 43, "5*8+3=43");
  });

  it("tileDocOrigin = (tx·256, ty·256)", () => {
    const o = tileDocOrigin(3, 5);
    assert(o.x === 768 && o.y === 1280, "原点");
  });
});

describe("tile-geometry · tileRangeForRect", () => {
  const W = 2048, H = 2048;   // 8×8

  it("空矩形 / doc 外 → null", () => {
    assert(tileRangeForRect(0, 0, 0, 10, W, H) === null, "w=0");
    assert(tileRangeForRect(0, 0, 10, -5, W, H) === null, "h<0");
    assert(tileRangeForRect(-100, -100, 50, 50, W, H) === null, "整体在左上外");
    assert(tileRangeForRect(2048, 0, 100, 100, W, H) === null, "整体在右外");
  });

  it("单像素点落在它所在的单一 tile", () => {
    const r = tileRangeForRect(300, 300, 1, 1, W, H);   // tile (1,1)
    assert(r.tx0 === 1 && r.tx1 === 1 && r.ty0 === 1 && r.ty1 === 1, "单 tile (1,1)");
  });

  it("跨 tile 边界的矩形覆盖多 tile", () => {
    // x[250,260) 跨 255/256 边界 → tx 0..1
    const r = tileRangeForRect(250, 10, 10, 5, W, H);
    assert(r.tx0 === 0 && r.tx1 === 1, "跨列边界 → 两列");
    assert(r.ty0 === 0 && r.ty1 === 0, "同行");
  });

  it("超出 doc 的部分被 clamp 进网格", () => {
    // 矩形右下越界，闭区间右端 clamp 到 7
    const r = tileRangeForRect(2000, 2000, 500, 500, W, H);
    assert(r.tx1 === 7 && r.ty1 === 7, "clamp 到末 tile");
    assert(r.tx0 === 7 && r.ty0 === 7, "起点也在末 tile");
  });

  it("末覆盖像素用 ix1-1（排他右边）不多算一格", () => {
    // x[0,256) 恰好只覆盖 tile 0（256 是排他右边，不应碰 tile 1）
    const r = tileRangeForRect(0, 0, 256, 256, W, H);
    assert(r.tx1 === 0 && r.ty1 === 0, "[0,256) 只 tile 0");
  });

  it("forEachTileInRect 遍历全部覆盖 tile", () => {
    const seen = [];
    forEachTileInRect(0, 0, 512, 256, W, H, (tx, ty) => seen.push(`${tx},${ty}`));
    assert(seen.length === 2 && seen.includes("0,0") && seen.includes("1,0"), "两 tile");
  });
});
