// device-kv.ts —— CatsUp 的 device 层唯一 localStorage 入口（形状照抄 WeebPaint src/device-kv.ts，pwa-cloud-store skill §2「device-kv 器官」）。
// 纪律：接了 @internal/store 之后全 app 禁裸 localStorage / indexedDB（家规「用了本库就禁止直接碰」）；device 层标量一律经本器官；
//   test/redline-guard.test.mjs 机械执法（白名单 = src/app-store.ts + 本文件）。
// 无地姿态：localStorage 在 file:// Safari / 隐私模式可抛 SecurityError → try/catch 降级纯内存（本 session 内一致，不跨刷新）。
// key 前缀带 GUID 命名空间（file:// 共桶防撞；永不碰非自己前缀的键）。created 2026-09-20 by Claude Fable 5.1

const PREFIX = "catsup-7c1f0d2e9a4b6c58:";

const _mem = new Map<string, string>();
function _ls(): Storage | null {
  try {
    const ls = globalThis.localStorage;
    ls.getItem(PREFIX + "__probe");
    return ls;
  } catch { return null; }
}

export function deviceKvGet(key: string): string | null {
  const k = PREFIX + key;
  const ls = _ls();
  if (ls) { try { return ls.getItem(k); } catch { /* 降级读内存 */ } }
  return _mem.get(k) ?? null;
}

/** v=null 删键。写失败（配额/隐私模式中途翻脸）→ 落内存层，绝不 throw（device 层是便利不是红线）。 */
export function deviceKvSet(key: string, v: string | null): void {
  const k = PREFIX + key;
  const ls = _ls();
  if (ls) {
    try {
      if (v == null) ls.removeItem(k); else ls.setItem(k, v);
      _mem.delete(k);
      return;
    } catch { /* 落内存层 */ }
  }
  if (v == null) _mem.delete(k); else _mem.set(k, v);
}

export function deviceKvGetJson<T>(key: string, fallback: T): T {
  const raw = deviceKvGet(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
export function deviceKvSetJson(key: string, v: unknown): void {
  deviceKvSet(key, v == null ? null : JSON.stringify(v));
}

/** 0.4 时代的裸 `catsup.ui.*` 键一次性搬家（读到就迁、迁完删旧键；无则无事）。 */
export function migrateLegacyUiPrefs(keys: readonly string[]): void {
  let ls: Storage | null = null;
  try { ls = globalThis.localStorage; } catch { return; }
  if (!ls) return;
  for (const key of keys) {
    try {
      const old = ls.getItem(`catsup.ui.${key}`);
      if (old != null) { if (deviceKvGet(`ui.${key}`) == null) deviceKvSet(`ui.${key}`, old); ls.removeItem(`catsup.ui.${key}`); }
    } catch { /* 忽略 */ }
  }
}
