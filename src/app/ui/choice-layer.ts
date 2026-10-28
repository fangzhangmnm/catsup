// choice-layer.ts —— 从菜单里开出来的下拉层：单选（下拉行）和多选（下拉多选）共用一个壳。created 2026-10-25 by Claude Opus 5.5
// 多选：user 2026-10-25「所以我们需要一个下拉多选的ux模块哦。而不是几百个选项浪费面板空间」——钮面一句摘要（multiSummary），点开 = 可勾选的列表，点一项只勾 / 取消不关层。
// 单选：user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做，以及也许可以做成那种可以滚动可以点开的下拉框」——
//   菜单里一行 = 名字 + 当前值 ▾（popup-menu.ts 的 choices 行），点开 = 这一层，选了就关层；长了自己滚，开的时候滚到勾着的那项。
// 层带 data-popup-child：上层菜单（popup-menu.ts）在它里面点不算点到外面；同一时刻只开一层，再点同一行 = 收起。
// 子菜单（2026-10-27 Opus；user「新建能不能收到一个子菜单里面…需要把菜单的深模块做成支持子菜单的，还要防止跑到屏幕外面」）：同一个壳，带图标的普通菜单项，
//   先往右开（桌面子菜单的习惯）、右边放不下往左、两边都放不下摆下面；太高自己滚（.choice-layer 的 max-height），上下夹在屏幕里。
// 以后和 select-field 一起抬进 @internal/workbench-elements（总账 #30）。前身 = multi-select.ts（同日，只有多选）。
import { iconHtml } from "./icon.ts";

export interface ChoiceOption { id: string; label: string; group?: string; hint?: string; icon?: string; disabled?: boolean }
interface LayerOpts {
  /** 挂在谁旁边（一般是菜单里那一行）：先摆左边（右上角的菜单往左开），再右边，都放不下就摆下面。 */
  anchor: HTMLElement;
  options: () => ChoiceOption[];
  isOn: (id: string) => boolean;
  /** 点了一项：返回 "close" = 关层。 */
  onPick: (id: string) => "close" | "keep";
  multi: boolean;
  head?: { label: string; enabled: () => boolean; onClick: () => void };
  ariaLabel?: string;
  /** 先摆哪边：left = 下拉层（右上角的菜单往左开，缺省）；right = 子菜单（往右开，放不下再往左）。 */
  prefer?: "left" | "right";
  /** menu = 子菜单（普通菜单项，没有勾）；缺省 listbox = 单选 / 多选。 */
  role?: "menu" | "listbox";
}
export interface ChoiceLayerHandle { readonly el: HTMLElement; readonly anchor: HTMLElement; close(): void; isOpen(): boolean }

let current: ChoiceLayerHandle | null = null;
export function closeChoiceLayer(): void { current?.close(); }
/** 有层开着（上层菜单的 Esc 先收这一层）。 */
export function choiceLayerOpen(): boolean { return !!current && current.isOpen(); }
/** 这一行开着的层（再点同一行 = 收起用）。 */
export function choiceLayerOn(anchor: HTMLElement): boolean { return !!current && current.isOpen() && current.anchor === anchor; }

/** 钮面摘要：前 max 个名字用「、」连，多了写「等 N 项」；一个没勾 = empty。 */
export function multiSummary(labels: readonly string[], empty = "不显示", max = 2): string {
  if (!labels.length) return empty;
  return labels.length <= max ? labels.join("、") : `${labels.slice(0, max).join("、")} 等 ${labels.length} 项`;
}

export interface MultiSelectOpts {
  anchor: HTMLElement;
  options: () => ChoiceOption[];
  /** 受控：勾了哪些由消费者持有。 */
  values: () => readonly string[];
  onToggle: (id: string) => void;
  onClear?: () => void;
  clearLabel?: string;
  ariaLabel?: string;
}
export function openMultiSelect(o: MultiSelectOpts): ChoiceLayerHandle {
  return openLayer({
    anchor: o.anchor, options: o.options, multi: true, ariaLabel: o.ariaLabel,
    isOn: (id) => o.values().includes(id),
    onPick: (id) => { o.onToggle(id); return "keep"; },
    head: o.onClear ? { label: o.clearLabel ?? "全部取消", enabled: () => o.values().length > 0, onClick: o.onClear } : undefined,
  });
}

export interface SingleSelectOpts {
  anchor: HTMLElement;
  options: () => ChoiceOption[];
  /** 受控：当前值由消费者持有。 */
  value: () => string | undefined;
  onPick: (id: string) => void;
  ariaLabel?: string;
}
export function openSingleSelect(o: SingleSelectOpts): ChoiceLayerHandle {
  return openLayer({
    anchor: o.anchor, options: o.options, multi: false, ariaLabel: o.ariaLabel,
    isOn: (id) => o.value() === id,
    onPick: (id) => { o.onPick(id); return "close"; },
  });
}

export interface SubmenuOpts {
  anchor: HTMLElement;
  items: () => ChoiceOption[];
  /** 点了一项：返回 "close" = 关层（上层菜单关不关由调用方定）。 */
  onPick: (id: string) => "close" | "keep";
  ariaLabel?: string;
}
/** 子菜单：菜单里一行旁边开一层普通菜单项（带图标、没有勾）。 */
export function openSubmenu(o: SubmenuOpts): ChoiceLayerHandle {
  return openLayer({ anchor: o.anchor, options: o.items, multi: false, ariaLabel: o.ariaLabel, isOn: () => false, onPick: o.onPick, prefer: "right", role: "menu" });
}

function openLayer(opts: LayerOpts): ChoiceLayerHandle {
  current?.close();
  const el = document.createElement("div");
  el.className = "popup-menu choice-layer";
  el.dataset.popupChild = "1";
  el.setAttribute("role", opts.role ?? "listbox");
  if (opts.role === "menu") el.classList.add("submenu");
  if (opts.multi) el.setAttribute("aria-multiselectable", "true");
  if (opts.ariaLabel) el.setAttribute("aria-label", opts.ariaLabel);
  document.body.appendChild(el);
  let open = true;
  const row = (label: string, checked: boolean, hint?: string, icon?: string): HTMLButtonElement => {
    const b = document.createElement("button"); b.type = "button"; b.className = "menu-item";
    b.innerHTML = `${icon ? iconHtml(icon) : '<span class="ico-gap"></span>'}<span class="menu-label"></span>${hint ? '<span class="menu-hint"></span>' : ""}${checked ? iconHtml("check", { cls: "ico menu-check" }) : ""}`;
    (b.querySelector(".menu-label") as HTMLElement).textContent = label;
    if (hint) (b.querySelector(".menu-hint") as HTMLElement).textContent = hint;
    return b;
  };
  const render = (): void => {
    const top = el.scrollTop;
    el.textContent = "";
    if (opts.head) {
      const h = opts.head, c = row(h.label, false); c.classList.add("ms-clear"); c.disabled = !h.enabled();
      c.addEventListener("click", () => { h.onClick(); render(); });
      el.appendChild(c);
    }
    let group: string | undefined;
    for (const o of opts.options()) {
      if (o.group !== group) { group = o.group; if (group) { const h = document.createElement("div"); h.className = "menu-section-label"; h.textContent = group; el.appendChild(h); } }
      const on = opts.isOn(o.id), b = row(o.label, on, o.hint, o.icon);
      if (opts.role === "menu") b.setAttribute("role", "menuitem");
      else { b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(on)); }
      b.dataset.choiceId = o.id; b.disabled = !!o.disabled;
      if (on) b.classList.add("on");
      b.addEventListener("click", () => { if (opts.onPick(o.id) === "close") close(); else render(); });
      el.appendChild(b);
    }
    el.scrollTop = top;
  };
  const position = (): void => {
    const a = opts.anchor.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    el.style.left = "0px"; el.style.top = "0px";
    const w = el.offsetWidth, h = el.offsetHeight;
    const leftSide = a.left - w - 6, rightSide = a.right + 6;
    const fitsL = leftSide >= 6, fitsR = rightSide + w <= vw - 6;
    let left: number, top = opts.prefer === "right" ? a.top - 6 : a.top;   // 子菜单：第一项和这一行对齐（层有 6 px 内边距）
    if (opts.prefer === "right" ? fitsR : fitsL) left = opts.prefer === "right" ? rightSide : leftSide;
    else if (opts.prefer === "right" ? fitsL : fitsR) left = opts.prefer === "right" ? leftSide : rightSide;
    else { left = Math.min(Math.max(6, a.left), vw - 6 - w); top = a.bottom + 4; }   // 两边都放不下（窄屏）：摆下面
    if (top + h > vh - 6) top = Math.max(6, vh - 6 - h);   // 夹在屏幕里（太高的层自己滚：.choice-layer max-height）
    if (top < 6) top = 6;
    el.style.left = `${left}px`; el.style.top = `${top}px`;
  };
  const onDocDown = (ev: Event): void => {
    const path = ev.composedPath();
    if (path.includes(el) || path.includes(opts.anchor)) return;
    close();
  };
  const onKey = (ev: KeyboardEvent): void => { if (ev.key === "Escape") { ev.stopPropagation(); close(); } };
  const close = (): void => {
    if (!open) return;
    open = false; el.remove();
    document.removeEventListener("pointerdown", onDocDown, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", position);
    opts.anchor.classList.remove("is-open");
    if (current === handle) current = null;
  };
  const handle: ChoiceLayerHandle = { el, anchor: opts.anchor, close, isOpen: () => open };
  render(); position();
  if (!opts.multi) el.querySelector<HTMLElement>(".menu-item.on")?.scrollIntoView({ block: "nearest" });   // 长列表：开的时候滚到勾着的那项
  opts.anchor.classList.add("is-open");
  setTimeout(() => { if (open) document.addEventListener("pointerdown", onDocDown, true); }, 0);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", position);
  current = handle;
  return handle;
}
