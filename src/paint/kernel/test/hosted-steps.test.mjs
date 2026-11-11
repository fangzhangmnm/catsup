// 画画内核的撤销出口：封好的步交给宿主的栈（贴图主线 0-2；施工单 CatsUp ai-docs/20261110-paint-workorders-4.md 第三节的门 2–7）。created 2026-11-10 by Claude Opus 5.5
// A 两件作品共用一个宿主栈（夹着别的步、随机撤销 / 重做 / 截断）= 各自用内核自带的栈做同样的事，像素逐步一样；最后全丢掉，活步为零
// B 乱用（翻错顺序、别的作品的步、drop 过的、令牌开着、clear 之前的）都抛 StepOrderError、什么都没碰；之后按对的顺序还能翻；同一步 drop 两次不出事
// C 脏不脏和自带栈逐条一样   D 翻的时候部件抛 = 不可恢复：onUnrecoverable 一次、宿主收到 onReset、旧步再翻抛 StepOrderError
// E 留开的几个子步封口后宿主只收到一步   另：步归宿主管时 undo / redo / canUndo 抛；后端注入口（画一笔 = 一步、宿主翻得回去）
// 内核自己的测试（test/kernel-tests.json）：不读仓里的文件；扫源码的两条守卫在 hosted-steps-guard.test.mjs
import { describe, it, assert, eq } from "./runner.mjs";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { PaintingView } from "../src/backend/workpiece/painting-view.ts";
import { Workpiece } from "../src/backend/workpiece/workpiece.ts";
import { History } from "../src/backend/workpiece/history.ts";
import { HostedSteps, StepOrderError } from "../src/backend/workpiece/hosted-steps.ts";
import { LayersFace } from "../src/backend/layers-face.ts";

const W = 48, H = 48;
const solid = (w, h, c) => { const b = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) b.set(c, i * 4); return b; };
const walk = (nodes, out = []) => { for (const n of nodes) { out.push(n); if (n.isGroup) walk(n.children, out); } return out; };
const throwsOrder = (fn, msg) => { try { fn(); } catch (e) { if (!(e instanceof StepOrderError)) throw new Error(`${msg}：抛的不是 StepOrderError（${e?.name}: ${e?.message}）`); return; } throw new Error(`${msg}：应当抛 StepOrderError`); };
const _hists = [];

/** 测试里的最小宿主：一个数组（游标 = 已应用到第几个），装好几件作品的步，中间夹着别的步。 */
class Host {
  constructor() { this.list = []; this.cur = 0; this.resets = 0; }
  /** 给一件作品的 StepHost；get() 拿这件作品的 { hs, hist }（建 HostedSteps 时它们还没建好）。 */
  stepHost(get) {
    return {
      onStep: (step) => { this.truncate(); this.list.push({ ...get(), step }); this.cur++; },
      onReset: () => { const { hs } = get(); this.resets++; const before = this.list.slice(0, this.cur).filter((e) => e.hs === hs).length; this.list = this.list.filter((e) => e.hs !== hs); this.cur -= before; },
    };
  }
  /** 截断还没重做的那一段：属于作品的，每一步都调 drop。 */
  truncate() { for (const e of this.list.splice(this.cur)) e.hs?.drop(e.step); }
  other() { this.truncate(); this.list.push({ other: true }); this.cur++; }
  undo() { if (!this.cur) return null; const e = this.list[this.cur - 1]; if (e.hs) { e.hist.sealCheckpoint(); if (!e.hist.flip(e.step)) return null; } this.cur--; return e; }
  redo() { if (this.cur >= this.list.length) return null; const e = this.list[this.cur]; if (e.hs) { e.hist.sealCheckpoint(); if (!e.hist.flip(e.step)) return null; } this.cur++; return e; }
}

/** 一件作品：host 给了 = 步交给宿主；不给 = 内核自带的栈（对照组）。 */
function makeArt(host) {
  const errs = [];
  const art = { errs };
  if (host) {
    art.hs = new HostedSteps(host.stepHost(() => ({ hs: art.hs, hist: art.hist })));
    art.hist = new History({ maxQuotaBytes: 1 << 30, onUnrecoverable: (e) => errs.push(e), hosted: art.hs });
  } else art.hist = new History({ maxQuotaBytes: 1 << 30, onUnrecoverable: (e) => errs.push(e) });
  _hists.push(art.hist);
  art.wp2 = new PaintingWorkpiece({ undo: art.hist.steps, tree: { width: W, height: H }, onTokenLeak: () => {} });
  art.doc = new PaintingView(art.wp2);
  art.hist.attach(art.wp2);
  art.lt = new LayersFace({ history: art.hist, tree: art.wp2.layerTree, tiles: art.wp2.layerTiles, port: art.doc, status: () => {} });
  art.leaves = () => walk(art.doc.layers).filter((n) => !n.isGroup);
  art.sig = () => walk(art.doc.layers).map((n) => { if (n.isGroup) return `g${n.id}`; const d = n.pixels.getRegion(0, 0, W, H); let x = 0; for (let i = 0; i < d.length; i++) x = (x * 31 + d[i]) | 0; return `${n.id}:${x}`; }).join(",");
  art.paint = (li, x, y, c) => { const L = art.leaves()[li]; art.hist.withPoint("paint", undefined, () => L.applyRegionDiff(x, y, 12, 12, solid(12, 12, c))); };
  return art;
}

describe("画画内核的撤销出口（0-2）", () => {
  it("A 两件作品共用一个宿主栈（夹着别的步）= 各自用自带的栈做同样的事：每一下像素都一样；最后全丢掉，活步为零、没有不可恢复", () => {
    for (let seed = 1; seed <= 12; seed++) {
      let s = seed * 7919;
      const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const host = new Host(), A = makeArt(host), B = makeArt(host), cA = makeArt(null), cB = makeArt(null), pair = new Map([[A.hs, cA], [B.hs, cB]]);
      const log = [];
      for (let i = 0; i < 60; i++) {
        const r = rnd();
        if (r < 0.32) { const [h, c] = rnd() < 0.5 ? [A, cA] : [B, cB], li = Math.floor(rnd() * h.leaves().length), x = Math.floor(rnd() * 36), y = Math.floor(rnd() * 36), col = [Math.floor(rnd() * 255), 40, Math.floor(rnd() * 255), 255]; h.paint(li, x, y, col); c.paint(li, x, y, col); log.push("paint"); }
        else if (r < 0.40) { const [h, c] = rnd() < 0.5 ? [A, cA] : [B, cB]; h.lt.addLayer("n"); c.lt.addLayer("n"); log.push("add"); }
        else if (r < 0.48) { host.other(); log.push("other"); }
        else if (r < 0.78) { const e = host.undo(); if (e?.hs) pair.get(e.hs).hist.undo(); log.push("undo"); }
        else { const e = host.redo(); if (e?.hs) pair.get(e.hs).hist.redo(); log.push("redo"); }
        eq(A.sig(), cA.sig(), `种子 ${seed} 第 ${i} 步（${log.slice(-4).join(" ")}）甲`);
        eq(B.sig(), cB.sig(), `种子 ${seed} 第 ${i} 步（${log.slice(-4).join(" ")}）乙`);
      }
      eq(A.errs.length + B.errs.length, 0, "没有不可恢复");
      host.cur = 0; host.truncate();
      eq(A.hs.liveCount() + B.hs.liveCount(), 0, "全部丢掉之后活步为零");
    }
  });

  it("B 乱用：顺序翻错 / 别的作品的步 / drop 过的 / 令牌开着 / clear 之前的，都抛 StepOrderError、像素和「现在停在哪」都没变；之后按对的顺序还能翻；同一步 drop 两次不出事", () => {
    const host = new Host(), A = makeArt(host), B = makeArt(host);
    A.paint(0, 2, 2, [255, 0, 0, 255]); A.paint(0, 10, 10, [0, 255, 0, 255]); B.paint(0, 4, 4, [0, 0, 255, 255]);
    const [a1, a2] = host.list.filter((e) => e.hs === A.hs).map((e) => e.step), b1 = host.list.find((e) => e.hs === B.hs).step;
    const sig0 = A.sig(), cur0 = A.wp2.stateVersion;
    throwsOrder(() => A.hist.flip(a1), "顺序翻错（停在 a2 却翻 a1）");
    throwsOrder(() => A.hist.flip(b1), "翻别的作品的步");
    eq(A.sig(), sig0, "像素没变"); eq(A.wp2.stateVersion, cur0, "停在哪没变");
    // 令牌开着：History 自己留开的令牌、和 Workpiece 的写令牌都拦
    A.hist.withPoint("paint", { checkpoint: false }, () => A.leaves()[0].applyRegionDiff(20, 20, 4, 4, solid(4, 4, [9, 9, 9, 255])));
    throwsOrder(() => A.hist.flip(a2), "History 留开的令牌");
    A.hist.sealCheckpoint();   // 宿主开始撤销前自己封口：封出 a3
    const a3 = host.list[host.cur - 1].step;
    const tok = A.wp2.begin("x");
    throwsOrder(() => A.hist.flip(a3), "Workpiece 的写令牌开着");
    tok.cancel();
    // 按对的顺序：撤 a3、撤 b1？—— 不同作品不相干；撤 A 的 a3、a2
    assert(A.hist.flip(a3), "撤 a3"); assert(A.hist.flip(a2), "撤 a2");
    throwsOrder(() => A.hist.flip(a3), "停在 a1 时翻 a3（隔了一步）");
    assert(A.hist.flip(a2), "重做 a2");
    // drop 过的：撤 a2 后宿主截断（新动作）
    assert(A.hist.flip(a2), "再撤 a2");
    A.hs.drop(a2); A.hs.drop(a2);   // 同一步两次
    throwsOrder(() => A.hist.flip(a2), "翻 drop 过的");
    assert(A.hist.flip(a1), "照样能撤 a1");
    // clear 之前的
    A.hist.clear();
    throwsOrder(() => A.hist.flip(a1), "clear 之前的旧步");
    eq(A.errs.length, 0, "都不算不可恢复");
  });

  it("C 脏不脏：存一次，画一步，撤回去 = 不脏；重做 = 脏；和自带的栈逐条一样", () => {
    for (const hosted of [true, false]) {
      const host = new Host(), A = makeArt(hosted ? host : null);
      A.paint(0, 1, 1, [1, 2, 3, 255]);
      A.wp2.markSaved();
      eq(A.wp2.isDirty(), false, `${hosted ? "宿主" : "自带"}：存过`);
      A.paint(0, 5, 5, [4, 5, 6, 255]);
      eq(A.wp2.isDirty(), true, "画了一步");
      if (hosted) host.undo(); else A.hist.undo();
      eq(A.wp2.isDirty(), false, "撤回存过的地方 = 不脏");
      if (hosted) host.redo(); else A.hist.redo();
      eq(A.wp2.isDirty(), true, "重做 = 脏");
    }
  });

  it("D 不可恢复：翻的时候部件 swapRecord 抛 → onUnrecoverable 一次、宿主收到 onReset、之后翻旧步抛 StepOrderError；活步为零", () => {
    class Val { constructor(wp) { this.kind = "val"; this._wp = wp; this.v = 0; this._o = null; this.boom = false; } set(x) { this._wp._componentWrite(this); if (this._o === null) this._o = { v: this.v }; this.v = x; } sealRecord() { const o = this._o; this._o = null; return o && o.v !== this.v ? o : null; } swapRecord(d) { if (this.boom) throw new Error("swap boom"); const c = this.v; this.v = d.v; return { v: c }; } recordBytes() { return 8; } disposeRecord() {} }
    class Wp extends Workpiece { constructor(o) { super(o); this.val = new Val(this); this.register(this.val, { undo: "recorded" }); } }
    const host = new Host(), errs = [], art = {};
    art.hs = new HostedSteps(host.stepHost(() => ({ hs: art.hs, hist: art.hist })));
    art.hist = new History({ maxQuotaBytes: 1 << 30, onUnrecoverable: (e) => errs.push(e), hosted: art.hs });
    const wp = new Wp({ undo: art.hist.steps, onTokenLeak: () => {} }); art.hist.attach(wp);
    art.hist.withPoint("v", undefined, () => wp.val.set(1)); art.hist.withPoint("v", undefined, () => wp.val.set(2));
    const [s1, s2] = host.list.map((e) => e.step);
    wp.val.boom = true;
    eq(art.hist.flip(s2), false, "翻失败返回 false");
    eq(errs.length, 1, "onUnrecoverable 一次"); eq(host.resets, 1, "宿主收到 onReset"); eq(host.list.length, 0, "宿主手上属于它的步都扔了");
    wp.val.boom = false;
    throwsOrder(() => art.hist.flip(s1), "之后翻旧步");
    eq(art.hs.liveCount(), 0, "活步为零");
  });

  it("E 并步：留开的几个子步封口之后，宿主只收到一步；撤一次全回去", () => {
    const host = new Host(), A = makeArt(host), sig0 = A.sig();
    for (let i = 0; i < 3; i++) A.hist.withPoint(`sub${i}`, { checkpoint: false }, () => A.leaves()[0].applyRegionDiff(4 * i, 0, 4, 4, solid(4, 4, [200, i * 50, 0, 255])));
    eq(host.list.length, 0, "封口之前宿主一步都没收到");
    A.hist.sealCheckpoint();
    eq(host.list.length, 1, "封口之后只收到一步"); eq(host.list[0].step.label, "sub0+sub1+sub2", "标签 = 各名字用 + 连起来");
    host.undo();
    eq(A.sig(), sig0, "撤一次全回去");
  });

  it("步归宿主管时 undo / redo / canUndo / peekLabel 抛（不悄悄返回假）、什么都不碰；没给 onUnrecoverable 建不起来；自带栈的 History 不许 flip", () => {
    const host = new Host(), A = makeArt(host);
    A.hist.withPoint("p", { checkpoint: false }, () => A.leaves()[0].applyRegionDiff(0, 0, 2, 2, solid(2, 2, [1, 1, 1, 255])));
    for (const f of ["undo", "redo", "canUndo", "canRedo"]) { let threw = false; try { A.hist[f](); } catch (e) { threw = /hosted/.test(e.message); } assert(threw, `${f} 应当抛`); }
    let threw = false; try { A.hist.peekLabel("undo"); } catch { threw = true; } assert(threw, "peekLabel 应当抛");
    eq(host.list.length, 0, "undo 没替宿主封口（什么都没碰）");
    A.hist.sealCheckpoint();
    threw = false; try { new History({ maxQuotaBytes: 1, hosted: new HostedSteps(host.stepHost(() => ({}))) }); } catch { threw = true; }
    assert(threw, "没给 onUnrecoverable 建不起来");
    const C = makeArt(null); threw = false; try { C.hist.flip({ id: 1, entries: [] }); } catch { threw = true; } assert(threw, "自带栈的 History 不许 flip");
  });

  it("后端注入口：给了 stepHost = 画一笔落一步交给宿主、宿主翻得回去；backend.undo 抛；不给 = 和以前一样", async () => {
    const { WeebPaintBackend } = await import("../src/backend/weebpaint-backend.ts");
    const host = new Host(), art = {};   // 后端建的时候装载会清一次步（宿主先收到一次 onReset），那时 art 还空着
    const be = WeebPaintBackend.blank({ width: 64, height: 64 }, { appVersion: "v0.0.0-test", stepHost: host.stepHost(() => ({ hs: art.hs, hist: art.hist })) });
    art.hs = be.history.steps; art.hist = be.history;
    const before = be.wp2.layerTiles.getRegion(be.docInfo().activeId, 0, 0, 64, 64).slice();
    const pts = new Float32Array([10, 10, 0.8, 0, 30, 20, 0.8, 16, 50, 40, 0.8, 32]);
    const id = be.strokeBegin(be.docInfo().activeId, { size: 12, color: "#e04020", opacity: 1, streamline: 0, stabilization: 0, pressureLPF: 0 });
    be.strokeAppend(id, pts);
    eq(be.strokeEnd(id), true, "真笔画落一步（「真落了一步」的计数在宿主模式下照样有）");
    eq(host.list.length, 1, "宿主收到一步");
    let threw = false; try { be.undo(); } catch (e) { threw = /hosted/.test(e.message); } assert(threw, "backend.undo 抛（归宿主管）");
    host.undo();
    const after = be.wp2.layerTiles.getRegion(be.docInfo().activeId, 0, 0, 64, 64);
    assert(after.every((v, i) => v === before[i]), "宿主翻回去 = 像素回到画之前");
    host.cur = 0; host.truncate(); be.history.clear();
    const plain = WeebPaintBackend.blank({ width: 16, height: 16 }, { appVersion: "v0.0.0-test" });
    eq(plain.history.hosted, false, "不给 = 内核自带的栈"); eq(plain.canUndo(), false);
  });

  it("（收尾）清掉这些历史：小块池的句柄都还回去（泄漏门在整个套件跑完后查）", () => {
    for (const h of _hists) h.clear();
    _hists.length = 0;
  });
});
