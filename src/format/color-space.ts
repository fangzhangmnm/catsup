// color-space.ts —— 材质色在文件边界的换算（2026-10-30 Opus 5.5；user「文件边界换算 同意」「老文件我们现在真的不用念旧」）。
// glTF 规定 baseColorFactor 是线性值；CatsUp 里材质色按 sRGB 存（调色板 / 取色器 / 线稿像素那些画风都直接用 sRGB 的数）。只在读写文件这一处换，app 里别处不认识线性。
// 往返：float64 里 sRGB → 线性 → sRGB 的误差在 1e-15 量级，比 8 位色的一档（1/255 ≈ 0.004）小十几个数量级，取整回 8 位就是原来那个色号。
// 老文件（CATSUP_material 1.0 及以前）存的是 sRGB 的数，现在一律按线性读 = 颜色会浅一些，不迁移（user 拍的）。

/** sRGB（0..1）→ 线性（IEC 61966-2-1 分段式）。 */
export const srgbToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
/** 线性（0..1）→ sRGB。 */
export const linearToSrgb = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
