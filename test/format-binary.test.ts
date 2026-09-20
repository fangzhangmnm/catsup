// src/format 字节层 + GLB 容器：位宽阶梯 / 对齐 / 往返。created 2026-09-20 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { BinBuilder, decodeUints, encodeUints, pickUintType, sliceBin, encodeF32, decodeF32 } from "../src/format/binary.ts";
import { decodeGlb, encodeGlb, isGlb } from "../src/format/glb.ts";

describe("format/binary", () => {
  it("位宽阶梯：按最大值选 uint8/16/32/64", () => {
    eq(pickUintType(0), "uint8"); eq(pickUintType(255), "uint8"); eq(pickUintType(256), "uint16");
    eq(pickUintType(65535), "uint16"); eq(pickUintType(65536), "uint32"); eq(pickUintType(2 ** 32), "uint64");
  });
  it("整数流往返（含 uint64 到 2^53）", () => {
    for (const t of ["uint8", "uint16", "uint32", "uint64"] as const) {
      const max = t === "uint8" ? 255 : t === "uint16" ? 65535 : t === "uint32" ? 4294967295 : Number.MAX_SAFE_INTEGER;
      const v = [0, 1, 7, max];
      eq(JSON.stringify(decodeUints(encodeUints(v, t), t, v.length)), JSON.stringify(v), t);
    }
  });
  it("越界值拒写、uint64 超 2^53 拒读", () => {
    let threw = false; try { encodeUints([256], "uint8"); } catch { threw = true; } assert(threw, "256 进 uint8 应报错");
    const big = new Uint8Array(8); big.fill(0xff);
    threw = false; try { decodeUints(big, "uint64", 1); } catch { threw = true; } assert(threw, "2^64-1 应报错");
  });
  it("BinBuilder：每段 4 字节对齐、总长补齐", () => {
    const b = new BinBuilder();
    const s1 = b.push(new Uint8Array([1, 2, 3]));
    const s2 = b.push(new Uint8Array([4]));
    eq(s1.byteOffset, 0); eq(s2.byteOffset, 4);
    const out = b.finish();
    eq(out.byteLength, 8);
    eq(sliceBin(out, s2)[0], 4);
  });
  it("f32 往返", () => {
    const f = decodeF32(encodeF32([1.5, -2.25]), 2);
    eq(f[0], 1.5); eq(f[1], -2.25);
  });
});

describe("format/glb", () => {
  it("往返：JSON + BIN，JSON 补空格、BIN 补零、头长度正确", () => {
    const json = { asset: { version: "2.0" }, x: "字" };
    const bin = new Uint8Array([9, 8, 7]);
    const glb = encodeGlb(json, bin);
    assert(isGlb(glb));
    eq(new DataView(glb.buffer).getUint32(8, true), glb.byteLength, "总长");
    eq(glb.byteLength % 4, 0, "4 对齐");
    const back = decodeGlb(glb);
    eq(JSON.stringify(back.json), JSON.stringify(json));
    eq(back.bin.byteLength, 4, "BIN 补到 4");
    eq(back.bin[0], 9); eq(back.bin[3], 0);
  });
  it("无 BIN 时不写 BIN chunk；坏 magic / 截断报错", () => {
    const glb = encodeGlb({ a: 1 }, new Uint8Array(0));
    eq(decodeGlb(glb).bin.byteLength, 0);
    let threw = false; try { decodeGlb(new Uint8Array(20)); } catch { threw = true; } assert(threw, "坏 magic");
    threw = false; try { decodeGlb(glb.subarray(0, glb.byteLength - 1)); } catch { threw = true; } assert(threw, "截断");
  });
});
