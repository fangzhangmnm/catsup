// 施工单十八第二节不变量 2：一张面新得到的位置，那几格在每个图层里都是空的。created 2026-11-13 by Claude Opus 5.5（施工单十八第 0 刀）
// 现在不成立：补面时「哪里被占着」只算这个网格体里现在有值的面（layoutAppend），删掉画过的面之后，新面会落在旧画上。第 2 刀（freed）修。
// 这条是棘轮：检查照真的写；现在红 = 记成待办（带上红的细节），不让全套红；哪天变绿了 = 这条测试红，提醒「第 2 刀修好了，把它改成正式的检查」（去掉棘轮那一层）。
// 场景：盒子开始画 → 归属表里有主的格全画满（不透明）→ 删掉画布上排在最左上的那张面 → 把洞补上 → 把画的材质给新面（收尾给它补位置）→ 新面那几格里有没有旧画。
import { describe, it, assert, todo } from "./runner.mjs";
import { PAINT_UNDO_KIND } from "../src/paint/boards.ts";
import { buildTexelTable, paintFaces } from "../src/paint/texel-table.ts";
import type { Op } from "../src/editor/ops.ts";
import { rig } from "./paint-undo-kit.ts";

/** 跑一遍场景，返回新面那几格里有旧画的格数（0 = 不变量 2 成立）和说明。 */
function scenario(): { leaked: number; cells: number; say: string } {
  const r = rig(1), def = r.defs[0], tex = r.startPaint(def);
  const mesh = () => r.cur().mesh(def), uvOf = () => mesh().kernel.columnDefs().find((c) => c.kind === "uv")!.guid;
  const table = () => { const row = r.cur().uvSets.get(uvOf())!; return buildTexelTable(row.width, row.height, paintFaces(mesh().kernel, uvOf()), 4); };
  // ① 有主的格全画满
  const t0 = table(), b = r.boards.ensure(r.cur(), tex), W = b.width, H = b.height, px = new Uint8Array(W * H * 4);
  for (let c = 0; c < W * H; c++) if (t0.owner[c] >= 0) { px[4 * c] = 200; px[4 * c + 1] = 40; px[4 * c + 2] = 40; px[4 * c + 3] = 255; }
  const s = b.openStroke(), layerId = b.wp.layerTree!.view().activeId!;
  s.setHostLayers([{ tex: b.wrapLayer({ pixels: px, w: W, h: H, prec: "u8" }), bx: 0, by: 0, bw: W, bh: H, layerId, opacity: 1, erase: false, blendMode: "source-over" }]);
  s.end();
  r.h.commitRecords("b", { title: "画一笔" }, r.boards.takePending().map((data) => ({ kind: PAINT_UNDO_KIND, data })));
  r.boards.sync(r.cur());
  // ② 删掉画布上排在最左上的那张面（它的位置最先被补面的铺法看到）
  const k = mesh().kernel, uv = uvOf(), minCorner = (f: number): number => { const v = k.cornerValues(f, uv)!; let m = Infinity; for (let i = 0; i < v.length; i += 2) m = Math.min(m, v[i] + v[i + 1] * 1e4); return m; };
  const F = k.faces().reduce((a, c) => (minCorner(c) < minCorner(a) ? c : a)), ring = k.faceVerts(F);
  r.commit({ op: "meshDelete", def, faces: [F] } as Op);
  const before = new Set(mesh().kernel.faces());   // 删完之后的面（补出来的新面会复用被删那张的编号：按删完之后比）
  // ③ 补洞：新面带画的材质，收尾给它补位置
  const k1 = mesh().kernel, ringEdges = ring.map((v, i) => k1.edgeOf(v, ring[(i + 1) % ring.length]));   // 测试盒子每张面背后还有一张（边上挂四张）：按一圈边补，不按一圈点
  r.commit({ op: "meshFill", def, edges: ringEdges } as Op);
  const k2 = mesh().kernel, fresh = k2.faces().filter((f) => !before.has(f));
  if (fresh.length !== 1) return { leaked: -1, cells: 0, say: `补洞之后新面 ${fresh.length} 张（场景搭错了）` };
  const nf = fresh[0];
  r.commit({ op: "meshPaintFaces", def, faces: [nf], material: r.paintMat(def) } as Op);   // 补出来的面是默认材质：把画的材质给它（「把这几张面加进来」）
  r.commit({ op: "meshLayoutPaint", def, faces: [nf] } as Op, true);   // 收尾给它补位置（编辑器每一步收尾自动补进同一步，paint-upkeep.ts；这套测试用的撤销栈不走编辑器那层，显式补）
  const t1 = table(), fp = t1.faces.get(nf);
  if (!fp) return { leaked: -1, cells: 0, say: "新面没有位置（场景搭错了：它该走画、该补上位置）" };
  // ④ 新面那几格：图层里有没有旧画（合成图里 alpha > 0 的格；画板底色另算——这里读图层本身）
  const d = r.boards.get(tex)!.wp.exportData(), layer = (d.nodes as { pixels?: { rect: { x: number; y: number; w: number; h: number }; bytes: Uint8ClampedArray } | null }[]).find((n) => n.pixels)?.pixels;
  let leaked = 0, cells = 0;
  for (let c = 0; c < t1.width * t1.height; c++) {
    if (t1.owner[c] !== fp.poly) continue;
    cells++;
    if (!layer) continue;
    const x = c % t1.width, y = Math.floor(c / t1.width), lx = x - layer.rect.x, ly = y - layer.rect.y;
    if (lx < 0 || ly < 0 || lx >= layer.rect.w || ly >= layer.rect.h) continue;
    if (layer.bytes[4 * (ly * layer.rect.w + lx) + 3] > 0) leaked++;
  }
  return { leaked, cells, say: `删掉面 ${F}、补上面 ${nf}：新面 ${cells} 格里 ${leaked} 格有旧画` };
}

describe("不变量 2：新面的位置上没有旧画（施工单十八；第 2 刀修）", () => {
  const r = scenario();
  it("场景搭得起来（新面一张、有位置）", () => assert(r.leaked >= 0 && r.cells > 0, r.say));
  if (r.leaked > 0) todo(`不变量 2 现在不成立（第 2 刀 freed 修）：${r.say}`);
  else it("不变量 2 成立了：第 2 刀修好了 → 把这条的棘轮去掉、改成正式的检查", () => assert(false, `已经成立：${r.say}`));
});
