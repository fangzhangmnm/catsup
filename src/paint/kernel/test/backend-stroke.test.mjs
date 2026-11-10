// C8 stroke 档口锚（weebpaint-backend strokeBegin/Append/End/Cancel 真实现；栅格域缺省 SoftGl2Port）：
//   ① 一笔一步（begin→append→end=true；undo/redo 逐位还原）
//   ② no-op 不占步（begin+end 零点 → false、栈不动）
//   ③ cancel 无痕（引擎丢状态+令牌 cancel；下一笔照常）
//   ④ 单令牌墙（第二 begin / 错 id / 开着期间 undo → 响亮 throw）
//   ⑤ 决定论（同快照+同 (x,y,p,t) 序列 → 两个 fresh backend 逐字节同图，ADR-0009）
//   ⑥ pixelMode = livesync（令牌内真层写；undo 一步还原）
//   ⑦ erase 模式（α 衰减；undo 还原）
//   ⑧ stride 校验（%4 != 0 → throw）
// node 无 GL 无 DOM：全链 = BrushEngine(平滑/压感) → StrokeSession → RasterService.bakeStamps(SoftGl2Port)。
import { describe, it, assert, eq } from "./runner.mjs";

const { WeebPaintBackend } = await import("../src/backend/weebpaint-backend.ts");

const W = 200, H = 150;
const INJ = { appVersion: "v0.0.0-test" };
const mk = () => WeebPaintBackend.blank({ width: W, height: H }, INJ);

// (x,y,p,t) stride=4 斜线序列（t = 事件钟，16ms 步进）
function diagPts(n = 10, x0 = 40, y0 = 50, dx = 12, dy = 8, p = 0.8) {
  const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    a[i * 4] = x0 + i * dx; a[i * 4 + 1] = y0 + i * dy; a[i * 4 + 2] = p; a[i * 4 + 3] = i * 16;
  }
  return a;
}

const layerBytes = (be) => be.wp2.layerTiles.getRegion(be.docInfo().activeId, 0, 0, W, H);
const alphaSum = (px) => { let s = 0; for (let i = 3; i < px.length; i += 4) s += px[i]; return s; };
const bytesEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const BRUSH = { size: 30, color: "#e04020", opacity: 1, streamline: 0, stabilization: 0, pressureLPF: 0 };

// 响亮拒绝断言（runner 无 assert.throws）：re = 期待的 message 片段（可省）
function throws(fn, re, msg) {
  try { fn(); } catch (e) { if (re && !re.test(String(e.message))) throw new Error(`${msg}：错误文案不符（got: ${e.message}）`); return; }
  throw new Error(msg || "应当 throw 却没有");
}

describe("backend-stroke · 一笔一步（buffered → SoftGl2Port bake）", () => {
  it("begin→append→end=true；层出像素；undo/redo 逐位还原", () => {
    const be = mk();
    const id = be.strokeBegin(1, BRUSH);
    be.strokeAppend(id, diagPts());
    eq(be.strokeEnd(id), true, "真笔画落一步");
    const after = layerBytes(be);
    assert(alphaSum(after) > 0, "层上有笔迹");
    eq(be.canUndo(), true);
    assert(be.undo());
    eq(alphaSum(layerBytes(be)), 0, "undo 后回空");
    assert(be.redo());
    assert(bytesEq(layerBytes(be), after), "redo 逐位还原");
    be.dispose();
  });

  it("no-op：begin 后立即 end → false、栈不动", () => {
    const be = mk();
    const id = be.strokeBegin(1, BRUSH);
    eq(be.strokeEnd(id), false, "零点笔画不占步");
    eq(be.canUndo(), false);
    be.dispose();
  });

  it("cancel 无痕：像素零变化、不占步、下一笔照常", () => {
    const be = mk();
    const id = be.strokeBegin(1, BRUSH);
    be.strokeAppend(id, diagPts());
    be.strokeCancel(id);
    eq(alphaSum(layerBytes(be)), 0, "cancel 后真层零写");
    eq(be.canUndo(), false);
    const id2 = be.strokeBegin(1, BRUSH);   // 令牌已收口 → 下一笔 begin 不被挡
    be.strokeAppend(id2, diagPts());
    eq(be.strokeEnd(id2), true);
    be.dispose();
  });
});

describe("backend-stroke · 单令牌墙（响亮拒绝）", () => {
  it("第二个 begin / 错 id append / 开着期间 undo → throw", () => {
    const be = mk();
    // 先落一步（否则栈空，undo() 在 canUndo 门就返 false，测不到令牌墙）
    const id0 = be.strokeBegin(1, BRUSH);
    be.strokeAppend(id0, diagPts(4));
    eq(be.strokeEnd(id0), true);
    const id = be.strokeBegin(1, BRUSH);
    be.strokeAppend(id, diagPts(3));
    throws(() => be.strokeBegin(1, BRUSH), /already open/, "第二 begin 拒绝");
    throws(() => be.strokeAppend(id + 99, diagPts(1)), /no such open stroke/, "错 id 拒绝");
    throws(() => be.undo(), null, "开着期间 undo 被令牌墙挡（workpiece beforeApply throw）");
    be.strokeCancel(id);
    eq(be.canUndo(), true, "cancel 后栈自由（第一步还在）");
    assert(be.undo(), "收口后 undo 恢复正常");
    be.dispose();
  });

  it("stride 校验：length % 4 != 0 → throw", () => {
    const be = mk();
    const id = be.strokeBegin(1, BRUSH);
    throws(() => be.strokeAppend(id, new Float32Array([1, 2, 3])), /stride-4/, "stride 校验");
    be.strokeCancel(id);
    be.dispose();
  });
});

describe("backend-stroke · 决定论（ADR-0009）", () => {
  it("同快照 + 同 (x,y,p,t) 序列 → 两个 fresh backend 逐字节同图", () => {
    const paint = () => {
      const be = mk();
      const id = be.strokeBegin(1, { ...BRUSH, streamline: 0.4, pressureLPF: 50, taperOut: 1.5 });
      const pts = diagPts(14, 30, 30, 10, 7, 0.6);
      for (let i = 0; i < 14; i++) pts[i * 4 + 2] = 0.3 + 0.05 * i;   // 变压感（吃 LPF/taper 路径）
      be.strokeAppend(id, pts);
      eq(be.strokeEnd(id), true);
      const px = layerBytes(be);
      be.dispose();
      return px;
    };
    const a = paint(), b = paint();
    assert(bytesEq(a, b), "决定论：同输入 → 同输出（平滑/压感/栅格全链无时钟无随机）");
  });
});

describe("backend-stroke · pixelMode / erase", () => {
  it("pixelMode（livesync 令牌内真层写）：end=true、undo 一步还原", () => {
    const be = mk();
    const id = be.strokeBegin(1, { ...BRUSH, pixelMode: true, size: 8 });
    be.strokeAppend(id, diagPts(8, 60, 60, 6, 4, 1));
    eq(be.strokeEnd(id), true);
    assert(alphaSum(layerBytes(be)) > 0, "像素笔真层落笔");
    assert(be.undo());
    eq(alphaSum(layerBytes(be)), 0, "一步还原");
    be.dispose();
  });

  it("erase：先画后擦 α 衰减；undo 还原到擦前", () => {
    const be = mk();
    const id = be.strokeBegin(1, BRUSH);
    be.strokeAppend(id, diagPts());
    eq(be.strokeEnd(id), true);
    const painted = layerBytes(be);
    const paintedA = alphaSum(painted);
    const id2 = be.strokeBegin(1, { ...BRUSH, mode: "erase" });
    be.strokeAppend(id2, diagPts());
    eq(be.strokeEnd(id2), true, "擦除是真变化 → 占步");
    assert(alphaSum(layerBytes(be)) < paintedA, "erase 衰减 α");
    assert(be.undo());
    assert(bytesEq(layerBytes(be), painted), "undo 回擦前");
    be.dispose();
  });
});
