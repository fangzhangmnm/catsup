// 「正在打的字」的唯一主人（controller/typed-input.ts；周账 F-125 输入统一）：去向由现状定、去向变了字就清；两套语法各归各；回车 / 退格 / Esc 按去向；小键盘字面同一条路。
// created 2026-10-29 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { createTypedInput, type TypedEvent } from "../src/controller/typed-input.ts";
import type { QuantityTag } from "../src/editor/units.ts";

function setup() {
  const st: { q: QuantityTag | null; vcb: boolean } = { q: null, vcb: false };
  const ev: TypedEvent[] = [];
  const t = createTypedInput({ gestureQuantity: () => st.q, vcbOpen: () => st.vcb });
  t.subscribe((e) => ev.push(e));
  return { st, ev, t };
}

describe("typed-input · 去向", () => {
  it("没人收 = null、什么键都不要；手势优先于数值小窗；去向变了字就清", () => {
    const { st, t } = setup();
    eq(t.target(), null); eq(t.wants("5"), false); eq(t.feed("5"), false); eq(t.text(), "");
    st.vcb = true; eq(t.target(), "vcb"); assert(t.feed("5")); eq(t.text(), "5");
    st.q = { q: "factor" }; eq(t.target(), "gesture"); t.sync(); eq(t.text(), "", "去向换了：字清掉");
    assert(t.feed("0")); eq(t.text(), "0");
    st.q = null; st.vcb = false; t.sync(); eq(t.text(), "");
  });
});
describe("typed-input · 手势中（quantityKey 语法）", () => {
  it("倍数：数字进、单位字不进（Z 照旧漏给锁轴层）；退格空着也吞；回车 = confirm 事件", () => {
    const { st, ev, t } = setup(); st.q = { q: "factor" };
    eq(t.wants("z"), false); eq(t.wants("Backspace"), true); assert(t.feed("Backspace")); eq(t.text(), "");
    assert(t.feed("0")); assert(t.feed(".")); assert(t.feed("5")); eq(t.text(), "0.5");
    assert(t.feed("Enter")); eq(ev.at(-1)?.kind, "confirm"); eq(ev.at(-1)?.target, "gesture"); eq(ev.at(-1)?.text, "0.5");
    eq(t.wants("5", { ctrl: true }), false, "带 Ctrl 的不要");
  });
  it("长度：单位字只在有数之后进", () => {
    const { st, t } = setup(); st.q = { q: "length" };
    eq(t.wants("m"), false); assert(t.feed("1")); eq(t.wants("m"), true); assert(t.feed("m")); eq(t.text(), "1m");
  });
});
describe("typed-input · 数值小窗（老语法）", () => {
  it("数字 / , - + * / 能开头，「.」不能开头；单位 / s / x 只能跟在后面；回车空着不收、有字 = confirm；Esc = 清空 + cancel", () => {
    const { st, ev, t } = setup(); st.vcb = true;
    eq(t.wants("."), false); eq(t.wants("m"), false); eq(t.wants("Enter"), false);
    assert(t.feed("2")); assert(t.feed(".")); assert(t.feed("5")); assert(t.feed("m")); eq(t.text(), "2.5m");
    assert(t.feed("Enter")); eq(ev.at(-1)?.kind, "confirm"); eq(ev.at(-1)?.target, "vcb");
    assert(t.feed("Escape")); eq(t.text(), ""); eq(ev.at(-1)?.kind, "cancel");
    assert(t.feed("5")); assert(t.feed("x")); eq(t.text(), "5x", "阵列 5x");
  });
  it("小键盘字面：⌫ / 清空 / ↵ / 空格 走同一条路", () => {
    const { st, ev, t } = setup(); st.vcb = true;
    t.press("3"); t.press("'"); t.press("空格"); t.press("6"); eq(t.text(), "3' 6");
    t.press("⌫"); eq(t.text(), "3' "); t.press("↵"); eq(ev.at(-1)?.kind, "confirm"); t.press("清空"); eq(t.text(), "");
  });
});
