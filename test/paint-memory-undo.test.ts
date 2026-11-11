// 画的内存额度（贴图主线 0-3a）之二：压缩之后撤销逐字节对；歇着的画板被压下去、撤回来画还在（和 paint-memory.test.ts 拆开跑）。created 2026-11-11 by Claude Opus 5.5
// ① 空闲表（照画画仓 background-sync-jobs）：没停够 1 秒不动；停 1 / 5 / 30 秒给 5 / 15 / 50 毫秒；有输入 = 归零；切后台 = 全压。
// ② 压缩之后画的记录有了真大小：连画很多笔，额度把最老的画的步挤掉、内核那边跟着放（活着的步数 = 栈里的记录数），能撤的笔数不再跟着笔数涨。
// ③ 压缩之后一路撤到头、再一路重做回来：每一步像素逐字节对。④ 歇着的画板被空闲压缩压下去；撤回删物件之前，画逐字节还在（解压是透明的）。
// 编码器在这个进程里装上就不卸（装上之后压过的图块只有它能解；别的测试读到压过的图块照样能读）。每条最后扔光画板，图块池回到开始之前 = 没漏（引用计数的账）。
// 架子在 paint-undo-kit.ts；每笔之后 prepare（app 里每帧都合成：内核的显卡图块是缓存，合成那一帧才清没人用的）。
import { describe, it, eq, assert } from "./runner.mjs";
import type { Op } from "../src/editor/ops.ts";
import { appTilePool, setTilePoolCodec } from "../src/paint/kernel/src/backend/tiles/app-tile-pool.ts";
import { deflateTileCodec } from "../src/paint/kernel/src/backend/tiles/cpu-tile-compression.ts";
import { TileJobs } from "../src/paint/tile-jobs.ts";
import { rig, rng } from "./paint-undo-kit.ts";

const pool = appTilePool();
const tiles = (): number => pool.stats().count;
const line = (shot: string, tex: string): string | undefined => shot.split("\n").find((l) => l.startsWith(tex.slice(0, 4)));

describe("压缩之后撤销逐字节对（0-3a）", () => {
  setTilePoolCodec(deflateTileCodec);
  it("画 / 擦 12 笔，中途和最后都全压：一路撤到头每一步逐字节对，再一路重做回来", () => {
    const t0 = tiles(), r = rig(2), rnd = rng(31), texs = r.defs.map((d) => r.startPaint(d, 60));
    for (const t of texs) r.boards.ensure(r.cur(), t);   // 先建好画板（不然「还没有画板」和「空白画板」在快照里是两样）
    const states = [r.shot()];
    for (let i = 0; i < 12; i++) {
      const n0 = r.h.steps();
      r.stroke([texs[i % 2]], rnd, i % 4 === 3); r.boards.prepare(r.cur());
      if (i % 3 === 2) pool.compactAll();
      if (r.h.steps() === n0) continue;   // 在空白处擦：什么都没改、不长一步
      states.push(r.shot());
    }
    assert(states.length >= 9, `大多数笔都长了一步（${states.length - 1}）`);
    pool.compactAll();
    for (let i = states.length - 1; i > 0; i--) { r.undo(); r.boards.prepare(r.cur()); if (i % 2) pool.compactAll(); eq(r.shot(), states[i - 1], `撤到第 ${i - 1} 步`); }
    for (let i = 1; i < states.length; i++) { r.redo(); r.boards.prepare(r.cur()); eq(r.shot(), states[i], `重做到第 ${i} 步`); }
    r.boards.disposeAll();
    eq(tiles(), t0, "扔光之后图块池回到开始之前");
  });
  it("歇着的画板被空闲压缩压下去；撤回删物件之前，画逐字节还在", () => {
    const t0 = tiles(), r = rig(2), rnd = rng(41), [ta, tb] = r.defs.map((d) => r.startPaint(d, 60)), [da] = r.defs;
    for (let i = 0; i < 6; i++) { r.stroke([ta], rnd); r.stroke([tb], rnd); r.boards.prepare(r.cur()); }
    const painted = line(r.shot(), ta);
    const root = r.cur().root, inst = [...r.cur().def(root).instances.values()].find((x) => x.def === da)!;
    r.commit({ op: "eraseInstance", def: root, instance: inst.id } as Op); r.commit({ op: "purgeDefs", defs: [da] } as Op, true);
    let clock = 0;
    const jobs = new TileJobs(pool, () => clock);
    clock = 60_000;   // 停了一分钟：每次给 50 毫秒
    let res = jobs.tick();
    for (let i = 0; i < 50 && res === "more"; i++) res = jobs.tick();
    eq(res, "done", "压完了");
    const b = r.boards.get(ta)!, lp = (b.wp.layerTiles as unknown as { tilesetPixels(ref: number): { handles(): { isCompressed(): boolean }[] } }).tilesetPixels((b.wp.layerTree!.view().nodes[0] as { pixelsRef: number }).pixelsRef);
    const hs = [...lp.handles()];
    assert(hs.length > 0 && hs.every((h) => h.isCompressed()), `歇着的 A 的图块全压了（${hs.filter((h) => h.isCompressed()).length}/${hs.length}）`);
    r.undo(); r.boards.prepare(r.cur());
    assert(r.cur().defs.has(da), "撤回来了");
    eq(line(r.shot(), ta), painted, "A 的画逐字节还在");
    r.boards.disposeAll();
    eq(tiles(), t0, "扔光之后图块池回到开始之前");
  });
});
