// v339 动态字节预算图层上限验收（C3：迁 v2 基座——computeMaxLayers 策略函数 + PaintingView.maxLayers 装配）。
// 问题陈述：
//   - 旧 cap = 悲观 per-layer×分辨率（2K 卡 11 层，即使层只画一角）。
//   - 新 cap = 动态总驻留字节预算：预算内 → 放硬顶(64)；驻留达预算 → 冻结当前层数(≥2)。
//   - C3 债 b 后驻留恒单份 tile 计费（物化 canvas 拆除，countMat 档消灭）。
import { describe, it, assert, eq } from "./runner.mjs";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { PaintingView, computeMaxLayers, LAYER_HARD_CEIL } from "../src/backend/workpiece/painting-view.ts";
import { History } from "../src/backend/workpiece/history.ts";
import { LayersFace } from "../src/backend/layers-face.ts";

// 测试卫生：统一释放（防 tile-pool FR 泄漏 assert 刷屏）
const _ctxs = [];
function mk(width = 512, height = 512) {
  const h = new History({ maxQuotaBytes: 1 << 30 })   // onUnrecoverable 缺省即抛（2026-10-13）;
  const wp2 = new PaintingWorkpiece({ undo: h.stack, tree: { width, height } });
  const doc = new PaintingView(wp2);
  h.attach(wp2);
  const lt = new LayersFace({ history: h, tree: wp2.layerTree, tiles: wp2.layerTiles, port: doc, status: () => {} });
  // 像素只当预算底料、不测像素记账——rig 声明 scratch 域（C7 无令牌写硬化白名单态；树记账不受影响）。
  wp2.layerTiles._suspendCollect(true);
  _ctxs.push({ h, wp2 });
  return { doc, wp2, lt };
}

const TILE = 256 * 256 * 4;   // 一 tile 字节
function fillFull(L, w, h) {
  L.putImageData(0, 0, { width: w, height: h, data: new Uint8ClampedArray(w * h * 4).fill(255) });
}

describe("computeMaxLayers · 预算策略（纯函数）", () => {
  it("预算内 → 硬顶；达预算 → 冻结当前层数；floor 2", () => {
    eq(computeMaxLayers(3, 0, 10 * 1e6), LAYER_HARD_CEIL, "预算内 → HARD_CEIL");
    eq(computeMaxLayers(3, 4 * TILE, 3 * TILE), 3, "达预算 → 冻结在当前层数");
    eq(computeMaxLayers(1, 4 * TILE, 3 * TILE), 2, "冻结 floor 2（至少可再加到 2 层）");
  });
});

describe("doc.maxLayers · 动态字节预算（v2 装配）", () => {
  it("预算内（空层稀疏）→ 放到硬顶 64", () => {
    const { doc } = mk();
    doc.configureMemory(10 * 1e6);   // 10MB 预算，空层 resident≈0
    eq(doc.maxLayers, 64, "预算内 → HARD_CEIL=64");
  });

  it("驻留达预算 → 冻结在当前层数（防 OOM；floor 2）", () => {
    const { doc, lt } = mk();
    lt.addLayer(); lt.addLayer();          // 共 3 层
    doc.configureMemory(3 * TILE);        // 预算 = 3 tile
    fillFull(doc.layers[0], 512, 512);    // 512² = 2×2 = 4 tile ≥ 3 → 达预算
    eq(doc.maxLayers, 3, "达预算 → 冻结在当前(3)，非硬顶 64");
  });

  it("稀疏层（只画一角）远不达预算 → 仍放硬顶（破 11 的真赢）", () => {
    const { doc } = mk(4096, 4096);        // 16×16=256 tile/满层（旧公式 cap 极小）
    doc.configureMemory(20 * TILE);        // 20 tile 预算
    // 画一角 1 tile
    doc.layers[0].putImageData(0, 0, { width: 200, height: 200, data: new Uint8ClampedArray(200 * 200 * 4).fill(255) });
    eq(doc.maxLayers, 64, "稀疏内容 << 预算 → 硬顶（旧悲观公式会卡到个位数）");
  });
});

// 测试卫生：统一释放（防 tile-pool FR 泄漏 assert 刷屏；见 shape-brush.test.mjs 同款）
describe("layer-cap-budget 收尾", () => {
  it("清栈并释放本文件的工件资源", () => {
    for (const { h, wp2 } of _ctxs) {
      h.stack.clear();
      wp2.load({ width: 4, height: 4, nodes: [{ name: "空", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }] });
    }
    _ctxs.length = 0;
    assert(true, "disposed");
  });
});
