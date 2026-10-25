// multi-select.ts —— 下拉多选（user 2026-10-25「所以我们需要一个下拉多选的ux模块哦。而不是几百个选项浪费面板空间」）。created 2026-10-25 by Claude Opus 5.5
// 钮面只写一句摘要（multiSummary），点开 = 一层可勾选的列表：按 group 分组、勾了打 ✓、点一项只勾 / 取消不关层、最上面「全部取消」。
// 和单选下拉（select-field.ts）同一个思路；可以从别的菜单里开出来：层带 data-popup-child，上层菜单（popup-menu.ts）在它里面点不算点到外面。
// 以后和 select-field 一起抬进 @internal/workbench-elements（总账 #30）。
import { iconHtml } from "./icon.ts";

export interface MultiOption { id: string; label: string; group?: string }
export interface MultiSelectOpts {
  /** 挂在谁旁边（一般是菜单里那一行）；层优先摆在它左边（右上角的菜单往左开），放不下就摆下面。 */
  anchor: HTMLElement;
  options: () => MultiOption[];
  /** 受控：勾了哪些由消费者持有。 */
  values: () => readonly string[];
  onToggle: (id: string) => void;
  onClear?: () => void;
  clearLabel?: string;
  ariaLabel?: string;
}
export interface MultiSelectHandle { readonly el: HTMLElement; close(): void; isOpen(): boolean }

let current: MultiSelectHandle | null = null;
export function closeMultiSelect(): void { current?.close(); }

/** 钮面摘要：前 max 个名字用「、」连，多了写「等 N 项」；一个没勾 = empty。 */
export function multiSummary(labels: readonly string[], empty = "不显示", max = 2): string {
  if (!labels.length) return empty;
  return labels.length <= max ? labels.join("、") : `${labels.slice(0, max).join("、")} 等 ${labels.length} 项`;
}

export function openMultiSelect(opts: MultiSelectOpts): MultiSelectHandle {
  current?.close();
  const el = document.createElement("div");
  el.className = "popup-menu multi-select";
  el.dataset.popupChild = "1";
  el.setAttribute("role", "listbox"); el.setAttribute("aria-multiselectable", "true");
  if (opts.ariaLabel) el.setAttribute("aria-label", opts.ariaLabel);
  document.body.appendChild(el);
  let open = true;
  const row = (label: string, checked: boolean): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = "menu-item";
    b.innerHTML = `<span class="ico-gap"></span><span class="menu-label"></span>${checked ? iconHtml("check", { cls: "ico menu-check" }) : ""}`;
    (b.querySelector(".menu-label") as HTMLElement).textContent = label;
    return b;
  };
  const render = (): void => {
    const vals = opts.values(), top = el.scrollTop;
    el.textContent = "";
    if (opts.onClear) {
      const c = row(opts.clearLabel ?? "全部取消", false); c.classList.add("ms-clear"); c.disabled = !vals.length;
      c.addEventListener("click", () => { opts.onClear!(); render(); });
      el.appendChild(c);
    }
    let group: string | undefined;
    for (const o of opts.options()) {
      if (o.group !== group) { group = o.group; if (group) { const h = document.createElement("div"); h.className = "menu-section-label"; h.textContent = group; el.appendChild(h); } }
      const on = vals.includes(o.id), b = row(o.label, on);
      b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(on)); b.dataset.msId = o.id;
      b.addEventListener("click", () => { opts.onToggle(o.id); render(); });
      el.appendChild(b);
    }
    el.scrollTop = top;
  };
  const position = (): void => {
    const a = opts.anchor.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    el.style.left = "0px"; el.style.top = "0px";
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = a.left - w - 6, top = a.top;
    if (left < 6) { left = Math.min(Math.max(6, a.left), vw - 6 - w); top = a.bottom + 4; }
    if (top + h > vh - 6) top = Math.max(6, vh - 6 - h);
    el.style.left = `${left}px`; el.style.top = `${top}px`;
  };
  const onDocDown = (ev: Event): void => {
    const path = ev.composedPath();
    if (path.includes(el) || path.includes(opts.anchor)) return;
    close();
  };
  const onKey = (ev: KeyboardEvent): void => { if (ev.key === "Escape") close(); };
  const close = (): void => {
    if (!open) return;
    open = false; el.remove();
    document.removeEventListener("pointerdown", onDocDown, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", position);
    if (current === handle) current = null;
  };
  const handle: MultiSelectHandle = { el, close, isOpen: () => open };
  render(); position();
  setTimeout(() => { if (open) document.addEventListener("pointerdown", onDocDown, true); }, 0);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", position);
  current = handle;
  return handle;
}
