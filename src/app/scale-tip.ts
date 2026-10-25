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
  // 航空迷你带（高度表那种竖带）：读数钉在正中，往上 = 更大（对数尺，窗口 ÷/× 1.5）。
  // 列出来的那几项各占一条细竖道画它的合理范围（浓淡同字），规格点画刻度线；名字标在典型值的高度。
  // （v0.13.52 起先把窗口里全部带子叠在一根柱上 = 几十条叠成实心，看不出在不在范围里，截图核过后改成每项一道。）
  const H = 112, mid = H / 2, half = mid - 6, LANE = 4, TX = 4 + Math.max(1, items.length) * LANE, W = TX + 132;
  const [lo, hi] = view.window, k = Math.log(hi / view.reading) || 1;
  const y = (v: number): number => mid - (Math.log(v / view.reading) / k) * half;
  const clampY = (v: number): number => Math.max(2, Math.min(H - 2, v));
  let svg = `<rect x="0" y="0" width="${TX}" height="${H}" class="tape-bg"/>`;
  for (const m of view.marks) if (m.shape === "point") { const ty = clampY(y(m.value)).toFixed(1); svg += `<line x1="0" x2="${TX}" y1="${ty}" y2="${ty}" class="tape-tick"/>`; }
  items.forEach((it, i) => {
    const x = 2 + i * LANE, y1 = clampY(y(Math.min(it.hi, hi))), y0 = clampY(y(Math.max(it.lo, lo)));
    svg += `<rect x="${x}" y="${y1.toFixed(1)}" width="${LANE - 1}" height="${Math.max(1, y0 - y1).toFixed(1)}" rx="1" class="tape-band${it.hit ? " hit" : ""}" style="opacity:${it.hit ? "0.9" : (0.25 + 0.55 * it.strength).toFixed(2)}"/>`;
  });
  svg += `<line x1="0" x2="${TX + 6}" y1="${mid}" y2="${mid}" class="tape-now"/><path d="M${TX + 6} ${mid - 4}L${TX + 1} ${mid}L${TX + 6} ${mid + 4}Z" class="tape-now-head"/>`;
  const labs = items.map((it) => ({ it, y: clampY(y(it.value)) })).sort((a, b) => a.y - b.y);
  let last = -Infinity;
  for (const l of labs) {
    const ly = Math.max(l.y, last + 12); if (ly > H - 2) break; last = ly;
    svg += `<line x1="${TX}" x2="${TX + 8}" y1="${l.y.toFixed(1)}" y2="${(ly - 3).toFixed(1)}" class="tape-leader"/><text x="${TX + 10}" y="${(ly + 1).toFixed(1)}" class="tape-label${l.it.hit ? " hit" : ""}" style="opacity:${l.it.hit ? "1" : alpha(l.it.strength)}">${esc(l.it.name)}</text>`;
  }
  return head + `<div class="tip-tape"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${svg}</svg></div>`;
}
