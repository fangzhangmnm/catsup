// vendored JPEG 编码器：产出 JFIF、体积合理、行序翻转。created 2026-09-20 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { encodeJpeg, flipRowsRgba } from "../src/format/jpeg.ts";

describe("format/jpeg", () => {
  it("192×108 渐变 → JPEG：SOI/EOI 正确、体积 < 12 KB", () => {
    const w = 192, h = 108, px = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; px[i] = x; px[i + 1] = y * 2; px[i + 2] = 128; px[i + 3] = 255; }
    const jpg = encodeJpeg(px, w, h, 80);
    eq(jpg[0], 0xff); eq(jpg[1], 0xd8); eq(jpg[jpg.length - 2], 0xff); eq(jpg[jpg.length - 1], 0xd9);
    assert(jpg.length < 12 * 1024, `JPEG ${jpg.length} B`);
  });
  it("flipRowsRgba 翻转行序", () => {
    const px = new Uint8Array([1, 1, 1, 1, 2, 2, 2, 2]);   // 1×2
    const f = flipRowsRgba(px, 1, 2);
    eq(f[0], 2); eq(f[4], 1);
  });
});
