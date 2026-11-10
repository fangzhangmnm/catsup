// cpu-gpu-tile-bridge 测试（spec :178-186）：身份去重跳传/批量/purgeDead/惰性 bytes；
//   sliceRegionToTiles 纯函数（大 FBO readback → 对齐 doc 网格切片，S8 brush commit 的消费口）。
import { describe, it, assert } from "./runner.mjs";
import { GpuTilePool, GPU_TILE_BYTES } from "../src/backend/gl/gpu-tile-pool.ts";
import { CpuGpuTileBridge, sliceRegionToTiles } from "../src/backend/gl/tile-bridge.ts";

function fakeBackend(capacity = 32) {
  const be = {
    capacity, uploads: 0,
    recreate(n) { be.capacity = n; },
    uploadSlice() { be.uploads++; },
    copySlice() {},
  };
  return be;
}
const entry = (cpuId, v = cpuId, touched = null) => ({
  cpuId,
  bytes: () => { touched?.push(cpuId); return new Uint8Array(GPU_TILE_BYTES).fill(v & 0xff); },
});

describe("tile-bridge · 身份去重（tile 只读 → id 相同=内容相同）", () => {
  it("首传 miss 上传；再问同 cpuId 命中零上传、零 bytes 物化（压缩驻留不解压）", () => {
    const be = fakeBackend();
    const bridge = new CpuGpuTileBridge(new GpuTilePool(be, 32));
    const touched = [];
    const [g1, g2] = bridge.ensureUploaded([entry(101, 1, touched), entry(102, 2, touched)]);
    assert(be.uploads === 2 && touched.length === 2, "首传两块");
    const [h1, h2] = bridge.ensureUploaded([entry(101, 1, touched), entry(102, 2, touched)]);
    assert(h1 === g1 && h2 === g2, "命中同 gpu id");
    assert(be.uploads === 2, "零重复上传");
    assert(touched.length === 2, "命中时 bytes 回调不被调（惰性）");
  });

  it("gpu 副本被 evict → 下次 ensureUploaded 自愈重传（新 gpu id）", () => {
    const pool = new GpuTilePool(fakeBackend(), 32);
    const bridge = new CpuGpuTileBridge(pool);
    const [g1] = bridge.ensureUploaded([entry(7)]);
    pool.evict(g1);
    const [g2] = bridge.ensureUploaded([entry(7)]);
    assert(g2 !== g1 && pool.isAlive(g2), "死副本自愈成新 id");
  });

  it("混合批：命中的复用、miss 的成一批上传，返回序与入参对齐", () => {
    const be = fakeBackend();
    const bridge = new CpuGpuTileBridge(new GpuTilePool(be, 32));
    const [a] = bridge.ensureUploaded([entry(1)]);
    const out = bridge.ensureUploaded([entry(2), entry(1), entry(3)]);
    assert(out[1] === a, "中间那个命中复用");
    assert(out[0] !== out[2] && out[0] !== a, "两个新的各有 id");
    assert(be.uploads === 3, "总上传 3（1+2）");
  });

  it("purgeDead：cpu 侧死或 gpu 侧死的条目都被清；registerPair 登记 FBO 造的对", () => {
    const pool = new GpuTilePool(fakeBackend(), 32);
    const bridge = new CpuGpuTileBridge(pool);
    const [g1] = bridge.ensureUploaded([entry(11)]);
    const [g2] = bridge.ensureUploaded([entry(12)]);
    const [g3] = pool.uploadBatch([{ bytes: new Uint8Array(GPU_TILE_BYTES) }]);
    bridge.registerPair(13, g3);
    assert(bridge.size === 3, "3 条映射");
    pool.evict(g2);                                  // gpu 死
    bridge.purgeDead((cpuId) => cpuId !== 11);       // cpu 11 死
    assert(bridge.size === 1, "只剩 (13,g3)");
    const [g1b] = bridge.ensureUploaded([entry(11)]);
    assert(g1b !== g1, "清掉后按新 tile 走");
  });
});

describe("tile-bridge · sliceRegionToTiles（大 FBO bbox 一次读 → 网格切片）", () => {
  const DOC = 1024;   // 4×4 tiles

  it("跨 tile 边界区域：覆盖 tile 集合正确、区域外补透明、像素落位正确", () => {
    // 区域 (250,250) 起 20×20 → 跨 (0,0)(1,0)(0,1)(1,1) 四 tile
    const w = 20, h = 20;
    const px = new Uint8Array(w * h * 4);
    // 区域内涂 (r=200)；(6,6)（doc 256,256 = tile(1,1) 的 (0,0)）标记 250
    px.fill(200);
    const mark = ((256 - 250) * w + (256 - 250)) * 4;
    px[mark] = 250;
    const tiles = sliceRegionToTiles(px, 250, 250, w, h, DOC, DOC);
    const keys = tiles.map((t) => `${t.tx},${t.ty}`).sort();
    assert(keys.join(" ") === "0,0 0,1 1,0 1,1", `四 tile，实得 ${keys}`);
    const t11 = tiles.find((t) => t.tx === 1 && t.ty === 1);
    assert(t11.bytes[0] === 250, "tile(1,1) 局部 (0,0) = doc(256,256) 的标记值");
    assert(t11.bytes[(20 * 256 + 20) * 4] === 0, "区域外（tile 内 (20,20)）透明 0");
    const t00 = tiles.find((t) => t.tx === 0 && t.ty === 0);
    assert(t00.bytes[(255 * 256 + 255) * 4] === 200, "tile(0,0) 右下角 = doc(255,255) 在区域内");
    assert(t00.bytes[0] === 0, "tile(0,0) 左上远离区域 → 透明");
  });

  it("空/越界区域 → 空数组", () => {
    assert(sliceRegionToTiles(new Uint8Array(0), 0, 0, 0, 10, DOC, DOC).length === 0, "w=0");
    assert(sliceRegionToTiles(new Uint8Array(400), -200, -200, 10, 10, DOC, DOC).length === 0, "整体在外");
  });
});
