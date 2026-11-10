// GL 合成计划纯逻辑测试：clip 基底解析 + 组隔离判定（与 layer-composite.ts 语义对齐）。
import { describe, it, assert } from "./runner.mjs";
import { resolveClipBases, needsIsolation, groupUnitMode } from "./gl-smoke/reference-gl-compositor.ts";

const leaf = (o = {}) => ({ kind: "leaf", opacity: 1, mode: "source-over", clip: false, visible: true, hasContent: true, srcIndex: null, ...o });
const group = (o = {}) => ({ kind: "group", children: [], opacity: 1, mode: "pass-through", clip: false, visible: true, ...o });

describe("gl-compose-plan · resolveClipBases", () => {
  it("无 clip → 全 null", () => {
    assert(resolveClipBases([leaf(), leaf()]).every((b) => b === null), "全 null");
  });
  it("clip 取下方最近非clip层", () => {
    const base = leaf(), clip = leaf({ clip: true });
    const out = resolveClipBases([base, clip]);
    assert(out[0] === null && out[1] === base, "基底=下方非clip");
  });
  it("连续 clip 链共基底", () => {
    const base = leaf(), c1 = leaf({ clip: true }), c2 = leaf({ clip: true });
    const out = resolveClipBases([base, c1, c2]);
    assert(out[1] === base && out[2] === base, "链共基底");
  });
  it("空层(hasContent=false)不能当基底", () => {
    const empty = leaf({ hasContent: false }), clip = leaf({ clip: true });
    assert(resolveClipBases([empty, clip])[1] === null, "无有效基底 → null");
  });
  it("隐藏层不能当基底", () => {
    const hidden = leaf({ visible: false }), clip = leaf({ clip: true });
    assert(resolveClipBases([hidden, clip])[1] === null, "隐藏 → 非基底");
  });
  it("组可作基底（可见即有内容）", () => {
    const g = group(), clip = leaf({ clip: true });
    assert(resolveClipBases([g, clip])[1] === g, "组作基底");
  });
  it("最底层就是 clip（下方无基底）→ null", () => {
    assert(resolveClipBases([leaf({ clip: true }), leaf()])[0] === null, "无基底");
  });
});

describe("gl-compose-plan · 组隔离", () => {
  it("pass-through + opacity1 + 无clip → 不隔离", () => {
    assert(!needsIsolation(group()), "纯穿透不隔离");
  });
  it("非 pass-through 模式 → 隔离", () => {
    assert(needsIsolation(group({ mode: "source-over" })), "正常组隔离");
    assert(needsIsolation(group({ mode: "multiply" })), "multiply 组隔离");
  });
  it("opacity<1 → 隔离", () => {
    assert(needsIsolation(group({ opacity: 0.5 })), "半透组隔离");
  });
  it("clip → 隔离", () => {
    assert(needsIsolation(group({ clip: true })), "剪裁组隔离");
  });
  it("groupUnitMode：pass-through 被逼隔离 → source-over", () => {
    assert(groupUnitMode(group({ mode: "pass-through", opacity: 0.5 })) === "source-over", "穿透→source-over");
    assert(groupUnitMode(group({ mode: "multiply" })) === "multiply", "保留真模式");
  });
});
