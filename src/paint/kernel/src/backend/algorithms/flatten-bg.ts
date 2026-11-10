// 导出底色（v0.9.14；user 2026-08-19 拍板：视图级导出底色——不碰画板底色、不建图层；
// 三分立原则：导出底色/画板底色/UI 主题互不同步）。
// flattenToBg = straight RGBA 字节压到不透明底色（src over bg，纯字节数学）——原 JPG 白底
// inline 段落抽出共用：PNG 选了底色、JPG 任意底色都走这里。字节进出不走 canvas（家规）。
export function flattenToBg(src: Uint8ClampedArray, br: number, bg: number, bb: number): Uint8ClampedArray {
  const flat = new Uint8ClampedArray(src.length);
  for (let p = 0; p < src.length; p += 4) {
    const a = src[p + 3] / 255;
    flat[p] = src[p] * a + br * (1 - a);
    flat[p + 1] = src[p + 1] * a + bg * (1 - a);
    flat[p + 2] = src[p + 2] * a + bb * (1 - a);
    flat[p + 3] = 255;
  }
  return flat;
}

/** 导出底色配置值 → rgb。"transparent"/非法/缺省 = null（=透明，不 flatten）。
 *  UI 层负责把色名/色温 parse 成 #rrggbb（parseColorName）；这里只认 6 位 hex，防御性收口。 */
export function parseExportBg(bg: string | null | undefined): { r: number; g: number; b: number } | null {
  if (!bg || !/^#[0-9a-fA-F]{6}$/.test(bg)) return null;
  return { r: parseInt(bg.slice(1, 3), 16), g: parseInt(bg.slice(3, 5), 16), b: parseInt(bg.slice(5, 7), 16) };
}
