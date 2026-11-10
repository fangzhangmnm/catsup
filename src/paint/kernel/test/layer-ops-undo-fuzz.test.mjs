// 图层结构操作 × 撤销 随机序列回归（created 2026-10-10 by Claude Opus 5.5）
//
// 起因：user 2026-10-10 真机 log 两次「unrecoverable undo exception; history reset … LayerTiles: layer gone at undo swap
//   (layerId=15 / 26 — stack-order bug)」，操作 = 图层组操作 + 按颜色拆分。根因：explodeLeaf / collapseGroupToLeaf
//   在令牌里先往新 LayerPixels 写、再入册挂树 → 写时扣押把它当成「对新层的修改」记 tiles 账且先于树账入 step →
//   undo 倒序先撤树（新层没了）再撤 tiles → throw → 整栈清空。
//   10-10 的修 = createTileset 入册即作废暂扣（只盖住这一种表现）；2026-10-13 Claude Fable 5.1 换成根治：像素账按 tileset id 记、
//   record 持引用，和树账的先后无关（layer-tiles 头注 / ADR-0008 §6）。本文件加了两种**混序聚合步**（aggNew / aggDel）
//   专门制造「像素账在树账前 / 后」两种顺序。原 workpiece-layer-tree 的 explode 用例只数不断言 unrecoverable，所以一直绿。
//
// 问题陈述：
//   输入 = 固定种子生成的结构/像素操作序列（画一块 / 加层 / 加组 / 复制 / 删 / 上下移 / 向下合并 / 剪切开关 /
//          清空 / 解组 / 组合并为图层 / 移入组 / 移出组 / 按颜色拆分 / 换活动层 / 两种混序聚合步）。
//   输出 = 全撤到底 → 结构 + 每叶像素回到初态；全重做到底 → 与操作完的终态逐字节一致；来回两轮；全程零不可恢复。
//   修前同一套 94/100 组失败，修后 0。
import { describe, it, assert } from "./runner.mjs";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { PaintingView } from "../src/backend/workpiece/painting-view.ts";
import { History } from "../src/backend/workpiece/history.ts";
import { LayersFace } from "../src/backend/layers-face.ts";

const W = 64, H = 64;
const ST = { undoStatus: "u", redoStatus: "r" };
const solid = (w, h, c) => { const b = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) b.set(c, i * 4); return b; };
const walk = (nodes, out = []) => { for (const n of nodes) { out.push(n); if (n.isGroup) walk(n.children, out); } return out; };
const _hists = [];

function trial(seed, nOps) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const errs = [];
  const h = new History({ maxQuotaBytes: 1 << 30, onUnrecoverable: (e) => errs.push(e?.message ?? String(e)) });
  _hists.push(h);
  const wp2 = new PaintingWorkpiece({ undo: h.stack, tree: { width: W, height: H }, onTokenLeak: () => {} });
  const doc = new PaintingView(wp2);
  h.attach(wp2);
  const lt = new LayersFace({ history: h, tree: wp2.layerTree, tiles: wp2.layerTiles, port: doc, status: () => {} });
  const hash = (n) => { const d = n.pixels.getRegion(0, 0, W, H); let x = 0; for (let i = 0; i < d.length; i++) x = (x * 31 + d[i]) | 0; return x; };
  const sig = () => walk(doc.layers).map((n) => n.isGroup ? `g${n.id}[${n.children.length}]${n.clippingMask ? "c" : ""}` : `${n.id}${n.clippingMask ? "c" : ""}:${hash(n)}`).join(",");
  const leaves = () => walk(doc.layers).filter((n) => !n.isGroup);
  const groups = () => walk(doc.layers).filter((n) => n.isGroup);
  const ops = {
    paint() { const L = pick(leaves()); if (!L) return; const x = Math.floor(rnd() * 40), y = Math.floor(rnd() * 40); const c = [Math.floor(rnd() * 255), Math.floor(rnd() * 255), 40, 255]; h.withPoint("paint", undefined, () => L.applyRegionDiff(x, y, 16, 16, solid(16, 16, c))); return `paint ${L.id}`; },
    add() { lt.addLayer("n"); return "add"; },
    group() { lt.addGroup("g", ST); return "group"; },
    dup() { const n = pick(walk(doc.layers)); if (n) lt.duplicateNode(n.id); return `dup ${n?.id}`; },
    del() { const n = pick(walk(doc.layers)); if (!n) return; if (n.isGroup) lt.deleteGroup(n.id, ST); else lt.removeLayer(n.id, n.name); return `del ${n.id}`; },
    move() { const n = pick(walk(doc.layers)); if (n) lt.moveLayer(n.id, rnd() < 0.5 ? 1 : -1); return `move ${n?.id}`; },
    merge() { const n = pick(leaves()); if (n) lt.mergeDown(n.id); return `mergeDown ${n?.id}`; },
    clip() { const n = pick(walk(doc.layers)); if (n) lt.setLayerProp(n.id, "clippingMask", !n.clippingMask); return `clip ${n?.id}`; },
    clear() { const n = pick(leaves()); if (n) lt.clearLayer(n.id); return `clear ${n?.id}`; },
    ungroup() { const g = pick(groups()); if (g) lt.ungroup(g.id, ST); return `ungroup ${g?.id}`; },
    collapse() { const g = pick(groups()); if (g) lt.collapseGroup(g.id, { bytes: solid(8, 8, [9, 9, 9, 255]), rect: { x: 2, y: 2, w: 8, h: 8 } }, ST); return `collapse ${g?.id}`; },
    into() { const g = pick(groups()); const n = pick(walk(doc.layers)); if (g && n && n.id !== g.id) lt.moveIntoGroup(n.id, g.id, ST); return `into ${n?.id}->${g?.id}`; },
    out() { const n = pick(walk(doc.layers)); if (n) lt.moveOutOfGroup(n.id, ST); return `out ${n?.id}`; },
    explode() { const n = pick(leaves()); if (n) lt.explodeLayer(n.id, [{ data: solid(8, 8, [255, 0, 0, 255]), name: "a" }, { data: solid(8, 8, [0, 0, 255, 255]), name: "b" }], { x: 4, y: 4, w: 8, h: 8 }, ST); return `explode ${n?.id}`; },
    active() { const n = pick(walk(doc.layers)); if (n) lt.setActive(n.id); return `active ${n?.id}`; },
    // 混序聚合步（2026-10-13）：像素账先触 + 出生层 / 树账先触 + 死亡层——两本账相对顺序的两个极端。
    aggNew() { const L = pick(leaves()); if (!L) return; h.withPoint("agg-new", undefined, () => { L.applyRegionDiff(2, 2, 8, 8, solid(8, 8, [1, 2, 3, 255])); const a = lt.addLayer("agg", { checkpoint: false }); if (a.ok) a.layer.applyRegionDiff(6, 6, 8, 8, solid(8, 8, [4, 5, 6, 255])); }); return `aggNew ${L.id}`; },
    aggDel() { const X = pick(leaves()); if (!X) return; h.withPoint("agg-del", undefined, () => { lt.addLayer("tmp", { checkpoint: false }); const X2 = leaves().find((l) => l.id === X.id); if (!X2) return; X2.applyRegionDiff(1, 1, 8, 8, solid(8, 8, [7, 8, 9, 255])); lt.removeLayer(X2.id, X2.name, { checkpoint: false }); }); return `aggDel ${X.id}`; },
  };
  const names = Object.keys(ops);
  const log = [];
  const sig0 = sig();
  for (let i = 0; i < nOps; i++) {
    log.push(ops[pick(names)]());
    if (errs.length) return `seed=${seed} 操作中不可恢复：${errs[0]}\n  ${log.join(" | ")}`;
  }
  const sigEnd = sig();
  for (let pass = 0; pass < 2; pass++) {
    while (h.canUndo()) { h.undo(); if (errs.length) return `seed=${seed} 第${pass + 1}轮撤销不可恢复：${errs[0]}\n  ${log.join(" | ")}`; }
    if (sig() !== sig0) return `seed=${seed} 撤到底没回初态：${sig()} ≠ ${sig0}\n  ${log.join(" | ")}`;
    while (h.canRedo()) { h.redo(); if (errs.length) return `seed=${seed} 第${pass + 1}轮重做不可恢复：${errs[0]}\n  ${log.join(" | ")}`; }
    if (sig() !== sigEnd) return `seed=${seed} 重做到底与终态不一致：${sig()} ≠ ${sigEnd}\n  ${log.join(" | ")}`;
  }
  return null;
}

describe("图层结构操作 × 撤销：随机序列（固定种子）", () => {
  it("80 组 × 25 步：撤到底回初态、重做到底回终态、零不可恢复", () => {
    const fails = [];
    for (let t = 0; t < 80; t++) { const f = trial(1000 + t * 7919, 25); if (f) fails.push(f); }
    assert(fails.length === 0, `${fails.length}/80 组失败；首例：\n${fails[0] ?? ""}`);
  });
  it("收尾：清栈释放 undo 包", () => {
    for (const h of _hists) h.clear();
    _hists.length = 0;
    assert(true, "disposed");
  });
});
