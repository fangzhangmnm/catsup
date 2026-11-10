// gpu-tile-pool 纯记账测试（fake backend；spec :160-177 的契约逐条压 + leaky-GPU 对抗模拟，
//   test-charter (c) gpu-tile-pool 维度）。真像素 round-trip 归 smoke。
import { describe, it, assert } from "./runner.mjs";

// 按 message 正则断言同步抛错（runner 的 throwsStatus 走 e.status，这里的池错误走 message 前缀）。
function throwsMsg(fn, re, msg) {
  try { fn(); } catch (e) { assert(re.test(e.message), `${msg}：抛的是 ${e.message}`); return; }
  throw new Error(`${msg}：应当抛错但没抛`);
}
import { GpuTilePool, GPU_TILE_BYTES } from "../src/backend/gl/gpu-tile-pool.ts";

// fake backend：内存模拟 slices（可选记录调用；容量可被 recreate 改）。
function fakeBackend(capacity = 8) {
  const be = {
    capacity,
    recreated: [],           // 每次 recreate 的新容量
    uploads: [],             // [slice, firstByte]
    copies: [],              // [slice, srcX, srcY]
    recreate(n) { be.capacity = n; be.recreated.push(n); },
    uploadSlice(s, px) { be.uploads.push([s, px[0]]); },
    copySlice(from, s, x, y, w, h) { be.copies.push([s, x, y, w, h]); },
  };
  return be;
}
const bytes = (v) => ({ bytes: new Uint8Array(GPU_TILE_BYTES).fill(v) });

describe("gpu-tile-pool · 分配/批次/句柄失效", () => {
  it("batch 分配：id 单调不复用；uploadBatch 落 backend", () => {
    const be = fakeBackend(8);
    const pool = new GpuTilePool(be, 8);
    const a = pool.uploadBatch([bytes(1), bytes(2)]);
    const b = pool.uploadBatch([bytes(3)]);
    assert(a.length === 2 && b.length === 1, "批量返 id");
    assert(new Set([...a, ...b]).size === 3, "id 全不同");
    assert(b[0] > a[1], "单调");
    assert(be.uploads.length === 3, "3 次上传");
  });

  it("evict 后 id 死：isAlive=false、slotOf 立刻 throw（spec:163 红线）", () => {
    const pool = new GpuTilePool(fakeBackend(8), 8);
    const [id] = pool.uploadBatch([bytes(9)]);
    assert(pool.isAlive(id), "活");
    const slice = pool.slotOf(id);
    assert(slice >= 0, "有 slice");
    pool.evict(id);
    assert(!pool.isAlive(id), "死");
    throwsMsg(() => pool.slotOf(id), /GPU_TILE_DEAD/, "死 id slotOf 必 throw");
    pool.evict(id);   // 幂等不炸
  });

  it("evict 释放的 slice 会被复用，但 id 永不复用", () => {
    const pool = new GpuTilePool(fakeBackend(2), 2);
    const [a] = pool.uploadBatch([bytes(1)]);
    const sliceA = pool.slotOf(a);
    pool.evict(a);
    const [b] = pool.uploadBatch([bytes(2)]);
    assert(pool.slotOf(b) === sliceA, "slice 复用");
    assert(b !== a, "id 不复用");
  });
});

describe("gpu-tile-pool · reserve/grow（spec:170/175）", () => {
  it("容量内 reserve 无操作；超容量在 quota 内翻倍 grow，全部现存 id 作废", () => {
    const be = fakeBackend(4);
    const pool = new GpuTilePool(be, 32);
    const ids = pool.uploadBatch([bytes(1), bytes(2)]);
    const gen0 = pool.generation;
    assert(pool.reserve(4) === true && be.recreated.length === 0, "容量内不动");
    assert(pool.reserve(9) === true, "grow 达标");
    assert(be.capacity === 16, "4→8→16 翻倍到 ≥9");
    assert(pool.generation === gen0 + 1, "代 +1");
    assert(!pool.isAlive(ids[0]) && !pool.isAlive(ids[1]), "grow 后全部 id 作废（CPU SSoT 自愈）");
  });

  it("超 quota → false，不 grow", () => {
    const be = fakeBackend(4);
    const pool = new GpuTilePool(be, 8);
    assert(pool.reserve(9) === false, "quota 顶不动");
    assert(be.capacity === 4, "容量未变");
  });

  it("clearAll = 同容量 recreate（context-loss/开新文档）", () => {
    const be = fakeBackend(4);
    const pool = new GpuTilePool(be, 8);
    const [id] = pool.uploadBatch([bytes(1)]);
    pool.clearAll();
    assert(!pool.isAlive(id), "全作废");
    assert(be.capacity === 4 && be.recreated.length === 1, "同容量重建");
    assert(pool.uploadBatch([bytes(2)]).length === 1, "重建后可分配");
  });
});

describe("gpu-tile-pool · pin 两档 + 驱逐次序（spec:171-174）", () => {
  it("frameMaintain evict 两档都不在的孤儿；required/preferred 留", () => {
    const pool = new GpuTilePool(fakeBackend(8), 8);
    const [req, pref, orphan] = pool.uploadBatch([bytes(1), bytes(2), bytes(3)]);
    pool.registerPinProvider(() => ({ required: new Set([req]), preferred: new Set([pref]) }));
    pool.uploadBatch([]);        // 开新批 → 上一批保护解除
    pool.frameMaintain();
    assert(pool.isAlive(req) && pool.isAlive(pref), "两档 pin 都留");
    assert(!pool.isAlive(orphan), "孤儿被清");
  });

  it("上一批在下次 allocBatch 前免驱逐（spec:169 批次保护）", () => {
    const pool = new GpuTilePool(fakeBackend(8), 8);
    const ids = pool.uploadBatch([bytes(1), bytes(2)]);   // 无 pin provider → 全是「孤儿」
    pool.frameMaintain();
    assert(pool.isAlive(ids[0]) && pool.isAlive(ids[1]), "刚分配的批不被 frameMaintain 清");
    pool.uploadBatch([bytes(3)]);                          // 下一批开始 → 保护移交
    pool.frameMaintain();
    assert(!pool.isAlive(ids[0]) && !pool.isAlive(ids[1]), "老批失去保护后按孤儿清");
  });

  it("满池压力：先扔孤儿、再扔 preferred（LRU），required 绝不动；还不够 → GPU_POOL_EXHAUSTED", () => {
    const pool = new GpuTilePool(fakeBackend(4), 4);      // quota=容量：不 grow
    const pins = { required: new Set(), preferred: new Set() };
    pool.registerPinProvider(() => ({ required: new Set(pins.required), preferred: new Set(pins.preferred) }));
    const [req, pref1, pref2, orphan] = pool.uploadBatch([bytes(1), bytes(2), bytes(3), bytes(4)]);
    pins.required.add(req); pins.preferred.add(pref1); pins.preferred.add(pref2);
    pool.frameMaintain();                                 // 帧号 +1（首批受批次保护不被清）
    pool.slotOf(pref2);                                   // touch：pref2 最近用 → pref1 更老
    const [n1] = pool.uploadBatch([bytes(5)]);            // 需 1：孤儿先走
    assert(!pool.isAlive(orphan), "孤儿被压力驱逐");
    assert(pool.isAlive(pref1) && pool.isAlive(pref2), "preferred 还在（孤儿够用）");
    pins.required.add(n1);                                // n1 也 pin 住（否则它就是下一个孤儿）
    const [n2] = pool.uploadBatch([bytes(6)]);            // 需 1：无孤儿 → preferred 按 LRU
    assert(!pool.isAlive(pref1), "LRU 更老的 pref1 被驱逐");
    assert(pool.isAlive(pref2), "较新的 pref2 保留");
    assert(pool.isAlive(req) && pool.isAlive(n1), "required 永不驱逐");
    pins.required.add(n2); pins.required.add(pref2); pins.preferred.clear();
    // 4 slots 全 required → 再要 1 无处腾 → 抛
    throwsMsg(() => pool.allocBatch(1), /GPU_POOL_EXHAUSTED/, "全 required 塞不下 → 抛");
  });
});

describe("gpu-tile-pool · leaky-GPU 对抗模拟（spec:163-164；使用者必须自愈）", () => {
  it("对抗式随机 evict 下，「isAlive 校验→死了重传」的使用者收敛到全活；直接用死 id 必炸", () => {
    const pool = new GpuTilePool(fakeBackend(64), 64);
    // 使用者：维护 16 个逻辑 tile 的 gpu 映射
    const logical = new Map();   // k → gpuId
    const syncAll = () => {
      const missing = [];
      for (let k = 0; k < 16; k++) if (!logical.has(k) || !pool.isAlive(logical.get(k))) missing.push(k);
      const ids = pool.uploadBatch(missing.map((k) => bytes(k)));
      missing.forEach((k, i) => logical.set(k, ids[i]));
    };
    // 确定性伪随机（Date/Math.random 禁用区）
    let seed = 42;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let round = 0; round < 50; round++) {
      syncAll();
      // 对抗者：随机 evict 0..4 个活 tile
      const alive = [...logical.values()].filter((id) => pool.isAlive(id));
      for (let i = rnd(5); i > 0 && alive.length; i--) pool.evict(alive[rnd(alive.length)]);
    }
    syncAll();
    for (const [k, id] of logical) { assert(pool.isAlive(id), `k${k} 自愈后活`); pool.slotOf(id); }
    // 不校验直接用死 id = bug，必须炸（不静默渲染垃圾）
    const victim = logical.get(0);
    pool.evict(victim);
    throwsMsg(() => pool.slotOf(victim), /GPU_TILE_DEAD/, "UAF 必 throw");
  });
});
