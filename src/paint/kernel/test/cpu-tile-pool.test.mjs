// cpu-tile-pool：0.4 纪元底座（不可变 tile + 显式引用计数 + raw quota 阻塞压缩）。
// 这里钉死的是**契约**：UAF 必 throw、双 release 必 throw、压缩对读者透明、quota 宁卡不爆。
import { describe, it, assert, eq } from "./runner.mjs";
import { CpuTilePool, computeBBox, bytesPerTile } from "../src/backend/tiles/cpu-tile-pool.ts";

const eqJson = (a, b, msg) => eq(JSON.stringify(a), JSON.stringify(b), msg);

const TS = 16; // 测试用小 tile（tileSize 注入 ctor，正是为了这个）

function mkPool(opts = {}) {
  return new CpuTilePool({ tileSize: TS, rawQuotaBytes: 1 << 30, ...opts });
}
function rgbaBytes(fill = 0) {
  return new Uint8Array(bytesPerTile("rgba8", TS)).fill(fill);
}
// 假 codec：前 8 字节记原长，其后放原字节的一半采样——只为测记账/透明解压，不求真压缩。
// decompress 用「重复回填」保证长度还原（内容不保真也无妨：契约测试只看字节数与可读性）。
const fakeCodec = {
  name: "fake-half",
  compress(b) { const out = new Uint8Array(Math.ceil(b.byteLength / 2)); for (let i = 0; i < out.length; i++) out[i] = b[i * 2]; return out; },
  decompress(b, len) { const out = new Uint8Array(len); for (let i = 0; i < len; i++) out[i] = b[i >> 1]; return out; },
};
// 无损假 codec（恒等）：测「解压后内容 = 原内容」
const identityCodec = {
  name: "identity",
  compress(b) { return b.slice(); },
  decompress(b, len) { eq(b.byteLength, len, "identity codec 长度一致"); return b.slice(); },
};

describe("cpu-tile-pool · 句柄生命周期（红线）", () => {
  it("createTile 返回持有句柄；release 后任何读都 throw（UAF）", () => {
    const pool = mkPool();
    const h = pool.createTile("rgba8", rgbaBytes(255));
    eq(h.refCount(), 1);
    h.release();
    let threw = 0;
    for (const f of [() => h.bytes(), () => h.bbox(), () => h.refCount(), () => h.acquire()]) {
      try { f(); } catch { threw++; }
    }
    eq(threw, 4, "已释放句柄的所有读口都必须 throw");
  });

  it("双 release throw", () => {
    const pool = mkPool();
    const h = pool.createTile("gray8", new Uint8Array(TS * TS));
    h.release();
    let threw = false;
    try { h.release(); } catch { threw = true; }
    assert(threw, "双 release 必须 throw");
  });

  it("acquire 返回新句柄（per-owner）；各自 release，最后一个释放才回收", () => {
    const pool = mkPool();
    const h1 = pool.createTile("rgba8", rgbaBytes(1));
    const h2 = h1.acquire();
    assert(h1 !== h2, "acquire 是新句柄对象");
    eq(h1.refCount(), 2);
    h1.release();
    eq(pool.stats().count, 1, "还有 h2 持有，tile 活着");
    eq(h2.refCount(), 1);
    h2.release();
    eq(pool.stats().count, 0, "全放光 → tile 回收");
    eq(pool.stats().rawBytes, 0, "字节记账归零");
  });

  it("同一 tile 的两个句柄：一个 release 后自己死，另一个照常可读", () => {
    const pool = mkPool();
    const h1 = pool.createTile("rgba8", rgbaBytes(9));
    const h2 = h1.acquire();
    h1.release();
    eq(h2.bytes()[0], 9, "幸存句柄读取正常");
    h2.release();
  });
});

describe("cpu-tile-pool · allocate/seal/abort（readPixels 零拷贝目标）", () => {
  it("allocate → 填 buffer → seal 得到句柄，内容就是填进去的", () => {
    const pool = mkPool();
    const a = pool.allocate("gray8");
    a.buffer.fill(7);
    const h = a.seal();
    eq(h.bytes()[TS * TS - 1], 7);
    eq(pool.stats().count, 1);
    h.release();
  });

  it("abort 不产生 tile；seal/abort 只许一次", () => {
    const pool = mkPool();
    const a = pool.allocate("rgba8");
    a.abort();
    eq(pool.stats().count, 0);
    let threw = false;
    try { a.seal(); } catch { threw = true; }
    assert(threw, "abort 后再 seal 必须 throw");
  });
});

describe("cpu-tile-pool · bbox（三格式）", () => {
  it("rgba8：只看 alpha 通道", () => {
    const b = rgbaBytes(0);
    // (3,2) 与 (5,4) 两个不透明像素 → bbox {3,2,3,3}
    b[(2 * TS + 3) * 4 + 3] = 255;
    b[(4 * TS + 5) * 4 + 0] = 255; // 纯 R 无 alpha，不算内容
    b[(4 * TS + 5) * 4 + 3] = 1;
    eqJson(computeBBox("rgba8", b, TS), { x: 3, y: 2, w: 3, h: 3 });
  });

  it("gray8：非零即内容；全零 → null", () => {
    const b = new Uint8Array(TS * TS);
    eqJson(computeBBox("gray8", b, TS), null);
    b[0] = 1; b[TS * TS - 1] = 1;
    eqJson(computeBBox("gray8", b, TS), { x: 0, y: 0, w: TS, h: TS });
  });

  it("bit1：按位；单个 bit 的 bbox 是 1×1", () => {
    const b = new Uint8Array(bytesPerTile("bit1", TS));
    b[1 * (TS >> 3) + 0] = 0b00010000; // y=1, x=3
    eqJson(computeBBox("bit1", b, TS), { x: 3, y: 1, w: 1, h: 1 });
  });
});

describe("cpu-tile-pool · 压缩与 quota", () => {
  it("compactAll 后 rawBytes 归零、compressed 记账；bytes() 透明解压且内容无损（identity codec）", () => {
    const pool = mkPool({ codec: identityCodec });
    const src = rgbaBytes(0); src[42] = 123; src[43] = 7;
    const h = pool.createTile("rgba8", src.slice());
    pool.compactAll();
    eq(pool.stats().rawBytes, 0, "raw 全丢");
    assert(pool.stats().compressedBytes > 0, "压缩形态记账");
    assert(h.isCompressed(), "句柄看得到压缩态");
    const back = h.bytes();               // 透明解压
    eq(back[42], 123); eq(back[43], 7);
    assert(!h.isCompressed(), "解压回填后不再是纯压缩态");
    assert(pool.stats().rawBytes > 0, "回填计入 raw");
    h.release();
    eq(pool.stats().compressedBytes, 0, "释放后压缩字节也归零");
  });

  it("raw 超 quota → createTile 阻塞式压缩最古老（宁卡不爆）", () => {
    const one = bytesPerTile("rgba8", TS);
    const pool = mkPool({ codec: fakeCodec, rawQuotaBytes: one * 2 }); // 只容 2 张 raw
    const h1 = pool.createTile("rgba8", rgbaBytes(1));
    const h2 = pool.createTile("rgba8", rgbaBytes(2));
    eq(pool.stats().rawBytes, one * 2);
    const h3 = pool.createTile("rgba8", rgbaBytes(3)); // 超额 → 最老的 h1 被压
    assert(h1.isCompressed(), "最古老先压");
    assert(!h3.isCompressed(), "新 tile 不动");
    assert(pool.stats().rawBytes <= one * 2, "回到 quota 内");
    h1.release(); h2.release(); h3.release();
  });

  it("无 codec：quota 不 enforcement（S3 接 codec 前的过渡语义）", () => {
    const pool = mkPool({ rawQuotaBytes: 1 });
    const h = pool.createTile("gray8", new Uint8Array(TS * TS));
    assert(!h.isCompressed());
    h.release();
  });

  it("compactOldest 预算耗尽返回 more，有 codec 且干完返回 done", () => {
    const pool = mkPool({ codec: fakeCodec });
    const h1 = pool.createTile("gray8", new Uint8Array(TS * TS));
    const h2 = pool.createTile("gray8", new Uint8Array(TS * TS));
    eq(pool.compactOldest(-1), "more", "负预算 = 立刻超时，还有活");
    eq(pool.compactOldest(10_000), "done");
    assert(h1.isCompressed() && h2.isCompressed());
    h1.release(); h2.release();
  });
});

describe("cpu-tile-pool · clearAll（开新文档/reload）", () => {
  it("清池后存活句柄全部失效（读即 throw），记账归零", () => {
    const pool = mkPool();
    const h = pool.createTile("rgba8", rgbaBytes(5));
    pool.clearAll();
    eq(pool.stats().count, 0);
    eq(pool.stats().rawBytes, 0);
    let threw = false;
    try { h.bytes(); } catch { threw = true; }
    assert(threw, "清池后旧句柄必须 throw");
    h.release(); // 迟到 release 不 throw（tile 已 freed，静默无事）
  });

  it("createTile 长度校验：错长直接 throw", () => {
    const pool = mkPool();
    let threw = false;
    try { pool.createTile("rgba8", new Uint8Array(3)); } catch { threw = true; }
    assert(threw);
  });
});
