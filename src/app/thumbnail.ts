// thumbnail.ts —— 保存时的缩略图：编辑器离屏渲 → 区域平均缩到长边 THUMB_LONG_EDGE → vendored JPEG。不走 canvas.toBlob。
// created 2026-09-20 by Claude Fable 5.1
import type { Editor } from "../editor/editor.ts";
import { encodeJpeg, THUMBNAIL_MIME } from "../format/jpeg.ts";
import { THUMB_JPEG_QUALITY, THUMB_LONG_EDGE } from "../config.ts";

/** 渲染分辨率 = 目标的 2 倍再区域平均（抗锯齿又省 GPU）。 */
export function captureThumbnail(editor: Editor): { mimeType: string; bytes: Uint8Array } | null {
  const vp = editor.vp();
  if (vp.w < 2 || vp.h < 2) return null;
  const long = THUMB_LONG_EDGE;
  const [tw, th] = vp.w >= vp.h ? [long, Math.max(1, Math.round(long * vp.h / vp.w))] : [Math.max(1, Math.round(long * vp.w / vp.h)), long];
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
