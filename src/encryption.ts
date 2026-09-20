// encryption.ts —— @internal/encryption 的唯一 value-level import（守卫测试执法）。CatsUp 0.5 不加密：零 codec 实例
//   （探测照常、pack/unpack 响亮抛），createStore 必填表态。created 2026-09-20 by Claude Fable 5.1
import { createEncryption } from "@internal/encryption";
import { reportError } from "./app/error-funnel.ts";

export const appEncryption = createEncryption({
  codec: null,
  reportError: (e) => reportError(e instanceof Error ? e : new Error(String(e)), "log"),
});
