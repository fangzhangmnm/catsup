// 艺术滤镜 kernel 组：马赛克 / 半调网点 / 教堂彩窗——数学自 plugins/stylize-filters.ts 析出（C8）。
// stainedGlass 的 seed 抖动 = 确定性 hash（无 Math.random——ADR-0009 决定论）。

import type { FilterKernel, FilterParams } from "./kernel.ts";

// ============ 马赛克（pixelize）============
// 每个 cellSize × cellSize 方块用块内平均色填满。
export const MosaicKernel: FilterKernel = {
  id: "mosaic",

  defaults() { return { cellSize: 12 }; },

  bleedRadius() { return 0; },    // 块内自包含

  bake(src, dst, params, mask, w, h) {
    const p = params as { cellSize: number };
    const cs = Math.max(2, p.cellSize | 0);
    for (let cy = 0; cy < h; cy += cs) {
      for (let cx = 0; cx < w; cx += cs) {
        const ex = Math.min(w, cx + cs);
        const ey = Math.min(h, cy + cs);
        // 1) 块内平均
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let y = cy; y < ey; y++) {
          for (let x = cx; x < ex; x++) {
            const o = (y * w + x) * 4;
            r += src[o]; g += src[o+1]; b += src[o+2]; a += src[o+3]; n++;
          }
        }
        const ar = (r / n) | 0, ag = (g / n) | 0, ab = (b / n) | 0, aa = (a / n) | 0;
        // 2) 块内填平均（mask 外 passthrough）
        for (let y = cy; y < ey; y++) {
          for (let x = cx; x < ex; x++) {
            const o = (y * w + x) * 4;
            if (mask && mask[o >> 2] < 128) {
              dst[o] = src[o]; dst[o+1] = src[o+1];
              dst[o+2] = src[o+2]; dst[o+3] = src[o+3];
              continue;
            }
            dst[o] = ar; dst[o+1] = ag; dst[o+2] = ab; dst[o+3] = aa;
          }
        }
      }
    }
  },
};

// ============ 半调网点（Halftone）============
// 每个 cell 一个圆点，半径 = (1 - 平均亮度) × cellSize/2 × scale。
export const HalftoneKernel: FilterKernel = {
  id: "halftone",

  defaults() { return { cellSize: 8, dotScale: 100, mode: "blackOnWhite" }; },

  bleedRadius() { return 0; },

  bake(src, dst, params, mask, w, h) {
    const p = params as { cellSize: number; dotScale: number; mode: string };
    const cs = Math.max(3, p.cellSize | 0);
    const scale = (p.dotScale | 0) / 100;
    const inverted = p.mode === "whiteOnBlack";
    const bgR = inverted ? 0 : 255;
    const fgR = inverted ? 255 : 0;
    for (let cy = 0; cy < h; cy += cs) {
      for (let cx = 0; cx < w; cx += cs) {
        const ex = Math.min(w, cx + cs);
        const ey = Math.min(h, cy + cs);
        // 平均亮度
        let l = 0, n = 0;
        for (let y = cy; y < ey; y++) {
          for (let x = cx; x < ex; x++) {
            const o = (y * w + x) * 4;
            l += 0.2126 * src[o] + 0.7152 * src[o+1] + 0.0722 * src[o+2];
            n++;
          }
        }
        const avgLuma = l / n;
        const darkness = inverted ? avgLuma / 255 : 1 - avgLuma / 255;
        const r = darkness * (cs / 2) * scale;
        const r2 = r * r;
        const ccx = cx + cs / 2;
        const ccy = cy + cs / 2;
        for (let y = cy; y < ey; y++) {
          for (let x = cx; x < ex; x++) {
            const o = (y * w + x) * 4;
            if (mask && mask[o >> 2] < 128) {
              dst[o] = src[o]; dst[o+1] = src[o+1]; dst[o+2] = src[o+2]; dst[o+3] = src[o+3];
              continue;
            }
            const dx = x + 0.5 - ccx, dy = y + 0.5 - ccy;
            const inDot = (dx*dx + dy*dy) < r2;
            const v = inDot ? fgR : bgR;
            dst[o] = v; dst[o+1] = v; dst[o+2] = v; dst[o+3] = src[o+3];
          }
        }
      }
    }
  },
};

// ============ 教堂彩窗（Stained glass）============
// Voronoi 分块 + 黑色 lead 边界。性能 O(W*H*9)，每像素只测 3×3 邻 cell seed
export const StainedGlassKernel: FilterKernel = {
  id: "stainedGlass",

  defaults() { return { cellSize: 16, leadWidth: 1 }; },

  bleedRadius(p: FilterParams | null) { return p ? ((p.cellSize as number) | 0) : 12; },

  bake(src, dst, params, mask, w, h) {
    const p = params as { cellSize: number; leadWidth: number };
    const cs = Math.max(6, p.cellSize | 0);
    const lead = Math.max(0, p.leadWidth | 0);
    const cols = Math.ceil(w / cs) + 1;
    const rows = Math.ceil(h / cs) + 1;
    // 1) seed 点（确定性 hash 抖动）
    const seedX = new Float32Array(cols * rows);
    const seedY = new Float32Array(cols * rows);
    const seedR = new Float32Array(cols * rows);
    const seedG = new Float32Array(cols * rows);
    const seedB = new Float32Array(cols * rows);
    const seedA = new Float32Array(cols * rows);
    const seedN = new Int32Array(cols * rows);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        const h1 = ((cx * 374761393 + cy * 668265263) ^ 0xdeadbeef) >>> 0;
        const h2 = ((cx * 2246822519 + cy * 3266489917) ^ 0xcafebabe) >>> 0;
        seedX[i] = cx * cs + (h1 % 256) / 255 * cs;
        seedY[i] = cy * cs + (h2 % 256) / 255 * cs;
      }
    }
    // 2 & 3) per-pixel 找最近 seed + 累 cell 平均色
    const pixelSeed = new Int32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ccx = Math.floor(x / cs);
        const ccy = Math.floor(y / cs);
        let best = -1, bestD = Infinity;
        for (let dcy = -1; dcy <= 1; dcy++) {
          for (let dcx = -1; dcx <= 1; dcx++) {
            const sx = ccx + dcx, sy = ccy + dcy;
            if (sx < 0 || sx >= cols || sy < 0 || sy >= rows) continue;
            const si = sy * cols + sx;
            const dx = x + 0.5 - seedX[si];
            const dy = y + 0.5 - seedY[si];
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = si; }
          }
        }
        pixelSeed[y * w + x] = best;
        if (best >= 0) {
          const o = (y * w + x) * 4;
          seedR[best] += src[o];
          seedG[best] += src[o + 1];
          seedB[best] += src[o + 2];
          seedA[best] += src[o + 3];
          seedN[best]++;
        }
      }
    }
    // 4) finalize 平均
    for (let i = 0; i < seedN.length; i++) {
      if (seedN[i] > 0) {
        seedR[i] = (seedR[i] / seedN[i]) | 0;
        seedG[i] = (seedG[i] / seedN[i]) | 0;
        seedB[i] = (seedB[i] / seedN[i]) | 0;
        seedA[i] = (seedA[i] / seedN[i]) | 0;
      }
    }
    // 5) 渲染：每像素填 cell 平均；边界（邻居 seed 不同）画黑
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const o = i * 4;
        if (mask && mask[o >> 2] < 128) {
          dst[o] = src[o]; dst[o+1] = src[o+1]; dst[o+2] = src[o+2]; dst[o+3] = src[o+3];
          continue;
        }
        const my = pixelSeed[i];
        let isLead = false;
        if (lead > 0) {
          for (let dy = 0; dy <= lead && !isLead; dy++) {
            for (let dx = 0; dx <= lead && !isLead; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx, ny = y + dy;
              if (nx >= w || ny >= h) continue;
              if (pixelSeed[ny * w + nx] !== my) isLead = true;
            }
          }
        }
        if (isLead) {
          dst[o] = 0; dst[o+1] = 0; dst[o+2] = 0; dst[o+3] = src[o+3];
        } else if (my >= 0) {
          dst[o]   = seedR[my];
          dst[o+1] = seedG[my];
          dst[o+2] = seedB[my];
          dst[o+3] = seedA[my];
        } else {
          dst[o] = src[o]; dst[o+1] = src[o+1]; dst[o+2] = src[o+2]; dst[o+3] = src[o+3];
        }
      }
    }
  },
};
