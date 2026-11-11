// 一帧改到的地方记成脏格子位图（CatsUp 贴图主线 1-4d 第 6 条；统筹 11-11）。created 2026-11-11 by Claude Opus 5.5
// 内核自己的测试：只 import 内核和测试工具。
import { describe, it, eq, assert } from "./runner.mjs";
import { DirtyCells, dirtyRuns, assertDisjoint, assertRuns, DIRTY_CELL, RECT_FULL_FRACTION } from "../src/common/dirty-rects.ts";

const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
/** 一张单子盖住的像素（W × H 的 0/1 图）。 */
const maskOf = (rects, W, H) => { const m = new Uint8Array(W * H); for (const r of rects) for (let y = r.y; y < r.y + r.h; y++) m.fill(1, y * W + r.x, y * W + r.x + r.w); return m; };

describe("一帧改到的地方（脏格子位图 dirty-rects）", () => {
  it("随机输入（重叠的、贴边的、出界的、一帧几百块的）：行段两两不相交、盖住输入的每一格、整数、在画布里；只盖输入碰到的格；过半 = full", () => {
    const R = rng(7);
    let fulls = 0, lists = 0;
    for (let t = 0; t < 300; t++) {
      const W = 64 + Math.floor(R() * 400), H = 64 + Math.floor(R() * 300);   // 含不是 8 的倍数的边
      const many = t % 10 === 0, n = many ? 300 + Math.floor(R() * 500) : Math.floor(R() * 30), big = t % 7 === 0;
      const cx = [R() * W, R() * W], cy = [R() * H, R() * H];
      const input = Array.from({ length: n }, (_, i) => many
        ? { x: cx[i % 2] + R() * 40 - 20, y: cy[i % 2] + R() * 40 - 20, w: 3 * R() + 0.5, h: 3 * R() + 0.5 }
        : { x: R() * (W + 40) - 20, y: R() * (H + 40) - 20, w: (big ? 150 : 12) * R() + 0.5, h: (big ? 150 : 12) * R() + 0.5 });
      const out = dirtyRuns(input, W, H);
      if (out === "full") { fulls++; continue; }
      lists++;
      assertDisjoint(out); assertRuns(out);
      for (const r of out) assert(Number.isInteger(r.x) && Number.isInteger(r.w) && r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H && r.w > 0 && r.h > 0, `行段在画布里：${JSON.stringify(r)}`);
      const m = maskOf(out, W, H);
      let total = 0;
      for (const r of input) {
        const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y)), x1 = Math.min(W, Math.ceil(r.x + r.w)), y1 = Math.min(H, Math.ceil(r.y + r.h));
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!m[y * W + x]) throw new Error(`第 ${t} 组：输入的格 (${x}, ${y}) 没盖住`);
      }
      // 只盖输入碰到的格：每个被盖住的像素，它所在的 8 格见方里至少有一个输入像素
      const inMask = maskOf(input.map((r) => { const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y)), x1 = Math.min(W, Math.ceil(r.x + r.w)), y1 = Math.min(H, Math.ceil(r.y + r.h)); return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }; }), W, H);
      for (const r of out) for (let cy0 = r.y; cy0 < r.y + r.h; cy0 += DIRTY_CELL) for (let cx0 = r.x; cx0 < r.x + r.w; cx0 += DIRTY_CELL) {
        let hit = false;
        for (let y = cy0; y < Math.min(H, cy0 + DIRTY_CELL) && !hit; y++) for (let x = cx0; x < Math.min(W, cx0 + DIRTY_CELL); x++) if (inMask[y * W + x]) { hit = true; break; }
        if (!hit) throw new Error(`第 ${t} 组：格 (${cx0}, ${cy0}) 没有输入却标了`);
      }
      for (const r of out) total += r.w * r.h;
      assert(total <= RECT_FULL_FRACTION * W * H, "没过半");
    }
    assert(fulls > 0 && lists > 100, `两种结果都走到了：full ${fulls}、行段 ${lists}`);
  });
  it("隔得远的两团各是各的；空 = 空单子；一行里连着的并成一段", () => {
    const far = dirtyRuns([{ x: 0, y: 0, w: 4, h: 4 }, { x: 400, y: 300, w: 4, h: 4 }], 512, 384);
    eq(far.length, 2); eq(far[0].w, 8); eq(far[1].x, 400);
    eq(dirtyRuns([], 10, 10).length, 0);
    const row = dirtyRuns([{ x: 1, y: 1, w: 30, h: 2 }], 512, 384);
    eq(row.length, 1, "一行一段"); eq(row[0].x, 0); eq(row[0].w, 32);
  });
  it("缩小图下一级 = 2×2 格或起来：下一级的每个脏像素对应这一级至少一个脏像素（不会漏），而且行段照样两两不相交", () => {
    const R = rng(3);
    for (let t = 0; t < 60; t++) {
      const W = 37 + Math.floor(R() * 500), H = 29 + Math.floor(R() * 400), d = new DirtyCells(W, H);
      for (let i = 0; i < 12; i++) d.mark(R() * W, R() * H, R() * 40, R() * 40);
      let cur = d, w = W, h = H;
      while (w > 1 || h > 1) {
        const nx = cur.half(), m0 = maskOf(cur.runs(), cur.w, cur.h), m1 = maskOf(nx.runs(), nx.w, nx.h);
        assertRuns(nx.runs()); assertDisjoint(nx.runs());
        // 这一级任何一个脏像素 (x, y) → 下一级 (x >> 1, y >> 1)（夹在下一级里）必须是脏的
        for (let y = 0; y < cur.h; y++) for (let x = 0; x < cur.w; x++) if (m0[y * cur.w + x]) { const X = Math.min(nx.w - 1, x >> 1), Y = Math.min(nx.h - 1, y >> 1); if (!m1[Y * nx.w + X]) throw new Error(`第 ${t} 组 ${cur.w}x${cur.h} → ${nx.w}x${nx.h}：(${x}, ${y}) 脏、下一级 (${X}, ${Y}) 没标`); }
        cur = nx; w = nx.w; h = nx.h;
      }
    }
  });
  it("画布不是 8 的倍数、不是 2 的幂、宽高是奇数（按密度开的画就是这种）：mark / runs / half 逐级不漏、不出界、两两不相交", () => {
    const R = rng(11);
    for (const [W, H] of [[300, 412], [1300, 901], [1, 1], [7, 3], [1, 977], [513, 1]]) {
      const d = new DirtyCells(W, H);
      for (let i = 0; i < 40; i++) d.mark(Math.floor(R() * (W + 20)) - 10, Math.floor(R() * (H + 20)) - 10, 1 + Math.floor(R() * 30), 1 + Math.floor(R() * 30));
      d.mark(W - 1, H - 1, 1, 1);   // 右下角那一个像素（最后一格不满 8）
      let cur = d, lvl = 0;
      while (true) {
        const runs = cur.runs();
        assertRuns(runs);
        for (const r of runs) assert(r.x >= 0 && r.y >= 0 && r.x + r.w <= cur.w && r.y + r.h <= cur.h && r.w > 0 && r.h > 0, `${W}x${H} 第 ${lvl} 级行段出界：${JSON.stringify(r)}`);
        if (lvl === 0) { const m = maskOf(runs, W, H); assert(m[(H - 1) * W + (W - 1)] === 1, `${W}x${H}：右下角那个像素盖住了`); }
        if (cur.w === 1 && cur.h === 1) { assert(!cur.empty, `${W}x${H}：一路缩到 1x1 还是脏的`); break; }
        const nx = cur.half(), m0 = maskOf(runs, cur.w, cur.h), m1 = maskOf(nx.runs(), nx.w, nx.h);
        for (let y = 0; y < cur.h; y++) for (let x = 0; x < cur.w; x++) if (m0[y * cur.w + x]) { const X = Math.min(nx.w - 1, x >> 1), Y = Math.min(nx.h - 1, y >> 1); if (!m1[Y * nx.w + X]) throw new Error(`${W}x${H} 第 ${lvl} 级 (${x}, ${y}) 脏、下一级 (${X}, ${Y}) 没标`); }
        cur = nx; lvl++;
      }
    }
  });
  it("断言：重叠的 = 抛", () => {
    let a = false; try { assertDisjoint([{ x: 0, y: 0, w: 5, h: 5 }, { x: 4, y: 4, w: 5, h: 5 }]); } catch (e) { a = /OVERLAP/.test(String(e.message)); }
    let b = false; try { assertRuns([{ x: 0, y: 0, w: 8, h: 8 }, { x: 4, y: 0, w: 8, h: 8 }]); } catch (e) { b = /OVERLAP/.test(String(e.message)); }
    assert(a && b, "两种断言都抛");
  });
});
