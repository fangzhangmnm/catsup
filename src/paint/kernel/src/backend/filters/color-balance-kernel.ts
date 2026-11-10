// 色彩平衡 kernel（PS 风格 3 区 × 3 轴）——数学自 plugins/color-balance.ts 析出（C8）。
// 3 区段：阴影 / 中间调 / 高光，每区 3 个轴（青-红 / 品-绿 / 黄-蓝）
// 区段权重 = luma 三段高斯（shadow @ 0、mid @ 0.5、hi @ 1）

import { clamp8, type FilterKernel, type FilterParams } from "./kernel.ts";

export interface ColorBalanceParams extends FilterParams {
  shR: number; shG: number; shB: number;
  mR: number; mG: number; mB: number;
  hiR: number; hiG: number; hiB: number;
}

export const ColorBalanceKernel: FilterKernel = {
  id: "colorBalance",

  defaults(): ColorBalanceParams {
    return { shR: 0, shG: 0, shB: 0, mR: 0, mG: 0, mB: 0, hiR: 0, hiG: 0, hiB: 0 };
  },

  bleedRadius() { return 0; },

  bake(srcData, dstData, params, mask) {
    const p = params as ColorBalanceParams;
    // 三段 luma 权重函数（每段高斯 σ≈0.25，中心 0 / 0.5 / 1）
    const wShadow = new Float32Array(256);
    const wMid    = new Float32Array(256);
    const wHi     = new Float32Array(256);
    const SIG2 = 2 * 0.25 * 0.25;
    for (let i = 0; i < 256; i++) {
      const l = i / 255;
      wShadow[i] = Math.exp(-(l - 0) * (l - 0) / SIG2);
      wMid[i]    = Math.exp(-(l - 0.5) * (l - 0.5) / SIG2);
      wHi[i]     = Math.exp(-(l - 1) * (l - 1) / SIG2);
    }
    // delta LUT 预算（按 luma 0..255 索引）
    const dRLut = new Float32Array(256);
    const dGLut = new Float32Array(256);
    const dBLut = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      dRLut[i] = (p.shR * wShadow[i] + p.mR * wMid[i] + p.hiR * wHi[i]) / 100 * 64;
      dGLut[i] = (p.shG * wShadow[i] + p.mG * wMid[i] + p.hiG * wHi[i]) / 100 * 64;
      dBLut[i] = (p.shB * wShadow[i] + p.mB * wMid[i] + p.hiB * wHi[i]) / 100 * 64;
    }
    const N = srcData.length / 4;
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      if (mask && mask[o >> 2] < 128) {
        dstData[o] = srcData[o]; dstData[o+1] = srcData[o+1];
        dstData[o+2] = srcData[o+2]; dstData[o+3] = srcData[o+3];
        continue;
      }
      const r = srcData[o], g = srcData[o+1], b = srcData[o+2];
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
      const li = luma > 255 ? 255 : luma < 0 ? 0 : luma;
      dstData[o]   = clamp8(r + dRLut[li]);
      dstData[o+1] = clamp8(g + dGLut[li]);
      dstData[o+2] = clamp8(b + dBLut[li]);
      dstData[o+3] = srcData[o+3];
    }
  },
};
