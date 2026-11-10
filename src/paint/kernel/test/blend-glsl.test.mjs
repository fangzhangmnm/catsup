// blend-glsl 生成的纯逻辑测试（GLSL 字符串组装）。像素正确性由 smoke 自 diff 验；这里防漏模式/串公式。
import { describe, it, assert } from "./runner.mjs";
import { BLEND_MODES, compositeFragSource, compositeProgramKey, COMPOSITE_VERT } from "../src/backend/gl/blend-glsl.ts";

// 与 UI 可选列表（layers-panel.ts:71 LAYER_MODE_LABEL）严格一致。
const UI_MODES = [
  "source-over", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion",
];

describe("blend-glsl · 模式集合", () => {
  it("恰好 12 个，且 = UI 可选集（不多不少，不含非可分离）", () => {
    assert(BLEND_MODES.length === 12, `应 12 个，实 ${BLEND_MODES.length}`);
    assert(JSON.stringify([...BLEND_MODES]) === JSON.stringify(UI_MODES), "顺序+集合 = UI");
    for (const nonsep of ["hue", "saturation", "color", "luminosity"]) {
      assert(!BLEND_MODES.includes(nonsep), `非可分离 ${nonsep} 不应出现`);
    }
  });

  it("program key 每模式唯一", () => {
    const keys = new Set(BLEND_MODES.map(compositeProgramKey));
    assert(keys.size === 12, "12 个唯一 key");
  });
});

describe("blend-glsl · fragment 源", () => {
  it("每模式都生成完整 frag（版本/采样器/合成脚手架）", () => {
    for (const m of BLEND_MODES) {
      const f = compositeFragSource(m);
      assert(f.startsWith("#version 300 es"), `${m} 版本头`);
      assert(f.includes("sampler2DArray") && f.includes("u_dst"), `${m} 采样器`);
      assert(f.includes("float bfn(") && f.includes("blendRGB"), `${m} blend 脚手架`);
      assert(f.includes("u_srcIndex") && f.includes("u_clipIndex") && f.includes("u_hasClip"), `${m} tile-index/clip uniform`);
      assert(f.includes("u_docSize") && f.includes("sampleTiled"), `${m} 多 tile 采样`);
      assert(f.includes("u_opacity"), `${m} opacity uniform`);
      // 预乘合成关键式
      assert(f.includes("as + ab * (1.0 - as)"), `${m} αo 合成式`);
    }
  });

  it("各模式含其特征公式（防张冠李戴）", () => {
    const sig = {
      "multiply": "Cb * Cs",
      "screen": "Cb + Cs - Cb * Cs",
      "darken": "min(Cb, Cs)",
      "lighten": "max(Cb, Cs)",
      "difference": "abs(Cb - Cs)",
      "exclusion": "Cb + Cs - 2.0*Cb*Cs",
      "color-dodge": "Cb/(1.0-Cs)",
      "color-burn": "(1.0-Cb)/Cs",
      "soft-light": "sqrt(Cb)",
    };
    for (const [m, s] of Object.entries(sig)) {
      assert(compositeFragSource(m).includes(s), `${m} 应含 "${s}"`);
    }
    // source-over 的 bfn 就是 return Cs（不混 backdrop）
    assert(compositeFragSource("source-over").includes("return Cs;"), "source-over=Cs");
  });

  it("共享顶点 shader 合法头 + location 0", () => {
    assert(COMPOSITE_VERT.includes("#version 300 es"), "版本");
    assert(COMPOSITE_VERT.includes("location=0") && COMPOSITE_VERT.includes("a_pos"), "quad attr");
  });
});
