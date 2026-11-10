// undo-stack v2 + workpiece(v2 基类) 契约测试（T1，玩具组件——基类不挑组件形状）。
// 钉死：令牌唯一性/无令牌写拒绝、commit 打包成单步、cancel 倒序回滚无痕、自反 swap 往返逐字节、
// 配额整步驱逐+dispose+最新步保底、stateVersion 位置身份（画→存→画→undo=clean 真值表）、
// silent 组件 record 即弃+silentDirty、无 undo workpiece 写面纪律统一、双计数语义分离。
// 这些是 v2 纪元（ADR-0008）的全部承重墙；旧栈 undo-history.test 在 T5 拆除时按此迁移退役。
import { describe, it, assert, eq } from "./runner.mjs";
import { UndoStack } from "../src/backend/workpiece/undo-stack.ts";
import { Workpiece } from "../src/backend/workpiece/workpiece.ts";

// 玩具组件：单值 substrate + 值对象 collector（首写扣押旧值快照——ADR-0008「json 收快照」形态）。
class ValueComp {
  constructor(wp, kind, initial = 0) {
    this.kind = kind;
    this.value = initial;
    this._wp = wp;
    this._collected = null;
    this.disposedLog = [];   // disposeRecord 收到的包（观测驱逐/cancel/截断）
    this.bytesPerRecord = 8;
    this.swapLog = null;     // 外部注入共享数组时记录 swap 顺序
  }
  set(v) {
    this._wp._componentWrite(this);
    if (this._collected === null) this._collected = { v: this.value };
    this.value = v;
  }
  sealRecord() { const r = this._collected; this._collected = null; return r; }
  swapRecord(data) {
    this.swapLog?.push(this.kind);
    const cur = this.value;
    this.value = data.v;
    return { v: cur };
  }
  recordBytes() { return this.bytesPerRecord; }
  disposeRecord(data) { this.disposedLog.push(data.v); }
}

// 字节组件：Uint8Array substrate（自反 swap 往返的逐字节锚）。
class BytesComp {
  constructor(wp, kind, len = 16) {
    this.kind = kind;
    this.bytes = new Uint8Array(len);
    this._wp = wp;
    this._collected = null;
  }
  paint(i, v) {
    this._wp._componentWrite(this);
    if (this._collected === null) this._collected = this.bytes.slice();
    this.bytes[i] = v;
  }
  sealRecord() { const r = this._collected; this._collected = null; return r; }
  swapRecord(data) { const cur = this.bytes; this.bytes = data; return cur; }
  recordBytes(data) { return data.length; }
  disposeRecord() {}
}

class TestWp extends Workpiece {
  addComp(c, policy = "recorded") { this.register(c, { undo: policy }); }
}

function mk(opts = {}) {
  const stackEvents = { changes: 0, applied: [] };
  const undo = new UndoStack({
    maxQuotaBytes: opts.maxQuotaBytes ?? 1 << 30,
    onChange: () => { stackEvents.changes++; },
    onApplied: (step, dir) => { stackEvents.applied.push(`${dir}:${step.label ?? "?"}`); },
  });
  const wp = new TestWp({ undo, onTokenLeak: () => {} });
  const wpEvents = [];
  wp.onChange((e) => wpEvents.push(`${e.kind}:${e.recorded ? "rec" : "sil"}`));
  return { wp, undo, stackEvents, wpEvents };
}

describe("workpiece v2 · 令牌", () => {
  it("同时只准一个令牌：第二次 begin → throw；commit/cancel 后可再 begin", () => {
    const { wp } = mk();
    const t1 = wp.begin("a");
    let threw = false;
    try { wp.begin("b"); } catch { threw = true; }
    assert(threw, "开着令牌时二次 begin 应 throw");
    t1.commit();
    const t2 = wp.begin("c");
    t2.cancel();
    wp.begin("d").commit();   // cancel 后照常
  });

  it("无令牌写 → throw（结构上写不进去）", () => {
    const { wp } = mk();
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    let threw = false;
    try { a.set(1); } catch { threw = true; }
    assert(threw, "无令牌写应被拒");
    eq(a.value, 0, "值不得被改");
  });

  it("未注册组件的写 → throw", () => {
    const { wp } = mk();
    const ghost = new ValueComp(wp, "ghost");
    wp.begin();
    let threw = false;
    try { ghost.set(1); } catch { threw = true; }
    assert(threw, "未注册组件应被拒");
  });

  it("commit 后的令牌再 commit/cancel → throw；open 翻 false", () => {
    const { wp } = mk();
    const t = wp.begin();
    eq(t.open, true);
    t.commit();
    eq(t.open, false);
    let threw = 0;
    try { t.commit(); } catch { threw++; }
    try { t.cancel(); } catch { threw++; }
    eq(threw, 2, "关门后 commit/cancel 都应 throw");
  });

  it("令牌开着时禁 undo/redo → throw", () => {
    const { wp, undo } = mk();
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    const t0 = wp.begin(); a.set(1); t0.commit();
    wp.begin();
    let threw = false;
    try { undo.undo(); } catch { threw = true; }
    assert(threw, "开着令牌 undo 应 throw");
  });
});

describe("workpiece v2 · commit 打包与自反 swap", () => {
  it("一个令牌摸两组件 = 一个 UndoStep；undo 倒序 swap、redo 正序", () => {
    const { wp, undo } = mk();
    const order = [];
    const a = new ValueComp(wp, "a"); a.swapLog = order;
    const b = new ValueComp(wp, "b"); b.swapLog = order;
    wp.addComp(a); wp.addComp(b);
    const t = wp.begin("paint");
    a.set(1); b.set(2);     // 摸序 a→b
    t.commit();
    eq(undo.depth(), 1, "两组件一个 step");
    undo.undo();
    eq(a.value, 0); eq(b.value, 0);
    eq(order.join(","), "b,a", "undo 按摸序倒序");
    undo.redo();
    eq(a.value, 1); eq(b.value, 2);
    eq(order.join(","), "b,a,a,b", "redo 正序再调一次");
  });

  it("自反往返：undo→redo→undo 逐字节等原图", () => {
    const { wp, undo } = mk();
    const px = new BytesComp(wp, "px");
    wp.addComp(px);
    const t = wp.begin(); px.paint(3, 7); px.paint(9, 255); t.commit();
    const painted = px.bytes.slice();
    undo.undo();
    assert(px.bytes.every((v) => v === 0), "undo 回原图");
    undo.redo();
    assert(px.bytes.every((v, i) => v === painted[i]), "redo 逐字节等画后");
    undo.undo();
    assert(px.bytes.every((v) => v === 0), "再 undo 逐字节等原图");
  });

  it("空 commit（没摸任何组件）：不入栈、commitVersion 不动", () => {
    const { wp, undo } = mk();
    const cv = wp.commitVersion;
    wp.begin().commit();
    eq(undo.depth(), 0);
    eq(wp.commitVersion, cv);
  });

  it("截断 redo 段时 dispose 被弃的 record", () => {
    const { wp, undo } = mk();
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    let t = wp.begin(); a.set(1); t.commit();
    t = wp.begin(); a.set(2); t.commit();
    undo.undo();                       // step2 变 redo 包（data = {v:2} 侧）
    t = wp.begin(); a.set(9); t.commit();   // 截断 redo 段
    eq(undo.depth(), 2);
    eq(a.disposedLog.length, 1, "被截断的 redo 步应 dispose");
  });
});

describe("workpiece v2 · cancel 回滚", () => {
  it("cancel：倒序回滚无痕，不入栈，dispose 换回的句柄", () => {
    const { wp, undo } = mk();
    const a = new ValueComp(wp, "a", 10);
    wp.addComp(a);
    const t = wp.begin(); a.set(11); a.set(12); t.cancel();
    eq(a.value, 10, "回滚到 begin 前");
    eq(undo.depth(), 0, "不入栈");
    eq(a.disposedLog.join(","), "12", "cancel 前的新态包被 dispose");
    assert(!wp.isDirty(), "cancel 无痕不置 dirty");
  });

  it("cancel 多组件按摸序倒序回滚", () => {
    const { wp } = mk();
    const order = [];
    const a = new ValueComp(wp, "a"); a.swapLog = order;
    const b = new ValueComp(wp, "b"); b.swapLog = order;
    wp.addComp(a); wp.addComp(b);
    const t = wp.begin(); a.set(1); b.set(2); t.cancel();
    eq(order.join(","), "b,a", "倒序");
    eq(a.value, 0); eq(b.value, 0);
  });
});

describe("workpiece v2 · 配额驱逐", () => {
  it("超配额从最老端整步驱逐 + dispose；游标步（最新）永不驱逐", () => {
    const { wp, undo } = mk({ maxQuotaBytes: 20 });   // 每步 8 字节 → 第三步触发驱逐
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    for (const v of [1, 2, 3]) { const t = wp.begin(); a.set(v); t.commit(); }
    eq(undo.depth(), 2, "最老一步被驱逐");
    eq(a.disposedLog.join(","), "0", "被驱逐步的 undo 包（旧值 0）被 dispose");
    eq(undo.quotaUsage(), 16);
    // 单步超配额也不驱逐游标步
    a.bytesPerRecord = 999;
    const t = wp.begin(); a.set(4); t.commit();
    assert(undo.depth() >= 1 && undo.canUndo(), "刚做的必须能撤（宁超配额）");
  });

  it("驱逐后栈底身份 = 被驱逐步 id（undo 到底 ≠ 初始态 0）", () => {
    const { wp, undo } = mk({ maxQuotaBytes: 20 });
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    for (const v of [1, 2, 3]) { const t = wp.begin(); a.set(v); t.commit(); }
    while (undo.canUndo()) undo.undo();
    assert(wp.stateVersion !== 0, "驱逐后栈底不是初始态位置");
    assert(wp.isDirty(), "回不到 lastSaved=0 的位置 → 恒 dirty");
  });
});

describe("workpiece v2 · 双计数与 dirty（真值表）", () => {
  it("画→存→画→undo = clean；再 undo = dirty；redo 回存档点 = clean", () => {
    const { wp, undo } = mk();
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    assert(!wp.isDirty(), "初始 clean");
    let t = wp.begin(); a.set(1); t.commit();       // 画
    assert(wp.isDirty(), "画后 dirty");
    wp.markSaved();                                  // 存
    assert(!wp.isDirty(), "存后 clean");
    t = wp.begin(); a.set(2); t.commit();            // 画
    assert(wp.isDirty(), "再画 dirty");
    undo.undo();                                     // undo 回存档点
    assert(!wp.isDirty(), "undo 回存档点自动 clean");
    undo.undo();
    assert(wp.isDirty(), "越过存档点 dirty");
    undo.redo();
    assert(!wp.isDirty(), "redo 回存档点 clean");
    undo.redo();
    assert(wp.isDirty(), "redo 到未存位置 dirty");
  });

  it("commitVersion 单调：commit/undo/redo/cancel 都 +1（渲染缓存失效）", () => {
    const { wp, undo } = mk();
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    const v0 = wp.commitVersion;
    let t = wp.begin(); a.set(1); t.commit();
    eq(wp.commitVersion, v0 + 1, "commit +1");
    undo.undo();
    eq(wp.commitVersion, v0 + 2, "undo +1");
    undo.redo();
    eq(wp.commitVersion, v0 + 3, "redo +1");
    t = wp.begin(); a.set(5); t.cancel();
    eq(wp.commitVersion, v0 + 4, "cancel（外界可能看过中间态）+1");
    eq(wp.stateVersion, undo.cursorStepId(), "stateVersion = 游标步 id（两计数不合并）");
  });
});

describe("workpiece v2 · silent 组件与无 undo workpiece", () => {
  it("silent：record 即弃、不入栈、silentDirty 置位、markSaved 清", () => {
    const { wp, undo, wpEvents } = mk();
    const ref = new ValueComp(wp, "reference");
    wp.addComp(ref, "silent");
    const t = wp.begin(); ref.set(1); t.commit();
    eq(undo.depth(), 0, "silent 不入栈");
    eq(ref.disposedLog.length, 1, "record 即弃（dispose）");
    assert(wp.silentDirty && wp.isDirty(), "silentDirty 置位");
    assert(wpEvents.includes("reference:sil"), "变更信号 recorded=false");
    wp.markSaved();
    assert(!wp.isDirty(), "markSaved 清 silentDirty");
  });

  it("recorded+silent 混摸一个令牌：只 recorded 进 step，silent 走 dirty", () => {
    const { wp, undo } = mk();
    const a = new ValueComp(wp, "a");
    const p = new ValueComp(wp, "palette");
    wp.addComp(a); wp.addComp(p, "silent");
    const t = wp.begin(); a.set(1); p.set(7); t.commit();
    eq(undo.depth(), 1);
    undo.undo();
    eq(a.value, 0, "recorded 被撤");
    eq(p.value, 7, "silent 不被 undo 碰");
    assert(wp.silentDirty, "silent 侧仍 dirty");
  });

  it("无 undo workpiece：写照走令牌、record 即弃、touched 即 dirty", () => {
    const wp = new TestWp({ onTokenLeak: () => {} });
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    let threw = false;
    try { a.set(1); } catch { threw = true; }
    assert(threw, "无 undo 也得有令牌（写面纪律统一）");
    const t = wp.begin(); a.set(1); t.commit();
    eq(a.value, 1);
    eq(a.disposedLog.length, 1, "record 即弃");
    assert(wp.isDirty(), "touched 即 dirty");
    wp.markSaved();
    assert(!wp.isDirty());
  });

  it("组件 kind 重复注册 → throw", () => {
    const { wp } = mk();
    wp.addComp(new ValueComp(wp, "a"));
    let threw = false;
    try { wp.addComp(new ValueComp(wp, "a")); } catch { threw = true; }
    assert(threw);
  });
});

describe("workpiece v2 · hint 与信号", () => {
  it("hint：undo/redo 应用完 entries 后按方向调；push 时不调", () => {
    const { wp, undo } = mk();
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    const hints = [];
    const t = wp.begin(); a.set(1);
    t.commit({ hint: (dir) => hints.push(`${dir}@a=${a.value}`) });
    eq(hints.length, 0, "push 不调 hint");
    undo.undo();
    eq(hints.join(","), "undo@a=0", "hint 在 entries 应用完后调");
    undo.redo();
    eq(hints.join(","), "undo@a=0,redo@a=1");
  });

  it("onChange 统一信号：commit 按 touched 发、undo/redo 按 entries 发", () => {
    const { wp, undo, wpEvents } = mk();
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    const t = wp.begin(); a.set(1); t.commit();
    eq(wpEvents.join(","), "a:rec");
    undo.undo();
    eq(wpEvents.join(","), "a:rec,a:rec");
  });

  it("stack onApplied/onChange 照旧可接（app 按钮态/toast）", () => {
    const { wp, undo, stackEvents } = mk();
    const a = new ValueComp(wp, "a");
    wp.addComp(a);
    const t = wp.begin(); a.set(1); t.commit({ label: "paint" });
    undo.undo(); undo.redo();
    eq(stackEvents.applied.join(","), "undo:paint,redo:paint");
    assert(stackEvents.changes >= 3, "push/undo/redo 都发 onChange");
  });
});
