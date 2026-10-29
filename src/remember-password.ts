// remember-password.ts —— 「在这台设备上记住口令」政策（WeebPaint src/remember-password.ts 同形；库仓 @internal/encryption ADR-0001）。created 2026-10-29 by Claude Fable 5.1（周账 F-123）
// user 2026-10-15「还是允许设备记住密码，每次进来不用输吧」→ 10-17「口令同意。口令加一个过期时间，最多一个月。」
// 规矩：
//   · 只记**统一图库口令**；别的口令的文件（per-name）照旧每次问。验得了的面板上一个勾（默认不勾）；记 30 天（库上限），到期自动忘。
//   · 开页：记着 → 先和验证器比，对了才 setPassword；对不上（别的设备改过 / 重置过）→ 忘掉，照常问；没验证器 → 忘掉。
//   · 统一口令被换掉：新的过得了验证器 → 记新的、过期日不变；过不了（会话里临时换成别的口令）→ 不跟。锁定 / 撤销（null）→ 忘掉。
//   · 「锁定」/ 退出登录 / 还原出厂 → 忘掉（还原出厂删库，REMEMBER_DB 带 GUID 前缀）；清缓存 / 强制更新不碰。
//   · keeper 由组装点（main.ts）递进来（建在 encryption.ts）；本模块不打印口令。
import type { PasswordKeeper } from "@internal/encryption";
import { onCurrentPasswordChange } from "./crypto-state.ts";

export interface RememberDeps {
  /** false = 这个形态不提供（同源的不只我们时；CatsUp 现在没有那种形态 = true）。 */
  enabled: boolean;
  keeper: () => PasswordKeeper;
  hasVerifier: () => boolean;
  checkVerifier: (pw: string) => Promise<"ok" | "bad" | "none">;
  setPassword: (pw: string) => void;
  onError: (e: unknown) => void;
  onRemembered?: (expiresAt: number) => void;
  now?: () => number;
}

let d: RememberDeps | null = null;
let _until: number | null = null;   // 记到什么时候；null = 没记
let _pw: string | null = null;      // 记着的是哪一把（判断统一口令变了要不要跟）
let _choice = false;                // 最近一次提交的面板勾没勾（取一次就清）
let _forgetting: Promise<void> | null = null;
const _subs = new Set<() => void>();
const notify = (): void => { for (const cb of _subs) { try { cb(); } catch { /* UI 订阅者的错不许打断记忆状态 */ } } };
const need = (): RememberDeps => { if (!d) throw new Error("remember-password not wired (wireRememberPassword)"); return d; };

/** 组装点调一次；测试再调一次换成内存版（会清掉状态）。 */
export function wireRememberPassword(deps: RememberDeps): void { d = deps; _until = null; _pw = null; _choice = false; _forgetting = null; }
export function rememberedUntil(): number | null { return _until; }
export function rememberAvailable(): boolean { return d?.enabled === true; }
export function onRememberChange(cb: () => void): () => void { _subs.add(cb); return () => _subs.delete(cb); }
/** 口令面板交回勾态（取消 = false）；重开面板时按它预勾。 */
export function setRememberChoice(v: boolean): void { _choice = v; }
export function rememberChoice(): boolean { return _choice; }

/** 开页：试记着的口令。"unlocked" | "none"（没记 / 没验证器可比）| "stale"（对不上，已忘）。 */
export async function restoreRemembered(): Promise<"unlocked" | "none" | "stale"> {
  const dd = need();
  if (!dd.enabled) return "none";
  const pw = await dd.keeper().recall();
  if (pw == null) { _until = null; _pw = null; notify(); return "none"; }
  if (!dd.hasVerifier()) { await forgetRemembered(); return "none"; }
  if ((await dd.checkVerifier(pw)) !== "ok") { await forgetRemembered(); return "stale"; }
  _pw = pw; _until = (await dd.keeper().status()).expiresAt;
  dd.setPassword(pw);   // 订阅里 pw === _pw → 不动
  notify();
  return "unlocked";
}

/** 忘掉（幂等；在飞的那次直接复用）。 */
export function forgetRemembered(): Promise<void> {
  if (!need().enabled) return Promise.resolve();
  _forgetting ??= (async () => {
    try { await need().keeper().forget(); _pw = null; _until = null; notify(); }
    finally { _forgetting = null; }
  })();
  return _forgetting;
}

async function follow(pw: string | null): Promise<void> {
  const dd = need();
  if (!dd.enabled) { _choice = false; return; }
  if (pw == null) { _choice = false; if (_until != null) await forgetRemembered(); return; }
  if (_until != null) {
    if (pw === _pw) return;
    const left = _until - (dd.now ?? Date.now)();
    if (left <= 0) { await forgetRemembered(); return; }
    if ((await dd.checkVerifier(pw)) !== "ok") return;   // 会话里临时换成别的口令：不跟
    const { expiresAt } = await dd.keeper().remember(pw, { ttlMs: left });
    _pw = pw; _until = expiresAt; notify();
    return;
  }
  if (!_choice) return;
  _choice = false;
  const { expiresAt } = await dd.keeper().remember(pw);
  _pw = pw; _until = expiresAt; notify();
  dd.onRemembered?.(expiresAt);
}
onCurrentPasswordChange((pw) => { if (d) follow(pw).catch((e) => d?.onError(e)); });
