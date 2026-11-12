// 画板的二维落笔口（施工单二十一第 1 刀）：内核自己的二维笔画在画板上。不开浏览器：软件显卡 + 真画板 + 真撤销栈。created 2026-11-12 by Claude Opus 5.5
// ① 同样几笔（同一支笔、同样的点、同样的时间）= 画画仓后端（内核自己那套 strokeBegin / Append / End）画出来的图层逐字节一样；合成 = 把那几层装进一块干净画板合出来的，逐字节一样
// ② 画着的时候：图层一个字节不动（overlay 方式）；显示那张合成带着这一笔、和整张重合一样；存盘那张（composeBytes）= 落笔之前
// ③ 撤销逐位还原、重做回来；一笔 = 撤销里的一步
// ④ 锁：开一笔问一次（锁着 = 抛、什么都没开）；落层再问一次（一笔当中锁上 = 抛、整笔回滚、令牌收口，解锁后下一笔照常）
// ⑤ 同一块画板同一时间只有一笔；开着时不能睡；登记处 cancelOpen 收得掉；名册问得到
import { describe, it, eq, assert } from "./runner.mjs";
import { PaintBoard } from "../src/paint/board.ts";
import { PaintLockedError } from "../src/paint/paint-limit.ts";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { WeebPaintBackend } from "../src/paint/kernel/src/backend/weebpaint-backend.ts";
import { resolvedBrushOf, strokeSmoothOf, type BrushId } from "../src/paint/brush-records.ts";
import { rig, rng, hash } from "./paint-undo-kit.ts";
import { PAINT_UNDO_KIND } from "../src/paint/boards.ts";

const W = 96, H = 64;
type Pt = readonly [number, number, number, number];   // x, y, 压感, 一笔里的毫秒
const line = (seed: number, n = 24): Pt[] => { const r = rng(seed), x0 = 8 + r() * 30, y0 = 8 + r() * 20, dx = 1 + r() * 2.5, dy = (r() - 0.5) * 2.4; return Array.from({ length: n }, (_, i) => [x0 + i * dx, y0 + i * dy + Math.sin(i * 0.7) * 3, 0.25 + 0.7 * Math.abs(Math.sin(i * 0.4 + seed)), i * 9] as Pt); };
interface StrokeSpec { readonly id: BrushId; readonly size: number; readonly opacity: number; readonly hardness: number; readonly color: string; readonly erase?: boolean; readonly pts: readonly Pt[] }
const brushOf = (s: StrokeSpec) => ({ ...resolvedBrushOf(s.id, { size: s.size, opacity: s.opacity, hardness: s.hardness }), color: s.color });
const STROKES: readonly StrokeSpec[] = [
  { id: "pen", size: 9, opacity: 0.85, hardness: 0.7, color: "#d03020", pts: line(1) },
  { id: "sketch", size: 6, opacity: 1, hardness: 0.75, color: "#2050c0", pts: line(2) },
  { id: "ink", size: 8, opacity: 1, hardness: 0.5, color: "#106030", pts: line(3) },
  { id: "eraser", size: 14, opacity: 0.9, hardness: 0.8, color: "#000000", erase: true, pts: line(4) },
];
const layerBytes = (b: PaintBoard): Uint8Array => { const id = b.wp.layerTree!.view().activeId!; return new Uint8Array(b.wp.layerTiles.getRegion(id, 0, 0, b.width, b.height)); };
const draw = (b: PaintBoard, s: StrokeSpec): boolean => {
  const br = brushOf(s), [p0, ...rest] = s.pts;
  const st = b.openBrushStroke(br, { x: p0[0], y: p0[1], pressure: p0[2], t: p0[3] }, { erase: !!s.erase, ...(strokeSmoothOf(br) ? { smooth: strokeSmoothOf(br) } : {}) });
  for (const p of rest) st.move(p[0], p[1], p[2], p[3]);
  return st.end();
};
/** 画画仓后端画同样几笔（内核自己那套）：返回后端（拿图层 / 导出数据）。 */
const viaBackend = (strokes: readonly StrokeSpec[]): WeebPaintBackend => {
  const be = WeebPaintBackend.blank({ width: W, height: H }, { appVersion: "v0.0.0-test" }), leaf = be.docInfo().activeId!;
  for (const s of strokes) {
    const id = be.strokeBegin(leaf, { ...brushOf(s), mode: s.erase ? "erase" : "brush" } as never), a = new Float32Array(s.pts.length * 4);
    s.pts.forEach((p, i) => a.set(p, i * 4));
    be.strokeAppend(id, a); be.strokeEnd(id);
  }
  return be;
};

describe("画板的二维落笔口（施工单二十一第 1 刀）", () => {
  it("① 同样几笔 = 画画仓后端画出来的：图层逐字节一样（普通笔 / 草稿笔 / 勾线笔 / 橡皮，压感在变、带平滑的也一样）", () => {
    for (let k = 1; k <= STROKES.length; k++) {
      const list = STROKES.slice(0, k), b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H });
      for (const s of list) eq(draw(b, s), true, `${s.id} 落了一步`);
      const be = viaBackend(list), want = new Uint8Array(be.wp2.layerTiles.getRegion(be.docInfo().activeId!, 0, 0, W, H)), got = layerBytes(b);
      let ink = 0; for (let i = 3; i < got.length; i += 4) if (got[i]) ink++;
      assert(ink > 50, `画上了（${ink} 像素）`);
      eq(hash(got), hash(want), `前 ${k} 笔（到 ${list[k - 1].id}）图层逐字节 = 后端`);
      be.dispose(); b.dispose();
    }
  });
  it("① 合成 = 把后端画好的那几层装进一块干净画板合出来的（逐字节）", () => {
    const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H });
    for (const s of STROKES) draw(b, s);
    const be = viaBackend(STROKES), ref = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H });
    ref.load(be.wp2.exportData() as never);
    eq(hash(new Uint8Array(b.composeBytes()!)), hash(new Uint8Array(ref.composeBytes()!)), "整张合成逐字节一样");
    be.dispose(); b.dispose(); ref.dispose();
  });
  it("② 画着的时候：图层不动、存盘那张 = 落笔之前；显示那张带着这一笔、和整张重合一样；不能睡", () => {
    const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H });
    draw(b, STROKES[0]);
    const layer0 = hash(layerBytes(b)), save0 = hash(new Uint8Array(b.composeBytes()!)), shown0 = hash(new Uint8Array(b.composeBytes()!));
    const s = STROKES[1], br = brushOf(s), [p0, ...rest] = s.pts;
    const st = b.openBrushStroke(br, { x: p0[0], y: p0[1], pressure: p0[2], t: p0[3] }, { smooth: strokeSmoothOf(br)! });
    for (const p of rest.slice(0, 15)) st.move(p[0], p[1], p[2], p[3]);
    assert(st.open && b.strokeOpen, "一笔开着");
    eq(hash(layerBytes(b)), layer0, "图层一个字节没动（overlay 方式）");
    eq(hash(new Uint8Array(b.composeBytes()!)), save0, "存盘那张 = 落笔之前（不带正在画的那一笔）");
    const v = b.compose(); assert(!!v, "合成了");
    const port = (b as unknown as { port: SoftGl2Port }).port, shown = hash(new Uint8Array(port.readPixels(v!.fbo, 0, 0, W, H)));
    assert(shown !== shown0, "显示那张带着这一笔");
    eq(b.verifyFull()?.diff, 0, "显示那张 = 整张重合");
    let threw = ""; try { b.sleep(); } catch (e) { threw = String(e); }
    assert(/stroke is open/.test(threw), "一笔开着不能睡");
    for (const p of rest.slice(15)) st.move(p[0], p[1], p[2], p[3]);
    eq(st.end(), true); assert(!st.open && !b.strokeOpen, "抬笔后收了");
    assert(hash(layerBytes(b)) !== layer0, "抬笔才落进图层");
    b.sleep(); assert(b.asleep, "收了之后能睡");
    b.dispose();
  });
  it("②′ 带平滑的笔（勾线笔）每动一下：显示那张 = 整张重合（平滑器攒着的尾巴每下都变、引擎不一定报脏区；只看脏区 = 拿旧图交差，mid-stroke-save V12 抓到过）", () => {
    const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H }), s = STROKES[2], br = brushOf(s), [p0, ...rest] = s.pts;
    const st = b.openBrushStroke(br, { x: p0[0], y: p0[1], pressure: p0[2], t: p0[3] }, { smooth: strokeSmoothOf(br)! });
    const diffs: number[] = [];
    for (const p of rest) { st.move(p[0], p[1], p[2], p[3]); diffs.push(b.verifyFull()?.diff ?? -1); }
    eq(diffs.filter((d) => d !== 0).length, 0, `每一下都对上（${diffs.join(",")}）`);
    st.end(); b.dispose();
  });
  it("②″ 显示那一侧只报真变了的格：每动一下，前后两张显示图（带着这一笔）真变了的每个像素都在这一下报的格里；没变的那一下不报（四支笔、带平滑的、橡皮）", () => {
    for (const s of STROKES) {
      const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H });
      if (s.erase) draw(b, STROKES[0]);
      const br = brushOf(s), [p0, ...rest] = s.pts, sm = strokeSmoothOf(br);
      let prev = b.shownBytes()!;
      const st = b.openBrushStroke(br, { x: p0[0], y: p0[1], pressure: p0[2], t: p0[3] }, { erase: !!s.erase, ...(sm ? { smooth: sm } : {}) });
      let outside = 0, reported = 0, partial = 0;
      const step = (): void => {
        const cur = b.shownBytes()!, ch = b.changedSince(prev.version);
        if (ch === "all") return;   // 说不清 = 显示那一侧整张重拷（不会错）
        const inRun = (x: number, y: number): boolean => { for (const q of ch.runs()) if (x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h) return true; return false; };
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; if (cur.px[o] !== prev.px[o] || cur.px[o + 1] !== prev.px[o + 1] || cur.px[o + 2] !== prev.px[o + 2] || cur.px[o + 3] !== prev.px[o + 3]) { if (!inRun(x, y)) outside++; } }
        if (!ch.empty) { reported++; if (ch.fraction() < 1) partial++; }
        prev = cur;
      };
      step();
      for (const p of rest) { st.move(p[0], p[1], p[2], p[3]); step(); }
      eq(outside, 0, `${s.id}：变了的像素都在报的格里`);
      assert(partial > 0, `${s.id}：真的只报了一部分（${partial} / ${reported} 下没报整张）`);
      // 抬笔：落层之后那一版只报落层碰过的格（不是整张），落层前后变了的像素都在里面
      const before = prev.version;
      eq(st.end(), true);
      const after = b.shownBytes()!, land = b.changedSince(before);
      assert(land !== "all" && !land.empty && land.fraction() < 1, `${s.id}：抬笔那一版只报落层碰过的格（${land === "all" ? "整张" : `${land.count} 格`}）`);
      step();
      eq(outside, 0, `${s.id}：抬笔前后变了的像素都在报的格里`);
      void after; b.dispose();
    }
  });
  it("③ 经登记处：一笔 = 撤销里的一步；撤销逐位还原、重做回来；cancelOpen 收得掉；名册问得到", () => {
    const R = rig(1), tex = R.startPaint(R.defs[0]), b = R.boards.ensure(R.cur(), tex);
    const before = R.shot();
    const s = STROKES[2], br = brushOf(s), [p0, ...rest] = s.pts;
    const st = R.boards.openBrushStroke(tex, br, { x: p0[0], y: p0[1], pressure: p0[2], t: p0[3] }, { smooth: strokeSmoothOf(br)! });
    assert(R.boards.anyStrokeOpen(), "名册问得到：有一笔开着");
    for (const p of rest) st.move(p[0], p[1], p[2], p[3]);
    eq(st.end(), true); eq(R.boards.anyStrokeOpen(), false, "抬笔后没有开着的");
    const recs = R.boards.takePending();
    eq(recs.length, 1, "封了一步"); R.h.commitRecords("b", { title: "画一笔" }, recs.map((data) => ({ kind: PAINT_UNDO_KIND, data }))); R.boards.sync(R.cur());
    const after = R.shot(); assert(after !== before, "画上了");
    R.undo(); eq(R.shot(), before, "撤销逐位还原"); R.redo(); eq(R.shot(), after, "重做回来");
    // 开着一笔时撤销：只取消这一笔（零痕迹）、历史不动（同编辑器的手势、手感账 P-11）；之后照常撤上一步
    const st2 = R.boards.openBrushStroke(tex, br, { x: 20, y: 20, pressure: 1, t: 0 });
    st2.move(40, 30, 1, 20);
    R.undo(); eq(st2.open, false, "这一笔被取消了"); eq(R.shot(), after, "历史没翻：画 = 这一笔落笔之前");
    eq(st2.end(), false, "被取消之后抬手 = 没落（不抛）");
    eq(R.boards.anyStrokeOpen(), false); eq(R.boards.takePending().length, 0, "取消的那一笔不封步");
    R.undo(); eq(R.shot(), before, "再按一次才撤上一步");
    void b;
  });
  it("④ 锁：开一笔问一次（锁着 = 抛、什么都没开）；一笔当中锁上 = 落层时抛、整笔回滚，解锁后下一笔照常", () => {
    let lock: string | null = "锁着呢";
    const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H, locked: () => lock });
    const s = STROKES[0], br = brushOf(s), at = { x: 10, y: 10, pressure: 1, t: 0 };
    let e1: unknown = null; try { b.openBrushStroke(br, at); } catch (e) { e1 = e; }
    assert(e1 instanceof PaintLockedError, "锁着开不了"); eq(b.strokeOpen, false, "什么都没开");
    lock = null;
    const layer0 = hash(layerBytes(b)), st = b.openBrushStroke(br, at);
    for (const p of s.pts) st.move(p[0], p[1], p[2], p[3]);
    lock = "画到一半锁上了";
    let e2: unknown = null; try { st.end(); } catch (e) { e2 = e; }
    assert(e2 instanceof PaintLockedError, "落层时抛"); eq(hash(layerBytes(b)), layer0, "整笔回滚、图层一个字节没动"); eq(b.strokeOpen, false, "收了");
    lock = null;
    eq(draw(b, s), true, "解锁后下一笔照常（令牌收口了）");
    b.dispose();
  });
  it("⑤ 同一块画板同一时间只有一笔：二维笔开着时再开（二维 / 三维）= 抛；取消 = 零痕迹", () => {
    const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H }), br = brushOf(STROKES[0]), at = { x: 10, y: 10, pressure: 1, t: 0 };
    const layer0 = hash(layerBytes(b)), st = b.openBrushStroke(br, at);
    st.move(40, 30, 1, 30);
    let a = ""; try { b.openBrushStroke(br, at); } catch (e) { a = String(e); }
    let c = ""; try { b.openStroke(); } catch (e) { c = String(e); }
    assert(/already open/.test(a) && /2D stroke is open/.test(c), "再开一笔 = 抛（说清楚）");
    st.cancel(); eq(st.open, false); eq(hash(layerBytes(b)), layer0, "取消 = 零痕迹");
    eq(draw(b, STROKES[0]), true, "取消之后照常画");
    b.dispose();
  });
});
