// encryption.ts —— @internal/encryption 的唯一 value-level import（守卫测试 + build.sh lint 执法）。created 2026-09-20 by Claude Fable 5.1
// 2026-10-29 接密码（周账 F-123，user 10-28「一个是密码没有接……也许需要fable接一下」；Claude Fable 5.1）：零 codec → 真 codec。
//   codec = vendored zip.js（明文外壳）+ 7z-wasm（AES-256 payload；惰性加载，不拖 boot）——都自 WeebPaint 原样搬来；
//   容器形状归库（store 仓 ADR-0012）：**7-Zip 输口令可直接恢复**（anti-abandonware）。store 经 config.encryption 收同一实例，无库（本地文件）也能探测 / 解。
import { createEncryption, createPasswordKeeper, type PasswordKeeper } from "@internal/encryption";
import { zipPack, zipUnpack } from "./crypto/zip.ts";
import { pack7z, unpack7z } from "./crypto/sevenzip.ts";
import { REMEMBER_DB } from "./config.ts";
import { reportError } from "./app/error-funnel.ts";

export const appEncryption = createEncryption({
  codec: { zipPack, zipUnpack, pack7z, unpack7z },
  reportError: (e) => reportError(e instanceof Error ? e : new Error(String(e)), "log"),   // 探测容错路径 = 良性
});

// 「在这台设备上记住口令」（@internal/encryption 0.2.x createPasswordKeeper；库仓 ADR-0001；user 2026-10-17「口令加一个过期时间，最多一个月」）。
//   本机 IDB `catsup-<guid>.remember`：还原出厂一起删（factory-reset.ts OWN_DBS）；清缓存 / 强制更新不碰。没勾过的设备不会长出这个库（0.2.2）。
//   惰性建；只给 src/remember-password.ts 用。
let _keeper: PasswordKeeper | null = null;
export const passwordKeeper = (): PasswordKeeper => (_keeper ??= createPasswordKeeper({ dbName: REMEMBER_DB }));
