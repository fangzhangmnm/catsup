// 画板和画板登记处（贴图主线 1-3c，施工单 ai-docs/20261111-paint-workorders-10.md）：内核的软件显卡上跑。created 2026-11-11 by Claude Opus 5.5
// 画板：灌进去的字节合成出来一字不差（不透明的底色垫在透明处）、内容 / 底色没变 = 同一张图同一个版本；跟着坐标加高 / 缩回空白 / 有内容不缩（统筹 11-11 裁定）。
// 登记处：换文件全部销毁、画没了那块歇着（留到关文件；0-3a 统筹改判）、跟着场景里那一套坐标改大小（follow，1-8a 起在提交的收尾里）、签名跟着变。
import { describe, it, eq, assert } from "./runner.mjs";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { PaintBoard } from "../src/paint/board.ts";
import { PaintBoards } from "../src/paint/boards.ts";
import { PaintLockedError } from "../src/paint/paint-limit.ts";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { mintGuid } from "../src/format/guid.ts";
import { sceneBox } from "./format-scenes.ts";
import type { LiveImage } from "../src/minccino/contract/stream.ts";
import { DirtyCells } from "../src/paint/kernel/src/common/dirty-rects.ts";
import { PaintingView } from "../src/paint/kernel/src/backend/workpiece/painting-view.ts";

const pattern = (w: number, h: number, hole = false): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; px[o] = (x * 7) & 255; px[o + 1] = (y * 11) & 255; px[o + 2] = (x + 3 * y) & 255; px[o + 3] = hole && x < 3 && y < 2 ? 0 : 255; }
  return px;
};
const layer = (w: number, h: number, px: Uint8ClampedArray, rect = { x: 0, y: 0, w, h }) =>
  ({ width: w, height: h, nodes: [{ name: "L", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: { rect, bytes: px } }] });
const readAll = (port: SoftGl2Port, b: PaintBoard): Uint8Array => { const r = b.compose()!; return port.readPixels(r.fbo, 0, 0, b.width, b.height); };

describe("画板（1-3c）", () => {
  it("灌进去的字节合成出来一字不差；透明的地方垫的是不透明的底色", () => {
    const port = new SoftGl2Port(), b = new PaintBoard({ port, width: 40, height: 30 });
    b.setBackground([0.2, 0.4, 0.6]);
    const px = pattern(40, 30, true);
    b.load(layer(40, 30, px));
    const got = readAll(port, b);
    let bad = 0;
    for (let i = 0; i < px.length; i += 4) {
      const hole = px[i + 3] === 0, want = hole ? [51, 102, 153, 255] : [px[i], px[i + 1], px[i + 2], 255];
      for (let k = 0; k < 4; k++) if (Math.abs(got[i + k] - want[k]) > (hole ? 1 : 0)) bad++;
    }
    eq(bad, 0, "每个字节");
  });
  it("内容 / 底色没变 = 同一张图、同一个版本；灌了新内容 / 换了底色 = 新版本", () => {
    const port = new SoftGl2Port(), b = new PaintBoard({ port, width: 16, height: 8 });
    const a = b.compose()!, a2 = b.compose()!;
    eq(a2.version, a.version, "没变"); assert(a2.fbo === a.fbo, "同一张图");
    b.load(layer(16, 8, pattern(16, 8)));
    const c = b.compose()!; assert(c.version > a.version, "灌了新内容");
    b.setBackground([1, 0, 0]); const d = b.compose()!; assert(d.version > c.version, "换了底色");
    b.setBackground([1, 0, 0]); eq(b.compose()!.version, d.version, "同一个底色再设一次不算变");
  });
  it("跟着坐标：加高 = 跟着长、原来的不动、新的是空白；缩回去要砍的全空白 = 缩", () => {
    const port = new SoftGl2Port(), b = new PaintBoard({ port, width: 20, height: 10 }), px = pattern(20, 10);
    b.setBackground([0, 0, 0]);
    b.load(layer(20, 10, px));
    const r = b.follow(20, 25);
    eq([r.width, r.height, r.kept].join(), "20,25,false", "加高");
    const got = readAll(port, b);
    let bad = 0;
    for (let y = 0; y < 25; y++) for (let x = 0; x < 20; x++) { const o = (y * 20 + x) * 4, want = y < 10 ? [px[o], px[o + 1], px[o + 2]] : [0, 0, 0]; for (let k = 0; k < 3; k++) if (got[o + k] !== want[k]) bad++; }
    eq(bad, 0, "原来那 10 行不动，下面 15 行是底色");
    eq(b.follow(20, 10).height, 10, "缩回去（下面全空白）");
    eq(b.follow(12, 10).width, 20, "砍列：右边有内容 = 不砍");
  });
  it("缩回去要砍的行里有内容：不缩、留着比坐标高、记一笔，不抛", () => {
    const port = new SoftGl2Port(), logs: string[] = [], b = new PaintBoard({ port, width: 8, height: 20, log: (m) => logs.push(m) });
    b.load(layer(8, 20, pattern(8, 2), { x: 0, y: 17, w: 8, h: 2 }));   // 第 17、18 行有内容
    const r = b.follow(8, 12);
    eq([r.width, r.height, r.kept].join(), "8,20,true", "留着");
    eq(logs.length, 1, "记了一笔"); assert(/kept 8x20/.test(logs[0]), logs[0]);
    eq(b.follow(8, 19).height, 19, "要砍的那一行（第 19 行）空白：缩到 19");
  });
  it("退租摘干净：建十块又全退租，Port 上挂的「画面丢了」回调回到原数（以前画板和它的 GLBoard 各挂一个、都不摘，Port 一直拉着它们；内核 v0.14.85）", () => {
    const port = new SoftGl2Port(), base = port.invalidatedListenerCount;
    const boards = Array.from({ length: 10 }, () => new PaintBoard({ port, width: 16, height: 8 }));
    eq(port.invalidatedListenerCount, base + 20, "每块挂两个（画板一个、它的 GLBoard 一个）");
    for (const b of boards) b.dispose();
    eq(port.invalidatedListenerCount, base, "全退租之后回到原数");
  });
});

/** 一个网格体定义（方盒子）+ 开始画（走 1-3b 的指令）：返回场景、定义、那张画的 GUID。 */
function painted(): { s: Scene; def: number; tex: string } {
  const s0 = new Scene(), d = s0.mintDef("网格", sceneBox());
  s0.mintInstance(s0.root, null, d.id, IDENTITY);
  let s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
  const m = new MeshKernel(); addBox(m, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }); s.mesh(d.id).kernel = m;
  const tex = mintGuid(), op: Op = { op: "startPaint", def: d.id, faces: m.faces(), uvSet: mintGuid(), textureGuid: tex, materialGuid: mintGuid(), names: { uvSet: "UV", paint: "画", material: "画的材质" }, color: [0.8, 0.7, 0.6], density: 16 };
  s = applyOp(s, op).scene;
  return { s, def: d.id, tex };
}

describe("只合成改到的那些格（1-4d 第 6 条，内核 v0.14.79）", () => {
  it("一笔当中薄层报格 = 内核只重合那些格、和整张重合逐像素一样；存盘的合成图永远整张（不用增量那张）、和一块新画板合出来的一样", () => {
    const W = 50, H = 37, port = new SoftGl2Port(), b = new PaintBoard({ port, width: W, height: H });
    b.setBackground([0.3, 0.5, 0.7]);
    b.load(layer(W, H, pattern(W, H, true)));
    const thin = new Uint8Array(W * H * 4), ext = b.wrapLayer({ pixels: thin, w: W, h: H, prec: "u8" });
    const session = b.openStroke();
    const tree = (b as unknown as { gl: { _tree: { lastPath: { path: string } } } }).gl._tree;
    const paths: string[] = [];
    for (let f = 0; f < 6; f++) {
      const x = 3 + f * 7, y = 4 + f * 4;
      for (let yy = y; yy < y + 5; yy++) for (let xx = x; xx < x + 6; xx++) { const i = (yy * W + xx) * 4; thin[i] = 200; thin[i + 1] = 20; thin[i + 2] = 20; thin[i + 3] = 220; }
      ext.markChanged(x, y, 6, 5);
      session.setHostLayers([{ tex: ext, bx: 0, by: 0, bw: Math.min(W, x + 6), bh: Math.min(H, y + 5), layerId: b.wp.layerTree!.view().activeId!, opacity: 1, erase: false, blendMode: "source-over" }]);
      b.overlayChanged();   // 版本往前走（薄层的格子已经直接报给内核了；画板这边按整张记）
      const shown = readAll(port, b);
      paths.push(tree.lastPath.path);
      // 对照：同一个画板强制整张再合一遍
      (b as unknown as { gl: { markContentDirty(): void } }).gl.markContentDirty();
      (b as unknown as { last: unknown }).last = null; (b as unknown as { lastCommitted: unknown }).lastCommitted = null;
      const full = readAll(port, b);
      let bad = 0; for (let i = 0; i < shown.length; i++) if (shown[i] !== full[i]) bad++;
      eq(bad, 0, `第 ${f} 帧：增量 = 整张`);
      (b as unknown as { lastCommitted: unknown }).lastCommitted = b.committedKey();   // 回到「落定内容没变」：下一帧又能增量
    }
    assert(paths.slice(1).some((p) => p === "rects"), `一笔当中真的走了只合那些格：${paths.join(",")}`);
    const bytes = b.composeBytes()!;
    eq(tree.lastPath.path, "full", "存盘的合成图是整张合的");
    session.cancel();
    const fresh = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H });
    fresh.setBackground([0.3, 0.5, 0.7]); fresh.load(layer(W, H, pattern(W, H, true)));
    const want = fresh.composeBytes()!;
    let bad = 0; for (let i = 0; i < bytes.length; i++) if (bytes[i] !== want[i]) bad++;
    eq(bad, 0, "和一块新画板（同样的层、同样的底色）合出来的逐字节一样（不带薄层）");
    b.dispose(); fresh.dispose();
  });
});

describe("画板登记处（1-3c）", () => {
  it("锁着整份换内容（调试钩子 fill 那条路）：抛锁的错、不换；解锁照换（v0.19.48）", () => {
    const { s, tex } = painted();
    let why: string | null = null;
    const reg = new PaintBoards({ editLocked: () => why, port: () => new SoftGl2Port(), epoch: () => 0 });
    const b = reg.ensure(s, tex), W = b.width, H = b.height;
    reg.load(tex, layer(W, H, pattern(W, H)));
    const sum = (): number => { const d = b.wp.exportData(); let t = 0; for (const n of d.nodes) { const px = (n as { pixels?: { bytes: Uint8ClampedArray } }).pixels; if (px) for (const v of px.bytes) t = (t + v) | 0; } return t; };
    const s0 = sum();
    why = "锁着：看、选、量、进去走都行，改不了；☰「解锁」放开";
    let err: unknown = null; try { reg.load(tex, layer(W, H, new Uint8ClampedArray(W * H * 4))); } catch (e) { err = e; }
    assert(err instanceof PaintLockedError && (err as PaintLockedError).say === why, `抛的是锁的错、说锁的那句（${String(err)}）`);
    eq(sum(), s0, "没换");
    why = null; reg.load(tex, layer(W, H, new Uint8ClampedArray(W * H * 4))); assert(sum() !== s0, "解锁照换");
  });
  it("建：大小 = 那一套坐标的画布、底色 = 材质的底色；不是画 = 抛", () => {
    const { s, def, tex } = painted(), port = new SoftGl2Port(), reg = new PaintBoards({ editLocked: () => null,  port: () => port, epoch: () => 0 });
    const row = [...s.uvSets.values()][0] ?? null;   // 排法表在场景层（施工单十八）
    const b = reg.ensure(s, tex);
    eq([b.width, b.height].join(), [row!.width, row!.height].join(), "大小");
    eq((reg.board(tex)!.image as LiveImage).kind, "live", "活的图");
    assert(reg.sig().includes(`${tex}:${row!.width}x${row!.height}`), reg.sig());
    let threw = false; try { reg.ensure(s, mintGuid()); } catch { threw = true; }
    assert(threw, "不是画的 GUID 抛");
    eq((reg.board(tex)!.image as LiveImage).current(), null, "没准备之前活的图是空的（current() 只读准备好的结果）");
    reg.prepare(s);
    const cur = (reg.board(tex)!.image as LiveImage).current();
    assert(cur && cur.version > 0, "准备之后能读到合成好的");
  });
  it("换文件（epoch 变了）= 全部销毁；画没了（材质不指它了）= 那块歇着（不合成、留到关文件）", () => {
    const { s, tex } = painted(), port = new SoftGl2Port();
    let ep = 0;
    const reg = new PaintBoards({ editLocked: () => null,  port: () => port, epoch: () => ep });
    reg.ensure(s, tex); eq(reg.count, 1, "建了");
    ep = 1; reg.sync(s); eq(reg.count, 0, "换文件");
    reg.ensure(s, tex); eq(reg.count, 1, "新文件里再建");
    s.textures.delete(tex);   // 贴图表里那一行没了（清理贴图）：材质不再指着画
    reg.prepare(s); eq(reg.count, 1, "画没了：还在（歇着）"); eq((reg.board(tex)!.image as LiveImage).current(), null, "歇着 = 不合成");
  });
  it("跟着场景里那一套坐标改大小（加高；1-8a 起在提交的收尾里 follow，「准备」里的 sync 不改大小）；签名跟着变", () => {
    const { s, def, tex } = painted(), port = new SoftGl2Port(), reg = new PaintBoards({ editLocked: () => null,  port: () => port, epoch: () => 0 });
    const b = reg.ensure(s, tex), sig0 = reg.sig();
    void def;
    const [g, row] = [...s.uvSets][0];   // 排法表在场景层（施工单十八）
    s.uvSets.set(g, { ...row, height: row.height + 64 });
    reg.sync(s);
    eq(b.height, row.height, "「准备」里不改大小");
    reg.follow(s);
    eq(b.height, row.height + 64, "跟着加高"); assert(reg.sig() !== sig0, "签名变了");
    eq(reg.takePending().length, 1, "加高封了一步，等着挂进三维的栈");
  });
});

describe("落层只读回这一笔碰过的格（1-4d 第 8 条，内核 v0.14.82）", () => {
  /** 一块画板 + 一片薄层：几块分散的墨（方框比墨大很多）；cells = 交给落层的格（null = 不给）；breakAt = 第几次写进图层时抛（模拟写到一半出错）。 */
  const stroke = (cells: boolean, breakAt = 0) => {
    // 撤销的步交给一个只数数的收步口（三维里是画板登记处的 HostedSteps）：落成一笔 = 推一步
    let steps = 0;
    const sink = { _bindWorkpiece() {}, push() { steps++; }, cursorStepId: () => steps, clear() {} };
    const W = 600, H = 300, port = new SoftGl2Port(), b = new PaintBoard({ port, width: W, height: H, undo: sink as never });   // 跨好几个图块：落层一个图块写一次，才有「写到第 2 次」
    b.setBackground([0.3, 0.5, 0.7]);
    b.load(layer(W, H, pattern(W, H, true)));
    const thin = new Uint8Array(W * H * 4), ext = b.wrapLayer({ pixels: thin, w: W, h: H, prec: "u8" }), dc = new DirtyCells(W, H);
    for (const [x, y] of [[3, 4], [60, 30], [300, 80], [520, 270], [20, 270]]) {
      for (let yy = y; yy < Math.min(H, y + 6); yy++) for (let xx = x; xx < Math.min(W, x + 7); xx++) { const i = (yy * W + xx) * 4; thin[i] = 200; thin[i + 1] = 20; thin[i + 2] = 20; thin[i + 3] = 220; }
      dc.mark(x, y, 7, 6);
    }
    const id = b.wp.layerTree!.view().activeId!, leaf = new PaintingView(b.wp).layers.find((l) => l.id === id) as unknown as { pixels: { getRegion(x: number, y: number, w: number, h: number): Uint8ClampedArray }; applyRegionDiff: (...a: unknown[]) => unknown };
    const before = leaf.pixels.getRegion(0, 0, W, H), cursor0 = steps;
    // 第 breakAt 次写进图层时抛：档口每次开笔都从一个新的 PaintingView 拿叶（包装对象每次新建），所以包在叶的原型上、用完放回
    const proto = Object.getPrototypeOf(leaf) as { applyRegionDiff: (...a: unknown[]) => unknown }, orig = proto.applyRegionDiff;
    if (breakAt) { let n = 0; proto.applyRegionDiff = function (this: unknown, ...a: unknown[]) { if (++n === breakAt) throw new Error("injected write failure"); return orig.apply(this, a); }; }
    let thrown: unknown = null;
    try {
      const session = b.openStroke(id);
      session.setHostLayers([{ tex: ext, bx: 3, by: 4, bw: W - 3, bh: H - 4, layerId: id, opacity: 1, erase: false, blendMode: "source-over", ...(cells ? { cells: dc } : {}) }]);
      try { session.end(); } catch (e) { thrown = e; }
    } finally { proto.applyRegionDiff = orig; }
    const after = leaf.pixels.getRegion(0, 0, W, H), cursor1 = steps, bake = b.lastBake;
    b.dispose();
    return { before, after, thrown, cursor0, cursor1, bake };
  };
  /** 看得见的不一样的像素数：前后都全透明的像素颜色不论（读整个方框那条路合成一遍会把它的颜色归 0）。 */
  const diff = (a: Uint8ClampedArray, b2: Uint8ClampedArray): number => { let d = 0; for (let i = 0; i < a.length; i += 4) { if (a[i + 3] === 0 && b2[i + 3] === 0) continue; if (a[i] !== b2[i] || a[i + 1] !== b2[i + 1] || a[i + 2] !== b2[i + 2] || a[i + 3] !== b2[i + 3]) d++; } return d; };
  it("交了碰过的格 = 只读这些格（一次读回、字节比方框少），写进图层的和读整个方框的逐字节一样", () => {
    const box = stroke(false), cel = stroke(true);
    assert(!box.thrown && !cel.thrown, "都落成了");
    eq(box.bake?.path, "box"); eq(cel.bake?.path, "cells");
    eq(cel.bake?.readCalls, 1, "只读一次");
    assert((cel.bake?.readBytes ?? 0) < (box.bake?.readBytes ?? 0), `读的字节少了（${cel.bake?.readBytes} < ${box.bake?.readBytes}）`);
    eq(diff(box.after, cel.after), 0, "图层逐字节一样");
    eq(cel.cursor1, cel.cursor0 + 1, "落成 = 推了一步");
    assert(diff(box.before, box.after) > 100, "真画上了");
  });
  it("分几段写进图层、第 2 段抛 = 整笔不落：图层逐字节回到落笔之前、撤销栈没多一步、错误照样抛给调用的人（三维那边收成一句人话）", () => {
    const r = stroke(true, 2);
    assert(r.thrown instanceof Error && /injected write failure/.test((r.thrown as Error).message), `抛出来了（${String(r.thrown)}）`);
    let bytes = 0; for (let i = 0; i < r.before.length; i++) if (r.before[i] !== r.after[i]) bytes++;
    eq(bytes, 0, "图层和落笔之前逐字节一样（连全透明像素的颜色都一样：写了的那一段也回滚了）");
    eq(r.cursor1, r.cursor0, "撤销栈没多一步");
  });
});
