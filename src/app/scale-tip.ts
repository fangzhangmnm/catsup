// scale-tip.ts —— B43 尺度参考在跟指针提示框里的三种画法（user 2026-10-25「多试试吧」：浓淡字 / 航空迷你带 / 每项小条，「参考」页切着试）。
// 只画、不算：条目、浓淡（strength）、命中（hit）、迷你带的刻度都由 editor/scale-ref.ts scaleTipView 给。created 2026-10-25 by Claude Opus 5.5
import type { ScaleTipView } from "../editor/scale-ref.ts";

export type ScaleTipStyle = "fade" | "tape" | "bars";
export const SCALE_TIP_STYLES: readonly { id: ScaleTipStyle; label: string }[] = [
  { id: "fade", label: "浓淡字" },
  { id: "tape", label: "迷你带" },
  { id: "bars", label: "每项小条" },
];
export const SCALE_TIP_MAX = [3, 5, 8] as const;

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** 浓淡：在典型值上最浓，到合理范围边上淡到 0.3。 */
const alpha = (strength: number): string => (0.3 + 0.7 * strength).toFixed(2);

/** 提示框内容（HTML）：第一行 = 原来的吸附 / 工具文字（可空），下面 = 参考。view 空 = 只有第一行。 */
export function scaleTipHtml(text: string | null, view: ScaleTipView | null, style: ScaleTipStyle, max: number): string {
  const head = text ? `<div class="tip-main">${esc(text)}</div>` : "";
  if (!view) return head;
  const items = view.items.slice(0, max);
  if (style === "fade") {
    if (!items.length) return head;
    return head + `<div class="tip-ref">≈ ${items.map((it) => `<span class="${it.hit ? "hit" : ""}" style="opacity:${it.hit ? "1" : alpha(it.strength)}">${esc(it.name)}</span>`).join('<span class="sep"> / </span>')}</div>`;
  }
  if (style === "bars") {
    if (!items.length) return head;
    const W = 56, H = 8;
    const rows = items.map((it) => {
      const span = Math.log(it.hi / it.lo) || 1, x = (v: number): number => Math.max(0, Math.min(W, (Math.log(v / it.lo) / span) * W));
      const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><rect x="0" y="2" width="${W}" height="4" rx="2" class="bar-track ${it.shape}"/><line x1="${x(it.value).toFixed(1)}" y1="0" x2="${x(it.value).toFixed(1)}" y2="${H}" class="bar-typ"/><circle cx="${x(view.reading).toFixed(1)}" cy="4" r="2.6" class="bar-dot"/></svg>`;
      return `<div class="tip-bar-row${it.hit ? " hit" : ""}">${svg}<span style="opacity:${it.hit ? "1" : alpha(it.strength)}">${esc(it.name)}</span></div>`;
    });
    return head + `<div class="tip-bars">${rows.join("")}</div>`;
  }
  // 迷你带：和一行字一样高的细条放在名字前面，不比提示框本身更抢眼（user 2026-10-25「你那个飞行仪表太占地方了，我希望不比tooltip抢更多注意力，到没到是很不重要的信息」）。
  // 横着的对数尺（窗口 ÷/× 1.5，左小右大），读数 = 中间一根淡竖线；列出来的几项各一条极细的横道（浓淡同字），规格点 = 小刻度；全灰，不用强调色，也不标「到了」。
  // （v0.13.52–54 是一根 112 px 高的竖带 + 每项一条道 + 名字标在典型值高度，太大，换掉。）
  const W = 64, H = 10, mid = W / 2, half = mid - 2;
  const k = Math.log(view.window[1] / view.reading) || 1;
  const x = (v: number): number => Math.max(0, Math.min(W, mid + (Math.log(v / view.reading) / k) * half));
  const n = Math.max(1, items.length), row = Math.min(2, (H - 2) / n), gap = Math.min(1, ((H - 2) - row * n) / Math.max(1, n - 1));
  let svg = `<rect x="0" y="0" width="${W}" height="${H}" rx="2" class="tape-bg"/>`;
  for (const m of view.marks) if (m.shape === "point") { const tx = x(m.value).toFixed(1); svg += `<line x1="${tx}" x2="${tx}" y1="${H - 3}" y2="${H}" class="tape-tick"/>`; }
  items.forEach((it, i) => {
    const x0 = x(it.lo), x1 = x(it.hi), y0 = 1 + i * (row + gap);
    svg += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(2)}" width="${Math.max(1, x1 - x0).toFixed(1)}" height="${row.toFixed(2)}" class="tape-band" style="opacity:${(0.2 + 0.5 * it.strength).toFixed(2)}"/>`;
  });
  svg += `<line x1="${mid}" x2="${mid}" y1="0" y2="${H}" class="tape-now"/>`;
  const names = items.map((it) => `<span style="opacity:${alpha(it.strength)}">${esc(it.name)}</span>`).join('<span class="sep"> / </span>');
  return head + `<div class="tip-ref tip-tape"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${svg}</svg> ${names}</div>`;
}
