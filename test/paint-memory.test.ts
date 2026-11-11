// 画的内存额度（贴图主线 0-3a，统筹 11-11）：图块池接上压缩、三维撤销栈对「画」现问字节。created 2026-11-11 by Claude Opus 5.5
// ① 空闲表（照画画仓 background-sync-jobs）：没停够 1 秒不动；停 1 / 5 / 30 秒给 5 / 15 / 50 毫秒；有输入 = 归零；切后台 = 全压。
// ② 压缩之后画的记录有了真大小：连画很多笔，额度把最老的画的步挤掉、内核那边跟着放（活着的步数 = 栈里的记录数），能撤的笔数不再跟着笔数涨。
// ③ ④（压缩之后撤销逐字节对、歇着的画板被压下去）在 paint-memory-undo.test.ts（拆开跑）。
// 编码器在这个进程里装上就不卸（装上之后压过的图块只有它能解；别的测试读到压过的图块照样能读）。每条最后扔光画板，图块池回到开始之前 = 没漏（引用计数的账）。
// 架子在 paint-undo-kit.ts；每笔之后 prepare（app 里每帧都合成：内核的显卡图块是缓存，合成那一帧才清没人用的）。
import { describe, it, eq, assert } from "./runner.mjs";
import { appTilePool, setTilePoolCodec } from "../src/paint/kernel/src/backend/tiles/app-tile-pool.ts";
import { deflateTileCodec } from "../src/paint/kernel/src/backend/tiles/cpu-tile-compression.ts";
import { TileJobs, TileJobsDriver, IDLE_QUOTA_TABLE, type TileJobsEnv } from "../src/paint/tile-jobs.ts";
import { rig, rng } from "./paint-undo-kit.ts";

const pool = appTilePool();
const tiles = (): number => pool.stats().count;

describe("空闲时压缩的表（0-3a）", () => {
  it("没停够 1 秒不动；停 1 / 5 / 30 秒给 5 / 15 / 50 毫秒；有输入归零；切后台全压", () => {
    let t = 0;
    const calls: string[] = [];
    const jobs = new TileJobs({ compactOldest: (ms) => { calls.push(`oldest ${ms}`); return "done"; }, compactAll: () => { calls.push("all"); } }, () => t);
    t = 999; eq(jobs.tick(), "busy", "没停够");
    t = 1000; jobs.tick(); t = 5000; jobs.tick(); t = 30_000; jobs.tick();
    eq(calls.join(","), "oldest 5,oldest 15,oldest 50");
    jobs.noteInput(); t = 30_500; eq(jobs.tick(), "busy", "有输入：空闲时钟归零");
    jobs.hidden(); eq(calls[calls.length - 1], "all", "切后台全压");
    eq(IDLE_QUOTA_TABLE.map((r) => `${r.afterIdleMs}:${r.quotaMs}`).join(","), "1000:5,5000:15,30000:50", "和画画仓 background-sync-jobs 同一张表");
  });
});

describe("空闲压缩只在有画板时跑（0-3a 统筹审查）", () => {
  /** 假的定时器和监听：数挂着几个。 */
  const fakeEnv = () => { const live = { every: 0, input: 0, hidden: 0 }; const env: TileJobsEnv = { every: () => { live.every++; return () => { live.every--; }; }, onInput: () => { live.input++; return () => { live.input--; }; }, onHidden: () => { live.hidden++; return () => { live.hidden--; }; } }; return { live, env }; };
  it("没建过画板：定时器没起；建了一块：起了（再建一块不多起）；换文件全扔：停了；再建：再起", () => {
    const { live, env } = fakeEnv(), driver = new TileJobsDriver(new TileJobs({ compactOldest: () => "done", compactAll: () => {} }), env, () => {});
    let ep = 0;
    const r = rig(2, { epoch: () => ep, active: (on) => driver.setActive(on) }), rnd = rng(51), texs = r.defs.map((d) => r.startPaint(d, 20));
    r.boards.prepare(r.cur());
    eq(JSON.stringify(live), JSON.stringify({ every: 0, input: 0, hidden: 0 }), "没建过画板：什么都没挂");
    r.stroke([texs[0]], rnd);
    eq(JSON.stringify(live), JSON.stringify({ every: 1, input: 1, hidden: 1 }), "建了一块：定时器、输入、切后台各挂一个");
    r.stroke([texs[1]], rnd);
    eq(live.every, 1, "再建一块：不多起");
    ep = 1; r.boards.sync(r.cur());
    eq(JSON.stringify(live), JSON.stringify({ every: 0, input: 0, hidden: 0 }), "换文件全扔：全撤了");
    r.stroke([texs[0]], rnd);
    eq(live.every, 1, "再建：再起");
    r.boards.disposeAll(); eq(live.every, 0);
  });
});

describe("压缩之后画的记录有真大小（0-3a）", () => {
  setTilePoolCodec(deflateTileCodec);
  it("连画 36 笔、每笔之后全压：额度挤掉最老的画的步，内核那边跟着放；能撤的笔数到顶之后不再跟着笔数涨", () => {
    const t0 = tiles(), r = rig(1, { quota: 6_000 }), rnd = rng(21), [ta] = r.defs.map((d) => r.startPaint(d, 20));
    const kept: number[] = [];
    for (let i = 1; i <= 36; i++) {
      r.stroke([ta], rnd); if (i % 6 === 0) r.boards.prepare(r.cur()); pool.compactAll();   // 隔几笔合成一次就够清显卡那边的缓存（每笔都合成太慢）
      if (i % 12 === 0) kept.push(r.paintRecords(ta));
    }
    assert(r.h.evictedCount() > 0, `额度挤掉过（驱逐线 ${r.h.evictedCount()}）`);
    eq(r.live(ta), r.paintRecords(ta), "内核活着的步数 = 栈里的记录数");
    assert(kept[2] < 36 && kept[2] <= kept[1] + 3, `能撤的笔数到顶就不再涨（画得越满、压缩后越大，能撤的会少一点）：第 12 / 24 / 36 笔时 ${kept.join(" / ")}`);
    r.boards.disposeAll();
    eq(tiles(), t0, "扔光之后图块池回到开始之前");
  });
  it("没接压缩时（编码器在，但一次没压）画的记录照旧只算约 64 字节：额度挤不掉（这就是 0-3a 要接压缩的原因）", () => {
    const r = rig(1, { quota: 40_000 }), rnd = rng(22), [ta] = r.defs.map((d) => r.startPaint(d, 20));
    const u0 = r.h.usageBytes();
    for (let i = 0; i < 10; i++) { r.stroke([ta], rnd); r.boards.prepare(r.cur()); }
    assert(r.h.usageBytes() - u0 <= 10 * 64 + 64, `十笔只加了 ${r.h.usageBytes() - u0} 字节（没压缩的图块归图块池自己的额度）`);
    pool.compactAll();
    assert(r.h.usageBytes() - u0 > 10 * 64 + 64, `全压之后现问：${r.h.usageBytes() - u0} 字节`);
    r.boards.disposeAll();
  });
});
