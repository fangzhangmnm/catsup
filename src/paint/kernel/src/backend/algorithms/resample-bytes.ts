// 轴对齐重采样深模块（全 typed array，v0.6.46 去 canvas 化战役 F 批）。
//
// 为什么（deletion test）：resize/导入缩放/裁剪模板模式的「输入输出都是字节」重采样以前借道
// canvas drawImage——吃 premult 往返 + 算法是浏览器的黑盒（且大比例缩小只有 bilinear → alias）。
// 本模块：**面积平均**（缩小的理论正解：任意比例精确覆盖积分，整数比=严格 box——像素模板
// 1024→128=÷8 逐块均值，user「缩到像素图也得鲁棒」）+ 双三次/双线性/最近邻（premult 累加、
// 反预乘、双三次带 α 反振铃限幅，口径对齐 GPU warp 采样器）。
//
// 消费者：doc.resampleTo（调整画布尺寸）、导入缩放尾巴、裁剪模板模式 commit、缩略图（可选）。
// 全部 node 直测。

export interface BytesPlane { data: Uint8ClampedArray; w: number; h: number }

// ---- 面积平均（缩小正解；放大时退化为近似盒复制，别用——放大走 bicubic）----
export function areaResampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  const xr = sw / tw, yr = sh / th;
  for (let dy = 0; dy < th; dy++) {
    const y0 = dy * yr, y1 = (dy + 1) * yr;
    const iy0 = Math.floor(y0), iy1 = Math.min(sh, Math.ceil(y1));
    for (let dx = 0; dx < tw; dx++) {
      const x0 = dx * xr, x1 = (dx + 1) * xr;
      const ix0 = Math.floor(x0), ix1 = Math.min(sw, Math.ceil(x1));
      let r = 0, g = 0, b = 0, a = 0, area = 0;
      for (let yy = iy0; yy < iy1; yy++) {
        const wy = Math.min(y1, yy + 1) - Math.max(y0, yy);   // 该源行的覆盖高度
        if (wy <= 0) continue;
        let p = (yy * sw + ix0) * 4;
        for (let xx = ix0; xx < ix1; xx++, p += 4) {
          const wx = Math.min(x1, xx + 1) - Math.max(x0, xx);
          if (wx <= 0) continue;
          const wgt = wx * wy;
          const av = src[p + 3];
          r += src[p] * av * wgt; g += src[p + 1] * av * wgt; b += src[p + 2] * av * wgt;
          a += av * wgt; area += wgt;
        }
      }
      const o = (dy * tw + dx) * 4;
      if (area <= 0 || a < 1e-4) continue;   // 全透明 → 0
      out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a);
      out[o + 3] = Math.round(a / area);
    }
  }
  return out;
}

// ---- 最近邻（像素中心取样）----
export function nearestResampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  for (let dy = 0; dy < th; dy++) {
    const sy = Math.min(sh - 1, Math.floor((dy + 0.5) * sh / th));
    for (let dx = 0; dx < tw; dx++) {
      const sx = Math.min(sw - 1, Math.floor((dx + 0.5) * sw / tw));
      const p = (sy * sw + sx) * 4, o = (dy * tw + dx) * 4;
      out[o] = src[p]; out[o + 1] = src[p + 1]; out[o + 2] = src[p + 2]; out[o + 3] = src[p + 3];
    }
  }
  return out;
}

// ---- 双线性（premult 累加、越界 tap=0、反预乘）----
export function bilinearResampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  for (let dy = 0; dy < th; dy++) {
    const sy = (dy + 0.5) * sh / th - 0.5;
    const iy = Math.floor(sy), fy = sy - iy;
    for (let dx = 0; dx < tw; dx++) {
      const sx = (dx + 0.5) * sw / tw - 0.5;
      const ix = Math.floor(sx), fx = sx - ix;
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < 2; j++) {
        const yy = iy + j; if (yy < 0 || yy >= sh) continue;
        const wy = j ? fy : 1 - fy;
        for (let i = 0; i < 2; i++) {
          const xx = ix + i; if (xx < 0 || xx >= sw) continue;
          const wgt = (i ? fx : 1 - fx) * wy;
          const p = (yy * sw + xx) * 4, av = src[p + 3];
          r += src[p] * av * wgt; g += src[p + 1] * av * wgt; b += src[p + 2] * av * wgt; a += av * wgt;
        }
      }
      const o = (dy * tw + dx) * 4;
      if (a < 1e-4) continue;
      out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a);
      out[o + 3] = Math.round(Math.min(255, a));
    }
  }
  return out;
}

// ---- 双三次（Catmull-Rom，premult 累加 + α 反振铃限幅——口径逐位对齐 GPU warp 采样器）----
function crK(t: number): number {
  const A = -0.5, at = Math.abs(t);
  if (at < 1) return (A + 2) * at * at * at - (A + 3) * at * at + 1;
  if (at < 2) return A * at * at * at - 5 * A * at * at + 8 * A * at - 4 * A;
  return 0;
}
export function bicubicResampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  const kx = [0, 0, 0, 0], ky = [0, 0, 0, 0];
  for (let dy = 0; dy < th; dy++) {
    const sy = (dy + 0.5) * sh / th - 0.5;
    const iy = Math.floor(sy);
    for (let j = 0; j < 4; j++) ky[j] = crK(iy - 1 + j - sy);
    for (let dx = 0; dx < tw; dx++) {
      const sx = (dx + 0.5) * sw / tw - 0.5;
      const ix = Math.floor(sx);
      for (let i = 0; i < 4; i++) kx[i] = crK(ix - 1 + i - sx);
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < 4; j++) {
        const yy = iy - 1 + j; if (yy < 0 || yy >= sh) continue;
        for (let i = 0; i < 4; i++) {
          const xx = ix - 1 + i; if (xx < 0 || xx >= sw) continue;
          const wgt = kx[i] * ky[j];
          const p = (yy * sw + xx) * 4, av = src[p + 3];
          r += src[p] * av * wgt; g += src[p + 1] * av * wgt; b += src[p + 2] * av * wgt; a += av * wgt;
        }
      }
      // α 反振铃限幅（中央 2×2，越界=0；premult RGB 等比缩 → 零色偏），同 warp 采样器 v0.6.43
      const nA = (xx: number, yy: number) => (xx < 0 || xx >= sw || yy < 0 || yy >= sh) ? 0 : src[(yy * sw + xx) * 4 + 3];
      const n00 = nA(ix, iy), n10 = nA(ix + 1, iy), n01 = nA(ix, iy + 1), n11 = nA(ix + 1, iy + 1);
      const acl = Math.max(Math.min(n00, n10, n01, n11), Math.min(Math.max(n00, n10, n01, n11), a));
      if (acl !== a && a > 1e-4) { const sc = acl / a; r *= sc; g *= sc; b *= sc; a = acl; }
      const o = (dy * tw + dx) * 4;
      if (a < 1e-4) continue;
      out[o] = Math.round(Math.max(0, Math.min(255, r / a)));
      out[o + 1] = Math.round(Math.max(0, Math.min(255, g / a)));
      out[o + 2] = Math.round(Math.max(0, Math.min(255, b / a)));
      out[o + 3] = Math.round(Math.max(0, Math.min(255, a)));
    }
  }
  return out;
}

/** 双三次**点**采样（v0.6.61 液化第四核）：src[sx,sy]（浮点，straight RGBA）→ ddat[dstIdx..+3]。
 *  与 bicubicResampleBytes 同口径：Catmull-Rom 4×4、premult 累加、α 反振铃限幅（中央 2×2）、
 *  越界 tap=0（透明，防拉丝——同 liquify bilinearSample 的 v136 修）。
 *  整数坐标退化成精确点采样（liquify center-at-integer / v147 整数 march 约定依赖此性质）。 */
export function bicubicSamplePremult(src: Uint8ClampedArray, sw: number, sh: number, sx: number, sy: number, ddat: Uint8ClampedArray, dstIdx: number) {
  const ix = Math.floor(sx), iy = Math.floor(sy);
  let r = 0, g = 0, b = 0, a = 0;
  for (let j = 0; j < 4; j++) {
    const yy = iy - 1 + j; if (yy < 0 || yy >= sh) continue;
    const wy = crK(yy - sy);
    if (wy === 0) continue;
    for (let i = 0; i < 4; i++) {
      const xx = ix - 1 + i; if (xx < 0 || xx >= sw) continue;
      const wgt = crK(xx - sx) * wy;
      if (wgt === 0) continue;
      const p = (yy * sw + xx) * 4, av = src[p + 3];
      r += src[p] * av * wgt; g += src[p + 1] * av * wgt; b += src[p + 2] * av * wgt; a += av * wgt;
    }
  }
  const nA = (xx: number, yy: number) => (xx < 0 || xx >= sw || yy < 0 || yy >= sh) ? 0 : src[(yy * sw + xx) * 4 + 3];
  const n00 = nA(ix, iy), n10 = nA(ix + 1, iy), n01 = nA(ix, iy + 1), n11 = nA(ix + 1, iy + 1);
  const acl = Math.max(Math.min(n00, n10, n01, n11), Math.min(Math.max(n00, n10, n01, n11), a));
  if (acl !== a && a > 1e-4) { const sc = acl / a; r *= sc; g *= sc; b *= sc; a = acl; }
  if (a < 1e-4) { ddat[dstIdx] = ddat[dstIdx + 1] = ddat[dstIdx + 2] = ddat[dstIdx + 3] = 0; return; }
  ddat[dstIdx]     = Math.round(Math.max(0, Math.min(255, r / a)));
  ddat[dstIdx + 1] = Math.round(Math.max(0, Math.min(255, g / a)));
  ddat[dstIdx + 2] = Math.round(Math.max(0, Math.min(255, b / a)));
  ddat[dstIdx + 3] = Math.round(Math.max(0, Math.min(255, a)));
}

/** 统一入口。mode：nearest / area（=缩小优化"sharper"的字节正解）/ bilinear / bicubic /
 *  auto（两轴都缩→area；否则 bicubic——装裱模板 commit 的默认策略）。 */
export function resampleBytes(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number, mode = "auto"): Uint8ClampedArray {
  if (tw === sw && th === sh) return new Uint8ClampedArray(src);
  const m = mode === "auto" ? ((tw <= sw && th <= sh) ? "area" : "bicubic") : mode;
  if (m === "nearest") return nearestResampleBytes(src, sw, sh, tw, th);
  if (m === "area" || m === "sharper") return areaResampleBytes(src, sw, sh, tw, th);
  if (m === "bilinear") return bilinearResampleBytes(src, sw, sh, tw, th);
  return bicubicResampleBytes(src, sw, sh, tw, th);
}
