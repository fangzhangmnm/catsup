// 口令状态（src/crypto-state.ts；周账 F-123）：统一口令 + per-name 覆盖、锁定清一切、验证通过的上位规则、订阅、面板没接就炸。created 2026-10-29 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { setPasswordPrompt, promptPassword, isUnlocked, setPassword, lock, getPassword, setFilePassword, forgetFilePassword, onPasswordVerified, onLockChange, onCurrentPasswordChange } from "../src/crypto-state.ts";

describe("crypto-state", () => {
  it("统一口令 + per-name 覆盖；锁定清一切", () => {
    lock(); eq(isUnlocked(), false); eq(getPassword(null), null); eq(getPassword("a/b.catsup"), null);
    setPassword("猫"); eq(isUnlocked(), true); eq(getPassword("a/b.catsup"), "猫");
    setFilePassword("a/b.catsup", "狗"); eq(getPassword("a/b.catsup"), "狗"); eq(getPassword("c.catsup"), "猫");
    forgetFilePassword("a/b.catsup"); eq(getPassword("a/b.catsup"), "猫");
    setFilePassword("a/b.catsup", "狗"); lock(); eq(getPassword("a/b.catsup"), null); eq(getPassword(null), null);
    setPassword(""); eq(isUnlocked(), false, "空串 = 没口令");
  });
  it("onPasswordVerified：全局空着就上位；全局已有且不同 = per-name", () => {
    lock(); onPasswordVerified("x.catsup", "猫"); eq(getPassword(null), "猫");
    onPasswordVerified("y.catsup", "狗"); eq(getPassword(null), "猫"); eq(getPassword("y.catsup"), "狗"); eq(getPassword("x.catsup"), "猫");
    lock();
  });
  it("订阅：锁态 + 当前口令；订阅者抛错不打断", () => {
    lock(); const locks: boolean[] = [], pws: (string | null)[] = [];
    const off1 = onLockChange((u) => locks.push(u)), off2 = onCurrentPasswordChange((p) => pws.push(p)), off3 = onLockChange(() => { throw new Error("boom"); });
    setPassword("猫"); lock();
    eq(locks.join(), "true,false"); eq(pws.join("|"), "猫|"); off1(); off2(); off3();
  });
  it("面板没接 = 响亮抛；接了 = 空串 / 取消 → null", async () => {
    setPasswordPrompt(null as never);
    let threw = false; try { await promptPassword(); } catch { threw = true; } assert(threw);
    setPasswordPrompt(async () => ""); eq(await promptPassword(), null);
    setPasswordPrompt(async () => "猫"); eq(await promptPassword({ title: "t" }), "猫");
    setPasswordPrompt(null as never); lock();
  });
});
