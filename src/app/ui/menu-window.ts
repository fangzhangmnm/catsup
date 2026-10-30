// ui/menu-window.ts —— 一扇装着菜单的常驻浮窗（视图 / 物件）。created 2026-10-30 by Claude Opus 5.5
// user 10-29「我建议是视图 物体 都做成可以常驻的浮窗吧，只有主菜单是菜单型的」「浮窗的时候你可以学一下weebpaint……尽量深模块窄接口地去做」。
// 拼法：浮窗的一生 = ui/floating-window.ts（WeebPaint 同款深模块）；里面的菜单 = popup-menu.ts mountMenuPanel（和弹出菜单同一份画法）；
// 本文件只多三样：标题栏 + 关闭钮、第一次开的默认位置（挨着钮）、位置记在哪（调用方给 store）。
// 刷新：调用方每次界面刷新都可以叫 refresh()——只在菜单内容真的变了时才重画；下拉层开着时不重画（不把正在用的下拉抽掉）；页签变了（某页出现 / 消失）就整个重挂。
import { mountMenuPanel, openPopupMenu, type MenuPanelHandle, type PopupMenuItem, type PopupMenuOpts } from "./popup-menu.ts";
import { registerFloatingWindow, type FloatingWindowHandle, type PanelPos } from "./floating-window.ts";
import { choiceLayerOpen } from "./choice-layer.ts";

/** 第一次开的默认位置：start / end = 在钮下面、左 / 右对齐；beside = 在它（一整列挂件）的左边、after = 在它的右边，都顶对齐——不盖住它。 */
export type Align = "start" | "end" | "beside" | "after";
export type MenuSpec<Id extends string> = Pick<PopupMenuOpts<Id>, "items" | "onPick" | "tabs" | "tabKey">;
export interface MenuWindowSpec<Id extends string> {
  /** 窗的身份（位置按它记；探针按 data-win 找）。 */
  id: string;
  title: string;
  /** 菜单（每次刷新现取：页签可能跟现状变，比如修复页只在硬表面体里有）。 */
  menu: () => MenuSpec<Id>;
  /** 位置记在哪（CatsUp = 这台设备）。null = 没记过 → 第一次开挨着钮。 */
  store: { get(id: string): PanelPos | null; set(id: string, pos: PanelPos): void };
  /** 开关的回声（钮的按下态）。 */
  onOpenChange?(open: boolean): void;
}
export interface MenuWindowHandle {
  /** 开（开着 = 置顶）；tab = 直接停在这一页；anchor = 第一次开挨着谁。 */
  open(anchor: HTMLElement, align?: Align, tab?: string): void;
  /** 开着 = 关，关着 = 开。 */
  toggle(anchor: HTMLElement, align?: Align): void;
  close(): void;
  isOpen(): boolean;
  /** 现状可能变了：内容变了才重画。force = 从这扇窗里开出来的下拉自己要求的（下拉开着也重画，摘要跟着变）；不给 = 界面例行刷新（下拉开着就先不动，免得抽掉正在用的下拉）。 */
  refresh(force?: boolean): void;
  readonly el: HTMLElement;
}

/** 一扇带标题栏的浮窗（内容随调用方放：菜单窗 = 下面的 createMenuWindow；步行设置 = 参数区搬进来）。 */
export interface FloatWin {
  readonly el: HTMLElement;
  /** 内容区（标题栏下面，自己滚）。 */
  readonly body: HTMLElement;
  /** 开（开着 = 置顶）；第一次开挨着 anchor 摆（之后按记下的位置）。 */
  open(anchor: HTMLElement, align?: Align): void;
  close(): void;
  toggle(anchor: HTMLElement, align?: Align): void;
  isOpen(): boolean;
  /** 内容变了：重钳回屏。 */
  clamp(): void;
  /** 换标题字（标题是下拉的窗：换页时调）。 */
  setTitle(text: string): void;
}
/** 标题 = 下拉（user 10-30「两个大按钮太占地方了。我想的是窗口名字就是下拉」）：点标题弹这张表（换页 / 换内容），标题本身不拖窗。 */
export interface TitleMenu { items(): PopupMenuItem<string>[]; onPick(id: string): void }
export function createFloatWin(spec: { id: string; title: string; store: MenuWindowSpec<string>["store"]; onOpenChange?(open: boolean): void; bodyClass?: string; bodyRole?: string; titleMenu?: TitleMenu }): FloatWin {
  const el = document.createElement("div"); el.className = "float-win"; el.dataset.win = spec.id; el.hidden = true;
  const head = document.createElement("div"); head.className = "float-head";
  const tm = spec.titleMenu;
  const title = document.createElement(tm ? "button" : "span"); title.className = tm ? "float-title float-title-menu" : "float-title";
  const titleText = document.createElement("span"); titleText.className = "float-title-text"; titleText.textContent = spec.title; title.append(titleText);
  if (tm) {
    (title as HTMLButtonElement).type = "button"; title.setAttribute("aria-haspopup", "menu");
    const caret = document.createElement("span"); caret.className = "float-title-caret"; caret.setAttribute("aria-hidden", "true"); caret.textContent = "▾"; title.append(caret);
    title.addEventListener("click", () => openPopupMenu<string>({ anchor: title, align: "start", items: () => tm.items(), onPick: (id) => tm.onPick(id) }));
  }
  const close = document.createElement("button"); close.type = "button"; close.className = "float-close"; close.title = "关"; close.setAttribute("aria-label", `关掉「${spec.title}」`); close.textContent = "×";
  head.append(title, close);
  const body = document.createElement("div"); body.className = `float-body${spec.bodyClass ? ` ${spec.bodyClass}` : ""}`; if (spec.bodyRole) body.setAttribute("role", spec.bodyRole);
  el.append(head, body);
  document.body.appendChild(el);
  const win: FloatingWindowHandle = registerFloatingWindow(el, {
    id: spec.id, head, ignoreDragOn: (t) => close.contains(t) || (!!tm && title.contains(t)),
    onMove: (pos) => spec.store.set(spec.id, pos),
    onOpenChange: (open) => spec.onOpenChange?.(open),
  });
  close.addEventListener("click", () => win.close());
  const place = (anchor: HTMLElement, align: Align): void => {
    const saved = spec.store.get(spec.id);
    if (saved) { win.restore(saved); return; }
    const a = anchor.getBoundingClientRect(), w = el.offsetWidth || 300;
    win.restore(align === "beside" ? { left: a.left - w - 8, top: a.top } : align === "after" ? { left: a.right + 8, top: a.top } : { left: align === "end" ? a.right - w : a.left, top: a.bottom + 6 });
  };
  const fw: FloatWin = {
    el, body,
    open(anchor, align = "end") { const was = win.isOpen(); win.open(); if (!was) { place(anchor, align); win.clamp(); } },   // 先露出来才量得到尺寸
    close: () => win.close(),
    toggle(anchor, align = "end") { if (win.isOpen()) win.close(); else fw.open(anchor, align); },
    isOpen: () => win.isOpen(),
    clamp: () => win.clamp(),
    setTitle: (text) => { titleText.textContent = text; close.setAttribute("aria-label", `关掉「${text}」`); },
  };
  return fw;
}

export function createMenuWindow<Id extends string>(spec: MenuWindowSpec<Id>): MenuWindowHandle {
  // 内容区类名 float-menu：不冒充 .popup-menu（一次性弹出层：外点关 / 探针按它认），也别用 menu-panel（@internal/workbench-elements 里固定定位弹层的类名，v0.17.54 撞过）
  const fw = createFloatWin({ id: spec.id, title: spec.title, store: spec.store, bodyClass: "float-menu", bodyRole: "menu", onOpenChange: (open) => { if (!open) unmount(); spec.onOpenChange?.(open); } });
  const body = fw.body;
  let panel: MenuPanelHandle | null = null, tabsKey = "", sig = "";
  const signature = (m: MenuSpec<Id>): string => { try { return JSON.stringify(m.items()); } catch { return String(Math.random()); } };
  const unmount = (): void => { panel?.dispose(); panel = null; tabsKey = ""; sig = ""; };
  const mount = (tab?: string): void => {
    const m = spec.menu();
    unmount();
    tabsKey = (m.tabs ?? []).map((t) => t.id).join("|"); sig = signature(m);
    body.classList.toggle("has-tabs", tabsKey !== "");
    panel = mountMenuPanel<Id>(body, { ...m, ...(tab ? { tab } : {}), onPick: (id) => { const r = m.onPick(id); sig = signature(spec.menu()); return r; } });
  };
  const handle: MenuWindowHandle = {
    el: fw.el,
    open(anchor, align = "end", tab) {
      if (!fw.isOpen() || tab) mount(tab);
      fw.open(anchor, align);
    },
    toggle(anchor, align = "end") { if (fw.isOpen()) fw.close(); else handle.open(anchor, align); },
    close: () => fw.close(),
    isOpen: () => fw.isOpen(),
    refresh(force = false) {
      if (!fw.isOpen() || !panel || (!force && choiceLayerOpen())) return;
      const m = spec.menu(), tk = (m.tabs ?? []).map((t) => t.id).join("|");
      if (tk !== tabsKey) { mount(); fw.clamp(); return; }
      const s = signature(m);
      if (s !== sig) { sig = s; panel.refresh(); fw.clamp(); }
    },
  };
  return handle;
}
