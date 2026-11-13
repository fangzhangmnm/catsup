// 「这次打开之后按过实体键盘吗」的判法（src/app/keyboard-seen.ts；统筹 11-13 D，user 改的判据）。created 2026-11-13 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import { isPhysicalKey } from "../src/app/keyboard-seen.ts";

const body = { tagName: "BODY" }, ev = (o: Partial<{ isTrusted: boolean; key: string; keyCode: number; isComposing: boolean; target: unknown }> = {}) => ({ isTrusted: true, key: "g", keyCode: 71, isComposing: false, target: body, ...o });

describe("按过实体键盘吗：只认真的按键", () => {
  it("在画布 / 页面上按的真键 = 算（字母、单按修饰键都算）", () => { eq(isPhysicalKey(ev()), true); eq(isPhysicalKey(ev({ key: "Shift", keyCode: 16 })), true); eq(isPhysicalKey(ev({ target: { tagName: "CANVAS" } })), true); });
  it("脚本发的（isTrusted = false）= 不算", () => eq(isPhysicalKey(ev({ isTrusted: false })), false));
  it("输入框 / 文本区 / 下拉 / 可编辑区里打的字 = 不算（屏幕软键盘只在这些地方出来）", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT", "input"]) eq(isPhysicalKey(ev({ target: { tagName } })), false, tagName);
    eq(isPhysicalKey(ev({ target: { tagName: "DIV", isContentEditable: true } })), false);
  });
  it("输入法组字（Unidentified / 229 / isComposing）= 不算", () => { eq(isPhysicalKey(ev({ key: "Unidentified" })), false); eq(isPhysicalKey(ev({ keyCode: 229 })), false); eq(isPhysicalKey(ev({ isComposing: true })), false); });
});
