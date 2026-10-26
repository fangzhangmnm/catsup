// thumbnail.ts —— 保存时的缩略图：编辑器离屏渲 → 区域平均缩到 THUMB_LONG_EDGE 见方 → vendored JPEG。不走 canvas.toBlob。
// 永远正方形（2026-10-26，user「thumb应该永远是1:1的而不是依照设备」）：取屏幕正中间最大的那块（Editor.captureRgba 收窄视野）。
// created 2026-09-20 by Claude Fable 5.1
import type { Editor } from "../editor/editor.ts";
import { encodeJpeg, THUMBNAIL_MIME } from "../format/jpeg.ts";
import { THUMB_JPEG_QUALITY, THUMB_LONG_EDGE } from "../config.ts";

/** 渲染分辨率 = 目标的 2 倍再区域平均（抗锯齿又省 GPU）。 */
export function captureThumbnail(editor: Editor): { mimeType: string; bytes: Uint8Array } | null {
  const vp = editor.vp();
  if (vp.w < 2 || vp.h < 2) return null;
  const long = THUMB_LONG_EDGE;
  const tw = long, th = long;
  const rw = tw * 2, rh = th * 2;
  let rgba: Uint8Array;
  try { rgba = editor.captureRgba(rw, rh); } catch { return null; }
  const out = new Uint8Array(tw * th * 4);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const i = (y * tw + x) * 4;
    for (let c = 0; c < 3; c++) {
      const a = (2 * y * rw + 2 * x) * 4 + c, b = a + 4, cc = a + rw * 4, d = cc + 4;
      out[i + c] = (rgba[a] + rgba[b] + rgba[cc] + rgba[d]) >> 2;
    }
    out[i + 3] = 255;
  }
  return { mimeType: THUMBNAIL_MIME, bytes: encodeJpeg(out, tw, th, THUMB_JPEG_QUALITY) };
}
