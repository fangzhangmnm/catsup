// clipboard.ts —— app 内的一份剪贴板（SketchUp 同款：不进撤销；剪切后撤销，剪贴板还在，再贴 = 两份）。created 2026-10-28 by Claude Fable 5.1
// 载荷 = transfer.ts 的值拷贝（世界坐标）；跨文档 / 系统剪贴板以后再说（载荷能序列化成 .catsup 片段，留口）。
// 2026-10-29 Opus 5.5：记住来自哪个模型（doc = Editor 换模型时加一的号）。载荷里的组件按定义编号、材质按文档材质编号——到了另一个模型编号可能碰巧对上
// 别的组件 / 材质 = 静默贴错；跨模型拷贝（把一个模型当素材库，user 10-29 wishlist）等 Fable 设计，这之前换了模型就如实拒绝。
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
