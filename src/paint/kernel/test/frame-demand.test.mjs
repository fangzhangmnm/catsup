// frame-demand（v0.10.8 夏音冷开案的结构性修复）：需求精算 + 两段式准入。
// 病史：withBg 段旧预检只数 allTiles（56）漏数成员驻留（688）→ 64 slot 冷池连环驱逐、
//   残缺段被缓存冻结；且旧时序先记段命中后 reserve，grow=recreate 使命中段全体作废却照用。
import { describe, it, assert, eq } from "./runner.mjs";
import { residentMissTiles, segCopyTiles, residentIds, admitWithRegrow } from "../src/backend/gl/frame-demand.ts";

// fake 叶：tiles = [{tx,ty,id}]（id = cpu tile 身份）。
const leaf = (tiles) => ({ forEachTileHandle(cb) { for (const t of tiles) cb(t.tx, t.ty, { id: t.id }); } });

describe("frame-demand · residentMissTiles", () => {
  it("只数 miss；命中（bridge 有活副本）不计", () => {
    const leaves = new Map([[1, leaf([{ tx: 0, ty: 0, id: 100 }, { tx: 1, ty: 0, id: 101 }])]]);
    const alive = new Set([100]);
    eq(residentMissTiles([1], (id) => leaves.get(id), (c) => alive.has(c)), 1, "100 命中、101 miss");
  });
  it("跨叶共享 cpuId 去重（clip 基底被多段共列不重复计）", () => {
    const shared = [{ tx: 0, ty: 0, id: 7 }];
    const leaves = new Map([[1, leaf(shared)], [2, leaf(shared)]]);
    eq(residentMissTiles([1, 2], (id) => leaves.get(id), () => false), 1, "同 cpuId 只计一次");
  });
  it("缺叶（空层无 pixels）安全跳过", () => {
    eq(residentMissTiles([9], () => undefined, () => false), 0);
  });
});

describe("frame-demand · segCopyTiles", () => {
  it("withBg = 全 doc 格（不透明底烤满画布）", () => {
    eq(segCopyTiles({ members: [1], withBg: true }, () => leaf([]), 56, 8), 56);
  });
  it("非 bg = 成员 tile 键并集（多层叠同格只拷一次）", () => {
    const leaves = new Map([
      [1, leaf([{ tx: 0, ty: 0, id: 1 }, { tx: 1, ty: 0, id: 2 }])],
      [2, leaf([{ tx: 1, ty: 0, id: 3 }, { tx: 2, ty: 0, id: 4 }])],   // (1,0) 与叶 1 重叠
    ]);
    eq(segCopyTiles({ members: [1, 2], withBg: false }, (id) => leaves.get(id), 56, 8), 3, "0,1,2 三格");
  });
});

describe("frame-demand · residentIds", () => {
  it("live ∪ 缺段成员", () => {
    const s = residentIds([1, 2], [{ members: [2, 3] }, { members: [4] }]);
    eq([...s].sort().join(","), "1,2,3,4");
  });
});

describe("frame-demand · admitWithRegrow（两段式准入）", () => {
  const mkPool = (opts) => {
    const p = {
      allocatedCount: opts.allocated ?? 0, generation: 0, reserveCalls: [],
      reserve(n) {
        this.reserveCalls.push(n);
        if (n <= opts.capacity) return true;
        if (n > opts.quota) return false;
        this.generation++;   // grow = recreate：全部现存 id 作废
        opts.capacity = n;
        this.allocatedCount = 0;
        return true;
      },
    };
    return p;
  };

  it("容量够（无 grow）：单次扫描单次 reserve", () => {
    const pool = mkPool({ capacity: 1024, quota: 1024 });
    let scans = 0;
    const { ok, missing } = admitWithRegrow(pool, () => { scans++; return ["a"]; }, () => 10);
    assert(ok, "admitted");
    eq(scans, 1); eq(pool.reserveCalls.length, 1); eq(missing.length, 1);
  });

  it("grow=recreate（generation 变）→ 必须重扫（死段进 missing）+ 重估重 reserve", () => {
    // 病史②的钉子：旧时序先记段命中后 reserve，recreate 后命中段的 IndexTexture 指着新纹理
    // 的空 slice 却照画。此处模拟：首扫 1 个缺段（其余「命中」），grow 后重扫全部 3 段皆缺。
    const pool = mkPool({ capacity: 64, quota: 1024 });
    let scans = 0;
    const { ok, missing } = admitWithRegrow(
      pool,
      () => { scans++; return scans === 1 ? ["s1"] : ["s1", "s2", "s3"]; },
      (ms) => ms.length * 100,
    );
    assert(ok, "admitted after regrow");
    eq(scans, 2, "generation 变了必须重扫");
    eq(missing.length, 3, "recreate 后死段全部进 missing");
    eq(pool.reserveCalls.length, 2, "重估后再 reserve 一次");
    eq(pool.reserveCalls[1], 300, "第二次按全量需求要（allocated 已归 0）");
  });

  it("超 quota → ok=false（调用方降级为 transient，逐段驻留照样渲对）", () => {
    const pool = mkPool({ capacity: 64, quota: 100 });
    const { ok } = admitWithRegrow(pool, () => ["s1"], () => 500);
    assert(!ok);
  });

  it("回归钉：夏音形态——withBg 段的需求必须计成员驻留，远大于 allTiles", () => {
    // 33 叶 688 tile 全在一个 withBg prefix 段里；旧预检只要 56 → 64 slot 池直接通过（病根①）。
    const tiles = []; for (let i = 0; i < 688; i++) tiles.push({ tx: i % 8, ty: (i / 8) | 0, id: i });
    const big = leaf(tiles);
    const members = [1];
    const demand = residentMissTiles(residentIds([], [{ members }]), () => big, () => false)
      + segCopyTiles({ members, withBg: true }, () => big, 56, 8);
    eq(demand, 688 + 56, "成员 688 + 拷贝目标 56");
    assert(demand > 64, "冷池 64 slot 必须触发 grow（旧预检 56 ≤ 64 静默放行=病根）");
  });
});
