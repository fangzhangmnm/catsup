// unlock.ts —— 口令的交互循环（WeebPaint src/enc-thumbs.ts 的那几段同形）。created 2026-10-29 by Claude Fable 5.1（周账 F-123 接密码）
//   ensureUnlocked(name)   打开 / 解密一份加密模型前：内存口令先验（store verifyPassword 只解尾部 peek，便宜）；不行就弹面板循环（错 → 重问，取消 → false）。
//   ensureNewPassword()    第一次加密的口令：已解锁 → 复用；验证器在 → 输入并校验（绝不进创建流程）；都没有 → 设新口令（输两遍）、创建即落验证器。
//   unlockImportedContainer(blob) 本地加密文件（没进图库、没 name 可查 peek）：全量解，成功那次的明文直接给调用方。
// **都必须在 withBusy 之外调用**（要弹面板；busy 遮罩盖住面板 = 死锁，sheets 护栏会 throw）。
import { docFile } from "../app-store.ts";
import { appEncryption } from "../encryption.ts";
import { getPassword, isUnlocked, onPasswordVerified, promptPassword, setPassword } from "../crypto-state.ts";
import { checkVerifier, clearVerifier, createVerifier, hasVerifier } from "../password-verifier.ts";

const MSG_ENTER = "输入图库口令。口令只在内存里，关页就忘；可以勾「在这台设备上记住」。";
const MSG_WRONG = "口令不对，再试一次";

export async function ensureUnlocked(name: string): Promise<boolean> {
  const cur = getPassword(name);
  if (cur && await docFile(name).verifyPassword(cur)) return true;
  for (let attempt = 0; ; attempt++) {
    const pw = await promptPassword({ title: "解锁加密的模型", message: attempt > 0 ? MSG_WRONG : MSG_ENTER, offerRemember: getPassword(null) == null });   // 全局还空着 = 这次问的就是统一口令，给勾
    if (pw == null) return false;
    if (await docFile(name).verifyPassword(pw)) {
      onPasswordVerified(name, pw);
      if (getPassword(null) === pw && !hasVerifier()) void createVerifier(pw);   // 老账号迁移：真文件验过的统一口令回填验证器
      return true;
    }
  }
}

/** 解锁一段外来的加密容器字节（本地文件）。返回 { pw, plain }：验过的口令 + 解出来的明文；取消 → null。一次尝试 = 一次解密。 */
export async function unlockImportedContainer(blob: Blob): Promise<{ pw: string; plain: Blob } | null> {
  const cur = getPassword(null);
  if (cur) { const plain = await appEncryption.tryDecryptEncryptedBlob(blob, cur); if (plain) return { pw: cur, plain }; }
  for (let attempt = 0; ; attempt++) {
    const pw = await promptPassword({ title: "解锁加密的文件", message: attempt > 0 ? MSG_WRONG : "这是加密的工程文件。输入它的口令。" });
    if (pw == null) return null;
    const plain = await appEncryption.tryDecryptEncryptedBlob(blob, pw);
    if (plain) return { pw, plain };
  }
}

export async function ensureNewPassword(): Promise<string | null> {
  if (isUnlocked()) return getPassword(null);
  if (hasVerifier()) {   // 验证器在（本机或别的设备设过口令）→ 输入并校验，绝不再进创建流程（重装后设错一个新口令 = 两套口令并存）
    for (let attempt = 0; attempt < 3; attempt++) {
      const pw = await promptPassword({ title: "输入图库口令", message: attempt > 0 ? MSG_WRONG : "图库已设过口令（跟账号走）。输入原口令；忘记 = 内容永久找不回。", offerRemember: true });
      if (pw == null) return null;
      if ((await checkVerifier(pw)) === "ok") return pw;
    }
    return null;
  }
  for (let round = 0; round < 3; round++) {
    const p1 = await promptPassword({ title: "设置图库口令", message: round > 0 ? "两次输入不一致，重新设置" : "整个图库共用这一个口令。忘记 = 内容永久找不回（没有任何后门）；太短的口令可被暴力破解。加密文件用 7-Zip 输此口令也能打开。", purpose: "new" });
    if (p1 == null) return null;
    const p2 = await promptPassword({ title: "再输一遍确认", message: "两次输入需一致", offerRemember: true, purpose: "new" });   // 勾放在流程的最后一个面板
    if (p2 == null) return null;
    if (p1 === p2) { await createVerifier(p1); return p1; }
  }
  return null;
}

/** 这次 ensureNewPassword 会不会走「创建」：既没解锁也没验证器。在 ensureNewPassword **之前**取值。 */
export function isFreshPasswordSetup(): boolean { return !isUnlocked() && !hasVerifier(); }
/** 首次创建的口令没能加密成任何一件 → 验证器 + 内存口令一起撤销，图库回到「未设口令」。只在 isFreshPasswordSetup() 为真时调。 */
export function rollbackFreshPassword(): void { clearVerifier(); setPassword(null); }
