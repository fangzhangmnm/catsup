// popup-menu.ts —— 弹出菜单最小替身：挂 body、锚定、外点关/Escape 关/栈式互斥。
// 签名照抄 WeebPaint src/ui/popup-menu.ts 的消费者面（items 函数现算 / onPick 返回 "keep" 不关 / toggle）；
// 实现是 CatsUp 自己的 80 行——等 @internal/ui 包立户后整文件删掉换 import（2026-09-06 与 WeebPaint agent 约定）。
// created 2026-09-06 by Claude Fable 5.1

import { iconHtml } from "./icon.ts";

export interface PopupMenuItem<Id extends string = string> {
  id: Id;
  label: string;
  icon?: string;
  hint?: string;          // 右侧灰字（快捷键等）
  checked?: boolean;      // 勾选态（右侧 ✓）
  disabled?: boolean;
  separatorBefore?: boolean;
}
export interface PopupMenuOpts<Id extends string = string> {
  anchor: HTMLElement;
  items: () => PopupMenuItem<Id>[];
  onPick: (id: Id) => void | "keep";
  align?: "start" | "end";
}
export interface PopupMenuHandle {
  readonly el: HTMLElement;
  close(): void;
  refresh(): void;
  isOpen(): boolean;
}

let _open: PopupMenuHandle | null = null;
let _openAnchor: HTMLElement | null = null;

export function closePopupMenu(): void { _open?.close(); }
export function isPopupOpen(): boolean { return _open !== null; }

export function togglePopupMenu<Id extends string>(opts: PopupMenuOpts<Id>): PopupMenuHandle | null {
  if (_open && _openAnchor === opts.anchor) { _open.close(); return null; }
  return openPopupMenu(opts);
}

export function openPopupMenu<Id extends string>(opts: PopupMenuOpts<Id>): PopupMenuHandle {
  _open?.close();
  const el = document.createElement("div");
  el.className = "popup-menu";
  el.setAttribute("role", "menu");
  document.body.appendChild(el);
  let open = true;

  const render = (): void => {
    el.textContent = "";
    for (const it of opts.items()) {
      if (it.separatorBefore) {
        const hr = document.createElement("div");
        hr.className = "menu-sep";
        el.appendChild(hr);
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "menu-item";
      b.disabled = !!it.disabled;
      b.innerHTML = `${it.icon ? iconHtml(it.icon) : '<span class="ico-gap"></span>'}<span class="menu-label"></span>${it.hint ? '<span class="menu-hint"></span>' : ""}${it.checked ? iconHtml("check", { cls: "ico menu-check" }) : ""}`;
      (b.querySelector(".menu-label") as HTMLElement).textContent = it.label;
      if (it.hint) (b.querySelector(".menu-hint") as HTMLElement).textContent = it.hint;
      b.addEventListener("click", () => {
        const r = opts.onPick(it.id);
        if (r === "keep") render(); else close();
      });
      el.appendChild(b);
    }
    position();
  };
  const position = (): void => {
    const a = opts.anchor.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    el.style.left = "0px"; el.style.top = "0px";
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = opts.align === "end" ? a.right - w : a.left;
    let top = a.bottom + 4;
    if (left + w > vw - 6) left = vw - 6 - w;
    if (left < 6) left = 6;
    if (top + h > vh - 6) top = Math.max(6, a.top - 4 - h);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };
  const onDocDown = (ev: Event): void => {
    const path = ev.composedPath();
    if (path.includes(el) || path.includes(opts.anchor)) return;
    close();
  };
  const onKey = (ev: KeyboardEvent): void => { if (ev.key === "Escape") { ev.stopPropagation(); close(); } };
  const close = (): void => {
    if (!open) return;
    open = false;
    el.remove();
    document.removeEventListener("pointerdown", onDocDown, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", position);
    if (_open === handle) { _open = null; _openAnchor = null; }
    opts.anchor.classList.remove("is-open");
  };
  const handle: PopupMenuHandle = { el, close, refresh: render, isOpen: () => open };
  render();
  opts.anchor.classList.add("is-open");
  // 下一拍再挂外点关（本次点击的 pointerdown 已经过去了，click 触发的 open 不会被自己关掉）
  setTimeout(() => { if (open) document.addEventListener("pointerdown", onDocDown, true); }, 0);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", position);
  _open = handle;
  _openAnchor = opts.anchor;
  return handle;
}
