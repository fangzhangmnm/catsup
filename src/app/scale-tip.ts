// scale-tip.ts —— B43 尺度参考在跟指针提示框里的画法：只有字，按深浅（user 2026-10-25「要不不要图像，就字的深淡」）。
// 试过三种（浓淡字 / 迷你带 / 每项小条，v0.13.52–55），user 看完只留字；「到没到是很不重要的信息」→ 规格点进范围也不另外强调。
// user 同日：「其实深淡动画我都觉得抢注意力，因为这是每一次推拉，移动，都会弹的！也许以后考虑放右下角。我可以先看看用的是否习惯」。
// 条目和深浅（strength）由 editor/scale-ref.ts scaleTipView 给，这里只画。created 2026-10-25 by Claude Opus 5.5
import type { ScaleTipView } from "../editor/scale-ref.ts";

/** 「最多几条」的档（试用；这台设备记住）。 */
export const SCALE_TIP_MAX = [3, 5, 8] as const;

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** 深浅：在典型值上最深，到合理范围边上淡到 0.3。 */
const alpha = (strength: number): string => (0.3 + 0.7 * strength).toFixed(2);

/** 提示框内容（HTML）：第一行 = 原来的吸附 / 工具文字（可空），第二行 = 「≈ 名字 / 名字」。没有参考 = 只有第一行。 */
export function scaleTipHtml(text: string | null, view: ScaleTipView | null, max: number): string {
  const head = text ? `<div class="tip-main">${esc(text)}</div>` : "";
  const items = view?.items.slice(0, max) ?? [];
  if (!items.length) return head;
  return head + `<div class="tip-ref">≈ ${items.map((it) => `<span style="opacity:${alpha(it.strength)}">${esc(it.name)}</span>`).join('<span class="sep"> / </span>')}</div>`;
}
