// 图库口令验证器（src/password-verifier.ts；周账 F-123）：记录只认对的口令；坏形状当没有；接缝没接 = none / 不记。created 2026-10-29 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { createVerifierRecord, verifyRecord, isVerifierRecord, wireVerifierStore, hasVerifier, createVerifier, clearVerifier, checkVerifier, type VerifierRecord } from "../src/password-verifier.ts";

describe("password-verifier · 记录", () => {
  it("对的口令解得开、错的解不开；两次创建盐不同", async () => {
    const a = await createVerifierRecord("猫"), b = await createVerifierRecord("猫");
    assert(await verifyRecord(a, "猫")); assert(!(await verifyRecord(a, "狗"))); assert(!(await verifyRecord(a, "")));
    assert(a.salt !== b.salt && a.ct !== b.ct, "盐 / 密文随机");
    assert(isVerifierRecord(a)); assert(!isVerifierRecord({ v: 2, salt: "", iv: "", ct: "" })); assert(!isVerifierRecord(null)); assert(!isVerifierRecord("x"));
  });
  it("篡改密文 = 解不开（GCM tag）", async () => {
    const a = await createVerifierRecord("猫");
    const bad: VerifierRecord = { ...a, ct: a.ct.slice(0, -4) + (a.ct.endsWith("AAAA") ? "BBBB" : "AAAA") };
    assert(!(await verifyRecord(bad, "猫")));
  });
});
describe("password-verifier · 门面", () => {
  it("没接库 = none、不记；接了 = 建 / 查 / 清", async () => {
    wireVerifierStore(null);
    eq(hasVerifier(), false); eq(await checkVerifier("x"), "none"); await createVerifier("x"); eq(hasVerifier(), false);
    let rec: VerifierRecord | null = null;
    wireVerifierStore({ get: () => rec, set: (r) => { rec = r; } });
    eq(await checkVerifier("x"), "none");
    await createVerifier("猫"); assert(hasVerifier());
    eq(await checkVerifier("猫"), "ok"); eq(await checkVerifier("狗"), "bad");
    clearVerifier(); eq(hasVerifier(), false); eq(await checkVerifier("猫"), "none");
    wireVerifierStore(null);
  });
});
