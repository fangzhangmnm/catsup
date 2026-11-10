// liquify 双线性核 —— 预乘 + 越界记 0（替 v136 clamp-to-edge）。2026-09-19 搬 GPU 后：JS 参照 = 旧 bilinearSample 原式（test-only），
//   被测 = liquify-warp（u_sample=1）在 SoftGl2Port 孪生上对同一 src。契约不变：
//   问题陈述（真机：画个圆往下推，圆顶端被拉出一条）：旧 clamp-to-edge 把内容紧边界的不透明像素复制到越界采样处 → 拉丝；
//   预乘混合才是防黑边正解，两个都治。
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { ensureAllRegionPrograms } from "../src/backend/gl/region-programs.ts";

function refBilinear(sdat, w, h, sx, sy) {
  const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
  let pr = 0, pg = 0, pb = 0, pa = 0;
  const acc = (px, py, wt) => { if (wt === 0 || px < 0 || px >= w || py < 0 || py >= h) return; const o = (py * w + px) * 4; const a = sdat[o + 3]; const af = (a / 255) * wt; pr += sdat[o] * af; pg += sdat[o + 1] * af; pb += sdat[o + 2] * af; pa += a * wt; };
  acc(ix, iy, (1 - fx) * (1 - fy)); acc(ix + 1, iy, fx * (1 - fy)); acc(ix, iy + 1, (1 - fx) * fy); acc(ix + 1, iy + 1, fx * fy);
  const d = new Uint8ClampedArray(4);
  if (pa < 1e-4) return [0, 0, 0, 0];
  const afSum = pa / 255; d[0] = pr / afSum; d[1] = pg / afSum; d[2] = pb / afSum; d[3] = pa;
  return [d[0], d[1], d[2], d[3]];
}
// GPU：把 w×h 源放进 doc(16×16) 的 (4,4) 处当内容框，dest 像素 (8,8) 的位移 d = dest − (src + 4) → 采样 src 坐标 (sx,sy)。
function gpuSample(sdat, w, h, sx, sy) {
  const p = new SoftGl2Port(); ensureAllRegionPrograms(p);
  const W0 = p.borrowFBO(16, 16, "u8"); W0.data.fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) W0.data[((y + 4) * 16 + (x + 4)) * 4 + c] = sdat[(y * w + x) * 4 + c] / 255;
  const field = p.borrowFBO(16, 16, "f32"); field.data.fill(0);
  const di = (8 * 16 + 8) * 4; field.data[di] = 8 - (sx + 4); field.data[di + 1] = 8 - (sy + 4);
  const W = p.borrowFBO(16, 16, "u8"); W.data.fill(0.5);
  p.draw({ program: "liquify-warp", target: W, scissor: { x: 8, y: 8, w: 1, h: 1 }, uniforms: { u_docSize: [16, 16], u_fieldOrigin: [0, 0], u_srcRect: [4, 4, w, h], u_sample: 1, u_bleed: 2, u_hasSel: 0, u_selOrigin: [0, 0], u_selSize: [1, 1], u_planeSize: [w, h] }, textures: { u_field: field, u_W0: W0 } });
  return [0, 1, 2, 3].map((c) => Math.round(W.data[di + c] * 255));
}
const sample = (sdat, w, h, sx, sy) => { const g = gpuSample(sdat, w, h, sx, sy), r = refBilinear(sdat, w, h, sx, sy); for (let c = 0; c < 4; c++) assert(Math.abs(g[c] - r[c]) <= 1, `GPU vs 参照 ch${c}: ${g} vs ${r}`); return g; };
const RED = [255, 0, 0, 255];

describe("liquify · 双线性核（GPU liquify-warp ≡ 旧 bilinearSample）预乘 + 越界记 0", () => {
  it("界内不透明 → 原色原 α（双线性核不变，不变糊）", () => {
    const s = new Uint8ClampedArray([...RED, ...RED, ...RED, ...RED]);
    eq(sample(s, 2, 2, 0.5, 0.5).join(), "255,0,0,255", "界内中心 = 红不透明");
  });
  it("完全越界 → 透明(0,0,0,0)，不黑不复制", () => {
    const s = new Uint8ClampedArray([...RED, ...RED, ...RED, ...RED]);
    eq(sample(s, 2, 2, -5, -5).join(), "0,0,0,0", "越界 = 透明");
  });
  it("【拉丝修】采样在不透明内容上方(全越界 tap) → 透明，不复制边像素", () => {
    const s = new Uint8ClampedArray([...RED]);
    const r = sample(s, 1, 1, 0, -2);
    eq(r[3], 0, `上方采样应透明(α=0)，实得 α=${r[3]}（旧 clamp 会是 255=拉丝）`);
  });
  it("【防黑边修】不透明红 ⊗ 界内透明 tap → 色保持红(不拖暗)、α 减半", () => {
    const s = new Uint8ClampedArray([...RED, 0, 0, 0, 0]);
    const r = sample(s, 2, 1, 0.5, 0);
    eq(r[0], 255, `R 应保持 255(预乘不拖暗)，实得 ${r[0]}（旧直值混合=128 暗红）`);
    assert(r[3] >= 127 && r[3] <= 128, `α 应≈128(减半)，实得 ${r[3]}`);
    eq(r[1], 0, "G=0"); eq(r[2], 0, "B=0");
  });
  it("整数坐标 → 退化点采样（v147 选区整数 march 不受影响）", () => {
    const s = new Uint8ClampedArray([...RED, 0, 0, 0, 0]);
    eq(sample(s, 2, 1, 0, 0).join(), "255,0,0,255", "整数 (0,0) = 该像素原值");
  });
});
