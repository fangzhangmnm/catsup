// RotSprite（src/rotsprite.ts）EPX 数学验收：规则手算样例 + 级数预算 + 尺寸。
import { describe, it, assert, eq } from "./runner.mjs";
import { epx2x, rotspriteUpscale, rotspriteLevels } from "../src/backend/algorithms/rotsprite.ts";

const RED = [255, 0, 0, 255], WHITE = [255, 255, 255, 255];
function img(w, h, fn) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) buf.set(fn(x, y), (y * w + x) * 4);
  return buf;
}
const px = (p, w, x, y) => [...p.data.slice((y * p.w + x) * 4, (y * p.w + x) * 4 + 4)];

describe("rotsprite · EPX 规则", () => {
  it("纯色 → 2× 纯色（无邻域规则触发）", () => {
    const p = epx2x(img(4, 4, () => RED), 4, 4);
    eq(p.w, 8); eq(p.h, 8);
    for (let i = 0; i < p.data.length; i += 4) eq(p.data[i], 255), eq(p.data[i + 1], 0);
  });

  it("对角线外推：白像素邻接对角红 → 对应角补红（斜边变干净台阶）", () => {
    // 3×3 白底 + 红对角 (0,0)(1,1)(2,2)
    const src = img(3, 3, (x, y) => (x === y ? RED : WHITE));
    const p = epx2x(src, 3, 3);
    // 像素 (1,0) 白：C=(0,0)红 D=(1,1)红 → E2(左下 subpixel=(2,1)) = 红
    assert(px(p, 3, 2, 1)[0] === 255 && px(p, 3, 2, 1)[1] === 0, "E2 补红");
    // 其 E3 (3,1)：B=(2,0)白 D=(1,1)红 不等 → 保 P 白
    eq(px(p, 3, 3, 1)[1], 255, "E3 保白");
    // 像素 (0,1) 白：A=(0,0)红 B=(1,1)红 → E1(右上 subpixel=(1,2)) = 红
    assert(px(p, 3, 1, 2)[0] === 255 && px(p, 3, 1, 2)[1] === 0, "E1 补红");
    // 红对角自身不被侵蚀：(1,1) 的四个 subpixel 全红（A/B/C/D 全白，规则不触发）
    for (const [sx, sy] of [[2, 2], [3, 2], [2, 3], [3, 3]]) {
      assert(px(p, 3, sx, sy)[1] === 0, `对角块 (${sx},${sy}) 保红`);
    }
  });

  it("级数预算：≤256²→8×，≤512²→4×，更大→2×；upscale 尺寸正确", () => {
    eq(rotspriteLevels(256, 256), 3);
    eq(rotspriteLevels(512, 512), 2);
    eq(rotspriteLevels(600, 600), 1);
    const up = rotspriteUpscale(img(10, 7, () => WHITE), 10, 7);   // 70px → 8×
    eq(up.w, 80); eq(up.h, 56);
  });
});
