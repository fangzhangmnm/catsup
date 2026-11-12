// 只醒着正在编辑的物件（施工单十九第 3 刀；内核 v0.14.85 的合用图块池 + 画板睡和醒）。created 2026-11-12 by Claude Opus 5.5
// 睡 = 显卡那一半还回去，内存那一半（图块、图层树、步）不碰；睡着的画板显示的是渲染器自己那份拷贝。四条不丢东西（提案 ai-docs/20261112-kernel-shared-pool-and-sleep-proposal.md 第四节）：
//   存盘（睡着的脏画板：同步叫醒、合、读回、睡回去）· 崩溃快照（睡之前钉进缓存，快照不旧）· 撤销（跨几块睡着的画板连撤十步、再重做回来）· 显示（睡着时 current() 空、渲染器说要就合一次）。
// 另：只醒着正在编辑的、一笔开着不睡、换文件池退干净。结构守卫（读源码）在 paint-board-sleep-guard.test.ts。画布按密度 4 开（约 256 × 64）：软件显卡合成一次的花销跟画布大小走。
import { describe, it, eq, assert } from "./runner.mjs";
import "./paint-save-kit.ts";
import { dataPrint, decodeOra, decodePng } from "./paint-save-kit.ts";
import { rig, rng, hash } from "./paint-undo-kit.ts";
import { PaintSaver } from "../src/paint/save.ts";
import { documentFromScene } from "../src/format/index.ts";
import type { LiveImage } from "../src/minccino/contract/stream.ts";
import type { PaintBoards } from "../src/paint/boards.ts";

type R = ReturnType<typeof rig>;
/** 一帧：工作台说正在编辑哪几张 → 准备。 */
const frame = (r: R, editing: string[] = []): void => { r.boards.setEditing(editing); r.boards.prepare(r.cur()); };
const live = (b: PaintBoards, tex: string): LiveImage => b.board(tex)!.image as LiveImage;
/** 现在交给渲染器的那张（软件显卡：gpuImage 就是合成目标）读回来；没交 = null。 */
const shown = (r: R, tex: string): Uint8Array | null => { const c = live(r.boards, tex).current(); if (!c) return null; const b = r.boards.get(tex)!; return r.port.readPixels(c.gpuImage as never, 0, 0, b.width, b.height); };
/** 三个物件各开一张画、各画一笔。 */
function three(): { r: R; t: string[]; rnd: () => number } {
  const r = rig(3), rnd = rng(7), t = r.defs.map((d) => r.startPaint(d, 4));
  for (const g of t) r.stroke([g], rnd);
  return { r, t, rnd };
}
/** 合成读回的字节（Uint8ClampedArray）的哈希。 */
const hc = (u: Uint8ClampedArray | null): string => (u ? hash(new Uint8Array(u.buffer, u.byteOffset, u.byteLength)) : "null");
const same = (a: ArrayLike<number> | null, b: ArrayLike<number> | null): boolean => !!a && !!b && a.length === b.length && Array.prototype.every.call(a, (v: number, i: number) => v === b[i]);

describe("只醒着正在编辑的物件（施工单十九第 3 刀）", () => {
  it("三块画板合用一个池；都不在编辑 = 交出去的那一帧之后睡下；只编辑一块 = 只有它醒着；池里的使用者跟着变", () => {
    const { r, t } = three();
    frame(r);   // 第一帧：都合成交出去（渲染器这一帧拷），不睡
    let st = r.boards.gpuStats();
    eq([st.awake, st.asleep].join(), "3,0", "交出新版本的那一帧不睡（渲染器还没拷）");
    assert(st.pool !== null && st.pool.users === 3, `三块合用一个池（使用者 ${st.pool?.users}）`);
    frame(r);
    st = r.boards.gpuStats();
    eq([st.awake, st.asleep].join(), "0,3", "下一帧都睡了");
    eq(st.pool!.users, 0, "池里没有醒着的使用者");
    for (const g of t) eq(live(r.boards, g).current(), null, "睡着 = current() 空（渲染器接着显示自己那份）");
    frame(r, [t[1]]);
    st = r.boards.gpuStats();
    eq([st.awake, st.asleep].join(), "1,2", "只有正在编辑的那块醒着");
    assert(!r.boards.get(t[1])!.asleep && r.boards.get(t[0])!.asleep && r.boards.get(t[2])!.asleep, "醒着的是编辑的那块");
    frame(r, [t[1]]); frame(r, [t[1]]);
    eq(r.boards.gpuStats().awake, 1, "编辑着一直醒");
    frame(r, [t[2]]); frame(r, [t[2]]);
    assert(r.boards.get(t[1])!.asleep && !r.boards.get(t[2])!.asleep, "换编辑的物件：上一个睡、这一个醒");
  });

  it("④ 显示：睡着时不交图；渲染器说手里没有（want）→ 下一帧合一次、和睡之前逐字节一样 → 再下一帧睡回去；没人要就一直不碰", () => {
    const { r, t } = three();
    frame(r);
    const before = shown(r, t[0]);
    assert(before !== null, "睡之前交过一张");
    frame(r); frame(r); frame(r);
    eq(shown(r, t[0]), null, "睡着不交");
    const w0 = r.boards.gpuStats().wakes;
    frame(r); frame(r);
    eq(r.boards.gpuStats().wakes, w0, "没人要、内容没变：一直睡着不叫醒");
    live(r.boards, t[0]).want!();
    frame(r);
    assert(same(shown(r, t[0]), before), "渲染器要了：醒来合一张，和睡之前逐字节一样");
    eq(r.boards.gpuStats().wakes, w0 + 1, "叫醒了一次");
    frame(r);
    assert(r.boards.get(t[0])!.asleep, "渲染器拷走之后睡回去");
  });

  it("③ 撤销：三块画板都睡着，跨它们连撤十步（每撤一步只醒那一块、合一次、再睡回去），每步的图层和合成都对；再重做十步回到最后", () => {
    const { r, t, rnd } = three();
    const states: string[] = [], composites: string[][] = [];
    const record = (): void => { states.push(r.shot()); composites.push(t.map((g) => hc(r.boards.get(g)!.composeBytes()))); };
    record();
    for (let k = 0; k < 12; k++) { r.stroke([t[k % 3]], rnd); frame(r); record(); }   // 一路画、一路有帧在跑（不在编辑：画完的那块交出去之后睡）
    frame(r); frame(r);
    eq(r.boards.gpuStats().asleep, 3, "开撤之前三块都睡着");
    for (let k = 0; k < 10; k++) {
      r.undo();
      eq(r.boards.gpuStats().asleep, 3, `撤第 ${k + 1} 步：翻步只动内存，没叫醒任何一块`);
      const at = states.length - 2 - k;
      eq(r.shot(), states[at], `撤第 ${k + 1} 步：每张画的图层 = 当时那一步`);
      frame(r);
      const g = t[(11 - k) % 3];
      assert(!r.boards.get(g)!.asleep, `撤第 ${k + 1} 步：被撤的那块（${g.slice(0, 4)}）这一帧醒来合了一次`);
      const disp = shown(r, g);   // 先读下交出去的那张（醒着时调存盘读回会作废显示的缓存：下一帧重合，就不睡了——那是存盘读回的事，不是这里要验的）
      frame(r);
      eq(r.boards.gpuStats().asleep, 3, `撤第 ${k + 1} 步：下一帧又都睡了`);
      assert(same(disp, r.boards.get(g)!.composeBytes()), `撤第 ${k + 1} 步：交出去的那张 = 整张重合的`);
      eq(t.map((x) => hc(r.boards.get(x)!.composeBytes())).join(), composites[at].join(), `撤第 ${k + 1} 步：三张的合成都 = 当时那一步`);
    }
    for (let k = 0; k < 10; k++) { r.redo(); frame(r); frame(r); }
    eq(r.shot(), states[states.length - 1], "重做十步回到最后");
    eq(t.map((x) => hc(r.boards.get(x)!.composeBytes())).join(), composites[composites.length - 1].join(), "合成也回到最后");
    eq(r.boards.gpuStats().asleep, 3, "做完都睡着");
  });

  it("① 存盘：睡着的脏画板（缓存旧了）→ 钉点同步叫醒、整张合、读回、睡回去；存出来的分层和合成图 = 醒着时存的", async () => {
    const { r, t, rnd } = three();
    const saver = new PaintSaver({ boards: r.boards, wroteWith: "t" });
    r.stroke([t[0]], rnd); frame(r); frame(r);
    await saver.freeze(documentFromScene(r.cur(), "t"), r.cur(), "save").finish();   // 缓存 = 现在
    r.undo();   // 睡着的那块变脏（翻步只动内存），缓存旧了；不跑帧 = 一直睡着
    const b = r.boards.get(t[0])!;
    assert(b.asleep, "睡着、脏");
    const fz = saver.freeze(documentFromScene(r.cur(), "t"), r.cur(), "save");
    assert(b.asleep, "钉完睡回去了（同步醒-合-读回-睡）");
    const doc = await fz.finish(), row = doc.textures.find((x) => x.guid === t[0])!;
    const want = dataPrint(b.wp.exportData());
    eq(dataPrint(await decodeOra(row.content.kind === "layered" ? row.content.ora! : new Uint8Array())), want, "分层 = 画板现在的（撤过那一步的）");
    const png = await decodePng(row.composite!.png), awake = b.composeBytes(b.height)!;
    assert(same(png.data.subarray(0, png.w * png.h * 4), awake.subarray(0, png.w * png.h * 4)), "合成图 = 整张重合的（和醒着读回的逐字节一样）");
    assert(b.asleep, "读回那一下也睡回去了");
  });

  it("② 崩溃快照：画板睡之前钉进缓存（beforeSleep → prime），之后的快照不旧、用的就是那份；没钉（缓存旧了）照旧报旧", async () => {
    const { r, t, rnd } = three();
    const saver = new PaintSaver({ boards: r.boards, wroteWith: "t" }), primes: Promise<void>[] = [];
    r.boards.beforeSleep = (g) => { const p = saver.prime(r.cur(), g); if (p) primes.push(p); };
    r.stroke([t[1]], rnd); frame(r); frame(r);
    assert(r.boards.get(t[1])!.asleep && primes.length > 0, `睡下之前钉了（${primes.length} 份）`);
    await Promise.all(primes);
    const snap = saver.freeze(documentFromScene(r.cur(), "t"), r.cur(), "snapshot");
    eq(snap.stale, false, "快照不旧：睡之前钉的那份是最新的");
    const row = (await snap.finish()).textures.find((x) => x.guid === t[1])!;
    eq(dataPrint(await decodeOra(row.content.kind === "layered" ? row.content.ora! : new Uint8Array())), dataPrint(r.boards.get(t[1])!.wp.exportData()), "快照里的分层 = 画板现在的");
    r.boards.beforeSleep = null;
    r.undo();   // 睡着时撤一步，没跑帧：缓存旧了
    eq(saver.freeze(documentFromScene(r.cur(), "t"), r.cur(), "snapshot").stale, true, "缓存旧了照旧报旧（恢复时说画可能少了最后几笔）");
  });

  it("一笔开着不睡：薄层垫着时准备的末尾不睡它；收笔之后交出去的那一帧之后才睡", () => {
    const { r, t } = three();
    frame(r); frame(r);
    const b = r.boards.get(t[0])!, W = b.width, H = b.height, s = b.openStroke(), layerId = b.wp.layerTree!.view().activeId!;
    const px = new Uint8Array(W * H * 4); for (let i = 0; i < 40 * 4; i += 4) { px[i] = 200; px[i + 3] = 200; }
    s.setHostLayers([{ tex: b.wrapLayer({ pixels: px, w: W, h: H, prec: "u8" }), bx: 0, by: 0, bw: 40, bh: 1, layerId, opacity: 1, erase: false, blendMode: "source-over" }]);
    assert(b.strokeOpen, "一笔开着");
    frame(r); frame(r); frame(r);
    assert(!b.asleep, "开着不睡（帧照跑、不在编辑也不睡）");
    let threw = false; try { b.sleep(); } catch { threw = true; }
    assert(threw, "直接叫它睡 = 抛");
    s.end();
    frame(r);
    assert(!b.asleep, "收笔那一帧交出新版本：不睡");
    frame(r);
    assert(b.asleep, "下一帧睡了");
  });

  it("换文件：画板全扔了、池退了；Port 上挂的回调回到原数", () => {
    let ep = 0;
    const r = rig(2, { epoch: () => ep }), rnd = rng(3), base = r.port.invalidatedListenerCount;
    const t = r.defs.map((d) => r.startPaint(d, 4));
    for (const g of t) r.stroke([g], rnd);
    frame(r); frame(r);
    assert(r.boards.gpuStats().pool !== null, "有池");
    ep = 1; r.boards.sync(r.cur());
    eq(r.boards.count, 0, "画板全扔了");
    eq(r.boards.gpuStats().pool, null, "池退了");
    eq(r.port.invalidatedListenerCount, base, "Port 上挂的回调回到原数");
  });
});
