// History 编排器（T5 立；legacy-bridge 的 v2-native 后继——LegacyHistory/run/operator 流已拆）。
// 钉死（旧 legacy-bridge.test 的锚语义换 v2 形逐条保留）：
//   - withPoint checkpoint:false 微步聚合 + sealCheckpoint = 一整点；undo 一次全回；
//   - 微步流未封口就 undo → 先补封再撤；
//   - withPoint 中途 throw = 令牌回滚（tiles 混写一体无痕——fill 形状的原子性）；
//     嵌套 withPoint 骑外层令牌，内层 throw 由外层统一回滚；
//   - 不可恢复协议：undo swap 中途抛 → 弃整栈 + onUnrecoverable（宁丢历史不留半坏）；
//   - onChange 随栈形变、onApplied 按 step entries 翻译。
import { describe, it, assert, eq } from "./runner.mjs";
import { Workpiece } from "../src/backend/workpiece/workpiece.ts";
import { History } from "../src/backend/workpiece/history.ts";

// 最小组件：值语义 {v}；record = 另一侧值（自反 swap）。swapThrow 可注入（不可恢复协议测试用）。
class ValComp {
  constructor(wp, kind = "val") { this._wp = wp; this.kind = kind; this.v = 0; this._origin = null; this.swapThrow = false; }
  set(x) {
    this._wp._componentWrite(this);
    if (this._origin === null) this._origin = { v: this.v };
    this.v = x;
  }
  sealRecord() {
    const o = this._origin;
    this._origin = null;
    if (!o || o.v === this.v) return null;
    return o;
  }
  swapRecord(data) {
    if (this.swapThrow) throw new Error("swap boom");
    const cur = this.v;
    this.v = data.v;
    return { v: cur };
  }
  recordBytes() { return 8; }
  disposeRecord() {}
}

class TestWp extends Workpiece {
  constructor(opts) {
    super(opts);
    this.val = new ValComp(this);
    this.register(this.val, { undo: "recorded" });
  }
}

function mk() {
  const ev = { unrecoverable: 0, changes: 0, applied: [] };
  const h = new History({
    maxQuotaBytes: 1 << 30,
    onUnrecoverable: () => { ev.unrecoverable++; },
    onChange: () => { ev.changes++; },
    onApplied: (i) => { ev.applied.push(`${i.dir}:${i.kind}`); },
  });
  const wp = new TestWp({ undo: h.stack, onTokenLeak: () => {} });
  h.attach(wp);
  return { h, wp, ev };
}

describe("history · withPoint/checkpoint 语义", () => {
  it("standalone withPoint = 一步；undo/redo 自反往复", () => {
    const { h, wp } = mk();
    eq(h.withPoint("set", {}, () => wp.val.set(5)).ok, true);
    eq(wp.val.v, 5);
    eq(h.depth, 1);
    assert(h.undo()); eq(wp.val.v, 0);
    assert(h.redo()); eq(wp.val.v, 5);
    assert(h.undo()); eq(wp.val.v, 0);
  });

  it("checkpoint:false 微步流 + sealCheckpoint = 一个整点；undo 一次全回", () => {
    const { h, wp } = mk();
    h.withPoint("s1", { checkpoint: false }, () => wp.val.set(1));
    h.withPoint("s2", { checkpoint: false }, () => wp.val.set(2));
    h.withPoint("s3", { checkpoint: false }, () => wp.val.set(3));
    h.sealCheckpoint();
    eq(h.depth, 1, "三微步一整点");
    h.undo();
    eq(wp.val.v, 0, "整点一撤到底");
    h.redo();
    eq(wp.val.v, 3);
  });

  it("微步流未封口就 undo → 先补封再撤", () => {
    const { h, wp } = mk();
    h.withPoint("s", { checkpoint: false }, () => wp.val.set(7));
    assert(h.undo());
    eq(wp.val.v, 0);
  });

  it("withPoint 中途 throw = 令牌回滚无痕（不入栈）", () => {
    const { h, wp } = mk();
    h.withPoint("ok", {}, () => wp.val.set(2));
    const r = h.withPoint("bad", {}, () => { wp.val.set(9); throw new Error("mid fail"); });
    eq(r.ok, false);
    eq(wp.val.v, 2, "失败整点的写已回滚");
    eq(h.depth, 1, "失败不入栈");
  });

  it("嵌套 withPoint 骑外层令牌：全成一步；内层 throw 由外层统一回滚", () => {
    const { h, wp } = mk();
    const r = h.withPoint("outer", {}, () => {
      h.withPoint("inner1", { checkpoint: false }, () => wp.val.set(1));
      h.withPoint("inner2", { checkpoint: false }, () => wp.val.set(2));
      return "val";
    });
    eq(r.ok, true); eq(r.value, "val");
    eq(h.depth, 1, "嵌套打包一步");
    const r2 = h.withPoint("outer2", {}, () => {
      h.withPoint("inner", { checkpoint: false }, () => wp.val.set(9));
      throw new Error("bail");
    });
    eq(r2.ok, false);
    eq(wp.val.v, 2, "外层统一回滚（含内层写）");
    eq(h.depth, 1);
  });

  it("clear：开着的令牌弃置 + 栈清空", () => {
    const { h, wp } = mk();
    h.withPoint("s", { checkpoint: false }, () => wp.val.set(4));
    h.clear();
    eq(h.depth, 0);
    eq(h.canUndo(), false);
    eq(wp.val.v, 4, "abandon 不回滚（换文档语义）");
  });
});

describe("history · 不可恢复协议", () => {
  it("undo swap 中途抛 → 弃整栈 + onUnrecoverable", () => {
    const { h, wp, ev } = mk();
    h.withPoint("s", {}, () => wp.val.set(3));
    eq(h.depth, 1);
    wp.val.swapThrow = true;
    eq(h.undo(), false, "undo 失败返回 false");
    eq(ev.unrecoverable, 1, "回调触发");
    eq(h.depth, 0, "栈已弃");
    eq(h.canUndo(), false);
  });
});

describe("history · 事件翻译", () => {
  it("onChange 随栈形变；onApplied 按 step entries 翻译 undo/redo", () => {
    const { h, wp, ev } = mk();
    h.withPoint("s", {}, () => wp.val.set(3));
    h.undo();
    assert(ev.applied.includes("undo:val"), "undo 翻译");
    h.redo();
    assert(ev.applied.includes("redo:val"), "redo 翻译");
    assert(ev.changes >= 3, "push/undo/redo 都发 onChange");
  });
});
