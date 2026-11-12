// 落层只读回这一笔碰过的格（CatsUp 贴图主线 1-4d 第 8 条）：只读报的格 = 读整个方框，写回之后的图层看得见的逐字节一样（前后都全透明的像素颜色不论）、变了的图块 ⊆ 读方框的；
// 报漏了（报的格以外真变了）= 内核自己查出来、照旧读整个方框；核对比的是「合出来的和原来的一不一样」，不是「薄层 α 是不是 0」（假叠法：α = 0 却改了像素，照样查得出）。
// 内核自己的测试：只 import 内核和测试工具。created 2026-11-11 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { GLBoard } from "../src/shell/gl-board.ts";
import { DirtyCells } from "../src/common/dirty-rects.ts";

const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/** 一个场景：底下那一层（随机内容）+ 宿主画好的薄层（预乘，随机几块墨）+ 这几块墨碰过的格 + 方框。 */
function scene(seed, size) {
  const R = rng(seed), W = size ? size[0] : 40 + Math.floor(R() * 300), H = size ? size[1] : 30 + Math.floor(R() * 300);
  const base = new Uint8ClampedArray(W * H * 4);
  for (let k = 0; k < 6; k++) {   // 底下随机几块（有不透明的、半透明的）
    const x0 = Math.floor(R() * W), y0 = Math.floor(R() * H), w = 1 + Math.floor(R() * W / 2), h = 1 + Math.floor(R() * H / 2), c = [R() * 255, R() * 255, R() * 255, R() < 0.5 ? 255 : 40 + R() * 200];
    for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = x0; x < Math.min(W, x0 + w); x++) { const i = (y * W + x) * 4; base[i] = c[0]; base[i + 1] = c[1]; base[i + 2] = c[2]; base[i + 3] = c[3]; }
  }
  for (let k = 0; k < 3; k++) {   // 全透明却带颜色的像素（直值存法里常有：擦过的地方）——合成一遍会变成 0，方框外的不许被写回去
    const x0 = Math.floor(R() * W), y0 = Math.floor(R() * H), w = 1 + Math.floor(R() * 20), h = 1 + Math.floor(R() * 20);
    for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = x0; x < Math.min(W, x0 + w); x++) { const i = (y * W + x) * 4; base[i] = 77; base[i + 1] = 133; base[i + 2] = 201; base[i + 3] = 0; }
  }
  const ov = new Uint8Array(W * H * 4), cells = new DirtyCells(W, H), blobs = [];
  let bx0 = Infinity, by0 = Infinity, bx1 = -1, by1 = -1;
  const n = 1 + Math.floor(R() * 6);
  for (let k = 0; k < n; k++) {   // 薄层上几块墨（分散开，方框比墨大很多）
    const x0 = Math.floor(R() * (W - 2)), y0 = Math.floor(R() * (H - 2)), w = 1 + Math.floor(R() * 12), h = 1 + Math.floor(R() * 12), a = 20 + Math.floor(R() * 235), c = [R(), R(), R()];
    for (let y = y0; y < Math.min(H, y0 + h); y++) for (let x = x0; x < Math.min(W, x0 + w); x++) { const i = (y * W + x) * 4; ov[i] = Math.round(c[0] * a); ov[i + 1] = Math.round(c[1] * a); ov[i + 2] = Math.round(c[2] * a); ov[i + 3] = a; }
    cells.mark(x0, y0, w, h); blobs.push([x0, y0, Math.min(W, x0 + w) - x0, Math.min(H, y0 + h) - y0]);
    bx0 = Math.min(bx0, x0); by0 = Math.min(by0, y0); bx1 = Math.max(bx1, Math.min(W, x0 + w)); by1 = Math.max(by1, Math.min(H, y0 + h));
  }
  const erase = R() < 0.25, blendMode = erase ? "source-over" : ["source-over", "multiply", "screen"][Math.floor(R() * 3)];
  return { W, H, base, ov, cells, blobs, box: [bx0, by0, bx1 - bx0, by1 - by0], erase, blendMode };
}

/** 落一次层：cells = 给内核的格（null = 不给 = 读整个方框）；inject = 合出来之后、读回之前往合出来的那张上额外改一格（假叠法）。 */
function bake(sc, cells, inject = null) {
  const port = new SoftGl2Port(), board = new GLBoard(port, 64), lp = new LayerPixels(sc.W, sc.H);
  lp.putRegion(0, 0, sc.W, sc.H, sc.base);
  const ext = port.wrapExternal({ pixels: sc.ov, w: sc.W, h: sc.H, prec: "u8" });
  if (inject) {   // 只改落层合出来的那一张（第一次 finishAcc）：α = 0 的地方也改 = 一种「α 是 0 却改了像素」的叠法
    const comp = board._room.comp, orig = comp.finishAcc.bind(comp); let first = true;
    comp.finishAcc = (acc) => { const f = orig(acc); if (first) { first = false; comp.setRects([inject]); comp.fillBg(f, sc.W, sc.H, [0.2, 0.4, 0.6, 1]); comp.setRects(null); } return f; };
  }
  const [bx, by, bw, bh] = sc.box;
  const ov = { kind: "host", tex: ext, bx, by, bw, bh, layerId: 1, opacity: 1, erase: sc.erase, blendMode: sc.blendMode, lockAlpha: false, selMask: null, ...(cells ? { cells } : {}) };
  const changed = [];
  const ok = board.commitBrushStroke(1, lp, ov, sc.W, sc.H, (px, x, y, w, h) => { const c = lp.applyRegionDiff(x, y, w, h, px); changed.push(...c); return c; });
  const out = { ok, bytes: lp.getRegion(0, 0, sc.W, sc.H), bake: board.lastBake, tiles: [...new Set(changed.map((t) => `${t.tx},${t.ty}`))].sort().join(" ") };
  lp.dispose(); board.dispose();
  return out;
}
/** 看得见的一样：每个像素要么四个字节都一样，要么前后都全透明（全透明的像素颜色看不见、不是画；读整个方框那条路合成一遍会把它的颜色归 0）。返回不一样的像素数。 */
const sameBytes = (a, b) => { if (a.length !== b.length) return -1; let d = 0; for (let i = 0; i < a.length; i += 4) { if (a[i + 3] === 0 && b[i + 3] === 0) continue; if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) d++; } return d; };
/** 只读格那条路改的图块 ⊆ 读整个方框改的（方框那条路会多出「全透明像素的颜色归 0」那种假改动）。 */
const tilesSubset = (cel, box) => { const B = new Set(box.split(" ").filter(Boolean)); return cel.split(" ").filter(Boolean).every((t) => B.has(t)); };

describe("落层只读回报的格（1-4d 第 8 条）", () => {
  it("随机场景（随机大小 / 奇数边 / 叠法 / 橡皮 / 全透明带颜色的像素）：只读报的格 = 读整个方框，图层看得见的逐字节一样、变了的图块 ⊆ 读方框的；真的走了只读格", () => {
    let cellsPath = 0;
    for (let seed = 1; seed <= 34; seed++) {
      const sc = scene(seed, seed > 30 ? [600, 520] : null), box = bake(sc, null), cel = bake(sc, sc.cells);   // 后四个跨好几个图块（一个图块交一次 apply）
      assert(box.ok && cel.ok, `种子 ${seed}：落成了`);
      eq(box.bake.path, "box", `种子 ${seed}：不给格 = 读方框`);
      eq(sameBytes(box.bytes, cel.bytes), 0, `种子 ${seed}（${sc.W}×${sc.H}，${sc.blendMode}${sc.erase ? "，橡皮" : ""}，走 ${cel.bake.path}）：图层逐字节一样`);
      assert(tilesSubset(cel.tiles, box.tiles), `种子 ${seed}：变了的图块 ⊆ 读方框的（${cel.tiles} vs ${box.tiles}）`);
      assert(cel.bake.path !== "box-unreported", `种子 ${seed}：报全了不该说漏了（${JSON.stringify(cel.bake)}）`);
      if (cel.bake.path === "cells") { cellsPath++; eq(cel.bake.readCalls, 1, "只读一次"); assert(cel.bake.readBytes < sc.box[2] * sc.box[3] * 4, "读的字节比方框少"); }
    }
    assert(cellsPath >= 15, `34 个场景里只读格走了 ${cellsPath} 次`);
  }, { timeout: 60000 });
  it("报漏了几格：少报的那一段真变了 → 内核查出来（box-unreported、漏了几格），照旧读整个方框；没变的漏报不丢画（两种都和读方框一样）", () => {
    let hit = 0;
    for (let seed = 101; seed <= 120; seed++) {
      const sc = scene(seed, [200, 160]);
      const runs = sc.cells.runs();
      if (runs.length < 2) continue;
      const partial = new DirtyCells(sc.W, sc.H);   // 少报第一段
      for (const r of runs.slice(1)) partial.mark(r.x, r.y, r.w, r.h);
      const box = bake(sc, null), cel = bake(sc, partial);
      if (cel.bake.path === "box" && cel.bake.cells > 0) continue;   // 报的那点格读回不比方框省 = 本来就读方框
      // 少报的那一段里真变了没有（读方框写回的 vs 原来的）：真变了 = 必须查出来；没变（比如橡皮擦在透明的地方）= 查不查都不丢画，两种都行
      const r0 = runs[0]; let realChange = false;
      for (let y = r0.y; y < r0.y + r0.h && !realChange; y++) for (let x = r0.x; x < r0.x + r0.w; x++) { const i = (y * sc.W + x) * 4; if (box.bytes[i] !== sc.base[i] || box.bytes[i + 1] !== sc.base[i + 1] || box.bytes[i + 2] !== sc.base[i + 2] || box.bytes[i + 3] !== sc.base[i + 3]) { realChange = true; break; } }
      eq(sameBytes(box.bytes, cel.bytes), 0, `种子 ${seed}：写回的和读方框一样（走 ${cel.bake.path}）`);
      if (!realChange) continue;
      eq(cel.bake.path, "box-unreported", `种子 ${seed}：少报的那一段真变了 → 查出报漏了`);
      assert(cel.bake.strayCells > 0, `种子 ${seed}：漏了 ${cel.bake.strayCells} 格`);
      assert(tilesSubset(cel.tiles, box.tiles), `种子 ${seed}：变了的图块 ⊆ 读方框的`);
      hit++;
    }
    assert(hit >= 5, `查出报漏了 ${hit} 次`);
  }, { timeout: 60000 });
  it("假叠法：薄层 α = 0 的一格，合出来的却变了 → 核对片照样查出来（比的是合出来的和原来的，不是 α）", () => {
    let hit = 0;
    for (let seed = 201; seed <= 220; seed++) {
      const sc = scene(seed, [256, 192]), [bx, by, bw, bh] = sc.box;
      // 方框里找一格：没报、薄层在这一格里全透明
      let target = null;
      for (let cy = Math.floor(by / 8); cy <= Math.floor((by + bh - 1) / 8) && !target; cy++) for (let cx = Math.floor(bx / 8); cx <= Math.floor((bx + bw - 1) / 8) && !target; cx++) {
        let inked = false;
        for (let y = cy * 8; y < Math.min(sc.H, cy * 8 + 8); y++) for (let x = cx * 8; x < Math.min(sc.W, cx * 8 + 8); x++) if (sc.ov[(y * sc.W + x) * 4 + 3]) inked = true;
        const x = Math.max(bx, cx * 8), y = Math.max(by, cy * 8);
        if (!inked && x < bx + bw && y < by + bh) target = { x, y, w: Math.min(cx * 8 + 8, bx + bw) - x, h: Math.min(cy * 8 + 8, by + bh) - y };
      }
      if (!target) continue;
      const box = bake(sc, null, target), cel = bake(sc, sc.cells, target);
      if (cel.bake.path === "box" && cel.bake.cells > 0) continue;
      eq(cel.bake.path, "box-unreported", `种子 ${seed}：α 是 0 却改了的那一格查出来了`);
      eq(sameBytes(box.bytes, cel.bytes), 0, `种子 ${seed}：写回的和读方框一样（那一格的改动没丢）`);
      hit++;
    }
    assert(hit >= 5, `假叠法查出 ${hit} 次`);
  }, { timeout: 60000 });
  it("报的格读回不比方框省（小方框、墨占满）= 照旧读方框，报告里写 box", () => {
    const sc = scene(7, [64, 64]);
    sc.box = [8, 8, 8, 8]; sc.ov.fill(0); sc.cells = new DirtyCells(64, 64); sc.cells.mark(8, 8, 8, 8);
    for (let y = 8; y < 16; y++) for (let x = 8; x < 16; x++) { const i = (y * 64 + x) * 4; sc.ov[i] = 100; sc.ov[i + 3] = 200; }
    const r = bake(sc, sc.cells);
    eq(r.bake.path, "box");
  });
});
