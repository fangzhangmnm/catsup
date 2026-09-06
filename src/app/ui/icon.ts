// icon.ts —— 图标 = 指向内联 sprite 的 <use>（sprite 在 index.html 顶部，scripts/inline-sprites.py 生成）。
// 签名照抄 WeebPaint src/ui/icon.ts（2026-09-06 与 WeebPaint agent 对齐：将来 @internal/ui 包出来 import 一换即上）。
// created 2026-09-06 by Claude Fable 5.1
// 图标名 = 共享库（20260708 SVG Icons）的 symbol id；库里没有的名字 extract 会放 icon-missing 虚线占位。

export type IconName = string;

export function iconHtml(name: IconName, opts: { size?: number; cls?: string } = {}): string {
  const { size, cls } = opts;
  const attrs = [
    'viewBox="0 0 24 24"',
    cls ? `class="${cls}"` : 'class="ico"',
    size ? `width="${size}" height="${size}"` : "",
    'aria-hidden="true"',
  ].filter(Boolean).join(" ");
  return `<svg ${attrs}><use href="#${name}"/></svg>`;
}

export function iconEl(name: IconName, opts: { size?: number; cls?: string } = {}): SVGSVGElement {
  const tpl = document.createElement("template");
  tpl.innerHTML = iconHtml(name, opts);
  return tpl.content.firstElementChild as SVGSVGElement;
}
