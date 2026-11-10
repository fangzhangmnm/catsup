// RotSprite（像素完美旋转）深模块。v0.6.37。
//
// 像素画界旋转标准（Aseprite 同款思路）：EPX/Scale2x 放大 2^levels 倍 → nearest 采样 →
// 落回 1×。放大器按"同色邻域"规则外推斜边，旋转后台阶远比裸 nearest 干净，且零插值 = 零糊。
//
// 本仓集成方式（v0.6.37 拍板）：放大在 **CPU 一次性**做完、按浮层身份缓存（同 spline 预滤波节奏），
// GPU 侧只是「nearest 采样一张大纹理」——零新 shader，live/commit 同源，golden 参照即本文件。
// 整数刚体态（identity/整平移/90°/翻转）由置换快路/裸 nearest 接管（逐字节），本模块只管真旋转/缩放。
//
// 消费者：floating-transform（rotsprite 采样模式）、gl-smoke harness（CPU 参照）。

export interface U8Plane { data: Uint8ClampedArray; w: number; h: number }

// 显存/内存预算 → 放大级数（2^levels）：sprite 级源 8×；中等 4×；大源 2×。
// 8× 的 64× 像素只在 rotsprite 模式激活时存在（浮层收摊即释放）。
export function rotspriteLevels(w: number, h: number): number {
  const area = w * h;
  if (area <= 65536) return 3;     // ≤256²：8×
  if (area <= 262144) return 2;    // ≤512²：4×
  return 1;                        // 更大：2×（质量换内存）
}

// EPX/Scale2x 单级 2× 放大。邻域（源分辨率）：A=上 B=右 C=左 D=下；像素相等 = RGBA 四字节全等。
//   E0(左上)=C==A&&C!=D&&A!=B?A:P   E1(右上)=A==B&&A!=C&&B!=D?B:P
//   E2(左下)=D==C&&D!=B&&C!=A?C:P   E3(右下)=B==D&&B!=A&&D!=C?D:P
export function epx2x(src: Uint8ClampedArray, w: number, h: number): U8Plane {
  const W = w * 2, H = h * 2;
  const out = new Uint8ClampedArray(W * H * 4);
  const eq = (i: number, j: number) =>
    src[i] === src[j] && src[i + 1] === src[j + 1] && src[i + 2] === src[j + 2] && src[i + 3] === src[j + 3];
  const put = (di: number, si: number) => {
    out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const a = (y > 0 ? (y - 1) * w + x : y * w + x) * 4;          // 上（边界 clamp）
      const b = (x < w - 1 ? y * w + x + 1 : y * w + x) * 4;        // 右
      const c = (x > 0 ? y * w + x - 1 : y * w + x) * 4;            // 左
      const d = (y < h - 1 ? (y + 1) * w + x : y * w + x) * 4;      // 下
      const d0 = (y * 2 * W + x * 2) * 4;          // E0 左上
      const d1 = d0 + 4;                           // E1 右上
      const d2 = d0 + W * 4;                       // E2 左下
      const d3 = d2 + 4;                           // E3 右下
      put(d0, eq(c, a) && !eq(c, d) && !eq(a, b) ? a : p);
      put(d1, eq(a, b) && !eq(a, c) && !eq(b, d) ? b : p);
      put(d2, eq(d, c) && !eq(d, b) && !eq(c, a) ? c : p);
      put(d3, eq(b, d) && !eq(b, a) && !eq(d, c) ? d : p);
    }
  }
  return { data: out, w: W, h: H };
}

/** straight RGBA u8 → EPX 放大 2^levels 的平面（levels 缺省按尺寸预算自选）。 */
export function rotspriteUpscale(rgba: Uint8ClampedArray, w: number, h: number, levels = rotspriteLevels(w, h)): U8Plane {
  let p: U8Plane = { data: rgba, w, h };
  for (let i = 0; i < levels; i++) p = epx2x(p.data, p.w, p.h);
  return p;
}
