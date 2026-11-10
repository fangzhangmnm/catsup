// color-ramp 契约测（提案 §3 批 3）+ oklabToSrgb 往返。created 2026-09-05 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import {
  makeRamp, grayRamp, cloneRamp, evaluateRamp, bakeRampLut, insertStop, removeStop, moveStop, setStopColor, flipRamp,
  sanitizeRamp, hexToRgba8, rgba8ToCss,
} from "../src/common/color-ramp.ts";
import { srgbToOklab, oklabToSrgb } from "../src/common/color-dist.ts";
import { GradientMapKernel } from "../src/backend/filters/gradient-map-kernel.ts";

const RED = [200, 60, 50, 255], SKIN = [245, 210, 180, 255];

describe("color-ramp · 求值 / LUT", () => {
  it("grayRamp = 恒等 LUT（lut[i] 灰度 = i，alpha 255）", () => {
    const lut = bakeRampLut(grayRamp());
    for (let i = 0; i < 256; i++) { eq(lut[i * 4], i); eq(lut[i * 4 + 1], i); eq(lut[i * 4 + 2], i); eq(lut[i * 4 + 3], 255); }
  });
  it("端色：首色标前 / 末色标后取端色；单色标常数", () => {
    const r = makeRamp([{ t: 0.3, rgba: RED }, { t: 0.7, rgba: SKIN }]);
    eq(evaluateRamp(r, 0).join(), RED.join()); eq(evaluateRamp(r, 1).join(), SKIN.join());
    eq(evaluateRamp(makeRamp([{ t: 0.5, rgba: RED }]), 0.9).join(), RED.join());
    eq(evaluateRamp({ stops: [], interp: "linear", space: "srgb" }, 0.5).join(), "0,0,0,0");
  });
  it("constant：左色标持有到下一色标——二分实战 LUT 精确（θ=0.5：≤127 红肉影，≥128 皮肤色）", () => {
    const r = makeRamp([{ t: 0, rgba: RED }, { t: 0.5, rgba: SKIN }], "constant");
    const lut = bakeRampLut(r);
    for (let i = 0; i < 256; i++) {
      const want = i / 255 < 0.5 ? RED : SKIN;
      eq([lut[i * 4], lut[i * 4 + 1], lut[i * 4 + 2], lut[i * 4 + 3]].join(), want.join(), `i=${i}`);
    }
    // 拖第二色标 = 拖阈值
    moveStop(r, 1, 0.25);
    const lut2 = bakeRampLut(r);
    eq(lut2[63 * 4], RED[0]); eq(lut2[64 * 4], SKIN[0]);
  });
  it("linear sRGB：中点 = 逐通道均值；ease 中点同、1/4 处偏向起点", () => {
    const r = makeRamp([{ t: 0, rgba: [0, 0, 0, 255] }, { t: 1, rgba: [200, 100, 50, 255] }]);
    eq(evaluateRamp(r, 0.5).join(), "100,50,25,255");
    const e = makeRamp([{ t: 0, rgba: [0, 0, 0, 255] }, { t: 1, rgba: [200, 100, 50, 255] }], "ease");
    eq(evaluateRamp(e, 0.5).join(), "100,50,25,255");
    assert(evaluateRamp(e, 0.25)[0] < evaluateRamp(r, 0.25)[0], "ease 起步慢");
  });
  it("alpha 线性插、不进色空间", () => {
    const r = makeRamp([{ t: 0, rgba: [255, 0, 0, 0] }, { t: 1, rgba: [255, 0, 0, 255] }], "linear", "oklab");
    eq(evaluateRamp(r, 0.5)[3], 128);
  });
});

describe("color-ramp · OKLab", () => {
  it("oklabToSrgb ∘ srgbToOklab 对全 8-bit 立方体抽样往返 ≤ 1/255", () => {
    let maxErr = 0;
    for (let r = 0; r < 256; r += 15) for (let g = 0; g < 256; g += 15) for (let b = 0; b < 256; b += 15) {
      const [L, a, bb] = srgbToOklab(r, g, b);
      const [R, G, B] = oklabToSrgb(L, a, bb);
      maxErr = Math.max(maxErr, Math.abs(R - r), Math.abs(G - g), Math.abs(B - b));
    }
    assert(maxErr <= 1, `max err ${maxErr}`);
  });
  it("OKLab 色带端点回归原色；中点在两端之间且与 sRGB 中点不同（自证走了另一条路）", () => {
    const r = makeRamp([{ t: 0, rgba: [0, 0, 255, 255] }, { t: 1, rgba: [255, 255, 0, 255] }], "linear", "oklab");
    eq(evaluateRamp(r, 0).join(), "0,0,255,255"); eq(evaluateRamp(r, 1).join(), "255,255,0,255");
    const mid = evaluateRamp(r, 0.5);
    const s = makeRamp([{ t: 0, rgba: [0, 0, 255, 255] }, { t: 1, rgba: [255, 255, 0, 255] }]);
    assert(mid.join() !== evaluateRamp(s, 0.5).join());
    for (let k = 0; k < 3; k++) assert(mid[k] >= 0 && mid[k] <= 255);
  });
});

describe("color-ramp · verb", () => {
  it("insertStop 缺省色落在原色带上；同 t 覆盖；返回 index", () => {
    const r = makeRamp([{ t: 0, rgba: [0, 0, 0, 255] }, { t: 1, rgba: [200, 100, 50, 255] }]);
    const i = insertStop(r, 0.5);
    eq(i, 1); eq(r.stops[1].rgba.join(), "100,50,25,255");
    eq(insertStop(r, 0.5, [1, 2, 3, 4]), 1); eq(r.stops.length, 3); eq(r.stops[1].rgba.join(), "1,2,3,4");
  });
  it("moveStop 越邻居重排返回新 index；removeStop 至少留 1；setStopColor 钳 8bit；flip", () => {
    const r = makeRamp([{ t: 0, rgba: RED }, { t: 0.3, rgba: SKIN }, { t: 1, rgba: [0, 0, 0, 255] }]);
    eq(moveStop(r, 0, 0.6), 1);
    eq(r.stops.map((s) => s.t).join(","), "0.3,0.6,1");
    setStopColor(r, 0, [300, -5, 12.6, 255]);
    eq(r.stops[0].rgba.join(), "255,0,13,255");
    flipRamp(r);
    eq(r.stops.map((s) => s.t).join(","), "0,0.4,0.7");
    eq(removeStop(r, 0), true); eq(removeStop(r, 0), true); eq(removeStop(r, 0), false); eq(r.stops.length, 1);
  });
  it("cloneRamp 独立；sanitizeRamp 合法归一 / 非法 null；hex 往返", () => {
    const r = grayRamp(); const d = cloneRamp(r); moveStop(d, 1, 0.5); eq(r.stops[1].t, 1);
    const s = sanitizeRamp({ stops: [{ t: 1, rgba: [1, 2, 3, 4] }, { t: 0, rgba: [9, 9, 9, 9] }], interp: "bogus", space: "oklab" });
    assert(s); eq(s.stops[0].t, 0); eq(s.interp, "linear"); eq(s.space, "oklab");
    eq(sanitizeRamp({ stops: [] }), null); eq(sanitizeRamp({ stops: [{ t: 0, rgba: [1, 2] }] }), null); eq(sanitizeRamp(null), null);
    eq(hexToRgba8("#ff8000").join(), "255,128,0,255"); eq(hexToRgba8("#ff800080")[3], 128); eq(hexToRgba8("nope"), null);
    eq(rgba8ToCss([1, 2, 3, 255]), "rgb(1,2,3)"); eq(rgba8ToCss([1, 2, 3, 0]), "rgba(1,2,3,0.000)");
    eq(JSON.stringify(JSON.parse(JSON.stringify(grayRamp()))), JSON.stringify(grayRamp()), "defaults JSON 干净");
  });
});

describe("gradient-map kernel", () => {
  it("defaults = grayRamp（恒等映射：灰像素回自己）；alpha 原样；mask passthrough", () => {
    const src = new Uint8ClampedArray([10, 10, 10, 255, 200, 200, 200, 128, 255, 0, 0, 255, 0, 0, 0, 0]);
    const dst = new Uint8ClampedArray(src.length);
    GradientMapKernel.bake(src, dst, GradientMapKernel.defaults(), null, 4, 1);
    eq([...dst.slice(0, 8)].join(), "10,10,10,255,200,200,200,128");
    // 纯红 luma = 0.2126·255 ≈ 54 → 灰 54
    eq(dst[8], 54); eq(dst[9], 54); eq(dst[10], 54); eq(dst[11], 255);
    eq(dst[15], 0);
    const mask = new Uint8Array([255, 0, 255, 255]);
    const p = { ramp: makeRamp([{ t: 0, rgba: RED }, { t: 1, rgba: SKIN }]) };
    GradientMapKernel.bake(src, dst, p, mask, 4, 1);
    eq([...dst.slice(4, 8)].join(), "200,200,200,128", "mask 外 passthrough");
    eq(dst[0], RED[0] + Math.round((SKIN[0] - RED[0]) * (10 / 255)) , "mask 内按 luma 查色带");
  });
  it("旧/坏参数 → 恒等（sanitize 兜底）", () => {
    const src = new Uint8ClampedArray([77, 77, 77, 255]);
    const dst = new Uint8ClampedArray(4);
    GradientMapKernel.bake(src, dst, { ramp: "garbage" }, null, 1, 1);
    eq([...dst].join(), "77,77,77,255");
  });
});
