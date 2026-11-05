// clipboard.ts —— app 内的一份剪贴板（SketchUp 同款：不进撤销；剪切后撤销，剪贴板还在，再贴 = 两份）。created 2026-10-28 by Claude Fable 5.1
// 载荷 = transfer.ts 的值拷贝（世界坐标）；系统剪贴板以后再说（载荷能序列化成 .catsup 片段，留口）。
// 2026-11-04 Opus 5.5（身份地基 ID-3，计划书 §15）：载荷自带闭包、全按 GUID，换了模型也能贴，不再拒。还记着来自第几个模型（doc = Editor 换模型时加一的号），只决定粘贴提示要不要说「用的是本文件这版」。
import type { TransferPayload } from "./transfer.ts";

let held: { p: TransferPayload; doc: number } | null = null;
export const clipboard = {
  set(p: TransferPayload, doc: number): void { held = { p, doc }; },
  get(): TransferPayload | null { return held?.p ?? null; },
  /** 拷的时候是第几个模型（Editor.docEpoch）。 */
  doc(): number | null { return held?.doc ?? null; },
  has(): boolean { return held !== null; },
  /** 探针 / 测试用。 */
  clear(): void { held = null; },
};
