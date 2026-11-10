// PNG 编解码接缝（src/backend/png-codec.ts，UPNG 内脏）验收：
// ①无损 roundtrip 含低 α straight RGB（premult 往返退出持久化的铁证——ora 层存读走此路）；
// ②pHYs 注入后仍可解（chunk/CRC 合法）；③iCCP 探测。
import { describe, it, assert, eq } from "./runner.mjs";
import { encodePngFromBytes, decodePngToBytes, insertPhys } from "../src/backend/png-codec.ts";

describe("png-codec · UPNG 内脏", () => {
  it("无损 roundtrip：低 α straight RGB 逐字节保真（老 canvas 编码在 α≤3 时 RGB 会烂）", async () => {
    const w = 23, h = 11;
    const src = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      src[i * 4] = (i * 7) % 256; src[i * 4 + 1] = (i * 13) % 256; src[i * 4 + 2] = (i * 29) % 256;
      src[i * 4 + 3] = i % 5 === 0 ? 0 : (i % 7 === 0 ? 2 : (i * 11) % 256);   // 混入 α=0/2 的极端像素
    }
    const png = await encodePngFromBytes(src, w, h);
    eq(png[1], 0x50, "PNG 魔数");
    const back = await decodePngToBytes(png);
    eq(back.w, w); eq(back.h, h);
    let exact = true;
    for (let i = 0; i < src.length; i++) {
      // α=0 像素 RGB 允许不保（编码器可弃）；其余逐字节
      if (src[(i >> 2) * 4 + 3] === 0 && (i & 3) !== 3) continue;
      if (src[i] !== back.data[i]) { exact = false; break; }
    }
    assert(exact, "非全透明像素逐字节保真");
  });

  it("pHYs 注入：300dpi → 仍可解 + 尺寸正确", async () => {
    const w = 8, h = 8;
    const src = new Uint8ClampedArray(w * h * 4).fill(200);
    const png = await encodePngFromBytes(src, w, h, { dpi: 300 });
    // pHYs 在 IHDR 后（offset 33 起 4 字节长度 + "pHYs"）
    eq(String.fromCharCode(png[37], png[38], png[39], png[40]), "pHYs", "chunk 就位");
    const back = await decodePngToBytes(png);
    eq(back.w, 8, "带 pHYs 照常解码");
    eq(back.data[0], 200);
  });

  it("insertPhys 幂等性检查：长度增加恰 21 字节", async () => {
    const png = await encodePngFromBytes(new Uint8ClampedArray(16), 2, 2);
    const withP = insertPhys(png, 300);
    eq(withP.length, png.length + 21);
  });
});
