// 区域程序（region-programs.ts）↔ CPU 孪生（soft-shaders.ts）单测（created 2026-09-18 by Claude Fable 5.1）。
//   ① 注册表全覆盖：每个 RegionProgramId 都有 CPU 孪生（缺 = SoftGl2Port.program throw = 红）。
//   ② 各 program 在 SoftGl2Port 上的语义（小算例，手算可验）；多分辨率链对拍一份 JS 参照（= 旧 smudge-engine _multiRes 原式）。
//   真正的「精确翻译」锚在 test/smudge-golden.test.mjs（新引擎 vs 旧 CPU 引擎 fixture）。
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { REGION_PROGRAM_IDS, ensureAllRegionPrograms } from "../src/backend/gl/region-programs.ts";
import { resolveCpuProgram } from "../src/backend/soft-shaders.ts";

const near = (a, b, eps = 1e-5) => Math.abs(a - b) <= eps;
function eqArr(actual, expected, msg, eps = 1e-6) {
  assert(actual.length === expected.length && actual.every((v, i) => near(v, expected[i], eps)), `${msg || "不相等"}: 期望 [${expected}]，实得 [${actual}]`);
}
function texel(fbo, x, y) { const i = (y * fbo.w + x) * 4; const d = fbo.data; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }
function setTexel(fbo, x, y, rgba) { const i = (y * fbo.w + x) * 4; fbo.data.set(rgba, i); }
function fill(fbo, rgba) { for (let i = 0; i < fbo.data.length; i += 4) fbo.data.set(rgba, i); }
function port() { const p = new SoftGl2Port(); ensureAllRegionPrograms(p); return p; }
function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

describe("region-programs · 注册表", () => {
  it("每个 RegionProgramId 都有 CPU 孪生，SoftGl2Port 注册不 throw", () => {
    for (const id of REGION_PROGRAM_IDS) {
      const r = resolveCpuProgram(id);
      assert(typeof r === "function", `${id} 缺 CPU 孪生（resolveCpuProgram → ${String(r)}）`);
    }
    port();
    eq(REGION_PROGRAM_IDS.length, 19);
  });
});

describe("region-programs · 按需注册 / 预编译（2026-09-19 首笔卡顿案）", () => {
  it("RegionStroke 构造只注册 region-load；run 到哪个 program 才注册哪个；warmAllRegionPrograms 一次全注册", async () => {
    const { GlRoom } = await import("../src/backend/gl/gl-room.ts");
    const { LayerPixels } = await import("../src/backend/tiles/tile-layer.ts");
    const { RegionStroke } = await import("../src/backend/gl/region-stroke.ts");
    const { warmAllRegionPrograms } = await import("../src/backend/gl/region-programs.ts");
    const p = new SoftGl2Port();
    const room = new GlRoom(p, 16);
    const px = new LayerPixels(16, 16);
    const rs = new RegionStroke(room, 1, px, 16, 16, null);
    eq(p._programs.size, 1, "构造只注册 region-load");
    assert(p._programs.has("region-load"));
    const cur = rs.alloc(4, 4, "rgba-f32");
    rs.run("region-crop", cur, { u_W: "W" }, { u_size: [4, 4], u_origin: [0, 0], u_docSize: [16, 16] });
    eq(p._programs.size, 2, "run 按需注册 region-crop");
    warmAllRegionPrograms(p);
    eq(p._programs.size, REGION_PROGRAM_IDS.length, "预编译（软域 = 同步注册）全到齐");
    rs.dispose(); px.dispose(); room.dispose();
  });
});

describe("region-programs · region-crop / smudge-mask / smudge-absorb", () => {
  it("region-crop：W 直值 → premult；doc 外 = 0", () => {
    const p = port();
    const W = p.borrowFBO(8, 8, "u8"); fill(W, [0, 0, 0, 0]); setTexel(W, 3, 3, [0.5, 0.25, 0.125, 0.5]);
    const cur = p.borrowFBO(4, 4, "f32");
    p.draw({ program: "region-crop", target: cur, uniforms: { u_size: [4, 4], u_origin: [2, 2], u_docSize: [8, 8] }, textures: { u_W: W } });
    const t = texel(cur, 1, 1);
    assert(near(t[0], 0.25) && near(t[1], 0.125) && near(t[2], 0.0625) && near(t[3], 0.5), `premult (${t})`);
    p.draw({ program: "region-crop", target: cur, uniforms: { u_size: [4, 4], u_origin: [-2, -2], u_docSize: [8, 8] }, textures: { u_W: W } });
    eqArr(texel(cur, 0, 0), [0, 0, 0, 0], "doc 外 0");
    assert(near(texel(cur, 3, 3)[3], 0), "(-2,-2)+(3,3)=(1,1) 是透明像素");
  });
  it("smudge-mask：硬芯内 1、r 外 0、软边 smoothstep；选区外 0", () => {
    const p = port();
    const mask = p.borrowFBO(8, 8, "f32");
    const base = { u_size: [8, 8], u_origin: [0, 0], u_docSize: [8, 8], u_center: [4, 4], u_r: 3, u_innerR: 1.5, u_hasSel: 0, u_selOrigin: [0, 0], u_selSize: [1, 1] };
    p.draw({ program: "smudge-mask", target: mask, uniforms: base });
    assert(near(texel(mask, 3, 3)[0], 1), "硬芯内");
    assert(near(texel(mask, 7, 7)[0], 0), "r 外");
    const dist = Math.sqrt(1.5 * 1.5 + 0.5 * 0.5), u = (dist - 1.5) / 1.5, want = 1 - u * u * (3 - 2 * u);
    assert(near(texel(mask, 5, 3)[0], want), `软边 ${texel(mask, 5, 3)[0]} vs ${want}`);
    const sel = p.createTexture();
    const g = new Uint8Array(8 * 8); g[3 * 8 + 3] = 255; g[4 * 8 + 4] = 128;
    p.uploadTexture(sel, "r8", 8, 8, g);
    p.draw({ program: "smudge-mask", target: mask, uniforms: { ...base, u_hasSel: 1, u_selOrigin: [0, 0], u_selSize: [8, 8] }, textures: { u_sel: sel } });
    assert(near(texel(mask, 3, 3)[0], 1), "选区 255 → 不变");
    assert(near(texel(mask, 4, 4)[0], 128 / 255), "选区 128 → ×128/255");
    assert(near(texel(mask, 2, 4)[0], 0), "选区 0 → 0");
  });
  it("smudge-absorb：A' = mix(cur, A, ρ)；u_clip=1 时 doc 外保持 A", () => {
    const p = port();
    const A = p.borrowFBO(4, 4, "f32"); fill(A, [1, 0, 0, 1]);
    const cur = p.borrowFBO(4, 4, "f32"); fill(cur, [0, 0, 1, 1]);
    const A2 = p.borrowFBO(4, 4, "f32");
    const uni = { u_size: [4, 4], u_origin: [0, 0], u_docSize: [8, 8], u_clip: 1, u_space: 0, u_rho: 0.25 };
    p.draw({ program: "smudge-absorb", target: A2, uniforms: uni, textures: { u_A: A, u_cur: cur } });
    const t = texel(A2, 1, 1);
    assert(near(t[0], 0.25) && near(t[2], 0.75) && near(t[3], 1), `mix (${t})`);
    p.draw({ program: "smudge-absorb", target: A2, uniforms: { ...uni, u_origin: [-8, 0] }, textures: { u_A: A, u_cur: cur } });
    eqArr(texel(A2, 1, 1), [1, 0, 0, 1], "doc 外保持 A");
    p.draw({ program: "smudge-absorb", target: A2, uniforms: { ...uni, u_rho: 1 }, textures: { u_A: A, u_cur: cur } });
    eqArr(texel(A2, 2, 2), [1, 0, 0, 1], "ρ=1 → A");
  });
});

// JS 参照 = 旧 smudge-engine.ts _weightedAverage / _multiRes 原式（test-only 复刻，不在产品路径）
function refWeightedAverage(cur, mask, n) {
  let sr = 0, sg = 0, sb = 0, sa = 0, sw = 0;
  for (let q = 0; q < n; q++) { const m = mask[q]; if (m <= 0) continue; const o = q * 4; sr += cur[o] * m; sg += cur[o + 1] * m; sb += cur[o + 2] * m; sa += cur[o + 3] * m; sw += m; }
  return sw <= 0 ? [0, 0, 0, 0] : [sr / sw, sg / sw, sb / sw, sa / sw];
}
function refMultiRes(acc, mask, B, dullK) {
  const n = B * B;
  const k = Math.max(2, Math.min(B - 1, Math.round(Math.pow(B, 1 - dullK))));
  const sum = new Float32Array(k * k * 4), wsum = new Float32Array(k * k), box = new Float32Array(k * k * 4), live = new Uint8Array(k * k), boxLive = new Uint8Array(k * k), rel = new Float32Array(n * 4);
  const scale = k / B;
  for (let q = 0; q < n; q++) { const m = mask[q]; if (m <= 0) continue; const x = q % B, y = (q - x) / B; const c = Math.min(k - 1, Math.floor(y * scale)) * k + Math.min(k - 1, Math.floor(x * scale)); const o = q * 4, co = c * 4; sum[co] += acc[o] * m; sum[co + 1] += acc[o + 1] * m; sum[co + 2] += acc[o + 2] * m; sum[co + 3] += acc[o + 3] * m; wsum[c] += m; }
  for (let c = 0; c < k * k; c++) { const w = wsum[c]; if (w <= 0) continue; live[c] = 1; const co = c * 4; sum[co] /= w; sum[co + 1] /= w; sum[co + 2] /= w; sum[co + 3] /= w; }
  for (let cy = 0; cy < k; cy++) for (let cx = 0; cx < k; cx++) {
    let r = 0, g = 0, b = 0, a = 0, cnt = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = cy + dy; if (yy < 0 || yy >= k) continue; for (let dx = -1; dx <= 1; dx++) { const xx = cx + dx; if (xx < 0 || xx >= k) continue; const c2 = yy * k + xx; if (!live[c2]) continue; const o2 = c2 * 4; r += sum[o2]; g += sum[o2 + 1]; b += sum[o2 + 2]; a += sum[o2 + 3]; cnt++; } }
    const c = cy * k + cx, co = c * 4;
    if (cnt > 0) { box[co] = r / cnt; box[co + 1] = g / cnt; box[co + 2] = b / cnt; box[co + 3] = a / cnt; boxLive[c] = 1; }
  }
  for (let q = 0; q < n; q++) {
    const o = q * 4;
    if (mask[q] <= 0) continue;
    const x = q % B, y = (q - x) / B;
    const u = (x + 0.5) * scale - 0.5, v = (y + 0.5) * scale - 0.5;
    const i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0;
    let r = 0, g = 0, b = 0, a = 0, wt = 0;
    for (let dj = 0; dj <= 1; dj++) { const jj = Math.min(k - 1, Math.max(0, j0 + dj)), wv = dj ? fv : 1 - fv;
      for (let di = 0; di <= 1; di++) { const ii = Math.min(k - 1, Math.max(0, i0 + di)), w = (di ? fu : 1 - fu) * wv; const c = jj * k + ii; if (w <= 0 || !boxLive[c]) continue; const co = c * 4; r += box[co] * w; g += box[co + 1] * w; b += box[co + 2] * w; a += box[co + 3] * w; wt += w; } }
    if (wt > 0) { rel[o] = r / wt; rel[o + 1] = g / wt; rel[o + 2] = b / wt; rel[o + 3] = a / wt; }
  }
  return { rel, k };
}
function randomWindow(B, seed) {
  const rnd = lcg(seed);
  const cur = new Float32Array(B * B * 4), mask = new Float32Array(B * B);
  for (let q = 0; q < B * B; q++) { const a = rnd() < 0.2 ? 0 : rnd(); cur[q * 4] = rnd() * a; cur[q * 4 + 1] = rnd() * a; cur[q * 4 + 2] = rnd() * a; cur[q * 4 + 3] = a; mask[q] = rnd() < 0.3 ? 0 : rnd(); }
  return { cur, mask };
}
function uploadWindow(p, B, cur, mask) {
  const curF = p.borrowFBO(B, B, "f32"); curF.data.set(cur);
  const maskF = p.borrowFBO(B, B, "f32"); for (let q = 0; q < B * B; q++) maskF.data[q * 4] = mask[q];
  return { curF, maskF };
}

describe("region-programs · 归约链 / 多分辨率链 vs JS 参照", () => {
  it("reduce-weighted(k=16) → reduce-sum → divide = _weightedAverage", () => {
    const p = port();
    const B = 10, { cur, mask } = randomWindow(B, 7);
    const { curF, maskF } = uploadWindow(p, B, cur, mask);
    const s16 = p.borrowFBO(16, 16, "f32"), w16 = p.borrowFBO(16, 16, "f32"), s1 = p.borrowFBO(1, 1, "f32"), w1 = p.borrowFBO(1, 1, "f32"), avg = p.borrowFBO(1, 1, "f32");
    p.draw({ program: "reduce-weighted", target: s16, uniforms: { u_size: [16, 16], u_B: B, u_which: 0 }, textures: { u_src: curF, u_mask: maskF } });
    p.draw({ program: "reduce-weighted", target: w16, uniforms: { u_size: [16, 16], u_B: B, u_which: 1 }, textures: { u_src: curF, u_mask: maskF } });
    p.draw({ program: "reduce-sum", target: s1, uniforms: { u_srcSize: [16, 16] }, textures: { u_src: s16 } });
    p.draw({ program: "reduce-sum", target: w1, uniforms: { u_srcSize: [16, 16] }, textures: { u_src: w16 } });
    p.draw({ program: "divide", target: avg, textures: { u_sum: s1, u_w: w1 } });
    const want = refWeightedAverage(cur, mask, B * B), got = texel(avg, 0, 0);
    for (let i = 0; i < 4; i++) assert(near(got[i], want[i], 1e-5), `avg[${i}] ${got[i]} vs ${want[i]}`);
  });
  it("reduce-weighted(k) → box3 → upsample-bilinear = _multiRes（dull 0.5 / 0.25）", () => {
    for (const dull of [0.5, 0.25]) {
      const p = port();
      const B = 12, { cur: acc, mask } = randomWindow(B, 11 + dull * 100);
      const { curF: accF, maskF } = uploadWindow(p, B, acc, mask);
      const { rel: want, k } = refMultiRes(acc, mask, B, dull);
      const sk = p.borrowFBO(k, k, "f32"), wk = p.borrowFBO(k, k, "f32"), box = p.borrowFBO(k, k, "f32"), rel = p.borrowFBO(B, B, "f32");
      p.draw({ program: "reduce-weighted", target: sk, uniforms: { u_size: [k, k], u_B: B, u_which: 0 }, textures: { u_src: accF, u_mask: maskF } });
      p.draw({ program: "reduce-weighted", target: wk, uniforms: { u_size: [k, k], u_B: B, u_which: 1 }, textures: { u_src: accF, u_mask: maskF } });
      p.draw({ program: "box3", target: box, uniforms: { u_size: [k, k] }, textures: { u_sum: sk, u_w: wk } });
      p.draw({ program: "upsample-bilinear", target: rel, uniforms: { u_size: [B, B], u_k: k }, textures: { u_box: box, u_w: wk, u_mask: maskF } });
      let maxd = 0;
      for (let i = 0; i < want.length; i++) maxd = Math.max(maxd, Math.abs(rel.data[i] - want[i]));
      assert(maxd < 1e-5, `dull ${dull} k=${k}: max |Δ| = ${maxd}`);
    }
  });
});

describe("region-programs · 第三批 液化（field-copy / liquify-accumulate / liquify-warp）", () => {
  it("field-copy：偏移搬运，越界 0", () => {
    const p = port();
    const src = p.borrowFBO(4, 4, "f32"); fill(src, [0, 0, 0, 0]); setTexel(src, 1, 2, [7, -3, 0, 0]);
    const dst = p.borrowFBO(8, 8, "f32"); fill(dst, [9, 9, 9, 9]);
    p.draw({ program: "field-copy", target: dst, uniforms: { u_size: [8, 8], u_offset: [2, 3], u_srcSize: [4, 4] }, textures: { u_src: src } });
    eqArr(texel(dst, 3, 5), [7, -3, 0, 0], "(1,2)+(2,3)");
    eqArr(texel(dst, 0, 0), [0, 0, 0, 0], "源外 0");
    eqArr(texel(dst, 7, 7), [0, 0, 0, 0], "源外 0");
  });
  it("liquify-accumulate：push 圈内 smoothstep 累加、圈外原样；reconstruct 乘 1−α", () => {
    const p = port();
    const A = p.borrowFBO(8, 8, "f32"); fill(A, [0, 0, 0, 0]); setTexel(A, 7, 7, [5, 5, 0, 0]);
    const B = p.borrowFBO(8, 8, "f32");
    const uni = { u_size: [8, 8], u_origin: [0, 0], u_center: [4, 4], u_R: 3, u_strength: 1, u_mode: 0, u_vel: [2, 0] };
    p.draw({ program: "liquify-accumulate", target: B, uniforms: uni, textures: { u_A: A } });
    eqArr(texel(B, 4, 4).slice(0, 2), [2, 0], "中心 ff=1 → +vel");
    const t = 1 - 1 / 3, ff = t * t * (3 - 2 * t);
    eqArr(texel(B, 5, 4).slice(0, 2), [2 * ff, 0], "r=1", 1e-5);
    eqArr(texel(B, 7, 4).slice(0, 2), [0, 0], "r=3 不在圈内（严格 <）");
    eqArr(texel(B, 7, 7).slice(0, 2), [5, 5], "圈外原样");
    p.draw({ program: "liquify-accumulate", target: B, uniforms: { ...uni, u_mode: 5, u_strength: 0.5 }, textures: { u_A: A } });
    eqArr(texel(B, 7, 7).slice(0, 2), [5, 5], "reconstruct 圈外原样");
    fill(A, [4, 2, 0, 0]);
    p.draw({ program: "liquify-accumulate", target: B, uniforms: { ...uni, u_mode: 5, u_strength: 0.5 }, textures: { u_A: A } });
    eqArr(texel(B, 4, 4).slice(0, 2), [2, 1], "中心 α=0.5 → ×0.5");
  });
  it("liquify-warp：零位移场下四核（nearest/bilinear/bicubic）都是恒等（内容框内逐字节）；框外 0", () => {
    const p = port();
    const W0 = p.borrowFBO(12, 12, "u8"); fill(W0, [0, 0, 0, 0]);
    const rnd = lcg(5);
    for (let y = 2; y < 10; y++) for (let x = 3; x < 9; x++) setTexel(W0, x, y, [Math.round(rnd() * 255) / 255, Math.round(rnd() * 255) / 255, Math.round(rnd() * 255) / 255, Math.round(rnd() * 255) / 255]);
    setTexel(W0, 0, 0, [1, 1, 1, 1]);   // 内容框外的脏像素（CPU 快照框外 = 不采）
    const field = p.borrowFBO(12, 12, "f32"); fill(field, [0, 0, 0, 0]);
    for (const sample of [0, 1, 2]) {
      const W = p.borrowFBO(12, 12, "u8"); fill(W, [0.5, 0.5, 0.5, 1]);
      p.draw({ program: "liquify-warp", target: W, uniforms: { u_docSize: [12, 12], u_fieldOrigin: [0, 0], u_srcRect: [3, 2, 6, 8], u_sample: sample, u_bleed: 2, u_hasSel: 0, u_selOrigin: [0, 0], u_selSize: [1, 1], u_planeSize: [6, 8] }, textures: { u_field: field, u_W0: W0 } });
      for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        const want = (x >= 3 && x < 9 && y >= 2 && y < 10) ? texel(W0, x, y) : [0, 0, 0, 0];
        eqArr(texel(W, x, y), want, `sample=${sample} (${x},${y})`, 1e-6);
      }
    }
  });
});

describe("region-programs · smudge-deposit", () => {
  it("strength 1、P=绿：窗口内 W 变绿（straight u8）；scissor 外不动；lockAlpha 保 α 且透明像素不动", () => {
    const p = port();
    const W = p.borrowFBO(8, 8, "u8"); fill(W, [0, 0, 0, 0]); setTexel(W, 3, 3, [0.5, 0.25, 0.125, 0.5]); setTexel(W, 6, 6, [1, 1, 1, 1]);
    const B = 4, origin = [2, 2];
    const cur = p.borrowFBO(B, B, "f32");
    p.draw({ program: "region-crop", target: cur, uniforms: { u_size: [B, B], u_origin: origin, u_docSize: [8, 8] }, textures: { u_W: W } });
    const mask = p.borrowFBO(B, B, "f32"); fill(mask, [1, 0, 0, 1]);
    const P = p.borrowFBO(B, B, "f32"); fill(P, [0, 1, 0, 1]);
    const avg = p.borrowFBO(1, 1, "f32"); fill(avg, [0, 0, 0, 0]);
    const uni = { u_docSize: [8, 8], u_origin: origin, u_strength: 1, u_colorRate: 0, u_dilEff: 0, u_lock: 0, u_space: 0, u_Psel: 0, u_paint: [0, 0, 0, 1] };
    p.draw({ program: "smudge-deposit", target: W, scissor: { x: 2, y: 2, w: 4, h: 4 }, uniforms: uni, textures: { u_cur: cur, u_mask: mask, u_P: P, u_avg: avg } });
    eqArr(texel(W, 3, 3), [0, 1, 0, 1], "窗口内 = P");
    eqArr(texel(W, 2, 2), [0, 1, 0, 1], "透明像素也被拖上颜料（非 lock）");
    eqArr(texel(W, 6, 6), [1, 1, 1, 1], "scissor 外不动");
    // lockAlpha：重来一遍
    fill(W, [0, 0, 0, 0]); setTexel(W, 3, 3, [0.5, 0.25, 0.125, 0.5]);
    p.draw({ program: "region-crop", target: cur, uniforms: { u_size: [B, B], u_origin: origin, u_docSize: [8, 8] }, textures: { u_W: W } });
    p.draw({ program: "smudge-deposit", target: W, scissor: { x: 2, y: 2, w: 4, h: 4 }, uniforms: { ...uni, u_lock: 1 }, textures: { u_cur: cur, u_mask: mask, u_P: P, u_avg: avg } });
    const t = texel(W, 3, 3);
    assert(near(t[3], 0.5, 1 / 255) && near(t[1], 1, 1 / 255) && near(t[0], 0, 1 / 255), `lock：α 不动、色变绿 (${t})`);
    eqArr(texel(W, 2, 2), [0, 0, 0, 0], "lock：透明像素不动");
  });
  it("strength 0.5 srgb：W = 0.5·cur + 0.5·P 后 straight 量化到 u8", () => {
    const p = port();
    const W = p.borrowFBO(4, 4, "u8"); fill(W, [1, 0, 0, 1]);
    const cur = p.borrowFBO(4, 4, "f32");
    p.draw({ program: "region-crop", target: cur, uniforms: { u_size: [4, 4], u_origin: [0, 0], u_docSize: [4, 4] }, textures: { u_W: W } });
    const mask = p.borrowFBO(4, 4, "f32"); fill(mask, [1, 0, 0, 1]);
    const P = p.borrowFBO(4, 4, "f32"); fill(P, [0, 0, 1, 1]);
    const avg = p.borrowFBO(1, 1, "f32");
    p.draw({ program: "smudge-deposit", target: W, uniforms: { u_docSize: [4, 4], u_origin: [0, 0], u_strength: 0.5, u_colorRate: 0, u_dilEff: 0, u_lock: 0, u_space: 0, u_Psel: 0, u_paint: [0, 0, 0, 1] }, textures: { u_cur: cur, u_mask: mask, u_P: P, u_avg: avg } });
    const t = texel(W, 1, 1);
    assert(near(t[0], 128 / 255) && near(t[2], 128 / 255) && near(t[3], 1), `(${t})`);
  });
});
