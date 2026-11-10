// 偏移接缝（环绕）验收 —— LayerPixels.offsetWrapped / Selection.offsetWrapped。
// 问题陈述：
//   - 输入：doc W×H + layer 像素（+ 可选 selection）；偏移 (dx,dy)，向右/下为正。
//   - 输出：doc 尺寸不变；像素 new(x,y) = old((x-dx) mod W, (y-dy) mod H)（环绕）；
//           偏移整幅 (W,H) = 恒等；偏移 a 再偏移 (W-a) = 恒等。
// C3：旧 PaintDoc.offsetWrap 死壳拆除——生产路径 = doc-ops → LayerTiles.offsetWrapAll →
//   LayerPixels.offsetWrapped（本文件直测该内核，字节原生零 stub canvas）+ Selection.offsetWrapped。
import { describe, it, assert, eq } from "./runner.mjs";
const { LayerPixels } = await import("../src/backend/tiles/tile-layer.ts");
const { Selection } = await import("../src/backend/selection.ts");

// 生产同款归一化（layer-tiles._applyComputed）：偏移进 [0,W)/[0,H) 再交内核。
function offsetWrap(lp, dx, dy) {
  return lp.offsetWrapped(((dx % lp.docW) + lp.docW) % lp.docW, ((dy % lp.docH) + lp.docH) % lp.docH);
}
const _lps = [];
const mkLp = (w, h) => { const lp = new LayerPixels(w, h); _lps.push(lp); return lp; };
const swap = (i, np) => { _lps[i].dispose(); _lps[i] = np; return np; };

function markPixel(lp, x, y, val) {
  lp.putRegion(x, y, 1, 1, new Uint8ClampedArray([val, val, val, 255]));
}
const redAt = (lp, x, y) => lp.sampleAt(x, y)[0];

describe("LayerPixels.offsetWrapped · 尺寸不变 + 像素环绕映射", () => {
  it("doc 尺寸偏移后不变", () => {
    let lp = mkLp(10, 6);
    markPixel(lp, 2, 2, 50);
    lp = swap(_lps.length - 1, offsetWrap(lp, 3, 2));
    eq(lp.docW, 10, "宽不变");
    eq(lp.docH, 6, "高不变");
    eq(redAt(lp, 5, 4), 50, "(2,2) → (5,4)");
  });

  it("偏移 (1,1)：每个角点按 (x+1)%W,(y+1)%H 环绕", () => {
    // W=4,H=2。四角放不同灰度 r，验证落点。
    let lp = mkLp(4, 2);
    markPixel(lp, 0, 0, 10);   // 左上 → (1,1)
    markPixel(lp, 3, 0, 20);   // 右上 → (0,1)
    markPixel(lp, 0, 1, 30);   // 左下 → (1,0)
    markPixel(lp, 3, 1, 40);   // 右下 → (0,0)
    lp = swap(_lps.length - 1, offsetWrap(lp, 1, 1));
    eq(redAt(lp, 1, 1), 10, "左上(0,0)→(1,1)");
    eq(redAt(lp, 0, 1), 20, "右上(3,0)→(0,1) 水平环绕");
    eq(redAt(lp, 1, 0), 30, "左下(0,1)→(1,0) 垂直环绕");
    eq(redAt(lp, 0, 0), 40, "右下(3,1)→(0,0) 双向环绕");
  });

  it("负偏移也环绕：(-1,0) 把左列移到右边", () => {
    let lp = mkLp(4, 1);
    markPixel(lp, 0, 0, 99);   // 左列 → (-1)%4 = 3
    lp = swap(_lps.length - 1, offsetWrap(lp, -1, 0));
    eq(redAt(lp, 3, 0), 99, "(0,0) 在 dx=-1 下环绕到 (3,0)");
  });
});

describe("LayerPixels.offsetWrapped · 恒等性", () => {
  it("偏移整幅 (W,H) = 无变化", () => {
    let lp = mkLp(4, 2);
    markPixel(lp, 2, 1, 77);
    lp = swap(_lps.length - 1, offsetWrap(lp, 4, 2));
    eq(redAt(lp, 2, 1), 77, "整幅偏移 = 像素不动");
  });

  it("偏移 a 再偏移 (W-a, H-b) 回到原图", () => {
    let lp = mkLp(4, 2);
    markPixel(lp, 0, 0, 12);
    markPixel(lp, 2, 1, 34);
    lp = swap(_lps.length - 1, offsetWrap(lp, 1, 1));
    lp = swap(_lps.length - 1, offsetWrap(lp, 3, 1));   // 总位移 (4,2) ≡ (0,0)
    eq(redAt(lp, 0, 0), 12, "(0,0) 回原");
    eq(redAt(lp, 2, 1), 34, "(2,1) 回原");
  });
});

describe("Selection.offsetWrapped · 环绕映射（v0.4.6 紧 bbox）", () => {
  it("内容随偏移平移；bbox = 紧内容框（旧 canvas 版的整幅 bbox 是实现副产品）", () => {
    const s0 = Selection.full(3, 2, 1, 1);   // bbox (1,1) 3×2
    const s1 = s0.offsetWrapped(1, 1, 8, 6);
    eq(s1.bboxX, 2, "selX=2（平移后紧框）");
    eq(s1.bboxY, 2, "selY=2");
    eq(s1.bboxW, 3, "selW=3");
    eq(s1.bboxH, 2, "selH=2");
    eq(s1.sampleAt(2, 2), 255, "旧 (1,1) → 新 (2,2)");
    eq(s1.sampleAt(1, 1), 0, "原位已空");
    s0.dispose(); s1.dispose();
  });
  it("越边环绕：贴右下的选区偏移后绕回左上", () => {
    const s0 = Selection.full(2, 2, 6, 4);   // 贴 8×6 doc 右下角
    const s1 = s0.offsetWrapped(1, 1, 8, 6);
    eq(s1.sampleAt(7, 5), 255, "(6,4)→(7,5) 仍在幅内");
    eq(s1.sampleAt(0, 0), 255, "(7,5)→环绕到 (0,0)");
    eq(s1.sampleAt(0, 5), 255, "(7,4)→环绕到 (0,5)");
    eq(s1.sampleAt(7, 0), 255, "(6,5)→环绕到 (7,0)");
    s0.dispose(); s1.dispose();
  });
});

// 测试卫生：统一释放（防 tile-pool FR 泄漏 assert 刷屏；见 shape-brush.test.mjs 同款）
describe("doc-offset 收尾", () => {
  it("释放本文件的 LayerPixels", () => {
    for (const lp of _lps) lp.dispose();
    _lps.length = 0;
    assert(true, "disposed");
  });
});
