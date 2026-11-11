// 画板的图块不漏（贴图主线 1-8a，统筹 11-11 审查要的第二件；施工单 ai-docs/20261111-paint-workorders-12.md）。created 2026-11-11 by Claude Opus 5.5
// 一长串随机的「画 / 擦 / 撤几步再做新的（截断）/ 重做 / 挪点 / 删掉画着的物件（有时再撤回来）」，撤销栈额度设得小、逼着驱逐；最后换文件（画板全扔），
// 内核的图块池（appTilePool，画画内核 CPU 那一侧唯一的池）里的图块数回到开始之前。
// 0-3a（统筹改判）：画板只在换文件时扔——歇着、记录被挤光的也留着（它是这张画的像素唯一的一份）；1-8a 那个丢画的洞做成了测试。显卡那一侧在探针 probe-paint-gpu-release 里数。
// 架子在 paint-undo-kit.ts。
import { describe, it, eq, assert } from "./runner.mjs";
import type { Op } from "../src/editor/ops.ts";
import { appTilePool } from "../src/paint/kernel/src/backend/tiles/app-tile-pool.ts";
import { rig, rng } from "./paint-undo-kit.ts";

const tiles = (): number => appTilePool().stats().count;
/** shot() 里这张画那一行（大小 + 每层像素的哈希）。 */
const line = (shot: string, tex: string): string | undefined => shot.split("\n").find((l) => l.startsWith(tex.slice(0, 4)));
/** 撤销栈额度：画一笔的记录内核只记约 64 字节（没压缩的图块记 0、归图块池自己的额度管；CatsUp 还没接压缩，施工记录里记着），所以要小到几百字节才逼得出驱逐。 */
const QUOTA = 400;

describe("画板的图块不漏（1-8a）", () => {
  for (const seed of [3, 11, 29]) it(`种子 ${seed}：画 / 擦 / 截断 / 重做 / 驱逐 / 删物件再撤回，换文件之后图块池回到开始之前`, () => {
    const t0 = tiles();
    let ep = 0;
    const r = rig(2, { quota: QUOTA, epoch: () => ep }), rnd = rng(seed), texs = r.defs.map((d) => r.startPaint(d, 20));
    const alive = (def: number): boolean => r.cur().defs.has(def), base = r.h.steps();   // 不撤过「开始画」那两步（撤过了画就没了，不是这张测试要量的）
    let deletes = 0, peak = 0, boards = 0;
    for (let n = 0; n < 70; n++) {
      const pick = rnd(), def = r.defs[Math.floor(rnd() * r.defs.length)], tex = texs[r.defs.indexOf(def)];
      if (pick < 0.12) { const k = 1 + Math.floor(rnd() * 4); for (let i = 0; i < k && r.h.steps() > base && r.h.canUndo(); i++) r.undo(); }   // 撤几步：下一个动作截断
      else if (pick < 0.2) { if (r.h.position() < r.h.depth()) r.redo(); }
      else if (!alive(def)) continue;
      else if (pick < 0.62) r.stroke([tex], rnd);
      else if (pick < 0.72) r.stroke([tex], rnd, true);
      else if (pick < 0.84) { const k = r.cur().mesh(def).kernel, v = k.verts()[Math.floor(rnd() * k.verts().length)], p = k.pt(v); r.commit({ op: "meshMove", def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + (rnd() - 0.5) * 0.1 } }] } as Op); }
      else {   // 删掉画着的物件（实例 + 清理掉定义 = 一步）：画板歇着；以后撤回来接着用，或者记录被截断 / 挤光了就扔
        const root = r.cur().root, inst = [...r.cur().def(root).instances.values()].find((i) => i.def === def)!;
        r.commit({ op: "eraseInstance", def: root, instance: inst.id } as Op); r.commit({ op: "purgeDefs", defs: [def] } as Op, true);
        deletes++;
      }
      assert(r.boards.count >= boards, "画板只在换文件时扔（数目只增不减）"); boards = r.boards.count;   // 第一笔才建，所以从 0 往上长
      peak = Math.max(peak, tiles() - t0);
    }
    assert(r.h.evictedCount() > 0, `种子 ${seed}：额度要真的挤掉过步（驱逐线 ${r.h.evictedCount()}）`);
    assert(peak > 0, "画过、图块池里真有东西");
    console.log(`    种子 ${seed}：图块最多 ${peak} 块、删物件 ${deletes} 次、驱逐线 ${r.h.evictedCount()}`);
    ep = 1; r.boards.sync(r.cur());   // 换文件：画板全扔
    eq(r.boards.count, 0, "画板全扔了");
    eq(tiles(), t0, `种子 ${seed}：图块池回到开始之前`);
  });

  it("丢画的洞（1-8a 复现，0-3a 改判）：A 画三笔 → 删 A 的物件 → 只画 B 把 A 的记录挤光 → 撤回删之前，A 的画逐字节还在", () => {
    const t0 = tiles();
    /** 开始画两张 → 画 A 三笔 → 删掉 A 的物件。额度先用大额度空跑一遍量：刚好装得下「A 那三笔 + 删物件那一步」再多一点（开始画那两步大，先被挤掉），之后画 B 每一笔挤掉 A 的一笔。 */
    const setup = (quota?: number) => {
      const r = rig(2, quota ? { quota } : {}), rnd = rng(9), [ta, tb] = r.defs.map((d) => r.startPaint(d, 20)), [da] = r.defs, u1 = r.h.usageBytes();
      for (let i = 0; i < 3; i++) r.stroke([ta], rnd);
      const painted = line(r.shot(), ta);
      const root = r.cur().root, inst = [...r.cur().def(root).instances.values()].find((x) => x.def === da)!;
      r.commit({ op: "eraseInstance", def: root, instance: inst.id } as Op); r.commit({ op: "purgeDefs", defs: [da] } as Op, true);
      return { r, rnd, ta, tb, da, u1, painted };
    };
    const dry = setup(); const fit = dry.r.h.usageBytes() - dry.u1 + 100; dry.r.boards.disposeAll();
    const { r, rnd, ta, tb, da, painted } = setup(fit);
    for (let i = 0; i < 12 && r.paintRecords(ta) > 0; i++) r.stroke([tb], rnd);
    eq(r.paintRecords(ta), 0, "A 的记录被挤光了");
    assert(!!r.boards.get(ta), "A 的画板还在（歇着）");
    let n = 0; while (!r.cur().defs.has(da) && r.h.canUndo() && n++ < 40) r.undo();
    assert(r.cur().defs.has(da), "撤回到删之前：A 的物件回来了");
    eq(line(r.shot(), ta), painted, "A 的画逐字节还在");
    r.boards.disposeAll();
    eq(tiles(), t0, "扔光之后图块池回到开始之前");
  });

  it("撤销「开始画」再重做，中间把它的记录清光（截断）：画板还是那一块", () => {
    const r = rig(1), rnd = rng(13), [ta] = r.defs.map((d) => r.startPaint(d, 20));
    r.stroke([ta], rnd); r.stroke([ta], rnd);
    const board = r.boards.get(ta)!;
    r.undo(); r.undo(); r.undo();   // 两笔 + 开始画都撤了：画没了，歇着
    r.redo();                        // 只重做开始画
    r.commit({ op: "addMaterial", name: "截断用", color: [0.4, 0.4, 0.4] } as Op);   // 新的一步：截掉重做段，那两笔的记录 dispose 了
    eq(r.paintRecords(ta), 0, "它的记录清光了");
    r.undo(); r.undo();              // 再撤：画又没了（歇着、记录 0）
    assert(r.boards.get(ta) === board, "歇着、记录 0：还是那一块（以前这时会扔）");
    r.redo();
    assert(r.boards.get(ta) === board, "重做回来：还是那一块");
    r.boards.disposeAll();
  });
});
