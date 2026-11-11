// 画板的图块不漏（贴图主线 1-8a，统筹 11-11 审查要的第二件；施工单 ai-docs/20261111-paint-workorders-12.md）。created 2026-11-11 by Claude Opus 5.5
// 一长串随机的「画 / 擦 / 撤几步再做新的（截断）/ 重做 / 挪点 / 删掉画着的物件（有时再撤回来）」，撤销栈额度设得小、逼着驱逐；最后换文件（画板全扔），
// 内核的图块池（appTilePool，画画内核 CPU 那一侧唯一的池）里的图块数回到开始之前。中途歇着、记录被挤光的画板也要被扔、图块还池。
// 架子在 paint-undo-kit.ts。显卡那一侧（GLBoard 的图块纹理）内核还没有退租口，这里不量（施工记录里记着）。
import { describe, it, eq, assert } from "./runner.mjs";
import type { Op } from "../src/editor/ops.ts";
import { appTilePool } from "../src/paint/kernel/src/backend/tiles/app-tile-pool.ts";
import { rig, rng } from "./paint-undo-kit.ts";

const tiles = (): number => appTilePool().stats().count;
/** 撤销栈额度：画一笔的记录内核只记约 64 字节（没压缩的图块记 0、归图块池自己的额度管；CatsUp 还没接压缩，施工记录里记着），所以要小到几百字节才逼得出驱逐。 */
const QUOTA = 400;

describe("画板的图块不漏（1-8a）", () => {
  for (const seed of [3, 11, 29]) it(`种子 ${seed}：画 / 擦 / 截断 / 重做 / 驱逐 / 删物件再撤回，换文件之后图块池回到开始之前`, () => {
    const t0 = tiles();
    let ep = 0;
    const r = rig(2, { quota: QUOTA, epoch: () => ep }), rnd = rng(seed), texs = r.defs.map((d) => r.startPaint(d, 20));
    const alive = (def: number): boolean => r.cur().defs.has(def), base = r.h.steps();   // 不撤过「开始画」那两步（撤过了画就没了，不是这张测试要量的）
    let deletes = 0, peak = 0, retired = 0;
    for (let n = 0; n < 70; n++) {
      const pick = rnd(), def = r.defs[Math.floor(rnd() * r.defs.length)], tex = texs[r.defs.indexOf(def)];
      const before = r.boards.count;
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
      if (r.boards.count < before) retired++;
      peak = Math.max(peak, tiles() - t0);
    }
    assert(r.h.evictedCount() > 0, `种子 ${seed}：额度要真的挤掉过步（驱逐线 ${r.h.evictedCount()}）`);
    assert(peak > 0, "画过、图块池里真有东西");
    console.log(`    种子 ${seed}：图块最多 ${peak} 块、删物件 ${deletes} 次、中途扔画板 ${retired} 次、驱逐线 ${r.h.evictedCount()}`);
    ep = 1; r.boards.sync(r.cur());   // 换文件：画板全扔
    eq(r.boards.count, 0, "画板全扔了");
    eq(tiles(), t0, `种子 ${seed}：图块池回到开始之前`);
  });

  it("歇着的画板记录被挤光 = 当场扔、图块还池（不等换文件）", () => {
    const t0 = tiles();
    /** 开始画两张 → 画 A 四笔 → 删掉 A 的物件。额度先用大额度空跑一遍量：刚好装得下「A 那四笔 + 删物件那一步」再多一点（开始画那两步大，先被挤掉），之后画 B 每一笔挤掉 A 的一笔。 */
    const setup = (quota?: number) => {
      const r = rig(2, quota ? { quota } : {}), rnd = rng(5), [ta, tb] = r.defs.map((d) => r.startPaint(d, 20)), [da] = r.defs, u1 = r.h.usageBytes();
      for (let i = 0; i < 4; i++) r.stroke([ta], rnd);
      const root = r.cur().root, inst = [...r.cur().def(root).instances.values()].find((x) => x.def === da)!;
      r.commit({ op: "eraseInstance", def: root, instance: inst.id } as Op); r.commit({ op: "purgeDefs", defs: [da] } as Op, true);
      return { r, rnd, ta, tb, u1 };
    };
    const dry = setup(); const fit = dry.r.h.usageBytes() - dry.u1 + 100; dry.r.boards.disposeAll();
    const { r, rnd, ta, tb } = setup(fit);
    eq(r.boards.count, 1, "A 歇着、记录还在（B 还没建画板）");
    const withA = tiles() - t0;
    for (let i = 0; i < 40 && r.boards.get(ta); i++) r.stroke([tb], rnd);   // 只画 B：额度把 A 的记录一条条挤掉
    assert(!r.boards.get(ta), "A 的记录被挤光，画板扔了");
    assert(r.paintRecords(ta) === 0, "栈里没有 A 的记录");
    assert(withA > 0, `A 有过图块（${withA}）`);
    r.boards.disposeAll();   // 登记处里已经没有 A 了：A 的图块要是扔的时候没还，这里就回不到开始之前
    eq(tiles(), t0, "B 也扔了之后回到开始之前");
  });
});
