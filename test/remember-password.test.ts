// 「在这台设备上记住口令」政策（src/remember-password.ts；WeebPaint test/remember-password.test.mjs 同形）：开页先比验证器、对不上 / 没验证器就忘；
// 锁定即忘；统一口令被换掉时只跟过得了验证器的那把；没勾不记；勾只用一次。created 2026-10-29 by Claude Fable 5.1（周账 F-123）
import { describe, it, eq, assert } from "./runner.mjs";
import { createPasswordKeeper, type SecretStore } from "@internal/encryption";
import { setPassword, lock, getPassword } from "../src/crypto-state.ts";
import { wireRememberPassword, restoreRemembered, forgetRemembered, rememberedUntil, setRememberChoice, rememberAvailable } from "../src/remember-password.ts";

const DAY = 86400_000;
function memStore(): SecretStore & { peek(): unknown } { let rec: unknown; return { get: async () => rec, put: async (r) => { rec = r; }, delete: async () => { rec = undefined; }, peek: () => rec }; }
function setup({ verifierPw = "real pw" as string | null, enabled = true } = {}) {
  const clock = { t: 1_700_000_000_000 }; const now = () => clock.t;
  const store = memStore();
  const keeper = createPasswordKeeper({ dbName: "test", store, now });
  const v = { pw: verifierPw };
  const remembered: number[] = [], errors: unknown[] = [];
  lock();
  wireRememberPassword({
    enabled, keeper: () => keeper, now,
    hasVerifier: () => v.pw != null,
    checkVerifier: async (pw) => (v.pw == null ? "none" : pw === v.pw ? "ok" : "bad"),
    setPassword: (pw) => setPassword(pw),
    onError: (e) => errors.push(e),
    onRemembered: (until) => remembered.push(until),
  });
  return { clock, store, keeper, v, remembered, errors };
}
const until = async (fn: () => Promise<boolean> | boolean, ms = 2000): Promise<boolean> => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 10)); } return false; };
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 30));

describe("remember-password · 开页", () => {
  it("没记 → none", async () => { setup(); eq(await restoreRemembered(), "none"); eq(getPassword(null), null); assert(rememberAvailable()); });
  it("记着且过得了验证器 → 解锁、记到哪天可读", async () => {
    const s = setup(); await s.keeper.remember("real pw");
    eq(await restoreRemembered(), "unlocked"); eq(getPassword(null), "real pw"); eq(rememberedUntil(), s.clock.t + 30 * DAY);
  });
  it("记着的过不了验证器（别的设备改过）→ stale、记录删掉、仍锁着", async () => {
    const s = setup({ verifierPw: "new elsewhere" }); await s.keeper.remember("old");
    eq(await restoreRemembered(), "stale"); eq(getPassword(null), null); eq(s.store.peek(), undefined);
  });
  it("记着却没验证器（重置过）→ none、记录删掉", async () => {
    const s = setup({ verifierPw: null }); await s.keeper.remember("x");
    eq(await restoreRemembered(), "none"); eq(s.store.peek(), undefined); eq(getPassword(null), null);
  });
  it("形态不提供（enabled:false）→ 不碰存储", async () => { const s = setup({ enabled: false }); await s.keeper.remember("x"); eq(await restoreRemembered(), "none"); assert(s.store.peek() !== undefined, "没动它"); eq(rememberAvailable(), false); });
});

describe("remember-password · 跟着统一口令走", () => {
  it("勾了 → 下一次统一口令落内存时记住（只用一次）", async () => {
    const s = setup();
    setRememberChoice(true); setPassword("real pw");
    assert(await until(async () => (await s.keeper.recall()) === "real pw"), "remembered");
    eq(s.remembered.length, 1);
    lock(); await forgetRemembered();
    setPassword("real pw"); await tick();
    eq(s.store.peek(), undefined, "勾只用一次：再设一次不会自己记");
  });
  it("没勾 → 不记", async () => { const s = setup(); setPassword("real pw"); await tick(); eq(s.store.peek(), undefined); eq(rememberedUntil(), null); });
  it("锁定 = 忘；也清掉悬着的勾", async () => {
    const s = setup(); setRememberChoice(true); setPassword("real pw");
    await until(async () => rememberedUntil() != null);
    lock(); await forgetRemembered();
    eq(s.store.peek(), undefined); eq(rememberedUntil(), null);
    setRememberChoice(true); lock(); setPassword("real pw"); await tick();
    eq(s.store.peek(), undefined, "锁定清掉了悬着的勾");
  });
  it("改口令（验证器先换）→ 记新的，过期日不变", async () => {
    const s = setup(); setRememberChoice(true); setPassword("real pw");
    await until(async () => rememberedUntil() != null);
    const u0 = rememberedUntil();
    s.clock.t += 5 * DAY; s.v.pw = "changed"; setPassword("changed");
    assert(await until(async () => (await s.keeper.recall()) === "changed"), "follows the verified new password");
    eq(rememberedUntil(), u0);
  });
  it("会话里换成一把过不了验证器的（别的口令的文件）→ 不跟，记着的那把留着", async () => {
    const s = setup(); setRememberChoice(true); setPassword("real pw");
    await until(async () => rememberedUntil() != null);
    setPassword("imported file pw"); await tick(); await tick();
    eq(await s.keeper.recall(), "real pw"); eq(s.errors.length, 0);
    lock(); await forgetRemembered();
  });
});
