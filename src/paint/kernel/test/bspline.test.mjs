// 预滤波三次 B 样条插值（src/bspline.ts）数学验收。
// 守的契约：①插值性（整数点采样逐字节还原源——identity 无损的根基）；
// ②「多次重采样保锐」的存在理由：反复亚像素平移往返，B 样条的累积误差显著小于 Catmull-Rom。
import { describe, it, assert, eq } from "./runner.mjs";
import { prefilterToSplinePlane, sampleSplinePremult, b3 } from "../src/backend/algorithms/bspline.ts";

function pattern(w, h, semiAlpha) {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const cell = (((x >> 2) + (y >> 2)) & 1) === 1;   // 4px 棋盘（高频内容）
    buf[i] = cell ? 230 : 40; buf[i + 1] = (x * 31 + 9) % 256; buf[i + 2] = cell ? 60 : 200;
    buf[i + 3] = semiAlpha ? 55 + ((x + y * 3) % 200) : 255;
  }
  return buf;
}

describe("bspline · 插值性 + 核", () => {
  it("B3 核：单位分解 Σb3(t+k)=1、b3(0)=2/3、b3(±1)=1/6", () => {
    assert(Math.abs(b3(0) - 2 / 3) < 1e-12);
    assert(Math.abs(b3(1) - 1 / 6) < 1e-12 && Math.abs(b3(-1) - 1 / 6) < 1e-12);
    for (const t of [0, 0.25, 0.5, 0.77]) {
      let s = 0;
      for (let k = -2; k <= 2; k++) s += b3(t + k);
      assert(Math.abs(s - 1) < 1e-12, `单位分解 t=${t}`);
    }
  });

  it("插值性：整数点采样逐字节还原源（不透明 + 半透明花纹，含边缘像素）", () => {
    for (const semi of [false, true]) {
      const w = 23, h = 17;   // 故意非 2 幂 + 奇数
      const src = pattern(w, h, semi);
      const plane = prefilterToSplinePlane(src, w, h);
      const out = new Uint8ClampedArray(4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        sampleSplinePremult(plane, x, y, out, 0);   // center 约定：texel 中心 = 整数
        const i = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) {
          assert(Math.abs(out[c] - src[i + c]) <= 1,
            `(${x},${y})c${c} semi=${semi}: 期望 ${src[i + c]} 实得 ${out[c]}`);
        }
      }
    }
  });

  it("存在理由：±0.3px 平移往返 ×6 次，累积误差 ≪ Catmull-Rom", () => {
    // 中频图案（模拟 AA 线稿的边缘频段 ~0.2 cyc/px）。棋盘不行：能量在 Nyquist，
    // 任何对称插值核半相位都把 Nyquist 归零，两者一起糊，测不出差距。
    const w = 32, h = 32;
    const src = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = Math.round(128 + 60 * Math.sin(2 * Math.PI * 0.22 * x) + 60 * Math.sin(2 * Math.PI * 0.17 * y));
      src[i] = v; src[i + 1] = 255 - v; src[i + 2] = v; src[i + 3] = 255;
    }
    // Catmull-Rom 单通道参照（同 warp 采样器核）
    const cr = (t) => { const a = -0.5, at = Math.abs(t); if (at < 1) return (a + 2) * at ** 3 - (a + 3) * at ** 2 + 1; if (at < 2) return a * at ** 3 - 5 * a * at ** 2 + 8 * a * at - 4 * a; return 0; };
    // 两条管线都逐次 u8 量化（真实 commit 流程：每次落盘存 u8）
    const resampleCR = (img, dx) => {
      const out = new Uint8ClampedArray(img.length);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const sx = x - dx, ix = Math.floor(sx);
        let v = [0, 0, 0, 0], wsum = 0;
        for (let i = -1; i <= 2; i++) {
          const xx = ix + i;
          if (xx < 0 || xx >= w) continue;
          const ww = cr(xx - sx); wsum += ww;
          for (let c = 0; c < 4; c++) v[c] += img[(y * w + xx) * 4 + c] * ww;
        }
        for (let c = 0; c < 4; c++) out[(y * w + x) * 4 + c] = wsum > 0 ? Math.round(v[c] / wsum) : 0;
      }
      return out;
    };
    const resampleSpline = (img, dx) => {
      const plane = prefilterToSplinePlane(img, w, h);
      const out = new Uint8ClampedArray(img.length);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        sampleSplinePremult(plane, x - dx, y, out, (y * w + x) * 4);
      }
      return out;
    };
    const err = (img) => {
      let e = 0, n = 0;
      for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++) {   // 避边
        for (let c = 0; c < 3; c++) { e += Math.abs(img[(y * w + x) * 4 + c] - src[(y * w + x) * 4 + c]); n++; }
      }
      return e / n;
    };
    let a = Uint8ClampedArray.from(src), b = Uint8ClampedArray.from(src);
    for (let k = 0; k < 6; k++) {
      const dx = k % 2 === 0 ? 0.3 : -0.3;   // 平移往返（净位移 0）
      a = resampleCR(a, dx);
      b = resampleSpline(b, dx);
    }
    const eCR = err(a), eSp = err(b);
    assert(eSp < eCR * 0.25, `6 次往返：spline 平均误差 ${eSp.toFixed(2)} 应 < CR 的 1/4（CR=${eCR.toFixed(2)}）`);
  });
});

describe("bspline · 反振铃限幅（v0.6.43 方案 A）", () => {
  it("半透明 α=128 台阶边缘：任意亚像素采样 α 不过冲（旋转边缘'变深'病根）", () => {
    // 左半 α=128 红、右半透明。修前：边缘内侧亚像素采样 α 冲到 ~140+（负瓣）。
    const w = 24, h = 8;
    const src = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (x < 12) { src[i] = 200; src[i + 1] = 40; src[i + 2] = 40; src[i + 3] = 128; }
    }
    const plane = prefilterToSplinePlane(src, w, h);
    const out = new Uint8ClampedArray(4);
    let maxA = 0;
    for (let f = 0; f <= 20; f++) {
      for (let y = 2; y < 6; y++) {
        sampleSplinePremult(plane, 8 + f * 0.3, y, out, 0);   // 扫过台阶边缘的亚像素位置
        if (out[3] > maxA) maxA = out[3];
      }
    }
    assert(maxA <= 129, `限幅后 α 峰值 ${maxA} 应 ≤128(+1 舍入)`);
    // 且色相不被限幅带偏（C=r/α 等比缩）：内部点仍是纯色
    sampleSplinePremult(plane, 5.5, 3.5, out, 0);
    assert(Math.abs(out[0] - 200) <= 2 && Math.abs(out[1] - 40) <= 2, `色相不动，实得 ${out[0]},${out[1]}`);
  });
});
