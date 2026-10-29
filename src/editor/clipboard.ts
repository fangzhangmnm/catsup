// clipboard.ts —— app 内的一份剪贴板（SketchUp 同款：不进撤销；剪切后撤销，剪贴板还在，再贴 = 两份）。created 2026-10-28 by Claude Fable 5.1
// 载荷 = transfer.ts 的值拷贝（世界坐标）；跨文档 / 系统剪贴板以后再说（载荷能序列化成 .catsup 片段，留口）。
import type { TransferPayload } from "./transfer.ts";

let held: TransferPayload | null = null;
export const clipboard = {
  set(p: TransferPayload): void { held = p; },
  get(): TransferPayload | null { return held; },
  has(): boolean { return held !== null; },
  /** 探针 / 测试用。 */
  clear(): void { held = null; },
};
