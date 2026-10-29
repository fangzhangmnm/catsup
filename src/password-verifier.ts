// password-verifier.ts —— 图库口令验证器（WeebPaint src/password-verifier.ts 同形，v0.4.11「sentinel 跟账号走」）。created 2026-10-29 by Claude Fable 5.1（周账 F-123）
//
// 病根：加密容器无 salt 文件、口令只活内存（红线设计不动）→ 系统没有任何「图库已有口令」的持久化标记：重装 / 换设备后必然走「创建新口令」流程且不校验——
//   创建错 = 两套口令并存 = softlock。
// 修法：app 层在 store 的 synced collection（跟账号走，离线有本地镜像）落一个微型验证器 { v, salt, iv, ct }，ct = AES-GCM(KDF(pw, salt), 固定明文)。
//   GCM tag 即验证（解得开 = 口令对）。不存明文 / 密钥 / 可逆物；KDF 参数对齐库 peek（PBKDF2-SHA256 × 250k）但完全独立实现，不与容器互操作。
// 语义：验证器只回答「图库口令是不是 X」。忘记口令 = 内容永久找不回（无后门，与容器一致）。
// 存取面（VerifierStore）由 app-store 接缝注入：collection "app-state" 的 galleryPasswordVerifier 项。本文件零 store import，node 可测。

export interface VerifierRecord { v: 1; salt: string; iv: string; ct: string }
export interface VerifierStore { get(): VerifierRecord | null; set(rec: VerifierRecord | null): void }

const PBKDF2_ITERS = 250_000;
const PLAINTEXT = "catsup-gallery-password-v1";   // 固定明文（验证只看 GCM tag 是否解得开）；v1 格式常量，改了 = 老验证器全失效

const b64 = (u: Uint8Array): string => btoa(String.fromCharCode(...u));
const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: PBKDF2_ITERS }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// ---- 密码学核心（纯，node 可测）----
export async function createVerifierRecord(pw: string): Promise<VerifierRecord> {
  const salt = new Uint8Array(16), iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(salt); globalThis.crypto.getRandomValues(iv);
  const key = await deriveKey(pw, salt);
  const ct = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(PLAINTEXT)));
  return { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
export async function verifyRecord(rec: VerifierRecord, pw: string): Promise<boolean> {
  try {
    const key = await deriveKey(pw, unb64(rec.salt));
    const plain = await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(rec.iv) as BufferSource }, key, unb64(rec.ct) as BufferSource);
    return new TextDecoder().decode(plain) === PLAINTEXT;
  } catch { return false; }   // GCM tag 不符 = 口令错
}
export const isVerifierRecord = (x: unknown): x is VerifierRecord => typeof x === "object" && x !== null && (x as VerifierRecord).v === 1 && typeof (x as VerifierRecord).salt === "string" && typeof (x as VerifierRecord).iv === "string" && typeof (x as VerifierRecord).ct === "string";

// ---- 存取门面（跟账号走；接缝注入）----
let _store: VerifierStore | null = null;
export function wireVerifierStore(s: VerifierStore | null): void { _store = s; }
export function hasVerifier(): boolean { return (_store?.get() ?? null) != null; }
/** 记住「图库口令 = pw」（覆盖旧验证器；创建 / 首次验证成功时调）。没接库（无地）= 不记（无地没有图库口令这回事）。 */
export async function createVerifier(pw: string): Promise<void> { if (_store) _store.set(await createVerifierRecord(pw)); }
export function clearVerifier(): void { _store?.set(null); }
/** 校验：ok = 口令对；bad = 口令错；none = 没有验证器（老账号未迁 / 已重置 / 无地）。 */
export async function checkVerifier(pw: string): Promise<"ok" | "bad" | "none"> {
  const rec = _store?.get() ?? null;
  if (!rec) return "none";
  return (await verifyRecord(rec, pw)) ? "ok" : "bad";
}
