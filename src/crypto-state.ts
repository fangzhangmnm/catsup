// crypto-state.ts —— CatsUp 的口令**政策**模块（WeebPaint src/crypto-state.ts 同形；store 仓 ADR-0012「统一图库口令」）。
// created 2026-10-29 by Claude Fable 5.1（周账 F-123 接密码）。
//   store 对口令非交互（接缝只要 getPassword）；本模块持有内存口令 + 面板注入 + 记忆政策，**自己永不持久化**：只活内存，关页 / 锁定即忘。
//   getPassword(name)        → store 接缝唯一接口：统一图库口令（per-name 覆盖兜底：别的口令的文件）
//   promptPassword(opts)     → in-app 输入面板（由组装点 main.ts 注入，本模块零 DOM）
//   onCurrentPasswordChange  → 统一口令变了（含锁定 = null）：只给 remember-password.ts 用
//   onPasswordVerified(name) → 解锁循环验证通过后调（全局空着就上位为全局；否则记 per-name）
// 「弹框 + 验证 + 重试」的循环在 app/unlock.ts ensureUnlocked（**必须在 withBusy 之外**——busy 遮罩盖口令框会死锁，sheets 护栏也会 throw）。
// 「在这台设备上记住」住 remember-password.ts：它经 setPassword 把验过的口令送进来、经 onCurrentPasswordChange 跟着锁定走。

/** 口令输入面板的注入形状（由组装点提供，无 DOM 依赖）。 */
export interface PromptOpts {
  title?: string;
  message?: string;
  /** 验得了的统一口令面板 = true：给「在这台设备上记住」的勾（别的口令的文件不给）。 */
  offerRemember?: boolean;
  /** 真表单（user 10-21「口令面板改成真表单让 Edge 密码管理器记住」）：设口令的面板 = "new"（autocomplete=new-password）；缺省 = 输入已有口令（current-password）。 */
  purpose?: "current" | "new";
}
type PasswordPrompt = (opts: PromptOpts) => Promise<string | null>;
type LockChangeSub = (unlocked: boolean) => void;

let _password: string | null = null;                 // 统一图库口令
const _perName = new Map<string, string>();          // 别的口令的文件的 per-name 覆盖；锁定时一并清
let _prompt: PasswordPrompt | null = null;
const _subs = new Set<LockChangeSub>();
const _pwSubs = new Set<(pw: string | null) => void>();
function _notify(): void {
  for (const cb of _subs) { try { cb(_password != null); } catch { /* UI 订阅者的错不许打断口令状态 */ } }
  for (const cb of _pwSubs) { try { cb(_password); } catch { /* 同上 */ } }
}

export function setPasswordPrompt(fn: PasswordPrompt): void { _prompt = fn; }
export function isUnlocked(): boolean { return _password != null; }
export function setPassword(pw: string | null): void { _password = pw || null; _notify(); }
/** 锁定 = 忘掉一切口令（内存清除）。加密文件回到锁样式；保存路径会明确说「锁着」而不是静默。 */
export function lock(): void { _password = null; _perName.clear(); _notify(); }
/** 锁态变化订阅（图库刷新用）。返回退订函数。 */
export function onLockChange(cb: LockChangeSub): () => void { _subs.add(cb); return () => _subs.delete(cb); }
/** 统一口令变了（设 / 锁定 = null）。只给 remember-password.ts 用。 */
export function onCurrentPasswordChange(cb: (pw: string | null) => void): () => void { _pwSubs.add(cb); return () => _pwSubs.delete(cb); }

/** 弹一次口令输入（不入库、不验证）。app 没注入面板 → throw（组装错误，早炸）。 */
export async function promptPassword(opts: PromptOpts = {}): Promise<string | null> {
  if (!_prompt) throw new Error("password prompt not wired (setPasswordPrompt)");
  const pw = await _prompt(opts);
  return pw == null || pw === "" ? null : pw;
}

// ---- store 接缝（app-store 装配只注入 getPassword）----

export function getPassword(name: string | null): string | null {
  if (name != null && _perName.has(name)) return _perName.get(name)!;
  return _password;
}
export function setFilePassword(name: string, pw: string): void { _perName.set(name, pw); }
export function forgetFilePassword(name: string): void { _perName.delete(name); }

export function onPasswordVerified(name: string, pw: string): void {
  // 统一口令模型：全局还空着 → 这个验证过的口令上位为全局；全局已有但这个文件用别的口令 → 记 per-name 覆盖，全局不动。
  if (_password == null) { _password = pw; _notify(); }
  else if (pw !== _password) _perName.set(name, pw);
}
