// v0.9.13 导出 defringe（贴图防黑边）行为锚 + PNG 往返保底。
// 语义：α=0 像素 RGB 回填最近（BFS 层序）不透明像素色；α 一个字节不动；α>0 像素不碰。
// PNG 往返是存在意义本体：encodePngFromBytes 直写 straight RGBA（不过 canvas premult），
// α=0 处的回填色必须活到最终文件——活不过就是白做（游戏引擎采样看的就是这些字节）。
import { describe, it } from "./runner.mjs";
import assert from "node:assert/strict";
import { defringeAlphaZero } from "../src/backend/algorithms/defringe.ts";
import { encodePngFromBytes, decodePngToBytes } from "../src/backend/png-codec.ts";

describe("defringe（v0.9.13 贴图防黑边）", () => {
  it("α=0 区回填边缘色；α 不动；源像素不碰", () => {
    const w = 8, h = 1;
    const d = new Uint8ClampedArray(w * h * 4);
    d.set([200, 30, 10, 255], 0);   // 最左一颗红，其余全透明
    defringeAlphaZero(d, w, h);
    for (let x = 1; x < w; x++) {
      assert.deepEqual([d[x * 4], d[x * 4 + 1], d[x * 4 + 2]], [200, 30, 10], `x=${x} RGB 回填红`);
      assert.equal(d[x * 4 + 3], 0, `x=${x} α 仍 0`);
    }
    assert.deepEqual([d[0], d[1], d[2], d[3]], [200, 30, 10, 255], "源像素原样");
  });

  it("两源竞争：各自就近（BFS 层序）", () => {
    const w = 5, h = 1;
    const d = new Uint8ClampedArray(w * h * 4);
    d.set([255, 0, 0, 255], 0);            // 左端红
    d.set([0, 0, 255, 255], 4 * 4);        // 右端蓝
    defringeAlphaZero(d, w, h);
    assert.equal(d[1 * 4 + 0], 255, "x=1 近左 → 红");
    assert.equal(d[3 * 4 + 2], 255, "x=3 近右 → 蓝");
  });

  it("全透明 / 全不透明 = no-op", () => {
    for (const alpha of [0, 255]) {
      const d = new Uint8ClampedArray(2 * 2 * 4);
      for (let p = 0; p < 4; p++) { d[p * 4] = 7; d[p * 4 + 3] = alpha; }
      const before = new Uint8ClampedArray(d);
      defringeAlphaZero(d, 2, 2);
      assert.deepEqual([...d], [...before], `alpha=${alpha} 不动`);
    }
  });

  // #8（user 2026-08-23「png导出默认defringe」，2026-08-28 默认开 by Claude Opus 5）：
  //   默认开之前先把「为什么值得默认开」钉成可执行断言——下游做**非预乘**采样（游戏引擎的
  //   bilinear/mipmap、朴素缩略图缩放）时，α=0 处那圈黑 RGB 会被平均进边缘 → 黑边。
  //   注意本 app 全链 straight（blend-glsl S7 + encodePngFromBytes 直写 straight RGBA），
  //   半透明像素的 RGB 是**直值、没有底色污染**，所以要救的只有 α=0 那圈，不存在「反预乘」这回事。
  it("默认开的理由：非预乘下采样在 defringe 前渗黑边、之后不渗", () => {
    // 4×4：左半实心青绿(0,200,180)、右半全透明（RGB=0 黑）。2×2 平均模拟朴素 bilinear。
    const w = 4, h = 4;
    const mk = () => {
      const d = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < 2; x++) {
        const i = (y * w + x) * 4;
        d[i] = 0; d[i + 1] = 200; d[i + 2] = 180; d[i + 3] = 255;
      }
      return d;
    };
    // 跨边界那块 2×2（x=1,2）的朴素 RGB 平均
    const straddleAvg = (d) => {
      let g = 0, b = 0;
      for (let y = 0; y < 2; y++) for (let x = 1; x <= 2; x++) { const i = (y * w + x) * 4; g += d[i + 1]; b += d[i + 2]; }
      return [g / 4, b / 4];
    };
    const [g0, b0] = straddleAvg(mk());
    assert.ok(g0 < 120 && b0 < 110, `defringe 前边缘被黑吃掉（G=${g0} B=${b0}，原色 200/180）`);
    const fixed = mk();
    defringeAlphaZero(fixed, w, h);
    const [g1, b1] = straddleAvg(fixed);
    assert.deepEqual([g1, b1], [200, 180], "defringe 后跨边界平均 = 原色，零黑边");
  });

  it("半透明像素是 straight 直值：PNG 往返不预乘（导出无「白边/色晕」可救）", async () => {
    const d = new Uint8ClampedArray([0, 200, 180, 128, 0, 200, 180, 8]);
    const back = await decodePngToBytes(await encodePngFromBytes(d, 2, 1));
    assert.deepEqual([...back.data.slice(0, 4)], [0, 200, 180, 128], "α=128 处 RGB 原样（未被 α 乘过）");
    assert.deepEqual([...back.data.slice(4, 8)], [0, 200, 180, 8], "α=8 极淡处也是直值");
  });

  it("PNG 往返：α=0 处回填的 RGB 活过 encode/decode", async () => {
    const w = 4, h = 4;
    const d = new Uint8ClampedArray(w * h * 4);
    d.set([10, 200, 60, 255], 0);   // 一颗绿源，其余透明
    defringeAlphaZero(d, w, h);
    const png = await encodePngFromBytes(d, w, h);
    const back = await decodePngToBytes(png);
    assert.equal(back.w, w);
    for (let p = 1; p < w * h; p++) {
      assert.equal(back.data[p * 4 + 3], 0, `p=${p} α=0`);
      assert.deepEqual(
        [back.data[p * 4], back.data[p * 4 + 1], back.data[p * 4 + 2]],
        [10, 200, 60],
        `p=${p} 回填色活过 PNG 往返`,
      );
    }
  });
});
