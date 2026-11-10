// liquify 双三次点采样（v0.6.61 第四核，默认）—— 口径对齐 bilinearSample 的关键性质：
//   预乘混合（不拖暗）、越界 tap=0（不拉丝）、整数坐标退化点采样（v147 整数 march 依赖）、
//   外加双三次特有的 α 反振铃限幅（负 lobe 不把 α 顶出邻域范围）。
import { describe, it, assert, eq } from "./runner.mjs";
const { bicubicSamplePremult } = await import("../src/backend/algorithms/resample-bytes.ts");

const sample = (sdat, w, h, sx, sy) => {
  const d = new Uint8ClampedArray(4);
  bicubicSamplePremult(sdat, w, h, sx, sy, d, 0);
  return [d[0], d[1], d[2], d[3]];
};
const RED = [255, 0, 0, 255];

describe("liquify · bicubicSamplePremult 预乘 + 越界记 0 + 反振铃", () => {
  it("整数坐标 → 退化精确点采样（Catmull-Rom 整点核=δ）", () => {
    const s = new Uint8ClampedArray([...RED, 0, 0, 0, 0]);   // 2×1
    eq(sample(s, 2, 1, 0, 0).join(), "255,0,0,255", "整数 (0,0) = 该像素原值");
    eq(sample(s, 2, 1, 1, 0).join(), "0,0,0,0", "整数 (1,0) = 透明原值");
  });

  it("完全越界 → 透明(0,0,0,0)，不复制边像素", () => {
    const s = new Uint8ClampedArray([...RED]);
    eq(sample(s, 1, 1, 0, -3).join(), "0,0,0,0", "远越界 = 透明");
  });

  it("不透明红 ⊗ 界内透明 tap → 色保持红（预乘不拖暗）", () => {
    const s = new Uint8ClampedArray([...RED, 0, 0, 0, 0]);   // 2×1
    const r = sample(s, 2, 1, 0.5, 0);
    eq(r[0], 255, `R 应保持 255(预乘)，实得 ${r[0]}`);
    eq(r[1], 0, "G=0"); eq(r[2], 0, "B=0");
    assert(r[3] > 0 && r[3] < 255, `α 应在中间，实得 ${r[3]}`);
  });

  it("全红均匀场中点采样 → 仍是纯红不透明（核权重归一）", () => {
    const s = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < 16; i++) s.set(RED, i * 4);          // 4×4 全红
    eq(sample(s, 4, 4, 1.5, 1.5).join(), "255,0,0,255", "均匀场插值不变");
  });

  it("α 反振铃：不透明区内负 lobe 不把 α 顶爆（钳在中央 2×2 邻域范围）", () => {
    // 3×4：一列透明 + 三列不透明红——横向跨越对比边采样，无限幅时 α 会过冲 >255 被 clamp 掩盖，
    // 这里验中央 2×2 全 255 时结果 α 恰为 255（被钳回邻域上界，而非 260→clamp 的巧合）。
    const s = new Uint8ClampedArray(4 * 3 * 4);
    for (let y = 0; y < 3; y++) for (let x = 1; x < 4; x++) s.set(RED, (y * 4 + x) * 4);
    const r = sample(s, 4, 3, 2.5, 1);                        // 中央 2×2 = (2,1)(3,1)(2,2)... 全不透明
    eq(r[3], 255, `α 应钳为邻域上界 255，实得 ${r[3]}`);
    eq(r[0], 255, "R 纯红不变");
  });
});
