// v258 剪裁层向下合并验收（v0.6.39 重写：merge-down 走 GL render tree 字节合成面——
// setDocCompositorBytes 注入。node 无 GL → 本文件注入一个**测试侧参照合成器**（straight 字节
// source-over + clippingMask + opacity；非 source-over 模式直接抛——真混合模式的对拍在 gl-smoke）。
// 守的语义不变：剪裁 dst-in 到基底 alpha / 链内合并仍剪裁 / clipping-under 拒绝 / undo 还原。
// C3：从旧 PaintDoc.mergeDownLayer 迁 **LayersFace.mergeDown**（v2 真生产路径：renderNodesToBytes
// 同一注入 seam + layer-tree.mergeDown verb——旧注「mergeDown 走 GL node 不可测」已不成立）。
import { describe, it, assert, eq } from "./runner.mjs";
import { seedWrite } from "./helpers.mjs";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { PaintingView, flattenViewLeaves, countViewLeaves } from "../src/backend/workpiece/painting-view.ts";
import { History } from "../src/backend/workpiece/history.ts";
import { LayersFace } from "../src/backend/layers-face.ts";
const { setDocCompositorBytes } = await import("../src/backend/doc-render.ts");

// 参照合成器：nodes（结构化叶）自底向上 source-over；clippingMask 叶的 as 乘最近非剪裁基底的 alpha。
// ⚠注入是模块单例、后注入者赢（app-boot 测试 import app.ts 会覆盖成 node 下恒 null 的 board 后端）
// → 每个 it 开头经 useStub() 重注入。
const refCompositor = ((nodes, w, h) => {
  const out = new Uint8ClampedArray(w * h * 4);
  let baseA = null;   // 最近非剪裁叶的原始 alpha 平面
  for (const n of nodes) {
    if (!n.visible) continue;
    if ((n.mode || "source-over") !== "source-over") throw new Error("参照合成器只支持 source-over（混合模式对拍归 gl-smoke）");
    const src = n.pixels.getRegion(0, 0, w, h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      let as = (src[o + 3] / 255) * n.opacity;
      if (n.clippingMask) as *= baseA ? baseA[o + 3] / 255 : 0;
      if (as <= 0) continue;
      const ab = out[o + 3] / 255;
      const ao = as + ab * (1 - as);
      for (let k = 0; k < 3; k++) out[o + k] = Math.round((src[o + k] * as + out[o + k] * ab * (1 - as)) / ao);
      out[o + 3] = Math.round(ao * 255);
    }
    if (!n.clippingMask) baseA = src;
  }
  return { data: out, w, h };
});
const useStub = () => setDocCompositorBytes(refCompositor);

// 测试卫生：统一释放（防 tile-pool FR 泄漏 assert 刷屏；见 shape-brush.test.mjs 同款）
const _ctxs = [];
function mk() {
  const h = new History({ maxQuotaBytes: 1 << 30 })   // onUnrecoverable 缺省即抛（2026-10-13）;
  const wp2 = new PaintingWorkpiece({ undo: h.stack, tree: { width: 4, height: 2 } });
  const doc = new PaintingView(wp2);
  h.attach(wp2);
  const lt = new LayersFace({ history: h, tree: wp2.layerTree, tiles: wp2.layerTiles, port: doc, status: () => {} });
  _ctxs.push({ h, wp2 });
  return { doc, h, lt };
}

// 填一个 layer 的整块矩形（tile-SoT：putImageData 纯路径），rgba
function fillLayer(L, w, h, r, g, b, a) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a; }
  seedWrite(L, () => L.putImageData(0, 0, { width: w, height: h, data: d }));   // 令牌外种子（C7 硬化显式态）
}
// 让 under 只有左半 alpha（右半透明），用于验剪裁
function fillLeftHalf(L, w, h, r, g, b) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = (x < w / 2) ? 255 : 0;
  }
  seedWrite(L, () => L.putImageData(0, 0, { width: w, height: h, data: d }));   // 令牌外种子
}
const px = (L, x, y) => [...L.sampleAt(x, y)];

describe("LayersFace.mergeDown · 剪裁层向下合并到基底（v2 真路径）", () => {
  it("active 剪裁(满红) + under 基底(左半蓝) → 合并：右半被裁掉(透明)，左半=红覆盖蓝；undo 还原", () => {
    useStub();
    const { doc, h, lt } = mk();
    const base = doc.layers[0];
    fillLeftHalf(base, 4, 2, 0, 0, 255);   // under 基底：x<2 蓝不透明，x>=2 透明
    const a = lt.addLayer("剪裁");
    assert(a.ok, "加层 ok");
    const clip = a.layer;
    fillLayer(clip, 4, 2, 255, 0, 0, 255); // active 剪裁层：满红
    lt.setLayerProp(clip.id, "clippingMask", true);

    const r = lt.mergeDown(clip.id);
    assert(r.ok, `应合并成功，实得 ${JSON.stringify(r)}`);
    eq(countViewLeaves(doc.layers), 1, "合并后一叶");
    const under = flattenViewLeaves(doc.layers)[0];
    eq(under.clippingMask, false, "合并后 under 保持非剪裁");
    // 左半：红裁进可见 → (255,0,0,255)
    const lpx = px(under, 0, 0);
    assert(lpx[0] === 255 && lpx[1] === 0 && lpx[2] === 0 && lpx[3] === 255, `左半应红不透明，实得 ${lpx}`);
    // 右半：基底透明 → 剪裁层被裁没 → 仍透明
    const rp = px(under, 3, 0);
    assert(rp[3] === 0, `右半应透明（被基底 alpha 裁掉），实得 ${rp}`);

    h.undo();   // undo 还原：两叶 + under 像素回蓝
    eq(countViewLeaves(doc.layers), 2, "undo 回两叶");
    const back = flattenViewLeaves(doc.layers)[0];
    const bp = px(back, 0, 0);
    assert(bp[2] === 255 && bp[0] === 0, `undo 后 under 回蓝，实得 ${bp}`);
  });

  it("active 与 under 都剪裁（链内）→ 合并结果仍 clippingMask=true", () => {
    useStub();
    const { doc, lt } = mk();
    fillLayer(doc.layers[0], 4, 2, 0, 255, 0, 255);   // 真正基底（非剪裁）
    const a1 = lt.addLayer("剪裁A");
    fillLayer(a1.layer, 4, 2, 0, 0, 255, 255);
    lt.setLayerProp(a1.layer.id, "clippingMask", true);
    const a2 = lt.addLayer("剪裁B");
    fillLayer(a2.layer, 4, 2, 255, 0, 0, 255);
    lt.setLayerProp(a2.layer.id, "clippingMask", true);

    const r = lt.mergeDown(a2.layer.id);   // B 合到 A（两者都剪裁）
    assert(r.ok, "链内合并应成功");
    eq(countViewLeaves(doc.layers), 2, "合并后两叶");
    const merged = flattenViewLeaves(doc.layers)[1];
    eq(merged.clippingMask, true, "合并后仍 clippingMask=true（仍剪到原基底）");
  });

  it("under 剪裁、active 普通 → msg clipping-under（拒绝）", () => {
    useStub();
    const { doc, lt } = mk();
    fillLayer(doc.layers[0], 4, 2, 0, 255, 0, 255);
    const a1 = lt.addLayer("剪裁");
    fillLayer(a1.layer, 4, 2, 0, 0, 255, 255);
    lt.setLayerProp(a1.layer.id, "clippingMask", true);
    const a2 = lt.addLayer("普通");
    fillLayer(a2.layer, 4, 2, 255, 0, 0, 255);

    const r = lt.mergeDown(a2.layer.id);  // 普通合到剪裁层上
    assert(!r.ok, "应拒绝");
    eq(r.msg, "clipping-under", "msg=clipping-under");
    eq(countViewLeaves(doc.layers), 3, "拒绝后层数不变");
  });

  it("普通向下合并仍工作（回归）", () => {
    useStub();
    const { doc, lt } = mk();
    fillLayer(doc.layers[0], 4, 2, 0, 255, 0, 255);
    const a = lt.addLayer("上");
    fillLayer(a.layer, 4, 2, 255, 0, 0, 255);
    const r = lt.mergeDown(a.layer.id);
    assert(r.ok, "普通合并应成功");
    const m = flattenViewLeaves(doc.layers)[0];
    eq(m.clippingMask, false, "普通合并非剪裁");
    const p = px(m, 0, 0);
    assert(p[0] === 255 && p[1] === 0 && p[2] === 0, `上层红盖下层绿，实得 ${p}`);
  });
});

// 测试卫生：统一释放（防 tile-pool FR 泄漏 assert 刷屏；见 shape-brush.test.mjs 同款）
describe("doc-mergedown-clip 收尾", () => {
  it("清栈并释放本文件的工件资源", () => {
    for (const { h, wp2 } of _ctxs) {
      h.stack.clear();
      wp2.load({ width: 4, height: 4, nodes: [{ name: "空", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }] });
    }
    _ctxs.length = 0;
    assert(true, "disposed");
  });
});
