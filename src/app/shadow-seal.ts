// shadow-seal.ts —— 崩溃影子这一帧写什么（家族规则书 §1 第 5 条：「加密了的，它和它的一切副产品，在任何地方只存密文；做不到密文就不存」）。
// created 2026-11-03 by Claude Opus 5.5（工单 C2 ①；形状照 WeebPaint session-state.ts t-crash-snapshot：加密的本地家快照 = 容器，口令不在 → 跳拍 + log，绝不降级明文）。
//
// 三种结果，没有第四种：
//   没封口（普通模型）            → 原字节
//   封口 ∧ 口令在（解开的加密件）  → 容器（再核一眼确实是容器，不是就当做不到）
//   封口 ∧ 口令没了（用户锁定过）  → null = 这一拍不写
// 只有这里决定写什么，session 里唯一的 crashStore.put 吃这里的结果（test/shadow-seal.test.ts 结构守卫）。

/** 这个模型是从加密件解开来的。pw = null：口令已被忘掉（锁定 / 登出），还是封口的，只是写不了了。 */
export interface ShadowSeal { readonly pw: string | null }

export interface SealPorts {
  pack(bytes: Uint8Array, pw: string): Promise<Blob>;
  isContainer(b: Blob): Promise<boolean>;
}

export async function shadowFrame(bytes: Uint8Array, seal: ShadowSeal | null, p: SealPorts): Promise<Blob | null> {
  if (!seal) return new Blob([bytes as BlobPart], { type: "model/gltf-binary" });
  if (!seal.pw) return null;
  const c = await p.pack(bytes, seal.pw);
  return (await p.isContainer(c)) ? c : null;
}
