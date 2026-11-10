// PaintingWorkpiece 树模式（T3b-1，ADR-0008）：出生单空叶 / load 令牌灌入（旧 doc 随 record 驱逐
// 零手工 dispose）/ exportData 冻结快照往返 / addGroup（v1 addGroup 语义）/ 写面纪律统一。
import { describe, it, assert, eq } from "./runner.mjs";
import { UndoStack } from "../src/backend/workpiece/undo-stack.ts";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";

function mk(opts = {}) {
  const undo = new UndoStack({ maxQuotaBytes: opts.maxQuotaBytes ?? (1 << 30) });
  const wp = new PaintingWorkpiece({ undo, tree: { width: 64, height: 64 }, onTokenLeak: () => {} });
  return { undo, wp, tree: wp.layerTree, tiles: wp.layerTiles };
}
const solid = (w, h, v) => new Uint8ClampedArray(w * h * 4).fill(v);
const leafData = (name, pixels = null, extra = {}) =>
  ({ name, visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels, ...extra });

describe("PaintingWorkpiece · 树模式", () => {
  it("出生：单空叶 doc、clean、tileset 账面 1", () => {
    const { wp, tree, tiles } = mk();
    eq(tree.countLeaves(), 1);
    eq(tiles.tilesetCount(), 1);
    assert(!wp.isDirty());
    assert(tree.view().activeId !== null);
  });

  it("load：令牌灌入 + 清栈 + markSaved；旧 doc tileset 随 record 驱逐全释放", () => {
    const { undo, wp, tree, tiles } = mk();
    // 先在出生 doc 上画点东西造「旧 doc 资源」
    let t = wp.begin(); tree.addLayer("scratch"); t.commit();
    eq(tiles.tilesetCount(), 2);
    wp.load({
      width: 64, height: 64,
      nodes: [
        leafData("bg", { rect: { x: 2, y: 2, w: 4, h: 4 }, bytes: solid(4, 4, 123) }),
        { name: "g", visible: true, opacity: 1, mode: "source-over", clippingMask: false, children: [leafData("in-group")] },
      ],
    });
    eq(tree.countLeaves(), 2);
    eq(tiles.tilesetCount(), 2, "旧 doc 两个 tileset 已全释放，只剩新 doc 的");
    eq(undo.depth(), 0, "load 后清栈");
    assert(!wp.isDirty(), "load 后 clean");
    assert(!undo.canUndo(), "load 不可撤（换文档语义）");
    const bg = tree.view().nodes[0];
    eq(tiles.getRegion(bg.id, 3, 3, 1, 1)[0], 123, "tile 字节灌入到位");
    eq(tree.view().activeId, bg.id, "缺省 active = 第一叶");
  });

  it("exportData：冻结快照（拷出后再画不追写）；load(export) 往返内容一致", () => {
    const { wp, tree, tiles } = mk();
    const bgId = tree.view().activeId;
    let t = wp.begin();
    tiles.putRegion(bgId, 1, 1, 3, 3, solid(3, 3, 77));
    tree.setLayerProp(bgId, "opacity", 0.5);
    t.commit();
    const snap = wp.exportData();
    eq(snap.nodes.length, 1);
    eq(snap.nodes[0].opacity, 0.5);
    eq(snap.nodes[0].pixels.rect.w, 3);
    // 冻结：继续画不影响已导出的 bytes
    t = wp.begin(); tiles.putRegion(bgId, 1, 1, 3, 3, solid(3, 3, 200)); t.commit();
    eq(snap.nodes[0].pixels.bytes[0], 77, "快照字节不被后续编辑追写");
    // 往返
    const { wp: wp2, tree: tree2, tiles: tiles2 } = mk();
    wp2.load(snap);
    const id2 = tree2.view().nodes[0].id;
    eq(tree2.leafById(id2).opacity, 0.5);
    eq(tiles2.getRegion(id2, 1, 1, 1, 1)[0], 77, "往返逐字节");
  });

  it("addGroup：恒插 active 同级之上（组 active 也是兄弟，2026-08-28 起）；active=新组；可撤", () => {
    const { undo, wp, tree } = mk();
    let t = wp.begin(); const g = tree.addGroup("G"); t.commit();
    assert(g && "children" in tree.nodeById(g.id));
    eq(tree.view().activeId, g.id);
    eq(tree.view().nodes.length, 2);
    t = wp.begin(); const g2 = tree.addGroup("G2"); t.commit();   // active 是组 → 仍是**兄弟**，不往里钻
    eq(tree.nodeById(g.id).children.length, 0, "不塞进 active 组（只含组的层级也建得出兄弟组）");
    eq(tree.view().nodes.length, 3, "根级三个节点");
    eq(tree.view().activeId, g2.id);
    undo.undo(); undo.undo();
    eq(tree.view().nodes.length, 1, "两步撤干净");
    undo.clear();
  });

  it("host 模式没有 layerTree：load/export throw（能力声明清晰）", () => {
    const undo = new UndoStack({ maxQuotaBytes: 1 << 30 });
    const wp = new PaintingWorkpiece({
      undo, onTokenLeak: () => {},
      host: { getPixels: () => null, findLayerIdByPixels: () => null, eachLayer: () => {}, replacePixels: () => {} },
    });
    assert(wp.layerTree === null);
    let threw = false;
    try { wp.exportData(); } catch { threw = true; }
    assert(threw);
  });
});
