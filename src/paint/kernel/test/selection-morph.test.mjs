// Selection.morphed 验收（v242 语义，v0.4.6 tile 底座）：硬 expand/shrink 选区编辑 op。
// v0.4.6 起 Selection = gray8 tile（无 canvas 依赖，纯路径直测）；读 mask 走 sampleAt/materializeMaskRegion。
// 语义差异（有意）：bbox 一律为**紧**内容框（旧 canvas 版收缩沿用原 bbox、留空边）。
import { describe, it, assert } from "./runner.mjs";

const { Selection } = await import("../src/backend/selection.ts");

// doc 坐标 alpha
function maskA(sel, dx, dy) { return sel.sampleAt(dx, dy); }
// 数 mask=255 的像素（bbox 内扫描）
function count255(sel) {
  const g = sel.materializeMaskRegion(sel.bboxX, sel.bboxY, sel.bboxW, sel.bboxH);
  let n = 0; for (let i = 0; i < g.length; i++) if (g[i] === 255) n++;
  return n;
}

describe("Selection.morphed · 硬扩张/收缩", () => {
  it("expand 0 = 原对象不变（同引用）", () => {
    const s = Selection.full(4, 4, 3, 3);
    assert(s.morphed(0, 20, 20) === s, "radius 0 应原样返回");
    s.dispose();
  });

  it("expand +1：实心 4×4 → bbox 外扩 1，6×6 全实心", () => {
    const s = Selection.full(4, 4, 3, 3);          // (3,3) 处 4×4
    const e = s.morphed(1, 20, 20);
    assert(e.bboxX === 2 && e.bboxY === 2, `bbox 应外扩到 (2,2)，实得 (${e.bboxX},${e.bboxY})`);
    assert(e.bboxW === 6 && e.bboxH === 6, `应 6×6，实得 ${e.bboxW}×${e.bboxH}`);
    assert(count255(e) === 36, `应全 36 实心，实得 ${count255(e)}`);
    s.dispose(); e.dispose();
  });

  it("shrink −1：实心 4×4 → 中心 2×2 留存（v0.4.6 紧 bbox）", () => {
    const s = Selection.full(4, 4, 3, 3);
    const e = s.morphed(-1, 20, 20);
    // 旧 canvas 版沿用原 bbox（4×4 留空边）；tile 版 bbox 恒紧 → (4,4) 2×2
    assert(e.bboxX === 4 && e.bboxY === 4 && e.bboxW === 2 && e.bboxH === 2,
      `紧 bbox 应 (4,4) 2×2，实得 (${e.bboxX},${e.bboxY}) ${e.bboxW}×${e.bboxH}`);
    assert(count255(e) === 4, `中心 2×2=4 留存，实得 ${count255(e)}`);
    assert(maskA(e, 4, 4) === 255 && maskA(e, 5, 5) === 255, "中心实（doc (4,4)-(5,5)）");
    assert(maskA(e, 3, 3) === 0 && maskA(e, 6, 6) === 0, "四角被腐蚀");
    s.dispose(); e.dispose();
  });

  it("shrink −2：实心 4×4 腐蚀光 → null", () => {
    const s = Selection.full(4, 4, 3, 3);
    assert(s.morphed(-2, 20, 20) === null, "腐蚀到空应返 null");
    s.dispose();
  });

  it("expand 在 doc 边界 clamp：贴角 2×2 + expand 5 → 不越界", () => {
    const s = Selection.full(2, 2, 0, 0);          // 贴 (0,0)
    const e = s.morphed(5, 3, 3);                   // doc 仅 3×3
    assert(e.bboxX === 0 && e.bboxY === 0, "左上 clamp 到 0");
    assert(e.bboxW === 3 && e.bboxH === 3, `右下 clamp 到 doc 3×3，实得 ${e.bboxW}×${e.bboxH}`);
    assert(count255(e) === 9, "clamp 后全实心 9");
    s.dispose(); e.dispose();
  });
});
