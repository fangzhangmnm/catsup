// 逆时针旋转画布 90° 验收（v258 立锚；C3 迁字节内核直测）。
// 问题陈述：
//   - 输入：doc W×H + layer 像素（+ 可选 selection）。
//   - 输出：doc 尺寸 H×W；坐标 (x,y)→(y, W-x)；旋转 4 次 = 恒等（尺寸与 bbox 都回原）。
// C3：旧 PaintDoc.rotate90CCW 死壳拆除——生产路径 = doc-ops → LayerTiles.rotate90All →
//   LayerPixels.rotated90CCW（本文件直测该内核，字节原生零 stub canvas）+ Selection.rotated90CCW。
import { describe, it, assert, eq } from "./runner.mjs";
const { LayerPixels } = await import("../src/backend/tiles/tile-layer.ts");
const { Selection } = await import("../src/backend/selection.ts");

const _lps = [];
const mkLp = (w, h) => { const lp = new LayerPixels(w, h); _lps.push(lp); return lp; };
const swap = (np) => { _lps[_lps.length - 1].dispose(); _lps[_lps.length - 1] = np; return np; };

// 直接验证 bbox 旋转公式（纯数字，不碰像素）
function expectedBbox(b, W) {
  return { x: b.bboxY, y: W - (b.bboxX + b.bboxW), w: b.bboxH, h: b.bboxW };
}
// tile-SoT：putRegion 在层的 doc 区域填不透明色。content 紧框 = contentBounds(true)。
function fillRegion(lp, x, y, w, h, [r, g, b] = [255, 0, 0]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 255; }
  lp.putRegion(x, y, w, h, data);
}
const tb = (lp) => lp.contentBounds(true);   // 紧内容框

describe("LayerPixels.rotated90CCW · 纯数字 bbox + 尺寸", () => {
  it("尺寸 W↔H 互换", () => {
    let lp = mkLp(10, 4);
    lp = swap(lp.rotated90CCW());
    eq(lp.docW, 4, "新宽=旧高");
    eq(lp.docH, 10, "新高=旧宽");
  });

  it("content 紧框按公式 newX=bboxY, newY=W-(bboxX+bboxW), newW=bboxH, newH=bboxW（tile-SoT）", () => {
    let lp = mkLp(20, 12);
    fillRegion(lp, 3, 2, 5, 4);   // 内容在 (3,2) 5×4
    const exp = expectedBbox({ bboxX: 3, bboxY: 2, bboxW: 5, bboxH: 4 }, 20);
    lp = swap(lp.rotated90CCW());
    const b = tb(lp);
    eq(b.x, exp.x, "newX"); eq(b.y, exp.y, "newY"); eq(b.w, exp.w, "newW"); eq(b.h, exp.h, "newH");
    eq(lp.docW, 12, "docW 更新为新宽"); eq(lp.docH, 20, "docH 更新为新高");
  });

  it("旋转 4 次 = 恒等（尺寸 + content 紧框都回原）", () => {
    let lp = mkLp(20, 12);
    fillRegion(lp, 3, 2, 5, 4);
    const o = tb(lp);
    for (let k = 0; k < 4; k++) lp = swap(lp.rotated90CCW());
    eq(lp.docW, 20, "宽回原"); eq(lp.docH, 12, "高回原");
    const b = tb(lp);
    eq(b.x, o.x, "x 回原"); eq(b.y, o.y, "y 回原"); eq(b.w, o.w, "w 回原"); eq(b.h, o.h, "h 回原");
  });
});

describe("LayerPixels.rotated90CCW · 像素方向（一个角点）", () => {
  it("旧 doc 左上角像素 (0,0) → 新 doc 左下角 (0, W-1=H'-1)", () => {
    // W=4, H=2 → 新 doc 2×4。在旧 (0,0) 放红，验证旋转后落到新左下 (0,3)。
    let lp = mkLp(4, 2);
    fillRegion(lp, 0, 0, 1, 1);   // 仅 (0,0) 红不透明
    lp = swap(lp.rotated90CCW());
    eq(lp.docW, 2, "新宽=2"); eq(lp.docH, 4, "新高=4");
    // 旧 (0,0) → 新 (0, W-1)=(0,3)
    eq(lp.sampleAt(0, 3)[3], 255, "左上角旋到新左下 (0,3)");
    eq(lp.sampleAt(0, 0)[3], 0, "新左上 (0,0) 应空");
  });
});

describe("LayerPixels.flippedHorizontal · 水平镜像", () => {
  it("x → W-1-x；两次翻转 = 恒等", () => {
    let lp = mkLp(4, 2);
    fillRegion(lp, 0, 1, 1, 1);   // (0,1)
    lp = swap(lp.flippedHorizontal());
    eq(lp.sampleAt(3, 1)[3], 255, "(0,1) 镜像到 (3,1)");
    eq(lp.sampleAt(0, 1)[3], 0, "原位已空");
    lp = swap(lp.flippedHorizontal());
    eq(lp.sampleAt(0, 1)[3], 255, "两次翻转回原");
  });
});

describe("Selection.rotated90CCW · bbox 公式 + 4 次恒等", () => {
  it("bbox 公式与 4 次恒等", () => {
    const s0 = Selection.full(5, 4, 3, 2);   // bbox (3,2) 5×4，doc 取 20×12
    const W = 20;
    const exp = expectedBbox({ bboxX: 3, bboxY: 2, bboxW: 5, bboxH: 4 }, W);
    const s1 = s0.rotated90CCW(20, 12);
    eq(s1.bboxX, exp.x, "selX");
    eq(s1.bboxY, exp.y, "selY");
    eq(s1.bboxW, exp.w, "selW");
    eq(s1.bboxH, exp.h, "selH");
    // 4 次回原：尺寸 20×12 →(旋)→ 12×20 →20×12 →12×20 →20×12
    let s = s0, dims = [[20, 12], [12, 20], [20, 12], [12, 20]];
    for (let k = 0; k < 4; k++) { const prev = s; s = s.rotated90CCW(dims[k][0], dims[k][1]); if (prev !== s0) prev.dispose(); }
    eq(s.bboxX, s0.bboxX, "sel bboxX 回原");
    eq(s.bboxY, s0.bboxY, "sel bboxY 回原");
    eq(s.bboxW, s0.bboxW, "sel bboxW 回原");
    eq(s.bboxH, s0.bboxH, "sel bboxH 回原");
    s0.dispose(); s.dispose(); s1.dispose();
  });
});

// 测试卫生：统一释放（防 tile-pool FR 泄漏 assert 刷屏；见 shape-brush.test.mjs 同款）
describe("doc-rotate 收尾", () => {
  it("释放本文件的 LayerPixels", () => {
    for (const lp of _lps) lp.dispose();
    _lps.length = 0;
    assert(true, "disposed");
  });
});
