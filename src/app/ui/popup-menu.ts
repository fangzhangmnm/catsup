// popup-menu.ts —— 弹出菜单最小替身：挂 body、锚定、外点关/Escape 关/栈式互斥。
// 签名照抄 WeebPaint src/ui/popup-menu.ts 的消费者面（items 函数现算 / onPick 返回 "keep" 不关 / toggle）；
// 实现是 CatsUp 自己的 80 行——等 @internal/ui 包立户后整文件删掉换 import（2026-09-06 与 WeebPaint agent 约定）。
// created 2026-09-06 by Claude Fable 5.1

import { iconHtml } from "./icon.ts";
import { type ChoiceLayerHandle, choiceLayerOn, choiceLayerOpen, closeChoiceLayer, openSingleSelect, openSubmenu } from "./choice-layer.ts";

export interface PopupMenuItem<Id extends string = string> {
  id: Id;
  label: string;
  icon?: string;
  hint?: string;          // 右侧灰字（快捷键等）
  checked?: boolean;      // 勾选态（右侧 ✓）
  disabled?: boolean;
  separatorBefore?: boolean;
  /** 分区小标题（票 2，WeebPaint 范式「人话小标题分区」，不是子菜单）：渲染在本项之前。 */
  sectionBefore?: string;
  /** 属于哪个 tab（opts.tabs 给了才看；A30）。 */
  tab?: string;
  /** 下拉行（user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做，以及也许可以做成那种可以滚动可以点开的下拉框」）：
   *  一行 = label + 当前值 ▾；点开 = 旁边一层可滚动的单选（choice-layer.ts），选了 = onPick(那一项的 id)，层关、本菜单留着并刷新。 */
  choices?: { id: Id; label: string; hint?: string; checked?: boolean }[];
  /** 行尾的当前值 ▾（下拉行）：给了 choices 时缺省 = 勾着那项的 label；只给 value 不给 choices = 点了照常 onPick(id)，层由消费者自己开（下拉多选）。 */
  value?: string;
  /** 纯文字说明（不可点；label = 正文；B43「新手提醒」）。 */
  note?: boolean;
  /** 子菜单（2026-10-27 Opus；user「新建能不能收到一个子菜单里面…需要把菜单的深模块做成支持子菜单的，还要防止跑到屏幕外面」）：
   *  这一行 = label + ›；点 / 鼠标悬停 = 旁边开一层（choice-layer.ts openSubmenu：先往右、放不下往左、太高自己滚）；点里面一项 = onPick(那一项的 id)，
   *  整个菜单关（返回 "keep" = 留着并刷新）。只一层：子项的 children 不看。 */
  children?: PopupMenuItem<Id>[];
}
/** 弹层顶部的 tab（A30，user 2026-10-24「汉堡菜单应该tab制度，和weebpaint一样」）：图标 + 字一排；只显示当前 tab 的项。 */
export interface PopupMenuTab { id: string; label: string; icon?: string }
export interface PopupMenuOpts<Id extends string = string> {
  anchor: HTMLElement;
  items: () => PopupMenuItem<Id>[];
  onPick: (id: Id) => void | "keep";
  align?: "start" | "end";
  tabs?: readonly PopupMenuTab[];
  /** 记住上次停在哪个 tab（同一个 key 共用；宿主接了 configureTabMemory 就由宿主记，CatsUp = 跟文件）。 */
  tabKey?: string;
  /** 这次打开直接停在这个 tab（别处的「XX 设置…」跳进来用；也记进 tabKey）。 */
  tab?: string;
  /** 这个菜单关掉了（任何原因：选了 / 外点 / Esc / 被别的菜单顶掉 / toggle）——调一次。参考窗库靠它清自己的菜单句柄和「再点一次删掉」（2026-10-25）。 */
  onClose?: () => void;
}
const _lastTab = new Map<string, string>();
/** tab 记忆交给宿主（user 2026-10-25「两个汉堡能记住选的是哪个tab吗」「不是应该跟文件吗」）：CatsUp 接 Session = 跟着文件走（WeebPaint desk.menuTab 同款）；
 *  接了就只问宿主（换文件 = 换一套记忆，本模块不另留缓存）；没接 = 只记本次会话。 */
export interface TabMemory { get(key: string): string | null; set(key: string, tab: string): void }
let _tabStore: TabMemory | null = null;
export function configureTabMemory(s: TabMemory | null): void { _tabStore = s; }
const recallTab = (key: string): string | undefined => (_tabStore ? _tabStore.get(key) : _lastTab.get(key)) ?? undefined;
const rememberTab = (key: string, tab: string): void => { if (_tabStore) _tabStore.set(key, tab); else _lastTab.set(key, tab); };
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

  // 开着的子菜单：鼠标移到别的行上，等一小会儿再收（斜着往子菜单挪的路上会擦过下一行，不能一碰就关）
  let sub: { row: HTMLElement; layer: ChoiceLayerHandle } | null = null, subTimer: ReturnType<typeof setTimeout> | null = null;
  const cancelSubClose = (): void => { if (subTimer !== null) { clearTimeout(subTimer); subTimer = null; } };
  const subOpen = (): boolean => !!sub && sub.layer.isOpen();
  const closeSubSoon = (): void => {
    if (!subOpen() || subTimer !== null) return;
    subTimer = setTimeout(() => { subTimer = null; if (sub && sub.layer.isOpen() && !sub.layer.el.matches(":hover") && !sub.row.matches(":hover")) { sub.layer.close(); sub = null; } }, 220);
  };
  const hoverSibling = (b: HTMLElement): void => { b.addEventListener("pointerenter", (ev) => { if (ev.pointerType === "mouse") closeSubSoon(); }); };
  const tabs = opts.tabs ?? [];
  let tab = tabs.length ? opts.tab || (opts.tabKey && recallTab(opts.tabKey)) || tabs[0].id : "";
  if (opts.tab && opts.tabKey) rememberTab(opts.tabKey, opts.tab);
  if (tabs.length && !tabs.some((t) => t.id === tab)) tab = tabs[0].id;
  const render = (): void => {
    el.textContent = "";
    el.classList.toggle("has-tabs", tabs.length > 0);
    if (tabs.length) {
      const bar = document.createElement("div"); bar.className = "menu-tabs"; bar.setAttribute("role", "tablist");
      for (const t of tabs) {
        const b = document.createElement("button"); b.type = "button"; b.className = "menu-tab" + (t.id === tab ? " on" : ""); b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(t.id === tab)); b.dataset.menuTab = t.id;
        b.innerHTML = `${t.icon ? iconHtml(t.icon) : ""}<span></span>`; (b.querySelector("span") as HTMLElement).textContent = t.label;
        b.addEventListener("click", (ev) => { ev.stopPropagation(); tab = t.id; if (opts.tabKey) rememberTab(opts.tabKey, tab); render(); });
        bar.appendChild(b);
      }
      el.appendChild(bar);
    }
    let firstInTab = true;
    for (const it of opts.items()) {
      if (tabs.length && it.tab !== tab) continue;
      const head = firstInTab; firstInTab = false;
      if (it.separatorBefore && !head) {
        const hr = document.createElement("div");
        hr.className = "menu-sep";
        el.appendChild(hr);
      }
      if (it.sectionBefore && !(head && tabs.length)) {   // tab 页的第一项不再画分区小标题（tab 本身就是标题）
        const h = document.createElement("div");
        h.className = "menu-section-label";
        h.textContent = it.sectionBefore;
        el.appendChild(h);
      }
      if (it.note) { const d = document.createElement("div"); d.className = "menu-note"; d.textContent = it.label; el.appendChild(d); continue; }
      if (it.children) {
        const kids = it.children, b = document.createElement("button");
        b.type = "button"; b.className = "menu-item menu-sub"; b.dataset.menuId = it.id; b.disabled = !!it.disabled || !kids.length;
        b.setAttribute("aria-haspopup", "menu");
        b.innerHTML = `${it.icon ? iconHtml(it.icon) : '<span class="ico-gap"></span>'}<span class="menu-label"></span><span class="menu-sub-mark" aria-hidden="true"></span>`;
        (b.querySelector(".menu-label") as HTMLElement).textContent = it.label;
        const openSub = (): void => {
          cancelSubClose();
          if (choiceLayerOn(b)) return;
          const layer = openSubmenu({
            anchor: b, ariaLabel: it.label,
            items: () => kids.map((k) => ({ id: k.id, label: k.label, ...(k.icon ? { icon: k.icon } : {}), ...(k.hint ? { hint: k.hint } : {}), ...(k.disabled ? { disabled: true } : {}) })),
            onPick: (id) => { const r = opts.onPick(id as Id); if (r === "keep") { if (open) render(); return "close"; } close(); return "close"; },
          });
          layer.el.addEventListener("pointerenter", cancelSubClose);
          sub = { row: b, layer };
        };
        b.addEventListener("click", openSub);   // 点 / 点按 = 开（开着再点不收：鼠标是悬停先开的，这一下点不该把它关掉）
        b.addEventListener("pointerenter", (ev) => { if (ev.pointerType === "mouse") openSub(); });
        el.appendChild(b); continue;
      }
      if (it.choices || it.value !== undefined) {
        const cur = it.choices?.find((c) => c.checked), b = document.createElement("button");
        b.type = "button"; b.className = "menu-item menu-field"; b.dataset.menuId = it.id; b.disabled = !!it.disabled;
        b.setAttribute("aria-haspopup", "listbox");
        b.innerHTML = `${it.icon ? iconHtml(it.icon) : '<span class="ico-gap"></span>'}<span class="menu-label"></span><span class="menu-value"></span>`;
        (b.querySelector(".menu-label") as HTMLElement).textContent = it.label;
        (b.querySelector(".menu-value") as HTMLElement).textContent = it.value ?? cur?.label ?? "";
        const choices = it.choices;
        b.addEventListener("click", () => {
          if (!choices) { const r = opts.onPick(it.id); if (r === "keep") render(); else close(); return; }
          if (choiceLayerOn(b)) { closeChoiceLayer(); return; }   // 再点同一行 = 收起
          openSingleSelect({
            anchor: b, ariaLabel: it.label,
            options: () => choices.map((c) => ({ id: c.id, label: c.label, ...(c.hint ? { hint: c.hint } : {}) })),
            value: () => choices.find((c) => c.checked)?.id,
            onPick: (id) => { opts.onPick(id as Id); if (open) render(); },
          });
        });
        hoverSibling(b);
        el.appendChild(b); continue;
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "menu-item";
      b.dataset.menuId = it.id;   // 子弹层（下拉多选）要挂在这一行旁边
      b.disabled = !!it.disabled;
      b.innerHTML = `${it.icon ? iconHtml(it.icon) : '<span class="ico-gap"></span>'}<span class="menu-label"></span>${it.hint ? '<span class="menu-hint"></span>' : ""}${it.checked ? iconHtml("check", { cls: "ico menu-check" }) : ""}`;
      (b.querySelector(".menu-label") as HTMLElement).textContent = it.label;
      if (it.hint) (b.querySelector(".menu-hint") as HTMLElement).textContent = it.hint;
      b.addEventListener("click", () => {
        const r = opts.onPick(it.id);
        if (r === "keep") render(); else close();
      });
      hoverSibling(b);
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
    if (top + h > vh - 6) top = Math.max(6, a.top - 4 - h);   // 下面放不下 → 摆上面；都放不下 = 贴顶（高度被 CSS 夹在屏幕里、自己滚，不跑出屏幕）
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };
  const onDocDown = (ev: Event): void => {
    const path = ev.composedPath();
    if (path.includes(el) || path.includes(opts.anchor)) return;
    // 子弹层不算外面（同 workbench-elements 0.1.3 / WeebPaint 09-11 规则）：从菜单里开出来的下拉层（multi-select.ts）里点，上层菜单不关
    if (path.some((n) => n instanceof HTMLElement && n.dataset.popupChild === "1")) return;
    close();
  };
  const onKey = (ev: KeyboardEvent): void => { if (ev.key === "Escape") { ev.stopPropagation(); if (choiceLayerOpen()) closeChoiceLayer(); else close(); } };   // 下拉层开着：Esc 先收它
  const close = (): void => {
    if (!open) return;
    open = false;
    cancelSubClose(); sub = null;
    closeChoiceLayer();   // 从这里开出来的下拉层跟着关
    el.remove();
    document.removeEventListener("pointerdown", onDocDown, true);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", position);
    if (_open === handle) { _open = null; _openAnchor = null; }
    opts.anchor.classList.remove("is-open");
    opts.onClose?.();
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
