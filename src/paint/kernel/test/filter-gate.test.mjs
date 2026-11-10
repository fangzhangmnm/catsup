// C8 filter 档口锚（weebpaint-backend filterBegin/SetParams/Commit/Cancel 真实现；
// kernel 清单 = backend/filters/index.ts，adjust surrogate 的 headless 升格）：
//   ① 未注册 id / 空层 / 不存在叶 → 响亮 throw
//   ② 参数重算一步落层（commit=true；层字节 = kernel 对冻结源的参考 bake 逐位；undo/redo 逐位）
//   ③ 重算不累积（连着 setParams 两次 → 结果 = 只应用最后一次参数的参考值）
//   ④ identity commit → false、不占步（逐 tile memcmp 零扣押）
//   ⑤ cancel 无痕（setParams 后 cancel → 真层逐位不变、不占步）
//   ⑥ 单令牌墙（filter open 期间 filterBegin/strokeBegin/undo → throw；stroke open 期间 filterBegin → throw）
//   ⑦ 选区 mask（左半选区 → 左半变右半逐位不变；mask 经 materializeMaskRegion 同一窄读口）
//   ⑧ kernel 清单完整性（六 region filter 全注册；defaults JSON-able——MCP schema 前提）
//   ⑨ dispose 时 open filter → cancel 收口不 throw（interrupt=cancel 家规）
import { describe, it, assert, eq } from "./runner.mjs";

const { WeebPaintBackend } = await import("../src/backend/weebpaint-backend.ts");
const { findViewNodeById } = await import("../src/backend/workpiece/painting-view.ts");
const { FILTER_KERNELS, getFilterKernel } = await import("../src/backend/filters/index.ts");
const { HsbKernel } = await import("../src/backend/filters/hsb-kernel.ts");
const { Selection } = await import("../src/backend/selection.ts");

const W = 160, H = 120;
const BRUSH = { size: 40, color: "#3070c0", opacity: 1, streamline: 0, stabilization: 0, pressureLPF: 0 };

function throws(fn, re, msg) {
  try { fn(); } catch (e) { if (re && !re.test(String(e.message))) throw new Error(`${msg}：错误文案不符（got: ${e.message}）`); return; }
  throw new Error(msg || "应当 throw 却没有");
}

// 铺一笔确定性底色（stroke 档自产——两个 fresh backend 同图，backend-stroke ⑤ 已锚）
function mkPainted() {
  const be = WeebPaintBackend.blank({ width: W, height: H }, { appVersion: "v0.0.0-test" });
  const id = be.strokeBegin(1, BRUSH);
  const n = 8;
  const pts = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { pts[i*4] = 20 + i * 16; pts[i*4+1] = 30 + i * 8; pts[i*4+2] = 0.9; pts[i*4+3] = i * 16; }
  be.strokeAppend(id, pts);
  be.strokeEnd(id);
  return be;
}

const leafOf = (be) => findViewNodeById(be.view.layers, 1);
const bboxBytes = (be) => { const L = leafOf(be); return L.pixels.getRegion(L.bboxX, L.bboxY, L.bboxW, L.bboxH); };
const bytesEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

describe("filter-gate · 响亮拒绝", () => {
  it("未注册 id / 空层 / 不存在叶 → throw", () => {
    const be = mkPainted();
    throws(() => be.filterBegin(1, "nope"), /kernel not registered/, "未注册 id");
    throws(() => be.filterBegin(99, "hsb"), /leaf missing/, "不存在叶");
    const blank = WeebPaintBackend.blank({ width: 32, height: 32 });
    throws(() => blank.filterBegin(1, "hsb"), /no pixels/, "空层");
    blank.dispose(); be.dispose();
  });
});

describe("filter-gate · 参数重算一步落层", () => {
  it("hsb 亮度 commit=true；字节 = kernel 参考 bake 逐位；undo/redo 逐位", () => {
    const be = mkPainted();
    const before = bboxBytes(be);
    // 参考值：kernel 对冻结源直接 bake（与档口同一函数、同一冻结语义）
    const expected = before.slice();
    HsbKernel.bake(before, expected, { ...HsbKernel.defaults(), brightness: 50 }, null, leafOf(be).bboxW, leafOf(be).bboxH);
    const fid = be.filterBegin(1, "hsb");
    be.filterSetParams(fid, { brightness: 50 });
    eq(be.filterCommit(fid), true, "真变化落一步");
    assert(bytesEq(bboxBytes(be), expected), "落层字节 = kernel 参考 bake 逐位");
    assert(be.undo());
    assert(bytesEq(bboxBytes(be), before), "undo 逐位回原");
    assert(be.redo());
    assert(bytesEq(bboxBytes(be), expected), "redo 逐位还原");
    be.dispose();
  });

  it("重算不累积：setParams×2 → 结果 = 只应用最后一次的参考值", () => {
    const be = mkPainted();
    const src = bboxBytes(be);
    const expected = src.slice();
    HsbKernel.bake(src, expected, { ...HsbKernel.defaults(), brightness: 30 }, null, leafOf(be).bboxW, leafOf(be).bboxH);
    const fid = be.filterBegin(1, "hsb");
    be.filterSetParams(fid, { brightness: 90 });   // 中间值——若累积，结果会被它污染
    be.filterSetParams(fid, { brightness: 30 });
    eq(be.filterCommit(fid), true);
    assert(bytesEq(bboxBytes(be), expected), "从冻结源重算，不吃中间态");
    be.dispose();
  });

  it("identity commit → false、不占步；cancel 无痕", () => {
    const be = mkPainted();
    const before = bboxBytes(be);
    const steps = be.canUndo();   // 铺底那一步
    const fid = be.filterBegin(1, "hsb");
    eq(be.filterCommit(fid), false, "identity（零参数）不占步");
    const fid2 = be.filterBegin(1, "hsb");
    be.filterSetParams(fid2, { brightness: 80 });
    be.filterCancel(fid2);
    assert(bytesEq(bboxBytes(be), before), "cancel 后真层逐位不变");
    eq(be.canUndo(), steps, "cancel 不占步");
    assert(be.undo(), "收口后 undo 自由（铺底步还在）");
    be.dispose();
  });
});

describe("filter-gate · 单令牌墙", () => {
  it("filter open 期间 filterBegin/strokeBegin/undo → throw；错 id → throw", () => {
    const be = mkPainted();
    const fid = be.filterBegin(1, "hsb");
    throws(() => be.filterBegin(1, "curves"), /already open/, "第二 filterBegin 拒绝");
    throws(() => be.strokeBegin(1, BRUSH), /open filter/, "filter open 期间 strokeBegin 拒绝");
    throws(() => be.undo(), /open filter/, "filter open 期间 undo 拒绝（门口令牌墙）");
    throws(() => be.filterSetParams(fid + 9, {}), /no such open filter/, "错 id 拒绝");
    be.filterCancel(fid);
    const sid = be.strokeBegin(1, BRUSH);
    throws(() => be.filterBegin(1, "hsb"), /open stroke/, "stroke open 期间 filterBegin 拒绝");
    be.strokeCancel(sid);
    be.dispose();
  });
});

describe("filter-gate · 选区 mask", () => {
  it("左半选区 → 左半变、右半逐位不变", () => {
    const be = mkPainted();
    const L = leafOf(be);
    const { bboxX: bx, bboxY: by, bboxW: bw, bboxH: bh } = L;
    // 选区 = 文档左半（覆盖 bbox 左侧）
    const selW = bx + Math.floor(bw / 2);
    const g = new Uint8Array(selW * H).fill(255);
    be.view.selection = Selection.fromGray8Region(0, 0, selW, H, g);
    const src = bboxBytes(be);
    const mask = be.view.selection.materializeMaskRegion(bx, by, bw, bh);
    const expected = src.slice();
    HsbKernel.bake(src, expected, { ...HsbKernel.defaults(), brightness: 60 }, mask, bw, bh);
    const fid = be.filterBegin(1, "hsb");
    be.filterSetParams(fid, { brightness: 60 });
    eq(be.filterCommit(fid), true);
    assert(bytesEq(bboxBytes(be), expected), "mask 内变 / mask 外 passthrough，逐位 = 参考 bake");
    assert(!bytesEq(expected, src), "参考值确实动了（测试自证非空转）");
    be.view.selection.dispose();   // 直接赋在 view 上的选区绕过了组件所有权——测试是持有者，自己收
    be.view.selection = null;
    be.dispose();
  });
});

describe("filter-gate · kernel 清单 / 生命周期", () => {
  it("七 region kernel 全注册；defaults JSON-able（MCP schema 前提）", () => {
    for (const id of ["hsb", "colorBalance", "curves", "gradientMap", "mosaic", "halftone", "stainedGlass"]) {
      const k = getFilterKernel(id);
      eq(k.id, id);
      const d = k.defaults();
      assert(bytesEqJson(d), `${id}.defaults() JSON round-trip 结构不变`);
    }
    eq(Object.keys(FILTER_KERNELS).length, 7, "清单封闭集 = 7（新 region filter 必须显式入册；2026-09-05 +gradientMap）");
    function bytesEqJson(d) { return JSON.stringify(JSON.parse(JSON.stringify(d))) === JSON.stringify(d); }
  });

  it("dispose 时 open filter → cancel 收口不 throw", () => {
    const be = mkPainted();
    const fid = be.filterBegin(1, "hsb");
    be.filterSetParams(fid, { brightness: 40 });
    be.dispose();   // interrupt=cancel：不 throw 即过
    eq(be.disposed, true);
  });
});
