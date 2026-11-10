// doc resize（T5：DocResizeOp 收编 LayerTiles.resizeAllLeaves 后的行为锚，前身 operators.test.mjs）。
// crop/cropResample/resample 的实例交换记账：exchange record（undo 包 = 另一侧实例，自反互换）
// + 树尺寸 setTreeProp 同 step 同向翻 + 双捕获断言 + 所有权收支（清栈/换文档后池归零）。
import { describe, it, assert, eq } from "./runner.mjs";
import { seedWrite } from "./helpers.mjs";
import { UndoStack } from "../src/backend/workpiece/undo-stack.ts";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { PaintingView } from "../src/backend/workpiece/painting-view.ts";
import { appTilePool } from "../src/backend/tiles/app-tile-pool.ts";

const _ctxs = [];
function mk() {
  const undo = new UndoStack({ maxQuotaBytes: 1 << 30 });
  const wp2 = new PaintingWorkpiece({ undo, tree: { width: 512, height: 512 }, onTokenLeak: () => {} });
  const doc = new PaintingView(wp2);
  _ctxs.push({ undo, wp2 });
  return { undo, wp2, doc };
}
const px = (r, g, b, a) => new Uint8ClampedArray([r, g, b, a]);

describe("doc-resize · 像素事务（token + 写时扣押，v2 基座）", () => {
  it("令牌内画一笔 → undo 回原态 → redo 回新态（像素逐点验证）", () => {
    const { undo, doc, wp2 } = mk();
    const L = doc.activeLayer;
    seedWrite(L, () => L.pixels.putRegion(10, 10, 1, 1, px(1, 2, 3, 255)));      // 底色（令牌外种子，不进 undo 的初态——C7 硬化后走显式态）
    const t = wp2.begin("stroke");
    L.pixels.putRegion(10, 10, 1, 1, px(9, 9, 9, 255));      // 引擎改动（写时扣押）
    L.pixels.putRegion(300, 300, 1, 1, px(5, 5, 5, 255));
    t.commit();
    undo.undo();
    eq(L.sampleAt(10, 10)[0], 1, "undo 回底色");
    eq(L.sampleAt(300, 300)[3], 0, "undo 后第二点消失");
    undo.redo();
    eq(L.sampleAt(10, 10)[0], 9, "redo 回笔迹");
    eq(L.sampleAt(300, 300)[0], 5);
    undo.undo();
    eq(L.sampleAt(10, 10)[0], 1, "二次 undo 仍精确（对称 swap 无衰减）");
  });
});

describe("doc-resize · exchange record（crop/resample 的实例交换 + 树尺寸同步翻）", () => {
  it("crop 形（一个 token：resizeAllLeaves + setTreeProp）→ undo 回原尺寸与像素 → redo 回裁后", () => {
    const { undo, doc, wp2 } = mk();
    const L = doc.activeLayer;
    seedWrite(L, () => {
      L.pixels.putRegion(400, 400, 1, 1, px(4, 4, 4, 255));
      L.pixels.putRegion(8, 8, 1, 1, px(2, 2, 2, 255));
    });
    const t = wp2.begin("crop");
    wp2.layerTiles.resizeAllLeaves((_id, lp) => lp.cropped(0, 0, 256, 256));
    wp2.layerTree.setTreeProp("width", 256);
    wp2.layerTree.setTreeProp("height", 256);
    t.commit();
    eq(doc.width, 256, "裁后尺寸");
    eq(doc.activeLayer.sampleAt(8, 8)[0], 2, "保留区像素还在");
    undo.undo();
    eq(doc.width, 512, "undo 回原尺寸");
    eq(doc.activeLayer.sampleAt(400, 400)[0], 4, "裁掉的像素回来了");
    undo.redo();
    eq(doc.width, 256, "redo 回裁后");
    eq(doc.activeLayer.sampleAt(400, 400)[3], 0, "redo 后裁外像素不在");
    undo.undo();
    eq(doc.activeLayer.sampleAt(400, 400)[0], 4, "二次 undo 仍精确");
  });

  it("双捕获断言：同 token 已有 tile 收集 → resizeAllLeaves 拒绝", () => {
    const { doc, wp2 } = mk();
    const t = wp2.begin("bad");
    doc.activeLayer.pixels.putRegion(0, 0, 1, 1, px(1, 1, 1, 255));   // 写时扣押已收集
    let threw = false;
    try { wp2.layerTiles.resizeAllLeaves((_id, lp) => lp.cropped(0, 0, 64, 64)); }
    catch { threw = true; }
    assert(threw, "exchange verb 前已有 tile 收集 → throw");
    t.cancel();
  });

  it("token.cancel：实例交换回滚无痕（尺寸与像素都回原态，栈不长）", () => {
    const { undo, doc, wp2 } = mk();
    const L = doc.activeLayer;
    seedWrite(L, () => L.pixels.putRegion(400, 400, 1, 1, px(4, 4, 4, 255)));
    const d0 = undo.depth();
    const t = wp2.begin("crop");
    wp2.layerTiles.resizeAllLeaves((_id, lp) => lp.cropped(0, 0, 256, 256));
    wp2.layerTree.setTreeProp("width", 256);
    wp2.layerTree.setTreeProp("height", 256);
    t.cancel();
    eq(doc.width, 512, "cancel 回原尺寸");
    eq(L.sampleAt(400, 400)[0], 4, "cancel 回原像素");
    eq(undo.depth(), d0, "栈未长");
  });
});

describe("doc-resize · 所有权收支（清栈+换文档后池不留本套件的 tile）", () => {
  it("一串操作 + 清栈 + load 空文档 → 池计数回落到进入前", () => {
    const before = appTilePool().stats().count;
    const { undo, doc, wp2 } = mk();
    const L = doc.activeLayer;
    seedWrite(L, () => L.pixels.putRegion(0, 0, 2, 2, new Uint8ClampedArray(16).fill(9)));
    const t = wp2.begin("stroke");
    L.pixels.putRegion(64, 64, 2, 2, new Uint8ClampedArray(16).fill(7));
    t.commit();
    undo.undo(); undo.redo(); undo.undo();
    const t2 = wp2.begin("crop");
    wp2.layerTiles.resizeAllLeaves((_id, lp) => lp.cropped(0, 0, 128, 128));
    wp2.layerTree.setTreeProp("width", 128);
    wp2.layerTree.setTreeProp("height", 128);
    t2.commit();
    undo.clear();
    // 换文档：旧根 record 随 load 清栈驱逐 → 旧 tileset 引用计数归零还池（换文档零手工 dispose）。
    wp2.load({ width: 8, height: 8, nodes: [{ name: "空", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }] });
    eq(appTilePool().stats().count, before, "undo 包/旧文档像素全部归还（无泄漏）");
  });
});

// 测试卫生：统一释放（清栈 + 换空文档 = record 驱逐 → tileset 归零还池；防 FR 泄漏 assert 刷屏）
describe("doc-resize 收尾", () => {
  it("清栈并释放本文件的工件资源", () => {
    for (const { undo, wp2 } of _ctxs) {
      undo.clear();
      wp2.load({ width: 4, height: 4, nodes: [{ name: "空", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }] });
    }
    _ctxs.length = 0;
    assert(true, "disposed");
  });
});
